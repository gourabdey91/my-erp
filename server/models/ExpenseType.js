const mongoose = require('mongoose');

const expenseTypeSchema = new mongoose.Schema({
  code: {
    type: String,
    required: [true, 'Expense type code is required'],
    trim: true,
    minlength: [3, 'Code must be at least 3 characters'],
    maxlength: [10, 'Code cannot exceed 10 characters']
  },
  name: {
    type: String,
    required: [true, 'Expense type name is required'],
    trim: true,
    minlength: [2, 'Name must be at least 2 characters'],
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  businessUnit: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'BusinessUnit',
    required: [true, 'Business unit is required'],
    index: true
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

// Compound index for business unit and code uniqueness
expenseTypeSchema.index({ businessUnit: 1, code: 1 }, { unique: true });

// Compound index for business unit and name uniqueness
expenseTypeSchema.index({ businessUnit: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('ExpenseType', expenseTypeSchema);
