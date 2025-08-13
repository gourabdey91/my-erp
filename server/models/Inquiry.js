const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');

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
