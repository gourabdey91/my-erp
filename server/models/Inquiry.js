const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');

// Schema for inquiry items
const inquiryItemSchema = new mongoose.Schema({
  serialNumber: {
    type: Number,
    required: true
  },
  materialNumber: {
    type: String,
    required: true,
    trim: true
  },
  // Material description is derived from material master, not stored
  hsnCode: {
    type: String,
    required: true,
    trim: true
  },
  unitRate: {
    type: Number,
    required: true,
    min: 0,
    set: v => Math.round(v * 100) / 100 // Round to 2 decimal places
  },
  gstPercentage: {
    type: Number,
    required: true,
    min: 0,
    max: 100,
    set: v => Math.round(v * 100) / 100 // Round to 2 decimal places
  },
  quantity: {
    type: Number,
    required: true,
    min: 0.01,
    set: v => Math.round(v * 100) / 100 // Round to 2 decimal places
  },
  unit: {
    type: String,
    required: true,
    trim: true
  },
  discountPercentage: {
    type: Number,
    default: 0,
    min: 0,
    max: 100,
    set: v => Math.round(v * 100) / 100 // Round to 2 decimal places
  },
  discountAmount: {
    type: Number,
    default: 0,
    min: 0,
    set: v => Math.round(v * 100) / 100 // Round to 2 decimal places
  },
  totalAmount: {
    type: Number,
    required: true,
    min: 0,
    set: v => Math.round(v * 100) / 100 // Round to 2 decimal places
  },
  currency: {
    type: String,
    required: true,
    default: 'INR'
  }
}, {
  _id: true,
  timestamps: false
});

const inquirySchema = new mongoose.Schema({
  inquiryNumber: {
    type: String,
    unique: true,
    index: true
  },
  inquiryDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  patientName: {
    type: String,
    required: true,
    maxlength: 80,
    trim: true
  },
  patientUHID: {
    type: String,
    required: true,
    maxlength: 50,
    trim: true
  },
  hospital: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Hospital',
    required: true
  },
  surgicalCategory: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: true
  },
  surgicalProcedure: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Procedure'
    // Note: Optional field, not required
  },
  paymentMethod: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PaymentType',
    required: true
  },
  limit: {
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
    }
  },
  items: [inquiryItemSchema],
  totalInquiryAmount: {
    type: Number,
    default: 0,
    min: 0,
    set: v => Math.round(v * 100) / 100 // Round to 2 decimal places
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
    ref: 'User'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Index for better query performance
inquirySchema.index({ hospital: 1, inquiryDate: -1 });
inquirySchema.index({ patientUHID: 1 });
inquirySchema.index({ isActive: 1 });

// Add pagination plugin
inquirySchema.plugin(mongoosePaginate);

// Helper method to calculate item total amount
inquiryItemSchema.methods.calculateTotal = function() {
  const baseAmount = this.unitRate * this.quantity;
  const gstAmount = (baseAmount * this.gstPercentage) / 100;
  const discountAmount = this.discountAmount || ((baseAmount * this.discountPercentage) / 100);
  
  const totalAmount = baseAmount + gstAmount - discountAmount;
  return Math.round(totalAmount * 100) / 100;
};

// Helper method to calculate inquiry total
inquirySchema.methods.calculateInquiryTotal = function() {
  const total = this.items.reduce((sum, item) => sum + item.totalAmount, 0);
  return Math.round(total * 100) / 100;
};

// Pre-save hook for items to calculate totals
inquirySchema.pre('save', function(next) {
  // Calculate total for each item
  this.items.forEach(item => {
    item.totalAmount = item.calculateTotal();
  });
  
  // Calculate total inquiry amount
  this.totalInquiryAmount = this.calculateInquiryTotal();
  
  next();
});

// Pre-save hook to generate inquiry number
inquirySchema.pre('save', async function(next) {
  if (this.isNew && !this.inquiryNumber) {
    try {
      const counter = await mongoose.model('InquirySequence').findOneAndUpdate(
        { _id: 'inquiryNumber' },
        { $inc: { seq: 1 } },
        { new: true, upsert: true }
      );
      this.inquiryNumber = `INCS${counter.seq.toString().padStart(8, '0')}`;
    } catch (error) {
      console.error('Error generating inquiry number:', error);
      next(error);
    }
  }
  next();
});

// Create sequence model for inquiry numbers
const inquirySequenceSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  seq: { type: Number, default: 10000000 }
});

const InquirySequence = mongoose.model('InquirySequence', inquirySequenceSchema);

module.exports = mongoose.model('Inquiry', inquirySchema);
