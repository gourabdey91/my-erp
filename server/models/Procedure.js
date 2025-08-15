const mongoose = require('mongoose');

// Schema for procedure line items (multiple surgical categories)
const procedureItemSchema = new mongoose.Schema({
  surgicalCategoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category', // Reference to surgical category
    required: true
  },
  limit: {
    type: Number,
    required: false, // Made optional - some categories may not have limits
    min: 0
  },
  currency: {
    type: String,
    required: true,
    default: 'INR',
    enum: ['USD', 'EUR', 'GBP', 'INR', 'AUD', 'CAD']
  }
});

const procedureSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true,
    match: /^P\d{5}$/,  // Format: P00001, P00002, etc.
    maxLength: 6
  },
  name: {
    type: String,
    required: true,
    trim: true,
    maxLength: 200
  },
  description: {
    type: String,
    trim: true,
    maxLength: 500
  },
  // Removed categoryId - now handled at line item level
  paymentTypeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PaymentType',
    required: true
  },
  // Procedure items - multiple surgical categories with individual limits
  items: [procedureItemSchema],
  // Flag to indicate if limits are applied at individual category level
  limitAppliedByIndividualCategory: {
    type: Boolean,
    default: false
  },
  // Calculated total limit (sum of all line item limits)
  totalLimit: {
    type: Number,
    default: 0,
    min: 0
  },
  // Removed individual amount and currency - now calculated from items
  isActive: {
    type: Boolean,
    default: true
  },
  businessUnitId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'BusinessUnit',
    required: false  // Made optional since procedures are independent entities
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Pre-save middleware to calculate totalLimit from items
procedureSchema.pre('save', function(next) {
  // Calculate total limit as sum of all item limits
  this.totalLimit = this.items.reduce((total, item) => {
    return total + (item.limit || 0);
  }, 0);
  next();
});

// Pre-findOneAndUpdate middleware to calculate totalLimit from items
procedureSchema.pre('findOneAndUpdate', function(next) {
  const update = this.getUpdate();
  if (update.items) {
    const totalLimit = update.items.reduce((total, item) => {
      return total + (item.limit || 0);
    }, 0);
    update.totalLimit = totalLimit;
  }
  next();
});

// Unique index on procedure code
procedureSchema.index({ code: 1 }, { unique: true });

// Index for efficient queries
procedureSchema.index({ businessUnitId: 1, isActive: 1 });
procedureSchema.index({ 'items.surgicalCategoryId': 1, isActive: 1 }); // Updated index for surgical categories
procedureSchema.index({ paymentTypeId: 1, isActive: 1 });
procedureSchema.index({ code: 1, isActive: 1 });

module.exports = mongoose.model('Procedure', procedureSchema);
