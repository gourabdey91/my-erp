const express = require('express');
const router = express.Router();
const Limit = require('../models/Limit');

// Get all limits for a business unit
router.get('/', async (req, res) => {
  try {
    const { businessUnitId } = req.query;
    
    if (!businessUnitId) {
      return res.status(400).json({
        success: false,
        message: 'Business Unit ID is required'
      });
    }

    const limits = await Limit.find({ 
      businessUnitId,
      isActive: true 
    })
    .populate('paymentTypeId', 'code description')
    .populate('categoryId', 'code description')
    .populate('createdBy', 'firstName lastName')
    .populate('updatedBy', 'firstName lastName')
    .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: limits
    });
  } catch (error) {
    console.error('Error fetching limits:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching limits',
      error: error.message
    });
  }
});

// Get limit by ID
router.get('/:id', async (req, res) => {
  try {
    const limit = await Limit.findById(req.params.id)
      .populate('paymentTypeId', 'code description')
      .populate('categoryId', 'code description')
      .populate('createdBy', 'firstName lastName')
      .populate('updatedBy', 'firstName lastName');
    
    if (!limit) {
      return res.status(404).json({
        success: false,
        message: 'Limit not found'
      });
    }

    res.json({
      success: true,
      data: limit
    });
  } catch (error) {
    console.error('Error fetching limit:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching limit',
      error: error.message
    });
  }
});

// Create new limit
router.post('/', async (req, res) => {
  try {
    const { 
      paymentTypeId, 
      categoryId, 
      amount, 
      currency, 
      description,
      businessUnitId, 
      createdBy 
    } = req.body;
    
    // Validation
    if (!paymentTypeId || !categoryId || !amount || !businessUnitId || !createdBy) {
      return res.status(400).json({
        success: false,
        message: 'Payment type, category, amount, business unit ID, and created by are required'
      });
    }

    if (amount < 0) {
      return res.status(400).json({
        success: false,
        message: 'Amount cannot be negative'
      });
    }

    // Check for existing limit with same combination
    const existingLimit = await Limit.findOne({ 
      paymentTypeId,
      categoryId,
      businessUnitId,
      isActive: true
    });
    
    if (existingLimit) {
      return res.status(400).json({
        success: false,
        message: 'Limit for this payment type-category combination already exists'
      });
    }

    const limit = new Limit({
      paymentTypeId,
      categoryId,
      amount,
      currency: currency || 'USD',
      description,
      businessUnitId,
      createdBy,
      updatedBy: createdBy
    });

    await limit.save();
    
    // Populate the created limit before returning
    await limit.populate('paymentTypeId', 'code description');
    await limit.populate('categoryId', 'code description');
    await limit.populate('createdBy', 'firstName lastName');
    await limit.populate('updatedBy', 'firstName lastName');

    res.status(201).json({
      success: true,
      data: limit,
      message: 'Limit created successfully'
    });
  } catch (error) {
    console.error('Error creating limit:', error);
    
    // Handle duplicate key error
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Limit for this procedure-payment type-category combination already exists'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Error creating limit',
      error: error.message
    });
  }
});

// Update limit
router.put('/:id', async (req, res) => {
  try {
    const { 
      paymentTypeId, 
      categoryId, 
      amount, 
      currency, 
      description,
      updatedBy 
    } = req.body;
    
    if (!updatedBy) {
      return res.status(400).json({
        success: false,
        message: 'Updated by is required'
      });
    }

    if (amount !== undefined && amount < 0) {
      return res.status(400).json({
        success: false,
        message: 'Amount cannot be negative'
      });
    }

    const limit = await Limit.findById(req.params.id);
    
    if (!limit) {
      return res.status(404).json({
        success: false,
        message: 'Limit not found'
      });
    }

    // If combination is being updated, check for duplicates
    if (paymentTypeId || categoryId) {
      const checkPaymentTypeId = paymentTypeId || limit.paymentTypeId;
      const checkCategoryId = categoryId || limit.categoryId;
      
      const existingLimit = await Limit.findOne({ 
        paymentTypeId: checkPaymentTypeId,
        categoryId: checkCategoryId,
        businessUnitId: limit.businessUnitId,
        isActive: true,
        _id: { $ne: req.params.id }
      });
      
      if (existingLimit) {
        return res.status(400).json({
          success: false,
          message: 'Limit for this payment type-category combination already exists'
        });
      }
    }

    // Update fields
    if (paymentTypeId) limit.paymentTypeId = paymentTypeId;
    if (categoryId) limit.categoryId = categoryId;
    if (amount !== undefined) limit.amount = amount;
    if (currency) limit.currency = currency;
    if (description !== undefined) limit.description = description;
    limit.updatedBy = updatedBy;

    await limit.save();
    
    // Populate before returning
    await limit.populate('paymentTypeId', 'code description');
    await limit.populate('categoryId', 'code description');
    await limit.populate('createdBy', 'firstName lastName');
    await limit.populate('updatedBy', 'firstName lastName');

    res.json({
      success: true,
      data: limit,
      message: 'Limit updated successfully'
    });
  } catch (error) {
    console.error('Error updating limit:', error);
    
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Limit for this procedure-payment type-category combination already exists'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Error updating limit',
      error: error.message
    });
  }
});

// Delete limit (soft delete)
router.delete('/:id', async (req, res) => {
  try {
    const { updatedBy } = req.body;
    
    if (!updatedBy) {
      return res.status(400).json({
        success: false,
        message: 'Updated by is required'
      });
    }

    const limit = await Limit.findById(req.params.id);
    
    if (!limit) {
      return res.status(404).json({
        success: false,
        message: 'Limit not found'
      });
    }

    limit.isActive = false;
    limit.updatedBy = updatedBy;
    await limit.save();

    res.json({
      success: true,
      message: 'Limit deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting limit:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting limit',
      error: error.message
    });
  }
});

module.exports = router;
