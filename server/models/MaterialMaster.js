const mongoose = require('mongoose');

const materialMasterSchema = new mongoose.Schema({
  materialNumber: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    maxLength: 20,
    index: true
  },
  description: {
    type: String,
    required: true,
    trim: true,
    maxLength: 100
  },
  hsnCode: {
    type: String,
    required: true,
    trim: true,
    maxLength: 15
  },
  gstPercentage: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },
  currency: {
    type: String,
    required: true,
    default: 'INR',
    enum: ['INR', 'USD', 'EUR', 'GBP']
  },
  mrp: {
    type: Number,
    required: true,
    min: 0
  },
  institutionalPrice: {
    type: Number,
    required: true,
    min: 0
  },
  distributionPrice: {
    type: Number,
    required: true,
    min: 0
  },
  surgicalCategory: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: true
  },
  implantType: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ImplantType',
    required: true
  },
  subCategory: {
    type: String,
    required: true,
    trim: true
  },
  lengthMm: {
    type: Number,
    required: false,
    min: 0
  },
  unit: {
    type: String,
    required: true,
    trim: true,
    maxLength: 10,
    default: 'NOS'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt field on save
materialMasterSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Indexes for efficient queries
materialMasterSchema.index({ materialNumber: 1 });
materialMasterSchema.index({ description: 1 });
materialMasterSchema.index({ surgicalCategory: 1 });
materialMasterSchema.index({ implantType: 1 });
materialMasterSchema.index({ isActive: 1 });
materialMasterSchema.index({ materialNumber: 'text', description: 'text' });

const MaterialMaster = mongoose.model('MaterialMaster', materialMasterSchema);

module.exports = MaterialMaster;
