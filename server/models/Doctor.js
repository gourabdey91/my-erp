const mongoose = require('mongoose');

const doctorSchema = new mongoose.Schema({
  doctorId: {
    type: String
  },
  name: {
    type: String,
    required: [true, 'Doctor name is required'],
    trim: true,
    minlength: [2, 'Name must be at least 2 characters'],
    maxlength: [50, 'Name cannot exceed 50 characters']
  },
  surgicalCategories: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: true
  }],
  phoneNumber: {
    type: String,
    required: false,
    trim: true,
    validate: {
      validator: function(v) {
        // Only validate if value is provided
        return !v || /^\+?[\d\s\-\(\)]{10,15}$/.test(v);
      },
      message: 'Please enter a valid phone number'
    }
  },
  email: {
    type: String,
    required: false,
    trim: true,
    lowercase: true,
    validate: {
      validator: function(v) {
        // Only validate if value is provided
        return !v || /^[\w\.-]+@[\w\.-]+\.\w+$/.test(v);
      },
      message: 'Please enter a valid email address'
    }
  },
  consultingDoctor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Doctor',
    required: false
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

// Remove all schema-level indexes - we'll rely on manually created ones

// Pre-save middleware to generate doctor ID
doctorSchema.pre('save', async function(next) {
  if (this.isNew && !this.doctorId) {
    const lastDoctor = await this.constructor
      .findOne({})
      .sort({ doctorId: -1 })
      .select('doctorId');
    
    let nextNumber = 1;
    if (lastDoctor && lastDoctor.doctorId) {
      // Extract the numeric part (last 5 characters) and increment
      const lastNumber = parseInt(lastDoctor.doctorId.substring(1));
      if (!isNaN(lastNumber)) {
        nextNumber = lastNumber + 1;
      }
    }
    
    // Generate 5 character alphanumeric sequence (zero-padded)
    const sequence = nextNumber.toString().padStart(5, '0');
    this.doctorId = `D${sequence}`;
  }
  next();
});

module.exports = mongoose.model('Doctor', doctorSchema);
