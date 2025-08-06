const express = require('express');
const router = express.Router();
const Doctor = require('../models/Doctor');
const Category = require('../models/Category');

// Get all doctors for a business unit
router.get('/', async (req, res) => {
  try {
    const { businessUnitId } = req.query;
    
    if (!businessUnitId) {
      return res.status(400).json({ message: 'Business unit ID is required' });
    }

    const doctors = await Doctor.find({ 
      businessUnit: businessUnitId,
      isActive: true 
    })
    .populate('surgicalCategories', 'code description')
    .populate('createdBy', 'firstName lastName')
    .populate('updatedBy', 'firstName lastName')
    .sort({ name: 1 });

    res.json(doctors);
  } catch (error) {
    console.error('Error fetching doctors:', error);
    res.status(500).json({ message: 'Server error while fetching doctors' });
  }
});

// Get surgical categories for dropdown
router.get('/categories/:businessUnitId', async (req, res) => {
  try {
    const { businessUnitId } = req.params;
    
    const categories = await Category.find({
      businessUnitId: businessUnitId,
      isActive: true
    }).select('_id code description').sort({ description: 1 });

    res.json(categories);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ message: 'Server error while fetching categories' });
  }
});

// Get doctor by ID
router.get('/:id', async (req, res) => {
  try {
    const doctor = await Doctor.findById(req.params.id)
      .populate('surgicalCategories', 'code description')
      .populate('createdBy', 'firstName lastName')
      .populate('updatedBy', 'firstName lastName');

    if (!doctor) {
      return res.status(404).json({ message: 'Doctor not found' });
    }

    res.json(doctor);
  } catch (error) {
    console.error('Error fetching doctor:', error);
    res.status(500).json({ message: 'Server error while fetching doctor' });
  }
});

// Create new doctor
router.post('/', async (req, res) => {
  try {
    const { name, surgicalCategories, phoneNumber, email, businessUnit, createdBy } = req.body;

    // Validation
    if (!name || !surgicalCategories || !businessUnit || !createdBy) {
      return res.status(400).json({ 
        message: 'Name, surgical categories, business unit, and created by are required' 
      });
    }

    if (name.length < 2 || name.length > 50) {
      return res.status(400).json({ 
        message: 'Name must be between 2 and 50 characters' 
      });
    }

    if (!Array.isArray(surgicalCategories) || surgicalCategories.length === 0) {
      return res.status(400).json({ 
        message: 'At least one surgical category must be selected' 
      });
    }

    // Validate phone number format if provided
    if (phoneNumber && !/^\+?[\d\s\-\(\)]{10,15}$/.test(phoneNumber)) {
      return res.status(400).json({ 
        message: 'Please enter a valid phone number' 
      });
    }

    // Validate email format if provided
    if (email && !/^[\w\.-]+@[\w\.-]+\.\w+$/.test(email)) {
      return res.status(400).json({ 
        message: 'Please enter a valid email address' 
      });
    }

    // Check if email already exists in this business unit (only if email is provided)
    if (email) {
      const existingByEmail = await Doctor.findOne({ 
        email: email.toLowerCase().trim(), 
        businessUnit,
        isActive: true 
      });

      if (existingByEmail) {
        return res.status(400).json({ 
          message: 'Doctor with this email already exists in this business unit' 
        });
      }
    }

    // Verify surgical categories exist
    const validCategories = await Category.find({
      _id: { $in: surgicalCategories },
      businessUnitId: businessUnit,
      isActive: true
    });

    if (validCategories.length !== surgicalCategories.length) {
      return res.status(400).json({ 
        message: 'One or more selected surgical categories are invalid' 
      });
    }

    const doctor = new Doctor({
      name: name.trim(),
      surgicalCategories,
      phoneNumber: phoneNumber ? phoneNumber.trim() : undefined,
      email: email ? email.toLowerCase().trim() : undefined,
      businessUnit,
      createdBy,
      updatedBy: createdBy
    });

    await doctor.save();
    
    const populatedDoctor = await Doctor.findById(doctor._id)
      .populate('surgicalCategories', 'code description')
      .populate('createdBy', 'firstName lastName')
      .populate('updatedBy', 'firstName lastName');

    res.status(201).json(populatedDoctor);
  } catch (error) {
    console.error('Error creating doctor:', error);
    if (error.code === 11000) {
      const field = Object.keys(error.keyValue)[0];
      const message = field === 'email' ? 
        'Doctor with this email already exists' : 
        'Doctor with this ID already exists';
      res.status(400).json({ message });
    } else if (error.name === 'ValidationError') {
      const message = Object.values(error.errors)[0].message;
      res.status(400).json({ message });
    } else {
      res.status(500).json({ message: 'Server error while creating doctor' });
    }
  }
});

// Update doctor
router.put('/:id', async (req, res) => {
  try {
    const { name, surgicalCategories, phoneNumber, email, updatedBy } = req.body;

    if (!name || !surgicalCategories || !updatedBy) {
      return res.status(400).json({ 
        message: 'Name, surgical categories, and updated by are required' 
      });
    }

    if (name.length < 2 || name.length > 50) {
      return res.status(400).json({ 
        message: 'Name must be between 2 and 50 characters' 
      });
    }

    if (!Array.isArray(surgicalCategories) || surgicalCategories.length === 0) {
      return res.status(400).json({ 
        message: 'At least one surgical category must be selected' 
      });
    }

    // Validate phone number format if provided
    if (phoneNumber && !/^\+?[\d\s\-\(\)]{10,15}$/.test(phoneNumber)) {
      return res.status(400).json({ 
        message: 'Please enter a valid phone number' 
      });
    }

    // Validate email format if provided
    if (email && !/^[\w\.-]+@[\w\.-]+\.\w+$/.test(email)) {
      return res.status(400).json({ 
        message: 'Please enter a valid email address' 
      });
    }

    const doctor = await Doctor.findById(req.params.id);
    if (!doctor) {
      return res.status(404).json({ message: 'Doctor not found' });
    }

    // Check if email conflicts with another doctor in the same business unit (only if email is provided)
    if (email && email.toLowerCase().trim() !== doctor.email) {
      const existingByEmail = await Doctor.findOne({ 
        email: email.toLowerCase().trim(), 
        businessUnit: doctor.businessUnit,
        isActive: true,
        _id: { $ne: req.params.id }
      });

      if (existingByEmail) {
        return res.status(400).json({ 
          message: 'Doctor with this email already exists in this business unit' 
        });
      }
    }

    // Verify surgical categories exist
    const validCategories = await Category.find({
      _id: { $in: surgicalCategories },
      businessUnitId: doctor.businessUnit,
      isActive: true
    });

    if (validCategories.length !== surgicalCategories.length) {
      return res.status(400).json({ 
        message: 'One or more selected surgical categories are invalid' 
      });
    }

    doctor.name = name.trim();
    doctor.surgicalCategories = surgicalCategories;
    doctor.phoneNumber = phoneNumber ? phoneNumber.trim() : undefined;
    doctor.email = email ? email.toLowerCase().trim() : undefined;
    doctor.updatedBy = updatedBy;

    await doctor.save();

    const populatedDoctor = await Doctor.findById(doctor._id)
      .populate('surgicalCategories', 'code description')
      .populate('createdBy', 'firstName lastName')
      .populate('updatedBy', 'firstName lastName');

    res.json(populatedDoctor);
  } catch (error) {
    console.error('Error updating doctor:', error);
    if (error.code === 11000) {
      const field = Object.keys(error.keyValue)[0];
      const message = field === 'email' ? 
        'Doctor with this email already exists' : 
        'Doctor with this ID already exists';
      res.status(400).json({ message });
    } else if (error.name === 'ValidationError') {
      const message = Object.values(error.errors)[0].message;
      res.status(400).json({ message });
    } else {
      res.status(500).json({ message: 'Server error while updating doctor' });
    }
  }
});

// Delete doctor (soft delete)
router.delete('/:id', async (req, res) => {
  try {
    const { updatedBy } = req.body;

    if (!updatedBy) {
      return res.status(400).json({ message: 'Updated by is required' });
    }

    const doctor = await Doctor.findById(req.params.id);
    if (!doctor) {
      return res.status(404).json({ message: 'Doctor not found' });
    }

    doctor.isActive = false;
    doctor.updatedBy = updatedBy;
    await doctor.save();

    res.json({ message: 'Doctor deleted successfully' });
  } catch (error) {
    console.error('Error deleting doctor:', error);
    res.status(500).json({ message: 'Server error while deleting doctor' });
  }
});

module.exports = router;
