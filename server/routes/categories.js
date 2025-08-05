const express = require('express');
const router = express.Router();
const Category = require('../models/Category');

// Get all categories for a business unit
router.get('/', async (req, res) => {
  try {
    const { businessUnitId } = req.query;
    
    if (!businessUnitId) {
      return res.status(400).json({
        success: false,
        message: 'Business Unit ID is required'
      });
    }

    const categories = await Category.find({ 
      businessUnitId,
      isActive: true 
    })
    .populate('createdBy', 'firstName lastName')
    .populate('updatedBy', 'firstName lastName')
    .sort({ code: 1 });

    res.json({
      success: true,
      data: categories
    });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching categories',
      error: error.message
    });
  }
});

// Get category by ID
router.get('/:id', async (req, res) => {
  try {
    const category = await Category.findById(req.params.id)
      .populate('createdBy', 'firstName lastName')
      .populate('updatedBy', 'firstName lastName');

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    res.json({
      success: true,
      data: category
    });
  } catch (error) {
    console.error('Error fetching category:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching category',
      error: error.message
    });
  }
});

// Create new category
router.post('/', async (req, res) => {
  try {
    console.log('Received category data:', JSON.stringify(req.body, null, 2));
    
    const { code, description, businessUnitId, createdBy } = req.body;

    // Validate required fields
    if (!code || !description || !businessUnitId || !createdBy) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: code, description, businessUnitId, or createdBy'
      });
    }

    // Check if code already exists in this business unit
    const existingCategory = await Category.findOne({ 
      code: code.toUpperCase(),
      businessUnitId,
      isActive: true
    });
    
    if (existingCategory) {
      return res.status(400).json({
        success: false,
        message: 'Category code already exists in this business unit'
      });
    }

    const category = new Category({
      code: code.toUpperCase(),
      description,
      businessUnitId,
      createdBy
    });

    await category.save();
    
    const populatedCategory = await Category.findById(category._id)
      .populate('createdBy', 'firstName lastName');

    res.status(201).json({
      success: true,
      message: 'Category created successfully',
      data: populatedCategory
    });
  } catch (error) {
    console.error('Error creating category:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating category',
      error: error.message
    });
  }
});

// Update category
router.put('/:id', async (req, res) => {
  try {
    const { code, description, updatedBy } = req.body;
    
    // Check if code already exists (excluding current category)
    if (code) {
      const existingCategory = await Category.findOne({ 
        code: code.toUpperCase(),
        _id: { $ne: req.params.id },
        isActive: true
      });
      
      if (existingCategory) {
        return res.status(400).json({
          success: false,
          message: 'Category code already exists'
        });
      }
    }

    const updateData = {
      ...(code && { code: code.toUpperCase() }),
      ...(description && { description }),
      updatedBy
    };

    const category = await Category.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    )
    .populate('createdBy', 'firstName lastName')
    .populate('updatedBy', 'firstName lastName');

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    res.json({
      success: true,
      message: 'Category updated successfully',
      data: category
    });
  } catch (error) {
    console.error('Error updating category:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating category',
      error: error.message
    });
  }
});

// Soft delete category
router.delete('/:id', async (req, res) => {
  try {
    const { updatedBy } = req.body;

    const category = await Category.findByIdAndUpdate(
      req.params.id,
      { 
        isActive: false,
        updatedBy
      },
      { new: true }
    );

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    res.json({
      success: true,
      message: 'Category deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting category:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting category',
      error: error.message
    });
  }
});

module.exports = router;
