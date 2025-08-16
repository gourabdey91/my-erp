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
  this.gstAmount = Math.round(gstAmount * 100) / 100;      // Total GST amount
  this.cgstAmount = Math.round(cgstAmount * 100) / 100;    // Central GST
  this.sgstAmount = Math.round(sgstAmount * 100) / 100;    // State GST
  this.igstAmount = Math.round(igstAmount * 100) / 100;    // Integrated GST
  
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
inquirySchema.pre('save', async function(next) {
  // Get hospital and company state codes for accurate GST calculation
  let customerStateCode = '';
  let companyStateCode = '';
  
  try {
    if (this.hospital) {
      const Hospital = mongoose.model('Hospital');
      const hospital = await Hospital.findById(this.hospital);
      if (hospital && hospital.stateCode) {
        customerStateCode = hospital.stateCode;
      }
    }
    
    // Get company details for company state code
    const CompanyDetails = mongoose.model('CompanyDetails');
    const company = await CompanyDetails.findOne({});
    if (company && company.compliance && company.compliance.stateCode) {
      companyStateCode = company.compliance.stateCode;
    }
  } catch (error) {
    console.warn('Warning: Could not fetch state codes for GST calculation:', error.message);
  }

  // Calculate total for each item with proper state codes
  this.items.forEach(item => {
    // Check if item has valid GST amounts already calculated (from frontend)
    const hasValidGST = item.cgstAmount !== undefined || item.sgstAmount !== undefined || item.igstAmount !== undefined;
    const gstAmountsExist = (item.cgstAmount || 0) + (item.sgstAmount || 0) + (item.igstAmount || 0) > 0;
    
    if (!hasValidGST || !gstAmountsExist) {
      // Only recalculate if GST amounts are missing or all zero
      // This is for items created directly through API or incomplete items
      console.log('Backend: Recalculating GST for item without valid GST amounts:', item.materialNumber);
      item.totalAmount = item.calculateTotal(customerStateCode, companyStateCode);
    } else {
      // GST amounts already calculated correctly on frontend, just recalculate total amount
      console.log('Backend: Using existing GST amounts for item:', item.materialNumber);
      const baseAmount = item.unitRate * item.quantity;
      const gstAmount = (item.cgstAmount || 0) + (item.sgstAmount || 0) + (item.igstAmount || 0);
      const discountAmount = item.discountAmount || ((baseAmount * item.discountPercentage) / 100);
      item.totalAmount = Math.round((baseAmount + gstAmount - discountAmount) * 100) / 100;
      
      // Ensure gstAmount field is set correctly for database storage
      item.gstAmount = Math.round(gstAmount * 100) / 100;
    }
  });
  
  // Calculate total inquiry amount
  this.totalInquiryAmount = this.calculateInquiryTotal();
  
  // Enhanced limit validation logic
  try {
    await validateInquiryLimits(this);
  } catch (error) {
    return next(error);
  }
  
  next();
});

// Enhanced limit validation function
async function validateInquiryLimits(inquiry) {
  // If no limit is set, skip validation
  if (!inquiry.limit || !inquiry.limit.amount) {
    return;
  }
  
  // If no surgical procedure is selected, use simple total validation
  if (!inquiry.surgicalProcedure) {
    if (inquiry.totalInquiryAmount > inquiry.limit.amount) {
      throw new Error(`Total inquiry amount (${inquiry.totalInquiryAmount} ${inquiry.limit.currency || 'INR'}) exceeds the limit (${inquiry.limit.amount} ${inquiry.limit.currency || 'INR'})`);
    }
    return;
  }
  
  // Get the procedure details to check category-level limit flag
  const Procedure = mongoose.model('Procedure');
  const procedure = await Procedure.findById(inquiry.surgicalProcedure)
    .populate('items.surgicalCategoryId');
  
  if (!procedure) {
    // If procedure not found, fall back to total limit validation
    if (inquiry.totalInquiryAmount > inquiry.limit.amount) {
      throw new Error(`Total inquiry amount (${inquiry.totalInquiryAmount} ${inquiry.limit.currency || 'INR'}) exceeds the limit (${inquiry.limit.amount} ${inquiry.limit.currency || 'INR'})`);
    }
    return;
  }
  
  // Check if category-level limit validation is enabled
  if (procedure.limitAppliedByIndividualCategory) {
    await validateCategoryLevelLimits(inquiry, procedure);
  } else {
    // Use total limit validation
    if (inquiry.totalInquiryAmount > inquiry.limit.amount) {
      throw new Error(`Total inquiry amount (${inquiry.totalInquiryAmount} ${inquiry.limit.currency || 'INR'}) exceeds the limit (${inquiry.limit.amount} ${inquiry.limit.currency || 'INR'})`);
    }
  }
}

// Category-level limit validation function
async function validateCategoryLevelLimits(inquiry, procedure) {
  const MaterialMaster = mongoose.model('MaterialMaster');
  
  // Get material details with surgical categories for all inquiry items
  const materialNumbers = inquiry.items.map(item => item.materialNumber);
  const materials = await MaterialMaster.find({ 
    materialNumber: { $in: materialNumbers } 
  }).populate('surgicalCategory');
  
  // Create mapping of material number to surgical category
  const materialCategoryMap = {};
  materials.forEach(material => {
    materialCategoryMap[material.materialNumber] = material.surgicalCategory._id.toString();
  });
  
  // Group inquiry amounts by surgical category
  const categoryTotals = {};
  inquiry.items.forEach(item => {
    const categoryId = materialCategoryMap[item.materialNumber];
    if (categoryId) {
      if (!categoryTotals[categoryId]) {
        categoryTotals[categoryId] = 0;
      }
      categoryTotals[categoryId] += item.totalAmount;
    }
  });
  
  // Create mapping of procedure categories to their limits
  const procedureCategoryLimits = {};
  procedure.items.forEach(item => {
    const categoryId = item.surgicalCategoryId._id.toString();
    procedureCategoryLimits[categoryId] = item.limit || 0;
  });
  
  // Validate each category against its individual limit
  const categoryViolations = [];
  Object.keys(categoryTotals).forEach(categoryId => {
    const categoryTotal = categoryTotals[categoryId];
    const categoryLimit = procedureCategoryLimits[categoryId];
    
    if (categoryLimit && categoryTotal > categoryLimit) {
      // Find category name for better error message
      const categoryItem = procedure.items.find(item => 
        item.surgicalCategoryId._id.toString() === categoryId
      );
      const categoryName = categoryItem?.surgicalCategoryId?.description || 
                          categoryItem?.surgicalCategoryId?.code || 
                          'Unknown Category';
      
      categoryViolations.push({
        categoryName,
        total: categoryTotal,
        limit: categoryLimit,
        excess: categoryTotal - categoryLimit
      });
    }
  });
  
  // If any category violations found, throw detailed error
  if (categoryViolations.length > 0) {
    const violationMessages = categoryViolations.map(violation => 
      `${violation.categoryName}: ${violation.total} exceeds limit of ${violation.limit} (excess: ${violation.excess})`
    );
    
    throw new Error(`Category-level limit validation failed. ${violationMessages.join('; ')}`);
  }
}

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
