const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');

// Schema for sales order items (same structure as inquiry items)
const salesOrderItemSchema = new mongoose.Schema({
  serialNumber: {
    type: Number,
    required: true
  },
  materialNumber: {
    type: String,
    required: true,
    trim: true
  },
  // Material description fetched from material master
  materialDescription: {
    type: String,
    default: ''
  },
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

const salesOrderSchema = new mongoose.Schema({
  salesOrderNumber: {
    type: String,
    unique: true,
    index: true
  },
  documentDate: {
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
  uhid: {
    type: String,
    required: true,
    maxlength: 50,
    trim: true
  },
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Hospital',
    required: true
  },
  surgicalCategory: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: false  // Will be derived from procedure if not provided
  },
  procedure: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Procedure'
    // Note: Optional field, not required
  },
  surgeon: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Doctor',
    required: false  // Optional field
  },
  consultingDoctor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Doctor',
    required: false  // Optional field
  },
  paymentType: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PaymentType',
    required: true
  },
  items: [salesOrderItemSchema],
  totalSalesOrderAmount: {
    type: Number,
    default: 0,
    min: 0,
    set: v => Math.round(v * 100) / 100 // Round to 2 decimal places
  },
  rounding: {
    type: Number,
    default: 0,
    set: v => Math.round(v * 100) / 100 // Round to 2 decimal places
  },
  status: {
    type: String,
    enum: ['DRAFT', 'CONFIRMED', 'DELIVERED', 'CANCELLED'],
    default: 'DRAFT'
  },
  notes: {
    type: String,
    trim: true,
    maxLength: 500
  },
  isActive: {
    type: Boolean,
    default: true
  },
  businessUnit: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'BusinessUnit',
    required: true
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
salesOrderSchema.index({ customer: 1, documentDate: -1 });
salesOrderSchema.index({ uhid: 1 });
salesOrderSchema.index({ isActive: 1 });

// Add pagination plugin
salesOrderSchema.plugin(mongoosePaginate);

// Helper method to calculate item total amount with GST breakdown
salesOrderItemSchema.methods.calculateTotal = function(customerStateCode = '', companyStateCode = '') {
  const baseAmount = this.unitRate * this.quantity;
  const discountAmount = this.discountAmount || ((baseAmount * this.discountPercentage) / 100);
  
  // Apply discount FIRST
  const amountAfterDiscount = baseAmount - discountAmount;
  
  // Then calculate GST on DISCOUNTED amount
  const gstAmount = (amountAfterDiscount * this.gstPercentage) / 100;
  
  // Calculate GST breakdown based on customer state
  // Same state (Intra-state): CGST (50%) + SGST (50%)
  // Different state (Inter-state): IGST (100%)
  const isSameState = customerStateCode === companyStateCode;
  
  let cgstAmount, sgstAmount, igstAmount;
  if (isSameState) {
    cgstAmount = gstAmount * 0.5;  // 50% of total GST
    sgstAmount = gstAmount * 0.5;  // 50% of total GST
    igstAmount = 0;                // No IGST for same state
  } else {
    cgstAmount = 0;                // No CGST for different state
    sgstAmount = 0;                // No SGST for different state
    igstAmount = gstAmount;        // 100% of total GST as IGST
  }
  
  // Total = discounted amount + GST
  const totalAmount = amountAfterDiscount + gstAmount;
  
  // Update GST amounts on the item
  this.gstAmount = Math.round(gstAmount * 100) / 100;      // Total GST amount
  this.cgstAmount = Math.round(cgstAmount * 100) / 100;    // Central GST
  this.sgstAmount = Math.round(sgstAmount * 100) / 100;    // State GST
  this.igstAmount = Math.round(igstAmount * 100) / 100;    // Integrated GST
  
  return Math.round(totalAmount * 100) / 100;
};

// Helper method to calculate sales order total (includes rounding)
salesOrderSchema.methods.calculateSalesOrderTotal = function() {
  const subtotal = this.items.reduce((sum, item) => sum + item.totalAmount, 0);
  const total = subtotal + (this.rounding || 0);
  return Math.round(total * 100) / 100;
};

// Helper method to calculate sales order subtotal (without rounding)
salesOrderSchema.methods.calculateSalesOrderSubtotal = function() {
  const total = this.items.reduce((sum, item) => sum + item.totalAmount, 0);
  return Math.round(total * 100) / 100;
};

// Pre-save middleware to derive surgical category from procedure
salesOrderSchema.pre('save', async function(next) {
  // If surgical category is not provided but procedure is, derive it from procedure
  if (!this.surgicalCategory && this.procedure) {
    try {
      const Procedure = mongoose.model('Procedure');
      const procedure = await Procedure.findById(this.procedure).populate('items.surgicalCategoryId');
      
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
salesOrderSchema.pre('save', async function(next) {
  if (this.procedure && this.items && this.items.length > 0) {
    try {
      const Procedure = mongoose.model('Procedure');
      const MaterialMaster = mongoose.model('MaterialMaster');
      
      // Get the procedure with its surgical categories
      const procedure = await Procedure.findById(this.procedure).populate('items.surgicalCategoryId');
      
      if (!procedure) {
        return next(new Error('Invalid surgical procedure'));
      }
      
      // Get all allowed surgical category IDs from the procedure
      const allowedCategoryIds = procedure.items.map(item => 
        item.surgicalCategoryId._id ? item.surgicalCategoryId._id.toString() : item.surgicalCategoryId.toString()
      );
      
      // Validate each material in the sales order items
      const materialNumbers = this.items.map(item => item.materialNumber);
      const materials = await MaterialMaster.find({ 
        materialNumber: { $in: materialNumbers } 
      }).populate('surgicalCategories');
      
      // Create a map of material numbers to their surgical categories
      const materialCategoryMap = {};
      materials.forEach(material => {
        const categoryIds = (material.surgicalCategories || []).map(cat => 
          cat._id ? cat._id.toString() : cat.toString()
        );
        materialCategoryMap[material.materialNumber] = categoryIds;
      });
      
      // Check each sales order item
      const invalidMaterials = [];
      this.items.forEach(item => {
        const materialCategories = materialCategoryMap[item.materialNumber];
        if (!materialCategories || materialCategories.length === 0) {
          invalidMaterials.push(`Material ${item.materialNumber} not found`);
        } else if (!materialCategories.some(catId => allowedCategoryIds.includes(catId))) {
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

// Pre-save hook for items to calculate totals
salesOrderSchema.pre('save', async function(next) {
  // Get hospital and company state codes for accurate GST calculation
  let customerStateCode = '';
  let companyStateCode = '';
  
  try {
    if (this.customer) {
      const Hospital = mongoose.model('Hospital');
      const hospital = await Hospital.findById(this.customer);
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
  
  // Calculate total sales order amount
  // Calculate subtotal first (sum of items)
  const subtotal = this.items.reduce((sum, item) => sum + item.totalAmount, 0);
  const subtotalRounded = Math.round(subtotal * 100) / 100;
  
  // Total = subtotal + rounding
  this.totalSalesOrderAmount = Math.round((subtotalRounded + (this.rounding || 0)) * 100) / 100;
  
  next();
});

// Text search index
salesOrderSchema.index({
  salesOrderNumber: 'text',
  patientName: 'text',
  uhid: 'text'
});

module.exports = mongoose.model('SalesOrder', salesOrderSchema);
