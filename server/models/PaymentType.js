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

// Compound index to ensure unique codes within each business unit
paymentTypeSchema.index({ code: 1, businessUnitId: 1 }, { unique: true });

// Index for efficient queries
paymentTypeSchema.index({ businessUnitId: 1, isActive: 1 });

module.exports = mongoose.model('PaymentType', paymentTypeSchema);
