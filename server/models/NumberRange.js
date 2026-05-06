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
    enum: ['Inquiry', 'SalesOrder', 'Billing', 'CreditNote', 'PurchaseOrder', 'Invoice', 'Procedure']
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
      'Invoice': { prefix: 'INV', paddingLength: 8, startingNumber: 1000000 },
      'Procedure': { prefix: 'PRO', paddingLength: 5, startingNumber: 1 }
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
  // First, try to get the existing range
  let range = await this.findOne({ 
    businessUnit: businessUnitId, 
    documentType: documentType,
    isActive: true 
  });

  // Define defaults for document types
  const defaults = {
    'Inquiry': { prefix: 'EST', paddingLength: 8, startingNumber: 11009 },
    'SalesOrder': { prefix: 'CS', paddingLength: 8, startingNumber: 10000000 },
    'Billing': { prefix: 'CINV', paddingLength: 6, startingNumber: 100000 },
    'CreditNote': { prefix: 'CN', paddingLength: 7, startingNumber: 1000000 },
    'PurchaseOrder': { prefix: 'PO', paddingLength: 8, startingNumber: 5000000 },
    'Invoice': { prefix: 'INV', paddingLength: 8, startingNumber: 1000000 },
    'Procedure': { prefix: 'PRO', paddingLength: 5, startingNumber: 1 }
  };
  const typeDefaults = defaults[documentType] || { prefix: documentType.substring(0, 3).toUpperCase(), paddingLength: 8, startingNumber: 0 };

  if (range) {
    // If startingNumber is not set (old records), set it from defaults
    if (!range.startingNumber || range.startingNumber === 0) {
      console.log(`⚠️ NumberRange ${documentType} has no startingNumber. Setting to ${typeDefaults.startingNumber}`);
      range.startingNumber = typeDefaults.startingNumber;
    }
    
    // If range exists and currentNumber < startingNumber, reset it to startingNumber
    if (range.currentNumber < range.startingNumber) {
      console.log(`🔄 Resetting NumberRange ${documentType} from ${range.currentNumber} to ${range.startingNumber}`);
      range.currentNumber = range.startingNumber;
      await range.save();
    }
  }

  // Use atomic findOneAndUpdate to increment, with reset logic built-in
  const updatedRange = await this.findOneAndUpdate(
    { businessUnit: businessUnitId, documentType: documentType, isActive: true },
    [
      {
        $set: {
          // If startingNumber is missing or 0, set it from defaults
          startingNumber: { $cond: [{ $or: [{ $not: '$startingNumber' }, { $eq: ['$startingNumber', 0] }] }, typeDefaults.startingNumber, '$startingNumber'] },
          // If currentNumber < startingNumber, reset to startingNumber before incrementing
          currentNumber: { 
            $cond: [
              { $lt: ['$currentNumber', { $cond: [{ $or: [{ $not: '$startingNumber' }, { $eq: ['$startingNumber', 0] }] }, typeDefaults.startingNumber, '$startingNumber'] }] },
              { $add: [{ $cond: [{ $or: [{ $not: '$startingNumber' }, { $eq: ['$startingNumber', 0] }] }, typeDefaults.startingNumber, '$startingNumber'] }, 1] },
              { $add: ['$currentNumber', 1] }
            ]
          },
          updatedAt: new Date()
        }
      }
    ],
    { new: true }
  );

  if (!updatedRange) {
    // Range doesn't exist, create it
    const newRange = await this.getOrCreateRange(businessUnitId, documentType, createdBy);
    const nextNumber = newRange.getNextNumber();
    await newRange.incrementNumber();
    return nextNumber;
  }

  // Format the number with the incremented value
  const paddedNumber = updatedRange.currentNumber.toString().padStart(updatedRange.paddingLength, '0');
  console.log(`✅ Generated ${documentType} number: ${updatedRange.prefix}${paddedNumber} (current: ${updatedRange.currentNumber})`);
  return `${updatedRange.prefix}${paddedNumber}`;
};

module.exports = mongoose.model('NumberRange', numberRangeSchema);
