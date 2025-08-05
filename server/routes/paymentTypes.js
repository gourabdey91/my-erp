const express = require('express');
const router = express.Router();
const PaymentType = require('../models/PaymentType');

// Get all payment types for a business unit
router.get('/', async (req, res) => {
  try {
    const { businessUnitId } = req.query;
    
    if (!businessUnitId) {
      return res.status(400).json({
        success: false,
        message: 'Business Unit ID is required'
      });
    }

    const paymentTypes = await PaymentType.find({ 
      businessUnitId,
      isActive: true 
    })
    .populate('createdBy', 'firstName lastName')
    .populate('updatedBy', 'firstName lastName')
    .sort({ code: 1 });

    res.json({
      success: true,
      data: paymentTypes
    });
  } catch (error) {
    console.error('Error fetching payment types:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching payment types',
      error: error.message
    });
  }
});

// Get payment type by ID
router.get('/:id', async (req, res) => {
  try {
    const paymentType = await PaymentType.findById(req.params.id)
      .populate('createdBy', 'firstName lastName')
      .populate('updatedBy', 'firstName lastName');
    
    if (!paymentType) {
      return res.status(404).json({
        success: false,
        message: 'Payment type not found'
      });
    }

    res.json({
      success: true,
      data: paymentType
    });
  } catch (error) {
    console.error('Error fetching payment type:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching payment type',
      error: error.message
    });
  }
});

// Create new payment type
router.post('/', async (req, res) => {
  try {
    const { code, description, businessUnitId, createdBy } = req.body;
    
    // Validation
    if (!code || !description || !businessUnitId || !createdBy) {
      return res.status(400).json({
        success: false,
        message: 'Code, description, business unit ID, and created by are required'
      });
    }

    if (code.length > 6) {
      return res.status(400).json({
        success: false,
        message: 'Payment type code cannot exceed 6 characters'
      });
    }

    // Check for existing payment type with same code in this business unit
    const existingPaymentType = await PaymentType.findOne({ 
      code: code.toUpperCase(), 
      businessUnitId 
    });
    
    if (existingPaymentType) {
      return res.status(400).json({
        success: false,
        message: 'Payment type with this code already exists in this business unit'
      });
    }

    const paymentType = new PaymentType({
      code: code.toUpperCase(),
      description,
      businessUnitId,
      createdBy,
      updatedBy: createdBy
    });

    await paymentType.save();
    
    // Populate the created payment type before returning
    await paymentType.populate('createdBy', 'firstName lastName');
    await paymentType.populate('updatedBy', 'firstName lastName');

    res.status(201).json({
      success: true,
      data: paymentType,
      message: 'Payment type created successfully'
    });
  } catch (error) {
    console.error('Error creating payment type:', error);
    
    // Handle duplicate key error
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Payment type with this code already exists in this business unit'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Error creating payment type',
      error: error.message
    });
  }
});

// Update payment type
router.put('/:id', async (req, res) => {
  try {
    const { code, description, updatedBy } = req.body;
    
    if (!updatedBy) {
      return res.status(400).json({
        success: false,
        message: 'Updated by is required'
      });
    }

    if (code && code.length > 6) {
      return res.status(400).json({
        success: false,
        message: 'Payment type code cannot exceed 6 characters'
      });
    }

    const paymentType = await PaymentType.findById(req.params.id);
    
    if (!paymentType) {
      return res.status(404).json({
        success: false,
        message: 'Payment type not found'
      });
    }

    // If code is being updated, check for duplicates
    if (code && code.toUpperCase() !== paymentType.code) {
      const existingPaymentType = await PaymentType.findOne({ 
        code: code.toUpperCase(), 
        businessUnitId: paymentType.businessUnitId,
        _id: { $ne: req.params.id }
      });
      
      if (existingPaymentType) {
        return res.status(400).json({
          success: false,
          message: 'Payment type with this code already exists in this business unit'
        });
      }
    }

    // Update fields
    if (code) paymentType.code = code.toUpperCase();
    if (description) paymentType.description = description;
    paymentType.updatedBy = updatedBy;

    await paymentType.save();
    
    // Populate before returning
    await paymentType.populate('createdBy', 'firstName lastName');
    await paymentType.populate('updatedBy', 'firstName lastName');

    res.json({
      success: true,
      data: paymentType,
      message: 'Payment type updated successfully'
    });
  } catch (error) {
    console.error('Error updating payment type:', error);
    
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Payment type with this code already exists in this business unit'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Error updating payment type',
      error: error.message
    });
  }
});

// Delete payment type (soft delete)
router.delete('/:id', async (req, res) => {
  try {
    const { updatedBy } = req.body;
    
    if (!updatedBy) {
      return res.status(400).json({
        success: false,
        message: 'Updated by is required'
      });
    }

    const paymentType = await PaymentType.findById(req.params.id);
    
    if (!paymentType) {
      return res.status(404).json({
        success: false,
        message: 'Payment type not found'
      });
    }

    paymentType.isActive = false;
    paymentType.updatedBy = updatedBy;
    await paymentType.save();

    res.json({
      success: true,
      message: 'Payment type deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting payment type:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting payment type',
      error: error.message
    });
  }
});

module.exports = router;
