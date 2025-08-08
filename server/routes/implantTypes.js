const express = require('express');
const router = express.Router();
const ImplantType = require('../models/ImplantType');
const Category = require('../models/Category');

// Get all implant types
router.get('/', async (req, res) => {
  try {
    const implantTypes = await ImplantType.find({ isActive: true })
      .populate('subcategories.surgicalCategory', 'code description')
      .populate('createdBy', 'firstName lastName')
      .populate('updatedBy', 'firstName lastName')
      .sort({ name: 1 });

    res.json(implantTypes);
  } catch (error) {
    console.error('Error fetching implant types:', error);
    res.status(500).json({ message: 'Server error while fetching implant types' });
  }
});

// Get surgical categories for dropdown
router.get('/categories', async (req, res) => {
  try {
    const categories = await Category.find({ isActive: true })
      .select('_id code description')
      .sort({ description: 1 });

    res.json(categories);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ message: 'Server error while fetching categories' });
  }
});

// Create new implant type
router.post('/', async (req, res) => {
  try {
    const { name, subcategories } = req.body;

    // Validate required fields
    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Implant type name is required' });
    }

    // Check if implant type with same name already exists
    const existingImplantType = await ImplantType.findOne({ 
      name: { $regex: new RegExp(`^${name.trim()}$`, 'i') },
      isActive: true 
    });
    
    if (existingImplantType) {
      return res.status(400).json({ message: 'An implant type with this name already exists' });
    }

    // Validate subcategories if provided
    if (subcategories && subcategories.length > 0) {
      for (const subcat of subcategories) {
        if (!subcat.subCategory || !subcat.subCategory.trim()) {
          return res.status(400).json({ message: 'Subcategory name is required' });
        }
        // Length is optional, but if provided must be greater than 0
        if (subcat.length !== undefined && subcat.length !== null && subcat.length !== '' && subcat.length <= 0) {
          return res.status(400).json({ message: 'Subcategory length must be greater than 0 if provided' });
        }
        if (!subcat.surgicalCategory) {
          return res.status(400).json({ message: 'Surgical category is required for subcategory' });
        }
      }
    }

    const implantType = new ImplantType({
      name: name.trim(),
      subcategories: subcategories || [],
      createdBy: req.user?.id,
      updatedBy: req.user?.id
    });

    const savedImplantType = await implantType.save();
    const populatedImplantType = await ImplantType.findById(savedImplantType._id)
      .populate('subcategories.surgicalCategory', 'code description')
      .populate('createdBy', 'firstName lastName')
      .populate('updatedBy', 'firstName lastName');

    res.status(201).json(populatedImplantType);
  } catch (error) {
    console.error('Error creating implant type:', error);
    res.status(500).json({ message: 'Server error while creating implant type' });
  }
});

// Update implant type
router.put('/:id', async (req, res) => {
  try {
    const { name, subcategories } = req.body;
    const implantTypeId = req.params.id;

    // Validate required fields
    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Implant type name is required' });
    }

    // Check if implant type exists
    const existingImplantType = await ImplantType.findById(implantTypeId);
    if (!existingImplantType) {
      return res.status(404).json({ message: 'Implant type not found' });
    }

    // Check if name is being changed and if it conflicts with another implant type
    if (name.trim().toLowerCase() !== existingImplantType.name.toLowerCase()) {
      const duplicateImplantType = await ImplantType.findOne({
        _id: { $ne: implantTypeId },
        name: { $regex: new RegExp(`^${name.trim()}$`, 'i') },
        isActive: true
      });
      
      if (duplicateImplantType) {
        return res.status(400).json({ message: 'An implant type with this name already exists' });
      }
    }

    // Validate subcategories if provided
    if (subcategories && subcategories.length > 0) {
      for (const subcat of subcategories) {
        if (!subcat.subCategory || !subcat.subCategory.trim()) {
          return res.status(400).json({ message: 'Subcategory name is required' });
        }
        // Length is optional, but if provided must be greater than 0
        if (subcat.length !== undefined && subcat.length !== null && subcat.length !== '' && subcat.length <= 0) {
          return res.status(400).json({ message: 'Subcategory length must be greater than 0 if provided' });
        }
        if (!subcat.surgicalCategory) {
          return res.status(400).json({ message: 'Surgical category is required for subcategory' });
        }
      }
    }

    // Update implant type
    existingImplantType.name = name.trim();
    existingImplantType.subcategories = subcategories || [];
    existingImplantType.updatedBy = req.user?.id;

    const updatedImplantType = await existingImplantType.save();
    const populatedImplantType = await ImplantType.findById(updatedImplantType._id)
      .populate('subcategories.surgicalCategory', 'code description')
      .populate('createdBy', 'firstName lastName')
      .populate('updatedBy', 'firstName lastName');

    res.json(populatedImplantType);
  } catch (error) {
    console.error('Error updating implant type:', error);
    res.status(500).json({ message: 'Server error while updating implant type' });
  }
});

// Delete implant type (soft delete)
router.delete('/:id', async (req, res) => {
  try {
    const implantType = await ImplantType.findById(req.params.id);
    
    if (!implantType) {
      return res.status(404).json({ message: 'Implant type not found' });
    }

    // Soft delete by setting isActive to false
    implantType.isActive = false;
    implantType.updatedBy = req.user?.id;
    await implantType.save();

    res.json({ message: 'Implant type deleted successfully' });
  } catch (error) {
    console.error('Error deleting implant type:', error);
    res.status(500).json({ message: 'Server error while deleting implant type' });
  }
});

module.exports = router;
