const mongoose = require('mongoose');

const inquirySchema = new mongoose.Schema({
  // Basic Information
  hospital: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Hospital',
    required: true,
    index: true
  },
  inquiryDate: {
    type: Date,
    required: true,
    index: true,
    default: Date.now
  },
  
  // Patient Information
  patientName: {
    type: String,
    required: true,
    maxlength: 80,
    trim: true,
    index: true
  },
  patientUHID: {
    type: String,
    required: true,
    maxlength: 50,
    trim: true,
    index: true
  },
  
  // Medical Information
  surgicalCategory: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category'
  },
  paymentMethod: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PaymentType'
  },
  surgicalProcedure: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Procedure'
  },
  
  // Doctor Information
  surgeon: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Doctor'
  },
  consultingDoctor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Doctor'
  },
  
  // Status and Workflow
  status: {
    type: String,
    enum: ['Pending', 'In Progress', 'Scheduled', 'Completed', 'Cancelled'],
    default: 'Pending',
    index: true
  },
  
  // Notes and Additional Information
  notes: {
    type: String,
    maxlength: 1000
  },

  // Items/Materials for the inquiry
  items: [{
    materialMaster: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MaterialMaster'
    },
    implantType: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ImplantType'
    },
    description: {
      type: String,
      maxlength: 200
    },
    quantity: {
      type: Number,
      min: 0,
      default: 1
    },
    unitPrice: {
      type: Number,
      min: 0,
      default: 0
    },
    totalAmount: {
      type: Number,
      min: 0,
      default: 0
    },
    notes: {
      type: String,
      maxlength: 300
    },
    isActive: {
      type: Boolean,
      default: true
    }
  }],

  // Calculated totals
  totalQuantity: {
    type: Number,
    min: 0,
    default: 0
  },
  totalAmount: {
    type: Number,
    min: 0,
    default: 0
  },
  
  // References to related documents
  salesOrder: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SalesOrder'
  },
  
  // Audit Fields
  isActive: {
    type: Boolean,
    default: true,
    index: true
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
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better query performance
inquirySchema.index({ hospital: 1, inquiryDate: -1 });
inquirySchema.index({ patientName: 1, patientUHID: 1 });
inquirySchema.index({ surgicalCategory: 1, status: 1 });
inquirySchema.index({ createdAt: -1 });
inquirySchema.index({ isActive: 1, status: 1 });

// Virtual for inquiry number (formatted)
inquirySchema.virtual('inquiryNumber').get(function() {
  const date = this.createdAt || new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const idStr = this._id.toString().slice(-6).toUpperCase();
  return `INQ${year}${month}${idStr}`;
});

// Pre-save middleware to update timestamp and calculate totals
inquirySchema.pre('save', function(next) {
  this.updatedAt = new Date();
  
  // Calculate totals from items
  if (this.items && this.items.length > 0) {
    let totalQuantity = 0;
    let totalAmount = 0;
    
    this.items.forEach(item => {
      if (item.isActive !== false) {
        totalQuantity += item.quantity || 0;
        
        // Calculate item total if not provided
        if (!item.totalAmount && item.quantity && item.unitPrice) {
          item.totalAmount = item.quantity * item.unitPrice;
        }
        
        totalAmount += item.totalAmount || 0;
      }
    });
    
    this.totalQuantity = totalQuantity;
    this.totalAmount = totalAmount;
  } else {
    this.totalQuantity = 0;
    this.totalAmount = 0;
  }
  
  next();
});

// Static method to get inquiry statistics
inquirySchema.statics.getStats = async function() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  
  const stats = await this.aggregate([
    {
      $match: { isActive: true }
    },
    {
      $facet: {
        total: [{ $count: 'count' }],
        today: [
          { $match: { createdAt: { $gte: today, $lt: tomorrow } } },
          { $count: 'count' }
        ],
        thisMonth: [
          { $match: { createdAt: { $gte: thisMonth } } },
          { $count: 'count' }
        ],
        byStatus: [
          { $group: { _id: '$status', count: { $sum: 1 } } }
        ],
        byHospital: [
          { $group: { _id: '$hospital', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 10 }
        ]
      }
    }
  ]);
  
  return {
    total: stats[0].total[0]?.count || 0,
    today: stats[0].today[0]?.count || 0,
    thisMonth: stats[0].thisMonth[0]?.count || 0,
    byStatus: stats[0].byStatus,
    topHospitals: stats[0].byHospital
  };
};

// Instance method to convert to sales order
inquirySchema.methods.convertToSalesOrder = function(userId) {
  // This will be implemented when we create the Sales Order module
  return {
    inquiry: this._id,
    hospital: this.hospital,
    patientName: this.patientName,
    patientUHID: this.patientUHID,
    surgicalCategory: this.surgicalCategory,
    paymentMethod: this.paymentMethod,
    surgicalProcedure: this.surgicalProcedure,
    surgeon: this.surgeon,
    consultingDoctor: this.consultingDoctor,
    createdBy: userId,
    updatedBy: userId
  };
};

const Inquiry = mongoose.model('Inquiry', inquirySchema);

module.exports = Inquiry;
