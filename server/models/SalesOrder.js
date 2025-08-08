const mongoose = require('mongoose');

const salesOrderSchema = new mongoose.Schema({
  salesOrderNumber: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  documentDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Hospital',
    required: true
  },
  surgeon: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Doctor',
    required: true
  },
  consultingDoctor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Doctor'
  },
  surgicalCategory: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: true
  },
  procedure: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Procedure',
    required: true
  },
  patientName: {
    type: String,
    required: true,
    trim: true,
    maxLength: 100
  },
  uhid: {
    type: String,
    required: true,
    trim: true,
    maxLength: 50
  },
  patientSalutation: {
    type: String,
    enum: ['Mr.', 'Mrs.', 'Miss', 'Dr.', 'Master']
  },
  status: {
    type: String,
    enum: ['DRAFT', 'CONFIRMED', 'DELIVERED', 'CANCELLED'],
    default: 'DRAFT'
  },
  notes: {
    type: String,
    trim: true,
    maxLength: 500
  },
  isActive: {
    type: Boolean,
    default: true
  },
  businessUnit: {
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
    ref: 'User'
  }
}, {
  timestamps: true
});

// Indexes
salesOrderSchema.index({ salesOrderNumber: 1 });
salesOrderSchema.index({ documentDate: -1 });
salesOrderSchema.index({ customer: 1 });
salesOrderSchema.index({ surgeon: 1 });
salesOrderSchema.index({ status: 1 });
salesOrderSchema.index({ businessUnit: 1 });
salesOrderSchema.index({ isActive: 1 });

// Text search index
salesOrderSchema.index({
  salesOrderNumber: 'text',
  patientName: 'text',
  uhid: 'text'
});

module.exports = mongoose.model('SalesOrder', salesOrderSchema);
