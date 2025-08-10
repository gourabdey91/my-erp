const mongoose = require('mongoose');

const salesOrderSequenceSchema = new mongoose.Schema({
  businessUnit: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'BusinessUnit',
    required: true,
    unique: true
  },
  prefix: {
    type: String,
    required: true,
    default: 'CS',
    trim: true,
    uppercase: true
  },
  currentNumber: {
    type: Number,
    required: true,
    default: 10000100, // Starting from CS10000100
    min: 1
  },
  description: {
    type: String,
    default: 'Sales Order Number Sequence'
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

// Method to get next sales order number
salesOrderSequenceSchema.methods.getNextNumber = function() {
  const nextNum = this.currentNumber + 1;
  return `${this.prefix}${nextNum.toString().padStart(8, '0')}`;
};

// Method to increment and save
salesOrderSequenceSchema.methods.incrementNumber = async function() {
  this.currentNumber += 1;
  this.updatedAt = new Date();
  await this.save();
  return this.currentNumber;
};

// Static method to get or create sequence for business unit
salesOrderSequenceSchema.statics.getSequenceForBusinessUnit = async function(businessUnitId, createdBy) {
  let sequence = await this.findOne({ businessUnit: businessUnitId, isActive: true });
  
  if (!sequence) {
    sequence = new this({
      businessUnit: businessUnitId,
      createdBy: createdBy || null
    });
    await sequence.save();
  }
  
  return sequence;
};

module.exports = mongoose.model('SalesOrderSequence', salesOrderSequenceSchema);
