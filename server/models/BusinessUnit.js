const mongoose = require('mongoose');

const businessUnitSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true
  },
  partners: [{
    type: String,
    trim: true
  }],
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Index for better performance
businessUnitSchema.index({ isActive: 1 });

const BusinessUnit = mongoose.model('BusinessUnit', businessUnitSchema);

module.exports = BusinessUnit;
