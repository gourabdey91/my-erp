const mongoose = require('mongoose');

const companyDetailsSchema = new mongoose.Schema({
  // Basic Company Information
  companyName: {
    type: String,
    required: true,
    trim: true
  },
  legalName: {
    type: String,
    required: true,
    trim: true
  },
  
  // Address Information
  address: {
    street: {
      type: String,
      required: true,
      trim: true
    },
    city: {
      type: String,
      required: true,
      trim: true
    },
    state: {
      type: String,
      required: true,
      trim: true
    },
    pincode: {
      type: String,
      required: true,
      trim: true
    },
    country: {
      type: String,
      required: true,
      default: 'India',
      trim: true
    }
  },

  // Contact Information
  contact: {
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true
    },
    mobile1: {
      type: String,
      required: true,
      trim: true
    },
    mobile2: {
      type: String,
      trim: true
    },
    landline: {
      type: String,
      trim: true
    }
  },

  // Legal & Compliance Information
  compliance: {
    gstNumber: {
      type: String,
      required: true,
      trim: true,
      uppercase: true
    },
    stateCode: {
      type: String,
      required: true,
      trim: true
    },
    dlNumber: {
      type: String,
      required: true,
      trim: true,
      uppercase: true
    },
    panNumber: {
      type: String,
      trim: true,
      uppercase: true
    },
    cinNumber: {
      type: String,
      trim: true,
      uppercase: true
    }
  },

  // System Information
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

// Only one active company details record should exist
companyDetailsSchema.index({ isActive: 1 }, { unique: true, partialFilterExpression: { isActive: true } });

module.exports = mongoose.model('CompanyDetails', companyDetailsSchema);
