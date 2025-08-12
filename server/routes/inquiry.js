const express = require('express');
const Inquiry = require('../models/Inquiry');
const Hospital = require('../models/Hospital');
const Category = require('../models/Category');
const PaymentType = require('../models/PaymentType');
const Procedure = require('../models/Procedure');
const Doctor = require('../models/Doctor');
const MaterialMaster = require('../models/MaterialMaster');
const ImplantType = require('../models/ImplantType');
const DoctorAssignment = require('../models/DoctorAssignment');

const router = express.Router();

// Get all inquiries with pagination and filters
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    // Build filter object
    const filter = { isActive: true };
    
    if (req.query.hospital) {
      filter.hospital = req.query.hospital;
    }
    
    if (req.query.surgicalCategory) {
      filter.surgicalCategory = req.query.surgicalCategory;
    }
    
    if (req.query.paymentMethod) {
      filter.paymentMethod = req.query.paymentMethod;
    }
    
    if (req.query.status) {
      filter.status = req.query.status;
    }
    
    if (req.query.dateFrom || req.query.dateTo) {
      filter.inquiryDate = {};
      if (req.query.dateFrom) {
        filter.inquiryDate.$gte = new Date(req.query.dateFrom);
      }
      if (req.query.dateTo) {
        const dateTo = new Date(req.query.dateTo);
        dateTo.setHours(23, 59, 59, 999); // End of day
        filter.inquiryDate.$lte = dateTo;
      }
    }

    // Execute query with population
    const inquiries = await Inquiry.find(filter)
      .populate('hospital', 'name shortName')
      .populate('surgicalCategory', 'description')
      .populate('paymentMethod', 'description')
      .populate('surgicalProcedure', 'name')
      .populate('surgeon', 'name specialization')
      .populate('consultingDoctor', 'name specialization')
      .populate('createdBy', 'name')
      .populate('updatedBy', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Get total count for pagination
    const total = await Inquiry.countDocuments(filter);
    const totalPages = Math.ceil(total / limit);

    res.json({
      success: true,
      data: inquiries,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });

  } catch (error) {
    console.error('Error fetching inquiries:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching inquiries',
      error: error.message
    });
  }
});

// Get inquiry by ID
router.get('/:id', async (req, res) => {
  try {
    const inquiry = await Inquiry.findOne({ _id: req.params.id, isActive: true })
      .populate('hospital', 'name shortName address contactPerson contactNumber')
      .populate('surgicalCategory', 'description')
      .populate('paymentMethod', 'description')
      .populate('surgicalProcedure', 'name description')
      .populate('surgeon', 'name specialization contactNumber')
      .populate('consultingDoctor', 'name specialization contactNumber')
      .populate('createdBy', 'name')
      .populate('updatedBy', 'name');

    if (!inquiry) {
      return res.status(404).json({
        success: false,
        message: 'Inquiry not found'
      });
    }

    res.json({
      success: true,
      data: inquiry
    });

  } catch (error) {
    console.error('Error fetching inquiry:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching inquiry',
      error: error.message
    });
  }
});

// Create new inquiry
router.post('/', async (req, res) => {
  try {
    const {
      hospital,
      inquiryDate,
      patientName,
      patientUHID,
      surgicalCategory,
      paymentMethod,
      surgicalProcedure,
      surgeon,
      consultingDoctor,
      notes,
      createdBy,
      updatedBy
    } = req.body;

    // Validate required fields
    if (!hospital) {
      return res.status(400).json({
        success: false,
        message: 'Hospital is required'
      });
    }

    if (!patientName || !patientUHID) {
      return res.status(400).json({
        success: false,
        message: 'Patient name and UHID are required'
      });
    }

    // Check if hospital exists
    const hospitalExists = await Hospital.findOne({ _id: hospital, isActive: true });
    if (!hospitalExists) {
      return res.status(400).json({
        success: false,
        message: 'Invalid hospital selected'
      });
    }

    // Check for duplicate UHID for the same hospital
    const existingInquiry = await Inquiry.findOne({
      hospital,
      patientUHID,
      isActive: true
    });

    if (existingInquiry) {
      return res.status(400).json({
        success: false,
        message: 'An inquiry already exists for this patient UHID at this hospital'
      });
    }

    // Create new inquiry
    const inquiry = new Inquiry({
      hospital,
      inquiryDate: inquiryDate || new Date(),
      patientName: patientName.trim(),
      patientUHID: patientUHID.trim(),
      surgicalCategory: surgicalCategory || undefined,
      paymentMethod: paymentMethod || undefined,
      surgicalProcedure: surgicalProcedure || undefined,
      surgeon: surgeon || undefined,
      consultingDoctor: consultingDoctor || undefined,
      notes: notes?.trim() || undefined,
      createdBy,
      updatedBy
    });

    await inquiry.save();

    // Populate and return the created inquiry
    const populatedInquiry = await Inquiry.findById(inquiry._id)
      .populate('hospital', 'name shortName')
      .populate('surgicalCategory', 'description')
      .populate('paymentMethod', 'description')
      .populate('surgicalProcedure', 'name')
      .populate('surgeon', 'name')
      .populate('consultingDoctor', 'name');

    res.status(201).json({
      success: true,
      message: 'Inquiry created successfully',
      data: populatedInquiry
    });

  } catch (error) {
    console.error('Error creating inquiry:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating inquiry',
      error: error.message
    });
  }
});

// Update inquiry
router.put('/:id', async (req, res) => {
  try {
    const {
      hospital,
      inquiryDate,
      patientName,
      patientUHID,
      surgicalCategory,
      paymentMethod,
      surgicalProcedure,
      surgeon,
      consultingDoctor,
      notes,
      status,
      updatedBy
    } = req.body;

    const inquiry = await Inquiry.findOne({ _id: req.params.id, isActive: true });
    if (!inquiry) {
      return res.status(404).json({
        success: false,
        message: 'Inquiry not found'
      });
    }

    // Check for duplicate UHID if changed
    if (patientUHID && (patientUHID !== inquiry.patientUHID || hospital !== inquiry.hospital.toString())) {
      const existingInquiry = await Inquiry.findOne({
        _id: { $ne: req.params.id },
        hospital: hospital || inquiry.hospital,
        patientUHID,
        isActive: true
      });

      if (existingInquiry) {
        return res.status(400).json({
          success: false,
          message: 'An inquiry already exists for this patient UHID at this hospital'
        });
      }
    }

    // Update fields
    if (hospital) inquiry.hospital = hospital;
    if (inquiryDate) inquiry.inquiryDate = inquiryDate;
    if (patientName) inquiry.patientName = patientName.trim();
    if (patientUHID) inquiry.patientUHID = patientUHID.trim();
    if (surgicalCategory !== undefined) inquiry.surgicalCategory = surgicalCategory || undefined;
    if (paymentMethod !== undefined) inquiry.paymentMethod = paymentMethod || undefined;
    if (surgicalProcedure !== undefined) inquiry.surgicalProcedure = surgicalProcedure || undefined;
    if (surgeon !== undefined) inquiry.surgeon = surgeon || undefined;
    if (consultingDoctor !== undefined) inquiry.consultingDoctor = consultingDoctor || undefined;
    if (notes !== undefined) inquiry.notes = notes?.trim() || undefined;
    if (status) inquiry.status = status;
    if (updatedBy) inquiry.updatedBy = updatedBy;

    await inquiry.save();

    // Populate and return updated inquiry
    const populatedInquiry = await Inquiry.findById(inquiry._id)
      .populate('hospital', 'name shortName')
      .populate('surgicalCategory', 'description')
      .populate('paymentMethod', 'description')
      .populate('surgicalProcedure', 'name')
      .populate('surgeon', 'name')
      .populate('consultingDoctor', 'name');

    res.json({
      success: true,
      message: 'Inquiry updated successfully',
      data: populatedInquiry
    });

  } catch (error) {
    console.error('Error updating inquiry:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating inquiry',
      error: error.message
    });
  }
});

// Delete inquiry (soft delete)
router.delete('/:id', async (req, res) => {
  try {
    const { updatedBy } = req.body;

    const inquiry = await Inquiry.findOne({ _id: req.params.id, isActive: true });
    if (!inquiry) {
      return res.status(404).json({
        success: false,
        message: 'Inquiry not found'
      });
    }

    // Soft delete
    inquiry.isActive = false;
    inquiry.updatedBy = updatedBy;
    await inquiry.save();

    res.json({
      success: true,
      message: 'Inquiry deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting inquiry:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting inquiry',
      error: error.message
    });
  }
});

// Get inquiry statistics
router.get('/stats', async (req, res) => {
  try {
    const stats = await Inquiry.getStats();
    
    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('Error fetching inquiry stats:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching statistics',
      error: error.message
    });
  }
});

// Get dropdown data for forms
router.get('/dropdown-data', async (req, res) => {
  try {
    const [hospitals, surgicalCategories, paymentMethods, procedures, doctors, materials, implantTypes] = await Promise.all([
      Hospital.find({ isActive: true }).select('name shortName').sort({ name: 1 }).lean(),
      Category.find({ isActive: true }).select('description').sort({ description: 1 }).lean(),
      PaymentType.find({ isActive: true }).select('description').sort({ description: 1 }).lean(),
      Procedure.find({ isActive: true }).select('name surgicalCategory').sort({ name: 1 }).lean(),
      Doctor.find({ isActive: true }).select('name specialization').sort({ name: 1 }).lean(),
      MaterialMaster.find({ isActive: true }).select('code description unitOfMeasure').sort({ code: 1 }).lean(),
      ImplantType.find({ isActive: true }).select('name description').sort({ name: 1 }).lean()
    ]);

    res.json({
      success: true,
      hospitals,
      surgicalCategories,
      paymentMethods,
      procedures,
      doctors,
      materials,
      implantTypes
    });

  } catch (error) {
    console.error('Error fetching dropdown data:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching dropdown data',
      error: error.message
    });
  }
});

//

// Get cascading dropdown data
router.get('/cascading-data/:type', async (req, res) => {
  try {
    const { type } = req.params;
    const { hospitalId, surgicalCategoryId } = req.query;

    let data = [];

    switch (type) {
      case 'procedures':
        const procedureFilter = { isActive: true };
        if (surgicalCategoryId) {
          procedureFilter.surgicalCategory = surgicalCategoryId;
        }
        data = await Procedure.find(procedureFilter)
          .select('name description surgicalCategory')
          .populate('surgicalCategory', 'description')
          .sort({ name: 1 })
          .lean();
        break;

      case 'surgeons':
        if (hospitalId) {
          // Get doctors assigned to the hospital through DoctorAssignment
          const assignments = await DoctorAssignment.find({
            hospital: hospitalId,
            isActive: true,
            validityFrom: { $lte: new Date() },
            validityTo: { $gte: new Date() }
          })
          .populate({
            path: 'doctor',
            select: 'name surgicalCategories',
            populate: {
              path: 'surgicalCategories',
              select: 'description'
            }
          })
          .lean();

          // Extract unique doctors and filter by surgical category if provided
          const doctorMap = new Map();
          assignments.forEach(assignment => {
            if (assignment.doctor && assignment.doctor.name) {
              const doctor = assignment.doctor;
              
              // Filter by surgical category if provided
              if (surgicalCategoryId) {
                const hasMatchingCategory = doctor.surgicalCategories?.some(
                  cat => cat._id.toString() === surgicalCategoryId
                );
                if (!hasMatchingCategory) return;
              }
              
              doctorMap.set(doctor._id.toString(), doctor);
            }
          });
          
          data = Array.from(doctorMap.values()).sort((a, b) => a.name.localeCompare(b.name));
        } else {
          // If no hospital selected, return empty array
          data = [];
        }
        break;

      case 'consulting-doctors':
        if (hospitalId) {
          // Get doctors assigned to the hospital through DoctorAssignment
          const assignments = await DoctorAssignment.find({
            hospital: hospitalId,
            isActive: true,
            validityFrom: { $lte: new Date() },
            validityTo: { $gte: new Date() }
          })
          .populate({
            path: 'doctor',
            select: 'name surgicalCategories',
            populate: {
              path: 'surgicalCategories',
              select: 'description'
            }
          })
          .lean();

          // Extract unique doctors
          const doctorMap = new Map();
          assignments.forEach(assignment => {
            if (assignment.doctor && assignment.doctor.name) {
              const doctor = assignment.doctor;
              doctorMap.set(doctor._id.toString(), doctor);
            }
          });
          
          data = Array.from(doctorMap.values()).sort((a, b) => a.name.localeCompare(b.name));
        } else {
          // If no hospital selected, return empty array
          data = [];
        }
        break;

      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid cascading data type'
        });
    }

    res.json({
      success: true,
      data,
      filters: {
        hospitalId,
        surgicalCategoryId
      }
    });

  } catch (error) {
    console.error(`Error fetching cascading ${req.params.type} data:`, error);
    res.status(500).json({
      success: false,
      message: `Error fetching cascading ${req.params.type} data`,
      error: error.message
    });
  }
});

// Search inquiries
router.get('/search', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.trim().length < 2) {
      return res.json({
        success: true,
        data: []
      });
    }

    const searchRegex = new RegExp(q.trim(), 'i');
    
    const inquiries = await Inquiry.find({
      isActive: true,
      $or: [
        { patientName: searchRegex },
        { patientUHID: searchRegex }
      ]
    })
    .populate('hospital', 'name shortName')
    .populate('surgicalCategory', 'description')
    .select('patientName patientUHID inquiryDate hospital surgicalCategory status')
    .sort({ createdAt: -1 })
    .limit(10)
    .lean();

    res.json({
      success: true,
      data: inquiries
    });

  } catch (error) {
    console.error('Error searching inquiries:', error);
    res.status(500).json({
      success: false,
      message: 'Error searching inquiries',
      error: error.message
    });
  }
});

// Get inquiry statistics
router.get('/stats', async (req, res) => {
  try {
    const stats = await Inquiry.getStats();
    
    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('Error fetching inquiry stats:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching statistics',
      error: error.message
    });
  }
});

module.exports = router;
