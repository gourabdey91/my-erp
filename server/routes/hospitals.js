const express = require('express');
const router = express.Router();
const Hospital = require('../models/Hospital');
const Category = require('../models/Category');

// Get all hospitals for a business unit or all hospitals
router.get('/', async (req, res) => {
  try {
    const { businessUnitId } = req.query;
    
    let query = { isActive: true };
    
    // If businessUnitId is provided, filter by it
    if (businessUnitId) {
      query.businessUnit = businessUnitId;
    }

    const hospitals = await Hospital.find(query)
    .populate('surgicalCategories', 'code description')
    .populate('businessUnit', 'name')
    .populate('createdBy', 'firstName lastName')
    .populate('updatedBy', 'firstName lastName')
    .sort({ shortName: 1 });

    res.json(hospitals);
  } catch (error) {
    console.error('Error fetching hospitals:', error);
    res.status(500).json({ message: 'Server error while fetching hospitals' });
  }
});

// Get surgical categories for dropdown
router.get('/categories/:businessUnitId', async (req, res) => {
  try {
    const { businessUnitId } = req.params;
    console.log('Fetching categories for business unit:', businessUnitId);
    
    const categories = await Category.find({
      businessUnitId: businessUnitId,
      isActive: true
    }).select('_id code description').sort({ description: 1 });

    console.log('Found categories:', categories.length);
    console.log('Categories data:', categories);
    
    res.json(categories);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ message: 'Server error while fetching categories' });
  }
});

// Get hospital by ID
router.get('/:id', async (req, res) => {
  try {
    const hospital = await Hospital.findById(req.params.id)
      .populate('surgicalCategories', 'code description')
      .populate('createdBy', 'firstName lastName')
      .populate('updatedBy', 'firstName lastName');

    if (!hospital) {
      return res.status(404).json({ message: 'Hospital not found' });
    }

    res.json(hospital);
  } catch (error) {
    console.error('Error fetching hospital:', error);
    res.status(500).json({ message: 'Server error while fetching hospital' });
  }
});

// Create new hospital
router.post('/', async (req, res) => {
  try {
    const { shortName, legalName, address, gstNumber, stateCode, surgicalCategories, paymentTerms, businessUnit, createdBy } = req.body;

    console.log('=== HOSPITAL CREATION DEBUG ===');
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    console.log('GST Number received:', gstNumber);
    console.log('GST Number uppercased:', gstNumber.toUpperCase());

    // Validation
    if (!shortName || !legalName || !address || !gstNumber || !stateCode || !surgicalCategories || !businessUnit || !createdBy) {
      return res.status(400).json({ 
        message: 'All fields are required' 
      });
    }

    if (shortName.length < 2 || shortName.length > 50) {
      return res.status(400).json({ 
        message: 'Short name must be between 2 and 50 characters' 
      });
    }

    if (legalName.length < 2 || legalName.length > 100) {
      return res.status(400).json({ 
        message: 'Legal name must be between 2 and 100 characters' 
      });
    }

    if (address.length > 200) {
      return res.status(400).json({ 
        message: 'Address cannot exceed 200 characters' 
      });
    }

    if (!Array.isArray(surgicalCategories) || surgicalCategories.length === 0) {
      return res.status(400).json({ 
        message: 'At least one surgical category must be selected' 
      });
    }

    // Validate GST number format
    const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}[Z]{1}[0-9A-Z]{1}$/;
    if (!gstRegex.test(gstNumber.toUpperCase())) {
      return res.status(400).json({ 
        message: 'Please enter a valid GST number' 
      });
    }

    // Check if GST number already exists globally (since hospitals are now global master data)
    console.log('Checking for existing GST number...');
    const existingByGST = await Hospital.findOne({ 
      gstNumber: gstNumber.toUpperCase(), 
      isActive: true 
    });

    console.log('Existing hospital with GST:', existingByGST ? existingByGST.shortName : 'None found');

    if (existingByGST) {
      console.log('GST conflict detected - returning error');
      return res.status(400).json({ 
        message: 'Hospital with this GST number already exists. GST numbers must be unique.' 
      });
    }

    // Verify surgical categories exist (remove business unit dependency)
    const validCategories = await Category.find({
      _id: { $in: surgicalCategories },
      isActive: true
    });

    if (validCategories.length !== surgicalCategories.length) {
      return res.status(400).json({ 
        message: 'One or more selected surgical categories are invalid' 
      });
    }

    console.log('Creating hospital object...');
    const hospital = new Hospital({
      shortName: shortName.trim(),
      legalName: legalName.trim(),
      address: address.trim(),
      gstNumber: gstNumber.toUpperCase().trim(),
      stateCode: stateCode.trim(),
      surgicalCategories,
      paymentTerms: paymentTerms || 30,
      businessUnit,
      createdBy,
      updatedBy: createdBy
    });

    console.log('Saving hospital to database...');
    await hospital.save();
    console.log('Hospital saved successfully with ID:', hospital._id);
    
    const populatedHospital = await Hospital.findById(hospital._id)
      .populate('surgicalCategories', 'code description')
      .populate('createdBy', 'firstName lastName')
      .populate('updatedBy', 'firstName lastName');

    res.status(201).json(populatedHospital);
  } catch (error) {
    console.error('Error creating hospital:', error);
    if (error.code === 11000) {
      res.status(400).json({ message: 'Hospital with this information already exists' });
    } else if (error.name === 'ValidationError') {
      const message = Object.values(error.errors)[0].message;
      res.status(400).json({ message });
    } else {
      res.status(500).json({ message: 'Server error while creating hospital' });
    }
  }
});

// Update hospital
router.put('/:id', async (req, res) => {
  try {
    const { shortName, legalName, address, gstNumber, stateCode, surgicalCategories, paymentTerms, updatedBy } = req.body;

    if (!shortName || !legalName || !address || !gstNumber || !stateCode || !surgicalCategories || !updatedBy) {
      return res.status(400).json({ 
        message: 'All fields are required' 
      });
    }

    if (shortName.length < 2 || shortName.length > 50) {
      return res.status(400).json({ 
        message: 'Short name must be between 2 and 50 characters' 
      });
    }

    if (legalName.length < 2 || legalName.length > 100) {
      return res.status(400).json({ 
        message: 'Legal name must be between 2 and 100 characters' 
      });
    }

    if (address.length > 200) {
      return res.status(400).json({ 
        message: 'Address cannot exceed 200 characters' 
      });
    }

    if (!Array.isArray(surgicalCategories) || surgicalCategories.length === 0) {
      return res.status(400).json({ 
        message: 'At least one surgical category must be selected' 
      });
    }

    // Validate GST number format
    const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}[Z]{1}[0-9A-Z]{1}$/;
    if (!gstRegex.test(gstNumber.toUpperCase())) {
      return res.status(400).json({ 
        message: 'Please enter a valid GST number' 
      });
    }

    const hospital = await Hospital.findById(req.params.id);
    if (!hospital) {
      return res.status(404).json({ message: 'Hospital not found' });
    }

    // Check if GST number conflicts with another hospital globally
    if (gstNumber.toUpperCase().trim() !== hospital.gstNumber) {
      const existingByGST = await Hospital.findOne({ 
        gstNumber: gstNumber.toUpperCase().trim(), 
        isActive: true,
        _id: { $ne: req.params.id }
      });

      if (existingByGST) {
        return res.status(400).json({ 
          message: 'Hospital with this GST number already exists. GST numbers must be unique.' 
        });
      }
    }

    // Verify surgical categories exist (remove business unit dependency)
    const validCategories = await Category.find({
      _id: { $in: surgicalCategories },
      isActive: true
    });

    if (validCategories.length !== surgicalCategories.length) {
      return res.status(400).json({ 
        message: 'One or more selected surgical categories are invalid' 
      });
    }

    hospital.shortName = shortName.trim();
    hospital.legalName = legalName.trim();
    hospital.address = address.trim();
    hospital.gstNumber = gstNumber.toUpperCase().trim();
    hospital.stateCode = stateCode.trim();
    hospital.surgicalCategories = surgicalCategories;
    hospital.paymentTerms = paymentTerms || 30;
    hospital.updatedBy = updatedBy;

    await hospital.save();

    const populatedHospital = await Hospital.findById(hospital._id)
      .populate('surgicalCategories', 'code description')
      .populate('createdBy', 'firstName lastName')
      .populate('updatedBy', 'firstName lastName');

    res.json(populatedHospital);
  } catch (error) {
    console.error('Error updating hospital:', error);
    if (error.code === 11000) {
      res.status(400).json({ message: 'Hospital with this information already exists' });
    } else if (error.name === 'ValidationError') {
      const message = Object.values(error.errors)[0].message;
      res.status(400).json({ message });
    } else {
      res.status(500).json({ message: 'Server error while updating hospital' });
    }
  }
});

// Delete hospital (soft delete)
router.delete('/:id', async (req, res) => {
  try {
    const { updatedBy } = req.body;

    if (!updatedBy) {
      return res.status(400).json({ message: 'Updated by is required' });
    }

    const hospital = await Hospital.findById(req.params.id);
    if (!hospital) {
      return res.status(404).json({ message: 'Hospital not found' });
    }

    hospital.isActive = false;
    hospital.updatedBy = updatedBy;
    await hospital.save();

    res.json({ message: 'Hospital deleted successfully' });
  } catch (error) {
    console.error('Error deleting hospital:', error);
    res.status(500).json({ message: 'Server error while deleting hospital' });
  }
});

module.exports = router;
