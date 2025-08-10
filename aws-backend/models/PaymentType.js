const mongoose = require('mongoose');

const paymentTypeSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    trim: true,
    maxlength: 6,
    uppercase: true
  },
  description: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  canBeExceeded: {
    type: Boolean,
    default: false,
    comment: 'If checked, this payment type can exceed normal limits when posting invoices'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  businessUnitId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'BusinessUnit',
    required: false  // Made optional since payment types are independent entities
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

// Unique index to ensure globally unique codes (since payment types are independent)
paymentTypeSchema.index({ code: 1 }, { unique: true });

// Index for efficient queries (keeping this for backward compatibility)
paymentTypeSchema.index({ businessUnitId: 1, isActive: 1 });

module.exports = mongoose.model('PaymentType', paymentTypeSchema);
