const mongoose = require('mongoose');

const deliveryChallanDetailsSchema = new mongoose.Schema({
  challanId: {
    type: String
  },
  deliveryChallanNumber: {
    type: String,
    required: [true, 'Delivery challan number is required'],
    trim: true,
    maxlength: [50, 'Delivery challan number cannot exceed 50 characters']
  },
  hospital: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Hospital',
    required: [true, 'Hospital is required']
  },
  challanDate: {
    type: Date,
    required: false
  },
  salesOrderNumber: {
    type: String,
    required: false,
    trim: true,
    maxlength: [10, 'Sales order number cannot exceed 10 characters']
  },
  consumedIndicator: {
    type: Boolean,
    default: false
  },
  businessUnit: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'BusinessUnit',
    required: false  // Will be derived from hospital
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

// Pre-save middleware to generate challan ID and set business unit from hospital
deliveryChallanDetailsSchema.pre('save', async function(next) {
  try {
    // Set business unit from hospital if not already set
    if (!this.businessUnit && this.hospital) {
      const Hospital = require('./Hospital');
      const hospital = await Hospital.findById(this.hospital).select('businessUnit');
      if (hospital && hospital.businessUnit) {
        this.businessUnit = hospital.businessUnit;
      }
    }

    // Generate challan ID if new document
    if (this.isNew && !this.challanId) {
      const lastChallan = await this.constructor
        .findOne({ businessUnit: this.businessUnit })
        .sort({ challanId: -1 })
        .select('challanId');
      
      let nextNumber = 1;
      if (lastChallan && lastChallan.challanId) {
        // Extract the numeric part (last 5 characters) and increment
        const lastNumber = parseInt(lastChallan.challanId.substring(2));
        if (!isNaN(lastNumber)) {
          nextNumber = lastNumber + 1;
        }
      }
      
      // Generate 5 character alphanumeric sequence (zero-padded)
      const sequence = nextNumber.toString().padStart(5, '0');
      this.challanId = `DC${sequence}`;
    }
    
    next();
  } catch (error) {
    next(error);
  }
});

module.exports = mongoose.model('DeliveryChallanDetails', deliveryChallanDetailsSchema);
