const mongoose = require('mongoose');

const numberRangeSchema = new mongoose.Schema({
  businessUnit: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'BusinessUnit',
    required: [true, 'Business unit is required']
  },
  documentType: {
    type: String,
    required: [true, 'Document type is required'],
    enum: ['Inquiry', 'SalesOrder', 'Billing', 'CreditNote', 'PurchaseOrder', 'Invoice']
  },
  prefix: {
    type: String,
    required: [true, 'Prefix is required'],
    trim: true,
    uppercase: true,
    maxlength: 10,
    validate: {
      validator: function(v) {
        return /^[A-Z0-9]+$/.test(v);
      },
      message: 'Prefix must contain only uppercase letters and numbers'
    }
  },
  currentNumber: {
    type: Number,
    required: [true, 'Current number is required'],
    min: [0, 'Current number cannot be negative'],
    default: 0
  },
  paddingLength: {
    type: Number,
    required: true,
    default: 8,
    min: [1, 'Padding length must be at least 1'],
    max: [20, 'Padding length cannot exceed 20'],
    description: 'Number of digits to pad with zeros (e.g., 8 for 00000001)'
  },
  startingNumber: {
    type: Number,
    required: true,
    default: 0,
    description: 'Initial number set (for audit trail)'
  },
  description: {
    type: String,
    default: '',
    maxlength: 200
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
  timestamps: true
});

// Unique index: one active range per business unit and document type
numberRangeSchema.index({ businessUnit: 1, documentType: 1, isActive: 1 }, { unique: true, sparse: true });

// Method to get next number in formatted string (e.g., EST00000001)
numberRangeSchema.methods.getNextNumber = function() {
  const nextNum = this.currentNumber + 1;
  const paddedNumber = nextNum.toString().padStart(this.paddingLength, '0');
  return `${this.prefix}${paddedNumber}`;
};

// Method to get the current formatted number
numberRangeSchema.methods.getCurrentNumber = function() {
  const paddedNumber = this.currentNumber.toString().padStart(this.paddingLength, '0');
  return `${this.prefix}${paddedNumber}`;
};

// Method to increment and save
numberRangeSchema.methods.incrementNumber = async function() {
  this.currentNumber += 1;
  this.updatedAt = new Date();
  await this.save();
  return this.currentNumber;
};

// Method to set manual number (for offline record catch-up)
numberRangeSchema.methods.setCurrentNumber = async function(newNumber, updatedBy) {
  if (newNumber < 0) {
    throw new Error('Number cannot be negative');
  }
  this.currentNumber = newNumber;
  this.updatedBy = updatedBy;
  this.updatedAt = new Date();
  await this.save();
  return this.currentNumber;
};

// Static method to get or create range for business unit and document type
numberRangeSchema.statics.getOrCreateRange = async function(businessUnitId, documentType, createdBy) {
  let range = await this.findOne({ 
    businessUnit: businessUnitId, 
    documentType: documentType,
    isActive: true 
  });
  
  if (!range) {
    // Define defaults for each document type
    const defaults = {
      'Inquiry': { prefix: 'EST', paddingLength: 8, startingNumber: 11009 },
      'SalesOrder': { prefix: 'CS', paddingLength: 8, startingNumber: 10000000 },
      'Billing': { prefix: 'CINV', paddingLength: 6, startingNumber: 100000 },
      'CreditNote': { prefix: 'CN', paddingLength: 7, startingNumber: 1000000 },
      'PurchaseOrder': { prefix: 'PO', paddingLength: 8, startingNumber: 5000000 },
      'Invoice': { prefix: 'INV', paddingLength: 8, startingNumber: 1000000 }
    };

    const config = defaults[documentType] || { prefix: documentType.substring(0, 3).toUpperCase(), paddingLength: 8, startingNumber: 0 };

    range = new this({
      businessUnit: businessUnitId,
      documentType: documentType,
      prefix: config.prefix,
      paddingLength: config.paddingLength,
      currentNumber: config.startingNumber,
      startingNumber: config.startingNumber,
      description: `Auto-created range for ${documentType}`,
      createdBy: createdBy || null
    });
    await range.save();
  }
  
  return range;
};

// Static method to get next number for a document type (atomic operation)
numberRangeSchema.statics.getNextNumberForType = async function(businessUnitId, documentType, createdBy) {
  // Use atomic findOneAndUpdate to prevent race conditions
  const range = await this.findOneAndUpdate(
    { businessUnit: businessUnitId, documentType: documentType, isActive: true },
    { $inc: { currentNumber: 1 } },
    { new: true, upsert: false }
  );

  if (!range) {
    // Range doesn't exist, create it
    const newRange = await this.getOrCreateRange(businessUnitId, documentType, createdBy);
    const nextNumber = newRange.getNextNumber();
    await newRange.incrementNumber();
    return nextNumber;
  }

  // Format the number with the incremented value
  const paddedNumber = range.currentNumber.toString().padStart(range.paddingLength, '0');
  return `${range.prefix}${paddedNumber}`;
};

module.exports = mongoose.model('NumberRange', numberRangeSchema);
