const mongoose = require('mongoose');

const doctorAssignmentSchema = new mongoose.Schema({
  hospital: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Hospital',
    required: [true, 'Hospital is required']
  },
  doctor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Doctor',
    required: [true, 'Doctor is required']
  },
  expenseType: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ExpenseType',
    required: [true, 'Expense type is required'] // Clinical Charges - hardcoded
  },
  paymentType: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PaymentType',
    required: false // Optional for "all payment types" scenarios
  },
  surgicalCategory: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: false // Optional for "all categories" scenarios
  },
  procedure: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Procedure',
    required: false // Optional for specific procedures
  },
  // Clinical charges can be percentage or fixed amount
  chargeType: {
    type: String,
    enum: ['percentage', 'fixed'],
    required: false // Not mandatory
  },
  chargeValue: {
    type: Number,
    required: false, // Not mandatory
    min: [0, 'Charge value cannot be negative'],
    validate: {
      validator: function(v) {
        if (v === undefined || v === null) return true; // Allow empty
        if (this.chargeType === 'percentage') {
          return v >= 0 && v <= 100;
        }
        return v >= 0; // Fixed amount can be any positive number
      },
      message: function(props) {
        if (this.chargeType === 'percentage') {
          return 'Percentage must be between 0 and 100';
        }
        return 'Charge value must be positive';
      }
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
doctorAssignmentSchema.index({ hospital: 1, isActive: 1, validityFrom: 1, validityTo: 1 });
doctorAssignmentSchema.index({ businessUnit: 1, isActive: 1 });
doctorAssignmentSchema.index({ doctor: 1, isActive: 1 });
doctorAssignmentSchema.index({ priority: -1 }); // For priority-based matching

// Index for finding applicable doctor assignments
doctorAssignmentSchema.index({ 
  hospital: 1, 
  doctor: 1,
  paymentType: 1, 
  surgicalCategory: 1, 
  procedure: 1, 
  isActive: 1 
});

module.exports = mongoose.model('DoctorAssignment', doctorAssignmentSchema);
