const express = require('express');
const router = express.Router();
const BusinessUnit = require('../models/BusinessUnit');

// GET /api/business-units - Get all business units
router.get('/', async (req, res) => {
  try {
    const businessUnits = await BusinessUnit.find({ isActive: true }).sort({ code: 1 });
    res.json({
      success: true,
      data: businessUnits,
      count: businessUnits.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching business units',
      error: error.message
    });
  }
});

// GET /api/business-units/:id - Get business unit by ID
router.get('/:id', async (req, res) => {
  try {
    const businessUnit = await BusinessUnit.findById(req.params.id);
    if (!businessUnit) {
      return res.status(404).json({
        success: false,
        message: 'Business unit not found'
      });
    }
    res.json({
      success: true,
      data: businessUnit
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching business unit',
      error: error.message
    });
  }
});

// POST /api/business-units - Create new business unit
router.post('/', async (req, res) => {
  try {
    const { name, code, partners } = req.body;

    // Check if code already exists
    const existingBU = await BusinessUnit.findOne({ code: code.toUpperCase() });
    if (existingBU) {
      return res.status(400).json({
        success: false,
        message: 'Business unit code already exists'
      });
    }

    const businessUnit = new BusinessUnit({
      name,
      code: code.toUpperCase(),
      partners: partners || []
    });

    const savedBusinessUnit = await businessUnit.save();
    res.status(201).json({
      success: true,
      data: savedBusinessUnit,
      message: 'Business unit created successfully'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Error creating business unit',
      error: error.message
    });
  }
});

// PUT /api/business-units/:id - Update business unit
router.put('/:id', async (req, res) => {
  try {
    const { name, code, partners, isActive } = req.body;

    // Check if new code conflicts with existing (excluding current)
    if (code) {
      const existingBU = await BusinessUnit.findOne({ 
        code: code.toUpperCase(), 
        _id: { $ne: req.params.id } 
      });
      if (existingBU) {
        return res.status(400).json({
          success: false,
          message: 'Business unit code already exists'
        });
      }
    }

    const updatedBusinessUnit = await BusinessUnit.findByIdAndUpdate(
      req.params.id,
      {
        ...(name && { name }),
        ...(code && { code: code.toUpperCase() }),
        ...(partners !== undefined && { partners }),
        ...(isActive !== undefined && { isActive })
      },
      { new: true, runValidators: true }
    );

    if (!updatedBusinessUnit) {
      return res.status(404).json({
        success: false,
        message: 'Business unit not found'
      });
    }

    res.json({
      success: true,
      data: updatedBusinessUnit,
      message: 'Business unit updated successfully'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Error updating business unit',
      error: error.message
    });
  }
});

// DELETE /api/business-units/:id - Soft delete business unit
router.delete('/:id', async (req, res) => {
  try {
    const businessUnit = await BusinessUnit.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );

    if (!businessUnit) {
      return res.status(404).json({
        success: false,
        message: 'Business unit not found'
      });
    }

    res.json({
      success: true,
      data: businessUnit,
      message: 'Business unit deactivated successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deactivating business unit',
      error: error.message
    });
  }
});

module.exports = router;
