const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');

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
    required: false // Only required for hospital customers
  },
  consultingDoctor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Doctor'
  },
  surgicalCategory: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: false // Only required for hospital customers
  },
  procedure: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Procedure',
    required: false // Only required for hospital customers
  },
  paymentType: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PaymentType',
    required: false // Only required for hospital customers
  },
  patientName: {
    type: String,
    required: false, // Only required for hospital customers
    trim: true,
    maxLength: 100
  },
  uhid: {
    type: String,
    required: false, // Only required for hospital customers
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

// Pre-save validation for hospital customers
salesOrderSchema.pre('save', async function(next) {
  try {
    // Get customer details to check if it's a hospital
    const Hospital = require('./Hospital');
    const customer = await Hospital.findById(this.customer);
    
    if (customer && customer.customerIsHospital) {
      // For hospital customers, validate required fields
      if (!this.patientName || this.patientName.trim() === '') {
        return next(new Error('Patient name is required for hospital customers'));
      }
      // Note: Surgeon, procedure, etc. can still be optional even for hospitals
      // as per business requirements
    }
    
    next();
  } catch (error) {
    next(error);
  }
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

// Add pagination plugin
salesOrderSchema.plugin(mongoosePaginate);

module.exports = mongoose.model('SalesOrder', salesOrderSchema);
