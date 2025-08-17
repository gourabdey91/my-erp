const express = require('express');
const router = express.Router();
const Template = require('../models/Template');
const Category = require('../models/Category');
const Procedure = require('../models/Procedure');
const Hospital = require('../models/Hospital');
const MaterialMaster = require('../models/MaterialMaster');

// Helper function to validate surgical category materials
const validateSurgicalCategoryMaterials = async (templateData) => {
  // Only validate if template has surgical category and items
  if (!templateData.surgicalCategory || !templateData.items || templateData.items.length === 0) {
    return { isValid: true };
  }

  try {
    console.log('🔍 Validating surgical category materials for template...');
    
    // Get all materials for the surgical category
    const categoryMaterials = await MaterialMaster.find({
      surgicalCategory: templateData.surgicalCategory,
      isActive: true
    });

    if (categoryMaterials.length === 0) {
      return {
        isValid: false,
        error: 'No materials found for the selected surgical category'
      };
    }

    // Get list of category's material numbers
    const categoryMaterialNumbers = categoryMaterials.map(material => material.materialNumber);
    
    // Check if all template materials belong to the surgical category
    const wrongCategoryMaterials = templateData.items.filter(item => 
      !categoryMaterialNumbers.includes(item.materialNumber)
    );

    if (wrongCategoryMaterials.length > 0) {
      const materialList = wrongCategoryMaterials.map(m => m.materialNumber).join(', ');
      return {
        isValid: false,
        error: `The following materials do not belong to the selected surgical category: ${materialList}`
      };
    }

    console.log('✅ All materials belong to the selected surgical category');
    return { isValid: true };

  } catch (error) {
    console.error('Error validating surgical category materials:', error);
    return {
      isValid: false,
      error: 'Unable to validate surgical category materials'
    };
  }
};

// Helper function to validate hospital materials
const validateHospitalMaterials = async (templateData) => {
  // Only validate if template is hospital-dependent and has items
  if (!templateData.hospitalDependent || !templateData.hospital || !templateData.items || templateData.items.length === 0) {
    return { isValid: true };
  }

  try {
    console.log('🔍 Validating hospital materials for template...');
    
    // Get hospital's assigned materials
    const hospital = await Hospital.findById(templateData.hospital).populate('assignedMaterials');
    
    if (!hospital) {
      return {
        isValid: false,
        error: 'Selected hospital not found'
      };
    }

    if (!hospital.assignedMaterials || hospital.assignedMaterials.length === 0) {
      return {
        isValid: false,
        error: 'Selected hospital has no assigned materials'
      };
    }

    // Get list of hospital's material numbers
    const hospitalMaterialNumbers = hospital.assignedMaterials.map(material => material.materialNumber);
    
    // Check if all template materials exist in hospital's assigned materials
    const unavailableMaterials = templateData.items.filter(item => 
      !hospitalMaterialNumbers.includes(item.materialNumber)
    );

    if (unavailableMaterials.length > 0) {
      const materialList = unavailableMaterials.map(m => m.materialNumber).join(', ');
      return {
        isValid: false,
        error: `The following materials are not available in the selected hospital: ${materialList}`
      };
    }

    console.log('✅ All materials are available in the selected hospital');
    return { isValid: true };

  } catch (error) {
    console.error('Error validating hospital materials:', error);
    return {
      isValid: false,
      error: 'Unable to validate hospital materials'
    };
  }
};

// Get all templates with pagination, filters, and search
router.get('/', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = '',
      surgicalCategory = '',
      surgicalProcedure = '',
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const query = { isActive: true };

    // Add search functionality
    if (search) {
      query.$or = [
        { templateNumber: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    // Add filters
    if (surgicalCategory) query.surgicalCategory = surgicalCategory;
    if (surgicalProcedure) query.surgicalProcedure = surgicalProcedure;

    // Execute query with pagination
    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      sort: { [sortBy]: sortOrder === 'desc' ? -1 : 1 },
      populate: [
        { path: 'surgicalCategory', select: 'description code' },
        { 
          path: 'surgicalProcedure', 
          select: 'name code totalLimit currency items',
          populate: {
            path: 'items.surgicalCategoryId',
            select: 'name description code'
          }
        },
        { path: 'createdBy', select: 'name email' },
        { path: 'updatedBy', select: 'name email' },
        { path: 'businessUnit', select: 'name code' }
      ]
    };

    const result = await Template.paginate(query, options);

    res.json({
      success: true,
      data: result.docs,
      pagination: {
        currentPage: result.page,
        totalPages: result.totalPages,
        totalItems: result.totalDocs,
        itemsPerPage: result.limit,
        hasNextPage: result.hasNextPage,
        hasPrevPage: result.hasPrevPage
      }
    });
  } catch (error) {
    console.error('Error fetching templates:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching templates',
      error: error.message
    });
  }
});

// Get template by ID
router.get('/:id', async (req, res) => {
  try {
    const template = await Template.findById(req.params.id)
      .populate('surgicalCategory', 'description code')
      .populate('hospital', 'shortName legalName gstNumber stateCode')
      .populate({
        path: 'surgicalProcedure',
        select: 'name code totalLimit currency items',
        populate: {
          path: 'items.surgicalCategoryId',
          select: 'name description code'
        }
      })
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email')
      .populate('businessUnit', 'name code');

    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Template not found'
      });
    }

    res.json({
      success: true,
      data: template
    });
  } catch (error) {
    console.error('Error fetching template:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching template',
      error: error.message
    });
  }
});

// Create new template
router.post('/', async (req, res) => {
  try {
    const templateData = req.body;
    
    // Validate required fields
    if (!templateData.description || !templateData.surgicalCategory || !templateData.limit) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: description, surgicalCategory, and limit are required'
      });
    }

    // Set createdBy from request user or body
    if (req.user) {
      templateData.createdBy = req.user._id;
    } else if (!templateData.createdBy) {
      return res.status(400).json({
        success: false,
        message: 'createdBy is required'
      });
    }

    // Validate surgical category materials
    const categoryValidation = await validateSurgicalCategoryMaterials(templateData);
    if (!categoryValidation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Surgical category material validation failed',
        error: categoryValidation.error
      });
    }

    // Validate hospital materials if hospital-dependent
    const materialValidation = await validateHospitalMaterials(templateData);
    if (!materialValidation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Hospital material validation failed',
        error: materialValidation.error
      });
    }

    const template = new Template(templateData);
    await template.save();

    // Populate the saved template for response
    const populatedTemplate = await Template.findById(template._id)
      .populate('surgicalCategory', 'description code')
      .populate('hospital', 'shortName legalName gstNumber stateCode')
      .populate('surgicalProcedure', 'name code totalLimit currency')
      .populate('createdBy', 'name email')
      .populate('businessUnit', 'name code');

    res.status(201).json({
      success: true,
      data: populatedTemplate,
      message: 'Template created successfully'
    });
  } catch (error) {
    console.error('Error creating template:', error);
    
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Template number already exists',
        error: error.message
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error creating template',
      error: error.message
    });
  }
});

// Update template
router.put('/:id', async (req, res) => {
  try {
    const templateData = req.body;
    
    // Set updatedBy from request user or body
    if (req.user) {
      templateData.updatedBy = req.user._id;
    } else if (!templateData.updatedBy) {
      return res.status(400).json({
        success: false,
        message: 'updatedBy is required'
      });
    }

    // Validate surgical category materials
    const categoryValidation = await validateSurgicalCategoryMaterials(templateData);
    if (!categoryValidation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Surgical category material validation failed',
        error: categoryValidation.error
      });
    }

    // Validate hospital materials if hospital-dependent
    const materialValidation = await validateHospitalMaterials(templateData);
    if (!materialValidation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Hospital material validation failed',
        error: materialValidation.error
      });
    }

    const template = await Template.findByIdAndUpdate(
      req.params.id,
      templateData,
      { new: true, runValidators: true }
    )
    .populate('surgicalCategory', 'description code')
    .populate('surgicalProcedure', 'name code totalLimit currency')
    .populate('createdBy', 'name email')
    .populate('updatedBy', 'name email')
    .populate('businessUnit', 'name code')
    .populate('hospital', 'name code');

    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Template not found'
      });
    }

    res.json({
      success: true,
      data: template,
      message: 'Template updated successfully'
    });
  } catch (error) {
    console.error('Error updating template:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating template',
      error: error.message
    });
  }
});

// Soft delete template
router.delete('/:id', async (req, res) => {
  try {
    const { updatedBy } = req.body;

    if (!updatedBy && !req.user) {
      return res.status(400).json({ 
        success: false,
        message: 'updatedBy is required' 
      });
    }

    const template = await Template.findById(req.params.id);
    if (!template) {
      return res.status(404).json({ 
        success: false,
        message: 'Template not found' 
      });
    }

    // Use findByIdAndUpdate to avoid validation issues during soft delete
    const updatedTemplate = await Template.findByIdAndUpdate(
      req.params.id,
      { 
        isActive: false,
        updatedBy: updatedBy || req.user._id,
        updatedAt: new Date()
      },
      { new: true, runValidators: false }
    );

    res.json({ 
      success: true,
      message: 'Template deleted successfully' 
    });
  } catch (error) {
    console.error('Error deleting template:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error while deleting template',
      error: error.message 
    });
  }
});

// Get template dropdown options
router.get('/dropdown/options', async (req, res) => {
  try {
    const templates = await Template.find(
      { isActive: true },
      { templateNumber: 1, description: 1, surgicalCategory: 1, surgicalProcedure: 1 }
    )
    .populate('surgicalCategory', 'description code')
    .populate('surgicalProcedure', 'name code')
    .sort({ templateNumber: 1 });

    res.json({
      success: true,
      data: templates
    });
  } catch (error) {
    console.error('Error fetching template dropdown options:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching template dropdown options',
      error: error.message
    });
  }
});

module.exports = router;
