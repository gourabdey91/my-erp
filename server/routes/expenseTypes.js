const express = require('express');
const router = express.Router();
const ExpenseType = require('../models/ExpenseType');

// Get all expense types
router.get('/', async (req, res) => {
  try {
    const expenseTypes = await ExpenseType.find({ isActive: true })
    .populate('createdBy', 'firstName lastName')
    .populate('updatedBy', 'firstName lastName')
    .sort({ name: 1 });

    res.json(expenseTypes);
  } catch (error) {
    console.error('Error fetching expense types:', error);
    res.status(500).json({ message: 'Server error while fetching expense types' });
  }
});

// Get expense type by ID
router.get('/:id', async (req, res) => {
  try {
    const expenseType = await ExpenseType.findById(req.params.id)
      .populate('createdBy', 'firstName lastName')
      .populate('updatedBy', 'firstName lastName');

    if (!expenseType) {
      return res.status(404).json({ message: 'Expense type not found' });
    }

    res.json(expenseType);
  } catch (error) {
    console.error('Error fetching expense type:', error);
    res.status(500).json({ message: 'Server error while fetching expense type' });
  }
});

// Create new expense type
router.post('/', async (req, res) => {
  try {
    const { code, name, createdBy } = req.body;

    // Validation
    if (!code || !name || !createdBy) {
      return res.status(400).json({ 
        message: 'Code, name, and created by are required' 
      });
    }

    if (code.length < 3 || code.length > 10) {
      return res.status(400).json({ 
        message: 'Code must be between 3 and 10 characters' 
      });
    }

    if (name.length < 2 || name.length > 100) {
      return res.status(400).json({ 
        message: 'Name must be between 2 and 100 characters' 
      });
    }

    // Check if expense type with same code already exists
    const existingByCode = await ExpenseType.findOne({ 
      code: code.trim().toUpperCase(),
      isActive: true 
    });

    if (existingByCode) {
      return res.status(400).json({ 
        message: 'Expense type with this code already exists' 
      });
    }

    // Check if expense type with same name already exists
    const existingByName = await ExpenseType.findOne({ 
      name: name.trim(),
      isActive: true 
    });

    if (existingByName) {
      return res.status(400).json({ 
        message: 'Expense type with this name already exists' 
      });
    }

    const expenseType = new ExpenseType({
      code: code.trim().toUpperCase(),
      name: name.trim(),
      createdBy,
      updatedBy: createdBy
    });

    await expenseType.save();
    
    const populatedExpenseType = await ExpenseType.findById(expenseType._id)
      .populate('createdBy', 'firstName lastName')
      .populate('updatedBy', 'firstName lastName');

    res.status(201).json(populatedExpenseType);
  } catch (error) {
    console.error('Error creating expense type:', error);
    if (error.code === 11000) {
      const field = Object.keys(error.keyValue)[0];
      const message = field === 'code' ? 
        'Expense type with this code already exists' : 
        'Expense type with this name already exists';
      res.status(400).json({ message });
    } else {
      res.status(500).json({ message: 'Server error while creating expense type' });
    }
  }
});

// Update expense type
router.put('/:id', async (req, res) => {
  try {
    const { code, name, updatedBy } = req.body;

    if (!code || !name || !updatedBy) {
      return res.status(400).json({ 
        message: 'Code, name, and updated by are required' 
      });
    }

    if (code.length < 3 || code.length > 10) {
      return res.status(400).json({ 
        message: 'Code must be between 3 and 10 characters' 
      });
    }

    if (name.length < 2 || name.length > 100) {
      return res.status(400).json({ 
        message: 'Name must be between 2 and 100 characters' 
      });
    }

    const expenseType = await ExpenseType.findById(req.params.id);
    if (!expenseType) {
      return res.status(404).json({ message: 'Expense type not found' });
    }

    // Check if code conflicts with another expense type in the same business unit
    if (code.trim().toUpperCase() !== expenseType.code) {
      const existingByCode = await ExpenseType.findOne({ 
        code: code.trim().toUpperCase(), 
        businessUnit: expenseType.businessUnit,
        isActive: true,
        _id: { $ne: req.params.id }
      });

      if (existingByCode) {
        return res.status(400).json({ 
          message: 'Expense type with this code already exists in this business unit' 
        });
      }
    }

    // Check if name conflicts with another expense type in the same business unit
    if (name.trim() !== expenseType.name) {
      const existingByName = await ExpenseType.findOne({ 
        name: name.trim(), 
        businessUnit: expenseType.businessUnit,
        isActive: true,
        _id: { $ne: req.params.id }
      });

      if (existingByName) {
        return res.status(400).json({ 
          message: 'Expense type with this name already exists in this business unit' 
        });
      }
    }

    expenseType.code = code.trim().toUpperCase();
    expenseType.name = name.trim();
    expenseType.updatedBy = updatedBy;

    await expenseType.save();

    const populatedExpenseType = await ExpenseType.findById(expenseType._id)
      .populate('createdBy', 'firstName lastName')
      .populate('updatedBy', 'firstName lastName');

    res.json(populatedExpenseType);
  } catch (error) {
    console.error('Error updating expense type:', error);
    if (error.code === 11000) {
      const field = Object.keys(error.keyValue)[0];
      const message = field === 'code' ? 
        'Expense type with this code already exists' : 
        'Expense type with this name already exists';
      res.status(400).json({ message });
    } else {
      res.status(500).json({ message: 'Server error while updating expense type' });
    }
  }
});

// Delete expense type (soft delete)
router.delete('/:id', async (req, res) => {
  try {
    const { updatedBy } = req.body;

    if (!updatedBy) {
      return res.status(400).json({ message: 'Updated by is required' });
    }

    const expenseType = await ExpenseType.findById(req.params.id);
    if (!expenseType) {
      return res.status(404).json({ message: 'Expense type not found' });
    }

    expenseType.isActive = false;
    expenseType.updatedBy = updatedBy;
    await expenseType.save();

    res.json({ message: 'Expense type deleted successfully' });
  } catch (error) {
    console.error('Error deleting expense type:', error);
    res.status(500).json({ message: 'Server error while deleting expense type' });
  }
});

module.exports = router;
