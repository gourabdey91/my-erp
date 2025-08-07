const mongoose = require('mongoose');

const expenseTypeAssignmentSchema = new mongoose.Schema({
  hospital: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Hospital',
    required: true
  },
  expenseType: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ExpenseType',
    required: true
  },
  value: {
    type: Number,
    required: true,
    min: 0
  },
  valueType: {
    type: String,
    enum: ['amount', 'percentage'],
    required: true,
    default: 'amount'
  },
  taxBasis: {
    type: String,
    enum: ['pre-gst', 'post-gst'],
    required: function() {
      return this.valueType === 'percentage';
    }
  },
  paymentType: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PaymentType',
    required: false
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: false
  },
  procedure: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Procedure',
    required: false
  },
  validityFrom: {
    type: Date,
    required: true
  },
  validityTo: {
    type: Date,
    required: true
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
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('ExpenseTypeAssignment', expenseTypeAssignmentSchema);
