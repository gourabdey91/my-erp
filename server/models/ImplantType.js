const mongoose = require('mongoose');

const implantSubcategorySchema = new mongoose.Schema({
  subCategory: {
    type: String,
    required: true,
    trim: true
  },
  length: {
    type: Number,
    required: true,
    min: 0
  },
  surgicalCategory: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, { _id: true });

const implantTypeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxLength: 100
  },
  subcategories: [implantSubcategorySchema],
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
implantTypeSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Index for efficient queries
implantTypeSchema.index({ name: 1 });
implantTypeSchema.index({ isActive: 1 });

const ImplantType = mongoose.model('ImplantType', implantTypeSchema);

module.exports = ImplantType;
