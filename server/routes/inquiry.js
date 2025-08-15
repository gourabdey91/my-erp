const express = require('express');
const router = express.Router();
const Inquiry = require('../models/Inquiry');
const Hospital = require('../models/Hospital');
const Category = require('../models/Category');
const PaymentType = require('../models/PaymentType');
const Procedure = require('../models/Procedure');

// Get all inquiries with pagination and search
router.get('/', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = '',
      hospital = '',
      surgicalCategory = '',
      paymentMethod = '',
      sortBy = 'inquiryDate',
      sortOrder = 'desc'
    } = req.query;

    const query = { isActive: true };

    // Add search functionality
    if (search) {
      query.$or = [
        { inquiryNumber: { $regex: search, $options: 'i' } },
        { patientName: { $regex: search, $options: 'i' } },
        { patientUHID: { $regex: search, $options: 'i' } }
      ];
    }

    // Add filters
    if (hospital) query.hospital = hospital;
    if (surgicalCategory) query.surgicalCategory = surgicalCategory;
    if (paymentMethod) query.paymentMethod = paymentMethod;

    // Execute query with pagination
    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      sort: { [sortBy]: sortOrder === 'desc' ? -1 : 1 },
      populate: [
        { path: 'hospital', select: 'shortName legalName code' },
        { path: 'surgicalCategory', select: 'description code' },
        { path: 'surgicalProcedure', select: 'name code amount currency' },
        { path: 'paymentMethod', select: 'description code' },
        { path: 'createdBy', select: 'name email' },
        { path: 'updatedBy', select: 'name email' }
      ]
    };

    const result = await Inquiry.paginate(query, options);

    res.json({
      success: true,
      data: result.docs,
      pagination: {
        currentPage: result.page,
        totalPages: result.totalPages,
        totalItems: result.totalDocs,
        itemsPerPage: result.limit,
        hasNextPage: result.hasNextPage,
        hasPrevPage: result.hasPrevPage
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
    const inquiry = await Inquiry.findById(req.params.id)
      .populate('hospital', 'shortName legalName code')
      .populate('surgicalCategory', 'description code')
      .populate('surgicalProcedure', 'name code amount currency')
      .populate('paymentMethod', 'description code')
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email');

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
    const inquiryData = {
      ...req.body,
      createdBy: req.user?.id || '507f1f77bcf86cd799439011' // Default user ID for development
    };

    const inquiry = new Inquiry(inquiryData);
    await inquiry.save();

    await inquiry.populate([
      { path: 'hospital', select: 'shortName legalName code' },
      { path: 'surgicalCategory', select: 'description code' },
      { path: 'surgicalProcedure', select: 'name code amount currency' },
      { path: 'paymentMethod', select: 'description code' },
      { path: 'createdBy', select: 'name email' }
    ]);

    res.status(201).json({
      success: true,
      message: 'Inquiry created successfully',
      data: inquiry
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Inquiry number already exists',
        error: 'Duplicate inquiry number'
      });
    }

    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: errors.length === 1 ? errors[0] : `Multiple validation errors: ${errors.join('; ')}`,
        errors
      });
    }

    // Handle custom validation errors (like material validation)
    if (error.message && error.message.includes('Material validation failed')) {
      return res.status(400).json({
        success: false,
        message: error.message,
        error: 'Material validation error'
      });
    }

    // Handle limit validation errors
    if (error.message && error.message.includes('exceeds the limit')) {
      return res.status(400).json({
        success: false,
        message: error.message,
        error: 'Limit validation error'
      });
    }

    res.status(500).json({
      success: false,
      message: error.message || 'Error creating inquiry',
      error: 'Internal server error'
    });
  }
});

// Update inquiry
router.put('/:id', async (req, res) => {
  try {
    const updateData = {
      ...req.body,
      updatedBy: req.user?.id || '507f1f77bcf86cd799439011' // Default user ID for development
    };

    const inquiry = await Inquiry.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate([
      { path: 'hospital', select: 'shortName legalName code' },
      { path: 'surgicalCategory', select: 'description code' },
      { path: 'surgicalProcedure', select: 'name code amount currency' },
      { path: 'paymentMethod', select: 'description code' },
      { path: 'createdBy', select: 'name email' },
      { path: 'updatedBy', select: 'name email' }
    ]);

    if (!inquiry) {
      return res.status(404).json({
        success: false,
        message: 'Inquiry not found'
      });
    }

    res.json({
      success: true,
      message: 'Inquiry updated successfully',
      data: inquiry
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: errors.length === 1 ? errors[0] : `Multiple validation errors: ${errors.join('; ')}`,
        errors
      });
    }

    // Handle custom validation errors (like material validation)
    if (error.message && error.message.includes('Material validation failed')) {
      return res.status(400).json({
        success: false,
        message: error.message,
        error: 'Material validation error'
      });
    }

    // Handle limit validation errors
    if (error.message && error.message.includes('exceeds the limit')) {
      return res.status(400).json({
        success: false,
        message: error.message,
        error: 'Limit validation error'
      });
    }

    res.status(500).json({
      success: false,
      message: error.message || 'Error updating inquiry',
      error: 'Internal server error'
    });
  }
});

// Soft delete inquiry
router.delete('/:id', async (req, res) => {
  try {
    const inquiry = await Inquiry.findByIdAndUpdate(
      req.params.id,
      { 
        isActive: false,
        updatedBy: req.user?.id || '507f1f77bcf86cd799439011' // Default user ID for development
      },
      { new: true }
    );

    if (!inquiry) {
      return res.status(404).json({
        success: false,
        message: 'Inquiry not found'
      });
    }

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

// Get surgical categories by hospital
router.get('/hospital/:hospitalId/surgical-categories', async (req, res) => {
  try {
    const { hospitalId } = req.params;
    console.log('=== SURGICAL CATEGORIES ENDPOINT ===');
    console.log('Hospital ID requested:', hospitalId);
    
    // Get hospital with populated surgical categories
    const hospital = await Hospital.findById(hospitalId)
      .populate('surgicalCategories', 'description code')
      .select('surgicalCategories');
    
    console.log('Hospital found:', !!hospital);
    if (hospital) {
      console.log('Surgical categories count:', hospital.surgicalCategories.length);
      console.log('Surgical categories:', hospital.surgicalCategories.map(cat => ({ id: cat._id, description: cat.description, code: cat.code })));
    }
    
    if (!hospital) {
      console.log('Hospital not found with ID:', hospitalId);
      return res.status(404).json({
        success: false,
        message: 'Hospital not found'
      });
    }

    const response = {
      success: true,
      data: hospital.surgicalCategories || []
    };
    console.log('Sending response:', response);
    res.json(response);
  } catch (error) {
    console.error('Error fetching surgical categories:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching surgical categories',
      error: error.message
    });
  }
});

// Get procedures filtered by category and payment method
router.get('/procedures/:hospitalId', async (req, res) => {
  try {
    const { hospitalId } = req.params;
    const { category, paymentMethod } = req.query;
    
    console.log('=== PROCEDURES ENDPOINT ===');
    console.log('Hospital ID:', hospitalId);
    console.log('Category:', category);
    console.log('Payment Method:', paymentMethod);
    
    // Get hospital with surgical categories to filter procedures
    const hospital = await Hospital.findById(hospitalId).populate('surgicalCategories');
    if (!hospital) {
      return res.status(404).json({
        success: false,
        message: 'Hospital not found'
      });
    }
    
    const hospitalCategoryIds = hospital.surgicalCategories.map(cat => cat._id.toString());
    console.log('Hospital category IDs:', hospitalCategoryIds);
    
    // Build procedure filter
    const procedureFilter = { isActive: true };
    
    // Filter by selected category (if specified)
    if (category && category !== '') {
      procedureFilter['items.surgicalCategoryId'] = category;
    } else {
      // If no specific category, filter by hospital's categories using new structure
      if (hospitalCategoryIds.length > 0) {
        procedureFilter['items.surgicalCategoryId'] = { $in: hospitalCategoryIds };
      }
    }
    
    // Filter by payment method (if specified)
    if (paymentMethod && paymentMethod !== '') {
      procedureFilter.paymentTypeId = paymentMethod;
    }
    
    console.log('Procedure filter:', procedureFilter);
    
    // Fetch procedures with population
    const procedures = await Procedure.find(procedureFilter)
      .populate('items.surgicalCategoryId', 'code description')
      .populate('paymentTypeId', 'code description')
      .select('_id code name items paymentTypeId totalLimit')
      .sort({ name: 1 });
    
    console.log('Found procedures:', procedures.length);
    
    res.json({
      success: true,
      data: procedures
    });
  } catch (error) {
    console.error('Error fetching procedures:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching procedures',
      error: error.message
    });
  }
});

// Get inquiry statistics
router.get('/stats/overview', async (req, res) => {
  try {
    const totalInquiries = await Inquiry.countDocuments({ isActive: true });
    const thisMonthStart = new Date();
    thisMonthStart.setDate(1);
    thisMonthStart.setHours(0, 0, 0, 0);
    
    const thisMonthInquiries = await Inquiry.countDocuments({
      isActive: true,
      inquiryDate: { $gte: thisMonthStart }
    });

    res.json({
      success: true,
      data: {
        total: totalInquiries,
        thisMonth: thisMonthInquiries
      }
    });
  } catch (error) {
    console.error('Error fetching inquiry statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching inquiry statistics',
      error: error.message
    });
  }
});

module.exports = router;
