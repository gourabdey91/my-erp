const express = require('express');
const router = express.Router();
const CompanyDetails = require('../models/CompanyDetails');

// Get all active companies for current business unit
router.get('/', async (req, res) => {
  try {
    const { businessUnitId } = req.query;
    
    const query = { isActive: true };
    if (businessUnitId) {
      query.businessUnit = businessUnitId;
    }

    const companies = await CompanyDetails.find(query)
      .populate('createdBy', 'firstName lastName')
      .populate('updatedBy', 'firstName lastName')
      .sort({ companyCode: 1 });

    res.json({
      success: true,
      data: companies
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching company details',
      error: error.message
    });
  }
});

// Get company by company code
router.get('/code/:companyCode', async (req, res) => {
  try {
    const { companyCode } = req.params;
    const { businessUnitId } = req.query;

    const query = { 
      companyCode: companyCode.toUpperCase(),
      isActive: true 
    };
    if (businessUnitId) {
      query.businessUnit = businessUnitId;
    }

    const companyDetails = await CompanyDetails.findOne(query)
      .populate('createdBy', 'firstName lastName')
      .populate('updatedBy', 'firstName lastName');

    if (!companyDetails) {
      return res.status(404).json({
        success: false,
        message: `Company with code ${companyCode} not found`
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

// Create new company
router.post('/', async (req, res) => {
  try {
    console.log('Received company details data:', JSON.stringify(req.body, null, 2));
    
    const {
      companyCode,
      companyName,
      legalName,
      address,
      contact,
      compliance,
      businessUnit,
      createdBy,
      updatedBy
    } = req.body;

    // Validate required fields
    if (!companyCode || !companyName || !legalName || !businessUnit || !createdBy) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: companyCode, companyName, legalName, businessUnit, or createdBy'
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

    // Check if company code already exists
    const existingCompany = await CompanyDetails.findOne({ 
      companyCode: companyCode.toUpperCase(),
      businessUnit,
      isActive: true
    });

    if (existingCompany) {
      return res.status(409).json({
        success: false,
        message: `Company code ${companyCode} already exists in this business unit`
      });
    }

    // Create new company
    const newCompany = new CompanyDetails({
      companyCode: companyCode.toUpperCase(),
      companyName,
      legalName,
      address,
      contact,
      compliance,
      businessUnit,
      createdBy
    });

    await newCompany.save();
    
    const populatedCompany = await CompanyDetails.findById(newCompany._id)
      .populate('createdBy', 'firstName lastName');

    res.status(201).json({
      success: true,
      message: 'Company created successfully',
      data: populatedCompany
    });
  } catch (error) {
    console.error('Error creating company:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating company',
      error: error.message,
      details: error.name === 'ValidationError' ? error.errors : undefined
    });
  }
});

// Update company by ID
router.put('/:id', async (req, res) => {
  try {
    const {
      companyCode,
      companyName,
      legalName,
      address,
      contact,
      compliance,
      updatedBy
    } = req.body;

    // If companyCode is being updated, check for duplicates
    if (companyCode) {
      const existingCompany = await CompanyDetails.findOne({ 
        companyCode: companyCode.toUpperCase(),
        _id: { $ne: req.params.id },
        isActive: true
      });

      if (existingCompany) {
        return res.status(409).json({
          success: false,
          message: `Company code ${companyCode} already exists`
        });
      }
    }

    const companyDetails = await CompanyDetails.findByIdAndUpdate(
      req.params.id,
      {
        ...(companyCode && { companyCode: companyCode.toUpperCase() }),
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
        message: 'Company not found'
      });
    }

    res.json({
      success: true,
      message: 'Company updated successfully',
      data: companyDetails
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating company',
      error: error.message
    });
  }
});

// Deactivate company
router.delete('/:id', async (req, res) => {
  try {
    const { updatedBy } = req.body;

    const companyDetails = await CompanyDetails.findByIdAndUpdate(
      req.params.id,
      {
        isActive: false,
        updatedBy
      },
      { new: true }
    )
    .populate('createdBy', 'firstName lastName')
    .populate('updatedBy', 'firstName lastName');

    if (!companyDetails) {
      return res.status(404).json({
        success: false,
        message: 'Company not found'
      });
    }

    res.json({
      success: true,
      message: 'Company deactivated successfully',
      data: companyDetails
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deactivating company',
      error: error.message
    });
  }
});

module.exports = router;
