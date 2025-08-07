const mongoose = require('mongoose');

const hospitalSchema = new mongoose.Schema({
  hospitalId: {
    type: String
  },
  shortName: {
    type: String,
    required: [true, 'Short name is required'],
    trim: true,
    minlength: [2, 'Short name must be at least 2 characters'],
    maxlength: [50, 'Short name cannot exceed 50 characters']
  },
  legalName: {
    type: String,
    required: [true, 'Legal name is required'],
    trim: true,
    minlength: [2, 'Legal name must be at least 2 characters'],
    maxlength: [100, 'Legal name cannot exceed 100 characters']
  },
  address: {
    type: String,
    required: [true, 'Address is required'],
    trim: true,
    maxlength: [200, 'Address cannot exceed 200 characters']
  },
  gstNumber: {
    type: String,
    required: [true, 'GST number is required'],
    trim: true,
    uppercase: true,
    validate: {
      validator: function(v) {
        // Basic GST number format validation (15 characters)
        return /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}[Z]{1}[0-9A-Z]{1}$/.test(v);
      },
      message: 'Please enter a valid GST number'
    }
  },
  stateCode: {
    type: String,
    required: [true, 'State code is required'],
    trim: true,
    minlength: [2, 'State code must be at least 2 characters'],
    maxlength: [3, 'State code cannot exceed 3 characters']
  },
  surgicalCategories: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: true
  }],
  paymentTerms: {
    type: Number,
    required: [true, 'Payment terms is required'],
    enum: [15, 30, 45, 60, 90],
    default: 30
  },
  defaultPricing: {
    type: Boolean,
    default: false
  },
  materialAssignments: [{
    material: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MaterialMaster',
      required: true
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
    isActive: {
      type: Boolean,
      default: true
    },
    assignedAt: {
      type: Date,
      default: Date.now
    }
  }],
  businessUnit: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'BusinessUnit',
    required: [true, 'Business unit is required']
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
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Pre-save middleware to generate hospital ID
hospitalSchema.pre('save', async function(next) {
  if (this.isNew && !this.hospitalId) {
    // Since hospitals are now global master data, generate ID globally
    const lastHospital = await this.constructor
      .findOne({})  // Remove business unit filter for global ID generation
      .sort({ hospitalId: -1 })
      .select('hospitalId');
    
    let nextNumber = 1;
    if (lastHospital && lastHospital.hospitalId) {
      // Extract the numeric part (last 5 characters) and increment
      const lastNumber = parseInt(lastHospital.hospitalId.substring(1));
      if (!isNaN(lastNumber)) {
        nextNumber = lastNumber + 1;
      }
    }
    
    // Generate 5 character alphanumeric sequence (zero-padded)
    const sequence = nextNumber.toString().padStart(5, '0');
    this.hospitalId = `H${sequence}`;
  }
  next();
});

module.exports = mongoose.model('Hospital', hospitalSchema);
