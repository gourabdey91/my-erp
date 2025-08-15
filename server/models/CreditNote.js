const mongoose = require('mongoose');

// Schema for credit note items (category-wise breakdown)
const creditNoteItemSchema = new mongoose.Schema({
  surgicalCategory: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: [true, 'Surgical category is required for item']
  },
  percentage: {
    type: Number,
    min: [0, 'Item percentage cannot be negative'],
    max: [100, 'Item percentage cannot exceed 100'],
    validate: {
      validator: function(v) {
        if (v === null || v === undefined) return true; // Allow null/undefined
        return /^\d+(\.\d{1,2})?$/.test(v.toString());
      },
      message: 'Item percentage can have maximum 2 decimal places'
    }
  },
  amount: {
    type: Number,
    min: [0, 'Item amount cannot be negative'],
    validate: {
      validator: function(v) {
        if (v === null || v === undefined) return true; // Allow null/undefined
        return /^\d+(\.\d{1,2})?$/.test(v.toString());
      },
      message: 'Item amount can have maximum 2 decimal places'
    }
  }
}, {
  _id: true,
  timestamps: false
});

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
  procedure: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Procedure',
    required: false // Optional for specific procedures like "Dura Supreme"
  },
  
  // Header level percentage or amount (when not split category wise)
  percentage: {
    type: Number,
    min: [0, 'Percentage cannot be negative'],
    max: [100, 'Percentage cannot exceed 100'],
    validate: {
      validator: function(v) {
        if (v === null || v === undefined) return true; // Allow null/undefined
        return /^\d+(\.\d{1,2})?$/.test(v.toString());
      },
      message: 'Percentage can have maximum 2 decimal places'
    }
  },
  amount: {
    type: Number,
    min: [0, 'Amount cannot be negative'],
    validate: {
      validator: function(v) {
        if (v === null || v === undefined) return true; // Allow null/undefined
        return /^\d+(\.\d{1,2})?$/.test(v.toString());
      },
      message: 'Amount can have maximum 2 decimal places'
    }
  },

  // Flag to determine if credit note is split category wise
  splitCategoryWise: {
    type: Boolean,
    default: false
  },

  // Items array (used when splitCategoryWise is true)
  items: [creditNoteItemSchema],
  
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
      if (this.splitCategoryWise && this.items?.length > 0) priority += 50; // Category-wise split has higher priority
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

// Validation: Either header level percentage/amount OR category-wise items (not both)
creditNoteSchema.pre('save', function(next) {
  const hasHeaderPercentage = this.percentage !== null && this.percentage !== undefined;
  const hasHeaderAmount = this.amount !== null && this.amount !== undefined;
  const hasItems = this.splitCategoryWise && this.items && this.items.length > 0;

  // Validation 1: Either percentage or amount at header level (not both)
  if (hasHeaderPercentage && hasHeaderAmount) {
    return next(new Error('Cannot specify both percentage and amount at header level'));
  }

  // Validation 2: If splitCategoryWise is true, must have items
  if (this.splitCategoryWise && (!this.items || this.items.length === 0)) {
    return next(new Error('Items are required when splitCategoryWise is true'));
  }

  // Validation 3: If not splitCategoryWise, must have either header percentage or amount
  if (!this.splitCategoryWise && !hasHeaderPercentage && !hasHeaderAmount) {
    return next(new Error('Either percentage or amount is required at header level when not splitting category wise'));
  }

  // Validation 4: If splitCategoryWise, validate items
  if (this.splitCategoryWise && this.items) {
    for (let item of this.items) {
      const hasItemPercentage = item.percentage !== null && item.percentage !== undefined;
      const hasItemAmount = item.amount !== null && item.amount !== undefined;
      
      if (hasItemPercentage && hasItemAmount) {
        return next(new Error('Cannot specify both percentage and amount at item level'));
      }
      
      if (!hasItemPercentage && !hasItemAmount) {
        return next(new Error('Either percentage or amount is required for each item'));
      }
    }
  }

  next();
});

// Index for efficient querying by date range and active status
creditNoteSchema.index({ hospital: 1, isActive: 1, validityFrom: 1, validityTo: 1 });
creditNoteSchema.index({ businessUnit: 1, isActive: 1 });
creditNoteSchema.index({ priority: -1 }); // For priority-based matching

// Index for finding applicable credit notes (updated for new structure)
creditNoteSchema.index({ 
  hospital: 1, 
  paymentType: 1, 
  procedure: 1,
  splitCategoryWise: 1,
  isActive: 1 
});

// Index for category-wise items
creditNoteSchema.index({ 
  'items.surgicalCategory': 1,
  hospital: 1,
  isActive: 1
});

module.exports = mongoose.model('CreditNote', creditNoteSchema);
