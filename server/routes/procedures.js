const express = require('express');
const router = express.Router();
const Procedure = require('../models/Procedure');

// Get all procedures
router.get('/', async (req, res) => {
  try {
    const procedures = await Procedure.find({ isActive: true })
    .populate('paymentTypeId', 'code description')
    .populate('items.surgicalCategoryId', 'code description')
    .populate('createdBy', 'firstName lastName')
    .populate('updatedBy', 'firstName lastName')
    .sort({ code: 1 });

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

// Get procedure by ID
router.get('/:id', async (req, res) => {
  try {
    const procedure = await Procedure.findById(req.params.id)
      .populate('paymentTypeId', 'code description')
      .populate('items.surgicalCategoryId', 'code description')
      .populate('createdBy', 'firstName lastName')
      .populate('updatedBy', 'firstName lastName');
    
    if (!procedure) {
      return res.status(404).json({
        success: false,
        message: 'Procedure not found'
      });
    }

    res.json({
      success: true,
      data: procedure
    });
  } catch (error) {
    console.error('Error fetching procedure:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching procedure',
      error: error.message
    });
  }
});

// Get procedures available for a specific hospital
// Only return procedures where ALL surgical categories are assigned to the hospital
router.get('/hospital/:hospitalId', async (req, res) => {
  try {
    const { hospitalId } = req.params;
    
    // First get the hospital with its surgical categories
    const Hospital = require('../models/Hospital');
    const hospital = await Hospital.findById(hospitalId).populate('surgicalCategories');
    
    if (!hospital) {
      return res.status(404).json({
        success: false,
        message: 'Hospital not found'
      });
    }
    
    // Get hospital's surgical category IDs
    const hospitalCategoryIds = hospital.surgicalCategories.map(cat => cat._id.toString());
    
    // Get all active procedures with populated surgical categories
    const allProcedures = await Procedure.find({ isActive: true })
      .populate('paymentTypeId', 'code description')
      .populate('items.surgicalCategoryId', 'code description')
      .populate('createdBy', 'firstName lastName')
      .populate('updatedBy', 'firstName lastName')
      .sort({ code: 1 });
    
    // Filter procedures where ALL surgical categories are available at the hospital
    const availableProcedures = allProcedures.filter(procedure => {
      // Get all surgical category IDs required by this procedure
      const procedureCategoryIds = procedure.items.map(item => 
        item.surgicalCategoryId._id.toString()
      );
      
      // Check if ALL procedure categories are available at the hospital
      const allCategoriesAvailable = procedureCategoryIds.every(categoryId => 
        hospitalCategoryIds.includes(categoryId)
      );
      
      return allCategoriesAvailable;
    });

    res.json({
      success: true,
      data: availableProcedures,
      hospitalInfo: {
        id: hospital._id,
        name: hospital.shortName,
        availableCategories: hospital.surgicalCategories.length,
        totalProcedures: allProcedures.length,
        availableProcedures: availableProcedures.length
      }
    });
    
  } catch (error) {
    console.error('Error fetching procedures for hospital:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching procedures for hospital',
      error: error.message
    });
  }
});

// Create new procedure
router.post('/', async (req, res) => {
  try {
    const { 
      code,
      name,
      items,
      paymentTypeId,
      limitAppliedByIndividualCategory,
      createdBy 
    } = req.body;
    
    // Validation
    if (!code || !name || !items || !paymentTypeId || !createdBy) {
      return res.status(400).json({
        success: false,
        message: 'Code, name, items, payment type, and created by are required'
      });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one surgical category item is required'
      });
    }

    // Validate each item
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (!item.surgicalCategoryId || !item.currency) {
        return res.status(400).json({
          success: false,
          message: `Item ${i + 1}: Surgical category and currency are required`
        });
      }
      // Limit is now optional, but if provided, must not be negative
      if (item.limit !== undefined && item.limit !== null && item.limit < 0) {
        return res.status(400).json({
          success: false,
          message: `Item ${i + 1}: Limit cannot be negative`
        });
      }
    }

    // Validate procedure code format
    if (!/^P\d{5}$/.test(code)) {
      return res.status(400).json({
        success: false,
        message: 'Procedure code must be in format: P##### (P followed by 5 digits)'
      });
    }

    // Check for existing procedure with same code
    const existingProcedure = await Procedure.findOne({ 
      code: code.toUpperCase(),
      isActive: true
    });
    
    if (existingProcedure) {
      return res.status(400).json({
        success: false,
        message: `Procedure with code ${code.toUpperCase()} already exists`
      });
    }

    const procedure = new Procedure({
      code: code.toUpperCase(),
      name,
      items,
      paymentTypeId,
      limitAppliedByIndividualCategory: limitAppliedByIndividualCategory || false,
      createdBy,
      updatedBy: createdBy
    });

    await procedure.save();
    
    // Populate the created procedure before returning
    await procedure.populate('paymentTypeId', 'code description');
    await procedure.populate('items.surgicalCategoryId', 'code description');
    await procedure.populate('createdBy', 'firstName lastName');
    await procedure.populate('updatedBy', 'firstName lastName');

    res.status(201).json({
      success: true,
      data: procedure,
      message: 'Procedure created successfully'
    });
  } catch (error) {
    console.error('Error creating procedure:', error);
    
    // Handle duplicate key error
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Procedure with this code already exists'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Error creating procedure',
      error: error.message
    });
  }
});

// Update procedure
router.put('/:id', async (req, res) => {
  try {
    const { 
      name,
      items,
      paymentTypeId,
      limitAppliedByIndividualCategory,
      updatedBy 
    } = req.body;
    
    if (!updatedBy) {
      return res.status(400).json({
        success: false,
        message: 'Updated by is required'
      });
    }

    // Validate items if provided
    if (items) {
      if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'At least one surgical category item is required'
        });
      }

      // Validate each item
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (!item.surgicalCategoryId || !item.currency) {
          return res.status(400).json({
            success: false,
            message: `Item ${i + 1}: Surgical category and currency are required`
          });
        }
        // Limit is now optional, but if provided, must not be negative
        if (item.limit !== undefined && item.limit !== null && item.limit < 0) {
          return res.status(400).json({
            success: false,
            message: `Item ${i + 1}: Limit cannot be negative`
          });
        }
      }
    }

    const procedure = await Procedure.findById(req.params.id);
    
    if (!procedure) {
      return res.status(404).json({
        success: false,
        message: 'Procedure not found'
      });
    }

    // Update fields (Note: code cannot be updated for data integrity)
    if (name) procedure.name = name;
    if (items) procedure.items = items;
    if (paymentTypeId) procedure.paymentTypeId = paymentTypeId;
    if (limitAppliedByIndividualCategory !== undefined) {
      procedure.limitAppliedByIndividualCategory = limitAppliedByIndividualCategory;
    }
    procedure.updatedBy = updatedBy;

    await procedure.save();
    
    // Populate before returning
    await procedure.populate('paymentTypeId', 'code description');
    await procedure.populate('items.surgicalCategoryId', 'code description');
    await procedure.populate('createdBy', 'firstName lastName');
    await procedure.populate('updatedBy', 'firstName lastName');

    res.json({
      success: true,
      data: procedure,
      message: 'Procedure updated successfully'
    });
  } catch (error) {
    console.error('Error updating procedure:', error);
    
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Procedure with this code already exists'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Error updating procedure',
      error: error.message
    });
  }
});

// Delete procedure (soft delete)
router.delete('/:id', async (req, res) => {
  try {
    const { updatedBy } = req.body;
    
    if (!updatedBy) {
      return res.status(400).json({
        success: false,
        message: 'Updated by is required'
      });
    }

    const procedure = await Procedure.findById(req.params.id);
    
    if (!procedure) {
      return res.status(404).json({
        success: false,
        message: 'Procedure not found'
      });
    }

    procedure.isActive = false;
    procedure.updatedBy = updatedBy;
    await procedure.save();

    res.json({
      success: true,
      message: 'Procedure deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting procedure:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting procedure',
      error: error.message
    });
  }
});

module.exports = router;
