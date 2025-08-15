const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');

// Schema for inquiry items
const inquiryItemSchema = new mongoose.Schema({
  serialNumber: {
    type: Number,
    required: true
  },
  materialNumber: {
    type: String,
    required: true,
    trim: true
  },
  // Material description is derived from material master, not stored
  hsnCode: {
    type: String,
    required: true,
    trim: true
  },
  unitRate: {
    type: Number,
    required: true,
    min: 0,
    set: v => Math.round(v * 100) / 100 // Round to 2 decimal places
  },
  gstPercentage: {
    type: Number,
    required: true,
    min: 0,
    max: 100,
    set: v => Math.round(v * 100) / 100 // Round to 2 decimal places
  },
  quantity: {
    type: Number,
    required: true,
    min: 0.01,
    set: v => Math.round(v * 100) / 100 // Round to 2 decimal places
  },
  unit: {
    type: String,
    required: true,
    trim: true
  },
  discountPercentage: {
    type: Number,
    default: 0,
    min: 0,
    max: 100,
    set: v => Math.round(v * 100) / 100 // Round to 2 decimal places
  },
  discountAmount: {
    type: Number,
    default: 0,
    min: 0,
    set: v => Math.round(v * 100) / 100 // Round to 2 decimal places
  },
  totalAmount: {
    type: Number,
    required: true,
    min: 0,
    set: v => Math.round(v * 100) / 100 // Round to 2 decimal places
  },
  // GST Amount Breakdown
  cgstAmount: {
    type: Number,
    default: 0,
    min: 0,
    set: v => Math.round(v * 100) / 100 // Round to 2 decimal places
  },
  sgstAmount: {
    type: Number,
    default: 0,
    min: 0,
    set: v => Math.round(v * 100) / 100 // Round to 2 decimal places
  },
  igstAmount: {
    type: Number,
    default: 0,
    min: 0,
    set: v => Math.round(v * 100) / 100 // Round to 2 decimal places
  },
  currency: {
    type: String,
    required: true,
    default: 'INR'
  }
}, {
  _id: true,
  timestamps: false
});

const inquirySchema = new mongoose.Schema({
  inquiryNumber: {
    type: String,
    unique: true,
    index: true
  },
  inquiryDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  patientName: {
    type: String,
    required: true,
    maxlength: 80,
    trim: true
  },
  patientUHID: {
    type: String,
    required: true,
    maxlength: 50,
    trim: true
  },
  hospital: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Hospital',
    required: true
  },
  surgicalCategory: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: false  // Will be derived from procedure if not provided
  },
  surgicalProcedure: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Procedure'
    // Note: Optional field, not required
  },
  paymentMethod: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PaymentType',
    required: true
  },
  limit: {
    amount: {
      type: Number,
      required: true,
      min: 0
    },
    currency: {
      type: String,
      required: true,
      default: 'INR',
      enum: ['USD', 'EUR', 'GBP', 'INR', 'AUD', 'CAD']
    }
  },
  items: [inquiryItemSchema],
  totalInquiryAmount: {
    type: Number,
    default: 0,
    min: 0,
    set: v => Math.round(v * 100) / 100 // Round to 2 decimal places
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Index for better query performance
inquirySchema.index({ hospital: 1, inquiryDate: -1 });
inquirySchema.index({ patientUHID: 1 });
inquirySchema.index({ isActive: 1 });

// Add pagination plugin
inquirySchema.plugin(mongoosePaginate);

// Helper method to calculate item total amount with GST breakdown
inquiryItemSchema.methods.calculateTotal = function(customerStateCode = '', companyStateCode = '') {
  const baseAmount = this.unitRate * this.quantity;
  const gstAmount = (baseAmount * this.gstPercentage) / 100;
  const discountAmount = this.discountAmount || ((baseAmount * this.discountPercentage) / 100);
  
  // Calculate GST breakdown
  const cgstAmount = gstAmount * 0.5; // Always 50%
  
  // Same state: SGST = 50%, IGST = 0
  // Different state: SGST = 0, IGST = 50%
  const isSameState = customerStateCode === companyStateCode;
  const sgstAmount = isSameState ? gstAmount * 0.5 : 0;
  const igstAmount = isSameState ? 0 : gstAmount * 0.5;
  
  const totalAmount = baseAmount + gstAmount - discountAmount;
  
  // Update GST amounts on the item
  this.cgstAmount = Math.round(cgstAmount * 100) / 100;
  this.sgstAmount = Math.round(sgstAmount * 100) / 100;
  this.igstAmount = Math.round(igstAmount * 100) / 100;
  
  return Math.round(totalAmount * 100) / 100;
};

// Helper method to calculate inquiry total
inquirySchema.methods.calculateInquiryTotal = function() {
  const total = this.items.reduce((sum, item) => sum + item.totalAmount, 0);
  return Math.round(total * 100) / 100;
};

// Pre-save middleware to derive surgical category from procedure
inquirySchema.pre('save', async function(next) {
  // If surgical category is not provided but procedure is, derive it from procedure
  if (!this.surgicalCategory && this.surgicalProcedure) {
    try {
      const Procedure = mongoose.model('Procedure');
      const procedure = await Procedure.findById(this.surgicalProcedure).populate('items.surgicalCategoryId');
      
      if (procedure && procedure.items && procedure.items.length > 0) {
        // Use the first surgical category from the procedure's items
        this.surgicalCategory = procedure.items[0].surgicalCategoryId._id || procedure.items[0].surgicalCategoryId;
      }
    } catch (error) {
      // Don't fail the save if category derivation fails
    }
  }
  next();
});

// Pre-save middleware to validate materials belong to allowed surgical categories
inquirySchema.pre('save', async function(next) {
  if (this.surgicalProcedure && this.items && this.items.length > 0) {
    try {
      const Procedure = mongoose.model('Procedure');
      const MaterialMaster = mongoose.model('MaterialMaster');
      
      // Get the procedure with its surgical categories
      const procedure = await Procedure.findById(this.surgicalProcedure).populate('items.surgicalCategoryId');
      
      if (!procedure) {
        return next(new Error('Invalid surgical procedure'));
      }
      
      // Get all allowed surgical category IDs from the procedure
      const allowedCategoryIds = procedure.items.map(item => 
        item.surgicalCategoryId._id ? item.surgicalCategoryId._id.toString() : item.surgicalCategoryId.toString()
      );
      
      // Validate each material in the inquiry items
      const materialNumbers = this.items.map(item => item.materialNumber);
      const materials = await MaterialMaster.find({ 
        materialNumber: { $in: materialNumbers } 
      }).populate('surgicalCategory');
      
      // Create a map of material numbers to their surgical categories
      const materialCategoryMap = {};
      materials.forEach(material => {
        materialCategoryMap[material.materialNumber] = material.surgicalCategory._id.toString();
      });
      
      // Check each inquiry item
      const invalidMaterials = [];
      this.items.forEach(item => {
        const materialCategory = materialCategoryMap[item.materialNumber];
        if (!materialCategory) {
          invalidMaterials.push(`Material ${item.materialNumber} not found`);
        } else if (!allowedCategoryIds.includes(materialCategory)) {
          invalidMaterials.push(`Material ${item.materialNumber} does not belong to any surgical category allowed for this procedure`);
        }
      });
      
      if (invalidMaterials.length > 0) {
        return next(new Error(`Material validation failed: ${invalidMaterials.join('; ')}`));
      }
      
    } catch (error) {
      return next(new Error(`Material validation error: ${error.message}`));
    }
  }
  next();
});

// Pre-save hook for items to calculate totals and validate limit
inquirySchema.pre('save', function(next) {
  // Calculate total for each item
  this.items.forEach(item => {
    // Call calculateTotal with default state codes (same state)
    item.totalAmount = item.calculateTotal('', ''); // Default to same state GST calculation
  });
  
  // Calculate total inquiry amount
  this.totalInquiryAmount = this.calculateInquiryTotal();
  
  // Validate total amount doesn't exceed limit (must be done after calculation)
  if (this.limit && this.limit.amount && this.totalInquiryAmount > this.limit.amount) {
    return next(new Error(`Total inquiry amount (${this.totalInquiryAmount} ${this.limit.currency || 'INR'}) exceeds the limit (${this.limit.amount} ${this.limit.currency || 'INR'})`));
  }
  
  next();
});

// Pre-save hook to generate inquiry number
inquirySchema.pre('save', async function(next) {
  if (this.isNew && !this.inquiryNumber) {
    try {
      const counter = await mongoose.model('InquirySequence').findOneAndUpdate(
        { _id: 'inquiryNumber' },
        { $inc: { seq: 1 } },
        { new: true, upsert: true }
      );
      this.inquiryNumber = `INCS${counter.seq.toString().padStart(8, '0')}`;
    } catch (error) {
      next(error);
    }
  }
  next();
});

// Create sequence model for inquiry numbers
const inquirySequenceSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  seq: { type: Number, default: 10000000 }
});

const InquirySequence = mongoose.model('InquirySequence', inquirySequenceSchema);

module.exports = mongoose.model('Inquiry', inquirySchema);
