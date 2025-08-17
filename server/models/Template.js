const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');

// Schema for template items (same structure as inquiry items)
const templateItemSchema = new mongoose.Schema({
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
  gstAmount: {
    type: Number,
    default: 0,
    min: 0,
    set: v => Math.round(v * 100) / 100 // Round to 2 decimal places - Total GST amount
  },
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

const templateSchema = new mongoose.Schema({
  templateNumber: {
    type: String,
    unique: true,
    index: true
  },
  description: {
    type: String,
    required: true,
    maxlength: 200,
    trim: true
  },
  surgicalCategory: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: true
  },
  surgicalProcedure: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Procedure'
    // Note: Optional field, not required
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
  discountApplicable: {
    type: Boolean,
    default: false
  },
  hospitalDependent: {
    type: Boolean,
    default: false
  },
  hospital: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Hospital',
    required: function() {
      return this.hospitalDependent;
    }
  },
  items: [templateItemSchema],
  totalTemplateAmount: {
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
  },
  businessUnit: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'BusinessUnit'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Index for better query performance
templateSchema.index({ isActive: 1 });
templateSchema.index({ surgicalCategory: 1 });
templateSchema.index({ surgicalProcedure: 1 });

// Add pagination plugin
templateSchema.plugin(mongoosePaginate);

// Helper method to calculate item total amount with GST breakdown (same as inquiry)
templateItemSchema.methods.calculateTotal = function(customerStateCode = '', companyStateCode = '') {
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
  this.gstAmount = Math.round(gstAmount * 100) / 100;      // Total GST amount
  this.cgstAmount = Math.round(cgstAmount * 100) / 100;    // Central GST
  this.sgstAmount = Math.round(sgstAmount * 100) / 100;    // State GST
  this.igstAmount = Math.round(igstAmount * 100) / 100;    // Integrated GST
  
  return Math.round(totalAmount * 100) / 100;
};

// Helper method to calculate template total
templateSchema.methods.calculateTemplateTotal = function() {
  const total = this.items.reduce((sum, item) => sum + item.totalAmount, 0);
  return Math.round(total * 100) / 100;
};

// Pre-save middleware to auto-generate template number
templateSchema.pre('save', async function(next) {
  if (this.isNew && !this.templateNumber) {
    try {
      // Find the last template number
      const lastTemplate = await mongoose.model('Template')
        .findOne({}, { templateNumber: 1 })
        .sort({ templateNumber: -1 })
        .lean();

      let nextNumber = 1;
      if (lastTemplate && lastTemplate.templateNumber) {
        // Extract number from T0000001 format
        const lastNumber = parseInt(lastTemplate.templateNumber.substring(1));
        nextNumber = lastNumber + 1;
      }

      // Format as T0000001
      this.templateNumber = 'T' + nextNumber.toString().padStart(7, '0');
    } catch (error) {
      return next(error);
    }
  }
  next();
});

// Pre-save middleware to derive surgical category from procedure
templateSchema.pre('save', async function(next) {
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

// Pre-save middleware to set business unit from user context
templateSchema.pre('save', async function(next) {
  if (this.isNew && this.createdBy && !this.businessUnit) {
    try {
      const User = mongoose.model('User');
      const user = await User.findById(this.createdBy);
      if (user && user.businessUnit) {
        this.businessUnit = user.businessUnit;
      }
    } catch (error) {
      // Don't fail the save if business unit setting fails
    }
  }
  next();
});

// Pre-save middleware to validate materials belong to allowed surgical categories
templateSchema.pre('save', async function(next) {
  if (this.surgicalProcedure && this.items && this.items.length > 0) {
    try {
      const Procedure = mongoose.model('Procedure');
      const MaterialMaster = mongoose.model('MaterialMaster');
      
      // Get the procedure with its surgical categories
      const procedure = await Procedure.findById(this.surgicalProcedure).populate('items.surgicalCategoryId');
      
      if (!procedure) {
        return next(new Error('Invalid surgical procedure'));
      }
      
      // Get allowed category IDs from the procedure
      const allowedCategoryIds = procedure.items.map(item => item.surgicalCategoryId._id.toString());
      
      // Check each material in the template
      for (const item of this.items) {
        const material = await MaterialMaster.findOne({ materialNumber: item.materialNumber });
        
        if (!material) {
          return next(new Error(`Material ${item.materialNumber} not found`));
        }
        
        // Check if material's category is in allowed categories
        if (!allowedCategoryIds.includes(material.surgicalCategoryId.toString())) {
          return next(new Error(`Material ${item.materialNumber} does not belong to allowed surgical categories for this procedure`));
        }
      }
    } catch (error) {
      return next(error);
    }
  }
  next();
});

// Post-save middleware to calculate and update total amount
templateSchema.post('save', async function(doc) {
  if (doc.items && doc.items.length > 0) {
    const total = doc.calculateTemplateTotal();
    if (Math.abs(doc.totalTemplateAmount - total) > 0.01) { // Only update if significant difference
      await mongoose.model('Template').updateOne(
        { _id: doc._id },
        { totalTemplateAmount: total }
      );
    }
  }
});

module.exports = mongoose.model('Template', templateSchema);
