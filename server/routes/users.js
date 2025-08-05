const express = require('express');
const router = express.Router();
const User = require('../models/User');

// GET /api/users - Get all users
router.get('/', async (req, res) => {
  try {
    const users = await User.find({})
      .populate('businessUnits', 'code name')
      .populate('defaultBusinessUnit', 'code name')
      .sort({ createdAt: -1 });
    res.json({
      success: true,
      data: users,
      count: users.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching users',
      error: error.message
    });
  }
});

// GET /api/users/:id - Get user by ID
router.get('/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .populate('businessUnits', 'code name')
      .populate('defaultBusinessUnit', 'code name');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching user',
      error: error.message
    });
  }
});

// POST /api/users - Create new user
router.post('/', async (req, res) => {
  console.log('=== CREATE USER ROUTE HIT ===');
  try {
    console.log('Received request body:', req.body);
    const { firstName, lastName, email, password, phone, role, status, businessUnits, defaultBusinessUnit } = req.body;
    console.log('Extracted fields:', { firstName, lastName, email, password: password ? '[HIDDEN]' : 'MISSING', phone, role, status, businessUnits, defaultBusinessUnit });

    // Check if user with email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      console.log('User already exists with email:', email);
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists'
      });
    }

    console.log('Creating new user...');
    const newUser = new User({
      firstName,
      lastName,
      email,
      password,
      phone,
      role,
      status,
      businessUnits: businessUnits || [],
      defaultBusinessUnit: defaultBusinessUnit || null
    });

    console.log('User object created, saving...');
    const savedUser = await newUser.save();
    console.log('User saved successfully');
    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: savedUser
    });
  } catch (error) {
    console.error('Error in create user route:', error);
    res.status(400).json({
      success: false,
      message: 'Error creating user',
      error: error.message
    });
  }
});

// PUT /api/users/:id - Update user
router.put('/:id', async (req, res) => {
  try {
    const { firstName, lastName, email, password, phone, role, status, businessUnits, defaultBusinessUnit } = req.body;

    // Check if another user with the same email exists
    if (email) {
      const existingUser = await User.findOne({ 
        email, 
        _id: { $ne: req.params.id } 
      });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Another user with this email already exists'
        });
      }
    }

    // Prepare update data - only include password if it's provided
    const updateData = {
      firstName,
      lastName,
      email,
      phone,
      role,
      status,
      businessUnits: businessUnits || [],
      defaultBusinessUnit: defaultBusinessUnit || null,
      updatedAt: Date.now()
    };

    // Only add password to update if it's provided (for editing)
    if (password && password.trim() !== '') {
      updateData.password = password;
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'User updated successfully',
      data: updatedUser
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Error updating user',
      error: error.message
    });
  }
});

// DELETE /api/users/:id - Delete user
router.delete('/:id', async (req, res) => {
  try {
    const deletedUser = await User.findByIdAndDelete(req.params.id);
    if (!deletedUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'User deleted successfully',
      data: deletedUser
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting user',
      error: error.message
    });
  }
});

// PATCH /api/users/:id/status - Update user status
router.patch('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    
    if (!['active', 'inactive'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be "active" or "inactive"'
      });
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      { status, updatedAt: Date.now() },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'User status updated successfully',
      data: updatedUser
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating user status',
      error: error.message
    });
  }
});

module.exports = router;
