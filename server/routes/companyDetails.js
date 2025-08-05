const express = require('express');
const router = express.Router();
const CompanyDetails = require('../models/CompanyDetails');

// Get company details
router.get('/', async (req, res) => {
  try {
    const companyDetails = await CompanyDetails.findOne({ isActive: true })
      .populate('createdBy', 'firstName lastName')
      .populate('updatedBy', 'firstName lastName');

    if (!companyDetails) {
      return res.status(404).json({
        success: false,
        message: 'Company details not found'
      });
    }

    res.json({
      success: true,
      data: companyDetails
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching company details',
      error: error.message
    });
  }
});

// Create or update company details
router.post('/', async (req, res) => {
  try {
    console.log('Received company details data:', JSON.stringify(req.body, null, 2));
    
    const {
      companyName,
      legalName,
      address,
      contact,
      compliance,
      createdBy,
      updatedBy
    } = req.body;

    // Validate required fields
    if (!companyName || !legalName || !createdBy) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: companyName, legalName, or createdBy'
      });
    }

    // Validate nested objects exist
    if (!address || !contact || !compliance) {
      return res.status(400).json({
        success: false,
        message: 'Missing required sections: address, contact, or compliance'
      });
    }

    // Validate required nested fields
    if (!address.street || !address.city || !address.state || !address.pincode) {
      return res.status(400).json({
        success: false,
        message: 'Missing required address fields'
      });
    }

    if (!contact.email || !contact.mobile1) {
      return res.status(400).json({
        success: false,
        message: 'Missing required contact fields'
      });
    }

    if (!compliance.gstNumber || !compliance.stateCode || !compliance.dlNumber) {
      return res.status(400).json({
        success: false,
        message: 'Missing required compliance fields'
      });
    }

    // Check if company details already exist
    const existingDetails = await CompanyDetails.findOne({ isActive: true });

    if (existingDetails) {
      // Update existing details
      const updatedDetails = await CompanyDetails.findByIdAndUpdate(
        existingDetails._id,
        {
          companyName,
          legalName,
          address,
          contact,
          compliance,
          updatedBy: updatedBy || createdBy
        },
        { new: true, runValidators: true }
      )
      .populate('createdBy', 'firstName lastName')
      .populate('updatedBy', 'firstName lastName');

      return res.json({
        success: true,
        message: 'Company details updated successfully',
        data: updatedDetails
      });
    } else {
      // Create new details
      const companyDetails = new CompanyDetails({
        companyName,
        legalName,
        address,
        contact,
        compliance,
        createdBy
      });

      await companyDetails.save();
      
      const populatedDetails = await CompanyDetails.findById(companyDetails._id)
        .populate('createdBy', 'firstName lastName');

      res.status(201).json({
        success: true,
        message: 'Company details created successfully',
        data: populatedDetails
      });
    }
  } catch (error) {
    console.error('Error saving company details:', error);
    res.status(500).json({
      success: false,
      message: 'Error saving company details',
      error: error.message,
      details: error.name === 'ValidationError' ? error.errors : undefined
    });
  }
});

// Update company details
router.put('/:id', async (req, res) => {
  try {
    const {
      companyName,
      legalName,
      address,
      contact,
      compliance,
      updatedBy
    } = req.body;

    const companyDetails = await CompanyDetails.findByIdAndUpdate(
      req.params.id,
      {
        companyName,
        legalName,
        address,
        contact,
        compliance,
        updatedBy
      },
      { new: true, runValidators: true }
    )
    .populate('createdBy', 'firstName lastName')
    .populate('updatedBy', 'firstName lastName');

    if (!companyDetails) {
      return res.status(404).json({
        success: false,
        message: 'Company details not found'
      });
    }

    res.json({
      success: true,
      message: 'Company details updated successfully',
      data: companyDetails
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating company details',
      error: error.message
    });
  }
});

module.exports = router;
