const mongoose = require('mongoose');

const procedureSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true,
    match: /^[A-Z]{3}\d{3}$/,  // Format: CRA001, MAX001, etc.
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
  categoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: true
  },
  paymentTypeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PaymentType',
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
    default: 'INR',
    enum: ['USD', 'EUR', 'GBP', 'INR', 'AUD', 'CAD']
  },
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

// Unique index on procedure code
procedureSchema.index({ code: 1 }, { unique: true });

// Index for efficient queries
procedureSchema.index({ businessUnitId: 1, isActive: 1 });
procedureSchema.index({ categoryId: 1, isActive: 1 });
procedureSchema.index({ paymentTypeId: 1, isActive: 1 });
procedureSchema.index({ code: 1, isActive: 1 });

module.exports = mongoose.model('Procedure', procedureSchema);
