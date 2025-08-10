const mongoose = require('mongoose');

const creditNoteSchema = new mongoose.Schema({
  hospital: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Hospital',
    required: [true, 'Hospital is required']
  },
  paymentType: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PaymentType',
    required: false // Make optional for "all payment types" scenarios
  },
  surgicalCategory: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: false // Make optional for "all categories" scenarios
  },
  procedure: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Procedure',
    required: false // Optional for specific procedures like "Dura Supreme"
  },
  percentage: {
    type: Number,
    required: [true, 'Percentage is required'],
    min: [0, 'Percentage cannot be negative'],
    max: [100, 'Percentage cannot exceed 100'],
    validate: {
      validator: function(v) {
        // Allow up to 2 decimal places
        return /^\d+(\.\d{1,2})?$/.test(v.toString());
      },
      message: 'Percentage can have maximum 2 decimal places'
    }
  },
  validityFrom: {
    type: Date,
    required: [true, 'Validity from date is required']
  },
  validityTo: {
    type: Date,
    required: [true, 'Validity to date is required'],
    validate: {
      validator: function(v) {
        return v > this.validityFrom;
      },
      message: 'Validity to date must be after validity from date'
    }
  },
  description: {
    type: String,
    trim: true,
    maxlength: [200, 'Description cannot exceed 200 characters']
  },
  // Priority field to handle overlapping rules (higher priority = more specific)
  priority: {
    type: Number,
    default: function() {
      let priority = 0;
      if (this.procedure) priority += 100; // Specific procedure has highest priority
      if (this.surgicalCategory) priority += 10; // Specific category has medium priority
      if (this.paymentType) priority += 1; // Specific payment type has lowest priority
      return priority;
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  businessUnit: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'BusinessUnit',
    required: [true, 'Business unit is required']
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Created by is required']
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Updated by is required']
  }
}, {
  timestamps: true
});

// Index for efficient querying by date range and active status
creditNoteSchema.index({ hospital: 1, isActive: 1, validityFrom: 1, validityTo: 1 });
creditNoteSchema.index({ businessUnit: 1, isActive: 1 });
creditNoteSchema.index({ priority: -1 }); // For priority-based matching

// Index for finding applicable credit notes
creditNoteSchema.index({ 
  hospital: 1, 
  paymentType: 1, 
  surgicalCategory: 1, 
  procedure: 1, 
  isActive: 1 
});

module.exports = mongoose.model('CreditNote', creditNoteSchema);
