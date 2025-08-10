const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    uppercase: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  businessUnitId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'BusinessUnit',
    required: false  // Surgical categories are global, not business unit specific
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
  timestamps: true
});

// Index for faster queries
categorySchema.index({ code: 1 });
categorySchema.index({ isActive: 1 });
categorySchema.index({ businessUnitId: 1, isActive: 1 }, { sparse: true }); // Sparse index for optional businessUnitId

module.exports = mongoose.model('Category', categorySchema);
