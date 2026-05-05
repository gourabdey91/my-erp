const express = require('express');
const router = express.Router();
const NumberRange = require('../models/NumberRange');
const BusinessUnit = require('../models/BusinessUnit');

// Get all number ranges for current business unit
router.get('/', async (req, res) => {
  try {
    const { businessUnitId } = req.query;

    if (!businessUnitId) {
      return res.status(400).json({
        success: false,
        message: 'Business unit ID is required'
      });
    }

    const ranges = await NumberRange.find({
      businessUnit: businessUnitId,
      isActive: true
    })
    .populate('createdBy', 'name email')
    .populate('updatedBy', 'name email')
    .sort({ documentType: 1 });

    res.json({
      success: true,
      data: ranges,
      count: ranges.length
    });
  } catch (error) {
    console.error('Error fetching number ranges:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching number ranges',
      error: error.message
    });
  }
});

// Get specific number range by ID
router.get('/:id', async (req, res) => {
  try {
    const range = await NumberRange.findById(req.params.id)
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email');

    if (!range) {
      return res.status(404).json({
        success: false,
        message: 'Number range not found'
      });
    }

    res.json({
      success: true,
      data: range
    });
  } catch (error) {
    console.error('Error fetching number range:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching number range',
      error: error.message
    });
  }
});

// Get number range for specific document type
router.get('/type/:documentType', async (req, res) => {
  try {
    const { businessUnitId } = req.query;
    const { documentType } = req.params;

    if (!businessUnitId) {
      return res.status(400).json({
        success: false,
        message: 'Business unit ID is required'
      });
    }

    const range = await NumberRange.findOne({
      businessUnit: businessUnitId,
      documentType: documentType,
      isActive: true
    })
    .populate('createdBy', 'name email')
    .populate('updatedBy', 'name email');

    if (!range) {
      return res.status(404).json({
        success: false,
        message: `No number range found for document type: ${documentType}`
      });
    }

    res.json({
      success: true,
      data: range
    });
  } catch (error) {
    console.error('Error fetching number range:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching number range',
      error: error.message
    });
  }
});

// Create new number range
router.post('/', async (req, res) => {
  try {
    const { businessUnit, documentType, prefix, currentNumber, paddingLength, description } = req.body;

    // Validate business unit exists
    const buExists = await BusinessUnit.findById(businessUnit);
    if (!buExists) {
      return res.status(400).json({
        success: false,
        message: 'Invalid business unit ID'
      });
    }

    // Check if range already exists for this type
    const existingRange = await NumberRange.findOne({
      businessUnit,
      documentType,
      isActive: true
    });

    if (existingRange) {
      return res.status(400).json({
        success: false,
        message: `Number range already exists for ${documentType} in this business unit`
      });
    }

    const newRange = new NumberRange({
      businessUnit,
      documentType,
      prefix: prefix.toUpperCase(),
      currentNumber: currentNumber || 0,
      paddingLength: paddingLength || 8,
      startingNumber: currentNumber || 0,
      description,
      createdBy: req.user?.id || '507f1f77bcf86cd799439011'
    });

    await newRange.save();

    res.status(201).json({
      success: true,
      message: 'Number range created successfully',
      data: newRange
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: errors.length === 1 ? errors[0] : `Validation errors: ${errors.join('; ')}`,
        errors
      });
    }

    console.error('Error creating number range:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating number range',
      error: error.message
    });
  }
});

// Update number range (set manual number)
router.put('/:id', async (req, res) => {
  try {
    const { currentNumber, description } = req.body;
    const range = await NumberRange.findById(req.params.id);

    if (!range) {
      return res.status(404).json({
        success: false,
        message: 'Number range not found'
      });
    }

    if (currentNumber !== undefined) {
      await range.setCurrentNumber(currentNumber, req.user?.id || '507f1f77bcf86cd799439011');
    }

    if (description !== undefined) {
      range.description = description;
      range.updatedBy = req.user?.id || '507f1f77bcf86cd799439011';
      range.updatedAt = new Date();
      await range.save();
    }

    res.json({
      success: true,
      message: 'Number range updated successfully',
      data: range
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: errors.length === 1 ? errors[0] : `Validation errors: ${errors.join('; ')}`,
        errors
      });
    }

    console.error('Error updating number range:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating number range',
      error: error.message
    });
  }
});

// Get next number for a document type (without incrementing)
router.get('/next/:documentType', async (req, res) => {
  try {
    const { businessUnitId } = req.query;
    const { documentType } = req.params;

    if (!businessUnitId) {
      return res.status(400).json({
        success: false,
        message: 'Business unit ID is required'
      });
    }

    const range = await NumberRange.getOrCreateRange(businessUnitId, documentType, req.user?.id);
    const nextNumber = range.getNextNumber();

    res.json({
      success: true,
      nextNumber: nextNumber,
      currentNumber: range.currentNumber,
      prefix: range.prefix
    });
  } catch (error) {
    console.error('Error getting next number:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while getting next number',
      error: error.message
    });
  }
});

// Generate next number (increments counter)
router.post('/generate/:documentType', async (req, res) => {
  try {
    const { businessUnitId } = req.body;
    const { documentType } = req.params;

    if (!businessUnitId) {
      return res.status(400).json({
        success: false,
        message: 'Business unit ID is required'
      });
    }

    const nextNumber = await NumberRange.getNextNumberForType(businessUnitId, documentType, req.user?.id);

    res.json({
      success: true,
      message: 'Next number generated successfully',
      number: nextNumber
    });
  } catch (error) {
    console.error('Error generating next number:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while generating next number',
      error: error.message
    });
  }
});

// Get all document types available
router.get('/meta/document-types', (req, res) => {
  const documentTypes = ['Inquiry', 'SalesOrder', 'Billing', 'CreditNote', 'PurchaseOrder', 'Invoice'];
  res.json({
    success: true,
    types: documentTypes
  });
});

module.exports = router;
