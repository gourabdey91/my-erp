const mongoose = require('mongoose');

const limitSchema = new mongoose.Schema({
  paymentTypeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PaymentType',
    required: true
  },
  categoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    required: true,
    default: 'USD',
    enum: ['USD', 'EUR', 'GBP', 'INR', 'AUD', 'CAD']
  },
  description: {
    type: String,
    trim: true,
    maxLength: 500
  },
  isActive: {
    type: Boolean,
    default: true
  },
  businessUnitId: {
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
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Compound index to ensure unique combination within each business unit
limitSchema.index({ 
  paymentTypeId: 1, 
  categoryId: 1, 
  businessUnitId: 1 
}, { unique: true });

// Index for efficient queries
limitSchema.index({ businessUnitId: 1, isActive: 1 });
limitSchema.index({ categoryId: 1, isActive: 1 });
limitSchema.index({ paymentTypeId: 1, isActive: 1 });

module.exports = mongoose.model('Limit', limitSchema);
