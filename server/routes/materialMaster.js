const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const MaterialMaster = require('../models/MaterialMaster');
const Category = require('../models/Category');
const ImplantType = require('../models/ImplantType');
const BusinessUnit = require('../models/BusinessUnit');

// Get all materials with pagination and filtering
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const search = req.query.search || '';
    const surgicalCategory = req.query.surgicalCategory;
    const implantType = req.query.implantType;
    const subCategory = req.query.subCategory;
    const lengthMm = req.query.lengthMm;
    const businessUnitId = req.query.businessUnitId;
    const isActive = req.query.isActive !== undefined ? req.query.isActive === 'true' : true;

    // Build filter query
    const filter = { isActive };

    // Search in material number and description
    if (search) {
      filter.$or = [
        { materialNumber: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    if (surgicalCategory) {
      filter.surgicalCategory = surgicalCategory;
    }

    if (implantType) {
      // If implantType is passed as a string (name), find the ObjectId first
      if (typeof implantType === 'string' && !mongoose.Types.ObjectId.isValid(implantType)) {
        const implantTypeDoc = await ImplantType.findOne({ name: implantType });
        if (implantTypeDoc) {
          filter.implantType = implantTypeDoc._id;
        } else {
          // If implant type not found, return empty results
          return res.json({
            materials: [],
            pagination: {
              page,
              limit,
              total: 0,
              totalPages: 0
            }
          });
        }
      } else {
        filter.implantType = implantType;
      }
    }

    if (subCategory) {
      filter.subCategory = { $regex: subCategory, $options: 'i' };
    }

    if (lengthMm) {
      filter.lengthMm = parseFloat(lengthMm);
    }

    if (businessUnitId) {
      filter.businessUnitId = businessUnitId;
    }

    const skip = (page - 1) * limit;

    const materials = await MaterialMaster.find(filter)
      .populate('surgicalCategory', 'code description')
      .populate('implantType', 'name')
      .populate('businessUnitId', 'code name')
      .populate('createdBy', 'firstName lastName')
      .populate('updatedBy', 'firstName lastName')
      .sort({ materialNumber: 1 })
      .skip(skip)
      .limit(limit);

    const total = await MaterialMaster.countDocuments(filter);
    const totalPages = Math.ceil(total / limit);

    res.json({
      materials,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Error fetching materials:', error);
    res.status(500).json({ message: 'Server error while fetching materials' });
  }
});

// Get dropdown data for filters
router.get('/dropdown-data', async (req, res) => {
  try {
    const [categories, implantTypes, businessUnits] = await Promise.all([
      Category.find({ isActive: true }).select('_id code description').sort({ description: 1 }),
      ImplantType.find({ isActive: true }).select('_id name subcategories').sort({ name: 1 }),
      BusinessUnit.find({ isActive: true }).select('_id code name').sort({ code: 1 })
    ]);

    res.json({
      categories,
      implantTypes,
      businessUnits
    });
  } catch (error) {
    console.error('Error fetching dropdown data:', error);
    res.status(500).json({ message: 'Server error while fetching dropdown data' });
  }
});

// Get subcategories by implant type
router.get('/subcategories/:implantTypeId', async (req, res) => {
  try {
    const implantType = await ImplantType.findById(req.params.implantTypeId)
      .populate('subcategories.surgicalCategory', 'code description');
    
    if (!implantType) {
      return res.status(404).json({ message: 'Implant type not found' });
    }

    res.json(implantType.subcategories);
  } catch (error) {
    console.error('Error fetching subcategories:', error);
    res.status(500).json({ message: 'Server error while fetching subcategories' });
  }
});

// Create new material
router.post('/', async (req, res) => {
  try {
    const {
      businessUnitId,
      materialNumber,
      description,
      hsnCode,
      gstPercentage,
      currency = 'INR',
      mrp,
      institutionalPrice,
      distributionPrice,
      surgicalCategory,
      implantType,
      subCategory,
      lengthMm
    } = req.body;

    // Validate required fields
    if (!businessUnitId) {
      return res.status(400).json({ message: 'Business unit is required' });
    }

    if (!materialNumber || !materialNumber.trim()) {
      return res.status(400).json({ message: 'Material number is required' });
    }
    
    if (!description || !description.trim()) {
      return res.status(400).json({ message: 'Description is required' });
    }

    if (!hsnCode || !hsnCode.trim()) {
      return res.status(400).json({ message: 'HSN code is required' });
    }

    if (gstPercentage === undefined || gstPercentage < 0 || gstPercentage > 100) {
      return res.status(400).json({ message: 'Valid GST percentage is required (0-100)' });
    }

    if (!mrp || mrp <= 0) {
      return res.status(400).json({ message: 'Valid MRP is required' });
    }

    if (!institutionalPrice || institutionalPrice <= 0) {
      return res.status(400).json({ message: 'Valid institutional price is required' });
    }

    if (!distributionPrice || distributionPrice <= 0) {
      return res.status(400).json({ message: 'Valid distribution price is required' });
    }

    if (!surgicalCategory) {
      return res.status(400).json({ message: 'Surgical category is required' });
    }

    // ImplantType and subCategory are optional
    // Only validate if implantType is provided, then subCategory should also be provided
    if (implantType && (!subCategory || !subCategory.trim())) {
      return res.status(400).json({ message: 'Subcategory is required when implant type is provided' });
    }

    // Length is optional - only validate if provided and should allow 0 as valid
    if (lengthMm !== null && lengthMm !== undefined && lengthMm < 0) {
      return res.status(400).json({ message: 'Length cannot be negative if provided' });
    }

    // Check if material number already exists within the same business unit
    const existingMaterial = await MaterialMaster.findOne({ 
      businessUnitId: businessUnitId,
      materialNumber: materialNumber.trim().toUpperCase() 
    });
    
    if (existingMaterial) {
      if (existingMaterial.isActive) {
        return res.status(400).json({ message: 'Material number already exists in this business unit' });
      } else {
        // Reactivate the existing material with new data
        existingMaterial.description = description.trim();
        existingMaterial.hsnCode = hsnCode.trim();
        existingMaterial.gstPercentage = gstPercentage;
        existingMaterial.currency = currency;
        existingMaterial.mrp = mrp;
        existingMaterial.institutionalPrice = institutionalPrice;
        existingMaterial.distributionPrice = distributionPrice;
        existingMaterial.surgicalCategory = surgicalCategory;
        existingMaterial.implantType = implantType;
        existingMaterial.subCategory = subCategory.trim();
        existingMaterial.lengthMm = lengthMm;
        existingMaterial.isActive = true;
        existingMaterial.updatedBy = req.user?.id;
        
        await existingMaterial.save();
        
        const populatedMaterial = await MaterialMaster.findById(existingMaterial._id)
          .populate('surgicalCategory', 'code description')
          .populate('implantType', 'name')
          .populate('businessUnitId', 'code name')
          .populate('createdBy', 'firstName lastName')
          .populate('updatedBy', 'firstName lastName');
        
        return res.status(201).json(populatedMaterial);
      }
    }

    // Verify surgical category exists
    const categoryExists = await Category.findById(surgicalCategory);
    if (!categoryExists) {
      return res.status(400).json({ message: 'Invalid surgical category' });
    }

    // Verify implant type exists if provided
    if (implantType) {
      const implantTypeExists = await ImplantType.findById(implantType);
      if (!implantTypeExists) {
        return res.status(400).json({ message: 'Invalid implant type' });
      }
    }

    const material = new MaterialMaster({
      businessUnitId,
      materialNumber: materialNumber.trim().toUpperCase(),
      description: description.trim(),
      hsnCode: hsnCode.trim(),
      gstPercentage,
      currency,
      mrp,
      institutionalPrice,
      distributionPrice,
      surgicalCategory,
      implantType: implantType || null,
      subCategory: subCategory ? subCategory.trim() : null,
      lengthMm,
      createdBy: req.user?.id,
      updatedBy: req.user?.id
    });

    const savedMaterial = await material.save();
    const populatedMaterial = await MaterialMaster.findById(savedMaterial._id)
      .populate('surgicalCategory', 'code description')
      .populate('implantType', 'name')
      .populate('businessUnitId', 'code name')
      .populate('createdBy', 'firstName lastName')
      .populate('updatedBy', 'firstName lastName');

    res.status(201).json(populatedMaterial);
  } catch (error) {
    console.error('Error creating material:', error);
    if (error.code === 11000) {
      res.status(400).json({ message: 'Material number already exists in this business unit' });
    } else {
      res.status(500).json({ message: 'Server error while creating material' });
    }
  }
});

// Update material
router.put('/:id', async (req, res) => {
  try {
    const materialId = req.params.id;
    const {
      businessUnitId,
      materialNumber,
      description,
      hsnCode,
      gstPercentage,
      currency = 'INR',
      mrp,
      institutionalPrice,
      distributionPrice,
      surgicalCategory,
      implantType,
      subCategory,
      lengthMm
    } = req.body;

    // Validate required fields (same as create)
    if (!businessUnitId) {
      return res.status(400).json({ message: 'Business unit is required' });
    }

    if (!materialNumber || !materialNumber.trim()) {
      return res.status(400).json({ message: 'Material number is required' });
    }
    
    if (!description || !description.trim()) {
      return res.status(400).json({ message: 'Description is required' });
    }

    if (!hsnCode || !hsnCode.trim()) {
      return res.status(400).json({ message: 'HSN code is required' });
    }

    if (gstPercentage === undefined || gstPercentage < 0 || gstPercentage > 100) {
      return res.status(400).json({ message: 'Valid GST percentage is required (0-100)' });
    }

    if (!mrp || mrp <= 0) {
      return res.status(400).json({ message: 'Valid MRP is required' });
    }

    if (!institutionalPrice || institutionalPrice <= 0) {
      return res.status(400).json({ message: 'Valid institutional price is required' });
    }

    if (!distributionPrice || distributionPrice <= 0) {
      return res.status(400).json({ message: 'Valid distribution price is required' });
    }

    if (!surgicalCategory) {
      return res.status(400).json({ message: 'Surgical category is required' });
    }

    // ImplantType and subCategory are optional
    // Only validate if implantType is provided, then subCategory should also be provided
    if (implantType && (!subCategory || !subCategory.trim())) {
      return res.status(400).json({ message: 'Subcategory is required when implant type is provided' });
    }

    // Length is optional - only validate if provided and should allow 0 as valid
    if (lengthMm !== null && lengthMm !== undefined && lengthMm < 0) {
      return res.status(400).json({ message: 'Length cannot be negative if provided' });
    }

    // Check if material exists
    const existingMaterial = await MaterialMaster.findById(materialId);
    if (!existingMaterial) {
      return res.status(404).json({ message: 'Material not found' });
    }

    // Check if material number is being changed and if it conflicts within the business unit
    const upperMaterialNumber = materialNumber.trim().toUpperCase();
    if (upperMaterialNumber !== existingMaterial.materialNumber || businessUnitId !== existingMaterial.businessUnitId.toString()) {
      const duplicateMaterial = await MaterialMaster.findOne({
        _id: { $ne: materialId },
        businessUnitId: businessUnitId,
        materialNumber: upperMaterialNumber
      });
      
      if (duplicateMaterial) {
        return res.status(400).json({ message: 'Material number already exists in this business unit' });
      }
    }

    // Update material
    const updatedMaterial = await MaterialMaster.findByIdAndUpdate(
      materialId,
      {
        businessUnitId,
        materialNumber: upperMaterialNumber,
        description: description.trim(),
        hsnCode: hsnCode.trim(),
        gstPercentage,
        currency,
        mrp,
        institutionalPrice,
        distributionPrice,
        surgicalCategory,
        implantType: implantType || null,
        subCategory: subCategory ? subCategory.trim() : null,
        lengthMm,
        updatedBy: req.user?.id
      },
      { new: true }
    )
    .populate('surgicalCategory', 'code description')
    .populate('implantType', 'name')
    .populate('businessUnitId', 'code name')
    .populate('createdBy', 'firstName lastName')
    .populate('updatedBy', 'firstName lastName');

    res.json(updatedMaterial);
  } catch (error) {
    console.error('Error updating material:', error);
    if (error.code === 11000) {
      res.status(400).json({ message: 'Material number already exists in this business unit' });
    } else {
      res.status(500).json({ message: 'Server error while updating material' });
    }
  }
});

// Get subcategories filtered by surgical category and implant type (with optional hospital filtering)
router.get('/subcategories/:surgicalCategoryId/:implantTypeId', async (req, res) => {
  try {
    const { surgicalCategoryId, implantTypeId } = req.params;
    const hospitalId = req.query.hospital; // Optional hospital filter
    
    console.log('🎯 Getting distinct subcategories for:', {surgicalCategoryId, implantTypeId, hospitalId});

    let subcategories = [];

    if (hospitalId) {
      // Hospital-specific subcategories: Get from hospital's assigned materials
      console.log('🏥 Fetching hospital-specific subcategories via assigned materials');
      
      const Hospital = require('../models/Hospital');
      const hospital = await Hospital.findById(hospitalId)
        .populate({
          path: 'materialAssignments.material',
          populate: [
            { path: 'surgicalCategory', select: '_id' },
            { path: 'implantType', select: '_id' }
          ]
        });

      if (!hospital) {
        return res.status(404).json({
          success: false,
          message: 'Hospital not found'
        });
      }

      // Extract distinct subcategories from hospital's assigned materials
      const subcategorySet = new Set();
      
      hospital.materialAssignments
        .filter(assignment => 
          assignment.isActive && 
          assignment.material &&
          assignment.material.surgicalCategory &&
          assignment.material.surgicalCategory._id.toString() === surgicalCategoryId &&
          assignment.material.implantType &&
          assignment.material.implantType._id.toString() === implantTypeId &&
          assignment.material.subCategory
        )
        .forEach(assignment => {
          subcategorySet.add(assignment.material.subCategory);
        });

      subcategories = Array.from(subcategorySet).sort();
      console.log(`✅ Found ${subcategories.length} hospital-specific subcategories`);
      
    } else {
      // Template mode: Get all distinct subcategories from MaterialMaster
      console.log('🔍 Fetching template-mode subcategories from MaterialMaster');
      
      const matchQuery = {
        surgicalCategory: new mongoose.Types.ObjectId(surgicalCategoryId),
        implantType: new mongoose.Types.ObjectId(implantTypeId),
        isActive: true,
        subCategory: { $exists: true, $ne: null, $ne: '' }
      };

      const result = await MaterialMaster.aggregate([
        { $match: matchQuery },
        {
          $group: {
            _id: '$subCategory'
          }
        },
        {
          $project: {
            _id: 0,
            subcategory: '$_id'
          }
        },
        {
          $sort: { subcategory: 1 }
        }
      ]);

      subcategories = result.map(item => item.subcategory);
      console.log(`✅ Found ${subcategories.length} template-mode subcategories`);
    }

    res.json({
      success: true,
      data: subcategories
    });
  } catch (error) {
    console.error('Error fetching filtered subcategories:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error while fetching subcategories',
      error: error.message 
    });
  }
});

// Get unique lengths filtered by surgical category, implant type, and subcategory (with optional hospital filtering)
router.get('/lengths/:surgicalCategoryId/:implantTypeId/:subCategory', async (req, res) => {
  try {
    const { surgicalCategoryId, implantTypeId, subCategory } = req.params;
    const hospitalId = req.query.hospital; // Optional hospital filter
    
    console.log('🎯 Getting distinct lengths for:', {surgicalCategoryId, implantTypeId, subCategory, hospitalId});

    let lengths = [];

    if (hospitalId) {
      // Hospital-specific lengths: Get from hospital's assigned materials
      console.log('🏥 Fetching hospital-specific lengths via assigned materials');
      
      const Hospital = require('../models/Hospital');
      const hospital = await Hospital.findById(hospitalId)
        .populate({
          path: 'materialAssignments.material',
          populate: [
            { path: 'surgicalCategory', select: '_id' },
            { path: 'implantType', select: '_id' }
          ]
        });

      if (!hospital) {
        return res.status(404).json({
          success: false,
          message: 'Hospital not found'
        });
      }

      // Extract distinct lengths from hospital's assigned materials
      const lengthSet = new Set();
      
      hospital.materialAssignments
        .filter(assignment => 
          assignment.isActive && 
          assignment.material &&
          assignment.material.surgicalCategory &&
          assignment.material.surgicalCategory._id.toString() === surgicalCategoryId &&
          assignment.material.implantType &&
          assignment.material.implantType._id.toString() === implantTypeId &&
          assignment.material.subCategory === decodeURIComponent(subCategory) &&
          assignment.material.lengthMm !== null &&
          assignment.material.lengthMm !== undefined &&
          typeof assignment.material.lengthMm === 'number'
        )
        .forEach(assignment => {
          lengthSet.add(assignment.material.lengthMm);
        });

      lengths = Array.from(lengthSet).sort((a, b) => a - b);
      console.log(`✅ Found ${lengths.length} hospital-specific lengths`);
      
    } else {
      // Template mode: Get all distinct lengths from MaterialMaster
      console.log('🔍 Fetching template-mode lengths from MaterialMaster');
      
      const matchQuery = {
        surgicalCategory: new mongoose.Types.ObjectId(surgicalCategoryId),
        implantType: new mongoose.Types.ObjectId(implantTypeId),
        subCategory: decodeURIComponent(subCategory),
        isActive: true,
        lengthMm: { $exists: true, $ne: null }
      };

      const result = await MaterialMaster.aggregate([
        { $match: matchQuery },
        {
          $group: {
            _id: '$lengthMm'
          }
        },
        {
          $project: {
            _id: 0,
            length: '$_id'
          }
        },
        {
          $sort: { length: 1 }
        }
      ]);

      lengths = result.map(item => item.length).filter(length => typeof length === 'number');
      console.log(`✅ Found ${lengths.length} template-mode lengths`);
    }

    res.json({
      success: true,
      data: lengths
    });
  } catch (error) {
    console.error('Error fetching filtered lengths:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error while fetching lengths',
      error: error.message 
    });
  }
});

// Get distinct implant types for a surgical category (with optional hospital filtering)
router.get('/implant-types/:surgicalCategoryId', async (req, res) => {
  try {
    const { surgicalCategoryId } = req.params;
    const hospitalId = req.query.hospital; // Optional hospital filter
    
    console.log('🎯 Getting distinct implant types for surgical category:', surgicalCategoryId, 'hospital:', hospitalId);

    let implantTypes = [];

    if (hospitalId) {
      // Hospital-specific implant types: Get from hospital's assigned materials
      console.log('🏥 Fetching hospital-specific implant types via assigned materials');
      
      const Hospital = require('../models/Hospital');
      const hospital = await Hospital.findById(hospitalId)
        .populate({
          path: 'materialAssignments.material',
          populate: [
            { path: 'surgicalCategory', select: '_id' },
            { path: 'implantType', select: '_id name' }
          ]
        });

      if (!hospital) {
        return res.status(404).json({
          success: false,
          message: 'Hospital not found'
        });
      }

      // Extract distinct implant types from hospital's assigned materials for this surgical category
      const implantTypeMap = new Map();
      
      hospital.materialAssignments
        .filter(assignment => 
          assignment.isActive && 
          assignment.material &&
          assignment.material.surgicalCategory &&
          assignment.material.surgicalCategory._id.toString() === surgicalCategoryId &&
          assignment.material.implantType
        )
        .forEach(assignment => {
          const implantType = assignment.material.implantType;
          implantTypeMap.set(implantType._id.toString(), {
            _id: implantType._id,
            name: implantType.name
          });
        });

      implantTypes = Array.from(implantTypeMap.values()).sort((a, b) => a.name.localeCompare(b.name));
      console.log(`✅ Found ${implantTypes.length} hospital-specific implant types`);
      
    } else {
      // Template mode: Get all distinct implant types from MaterialMaster
      console.log('🔍 Fetching template-mode implant types from MaterialMaster');
      
      implantTypes = await MaterialMaster.aggregate([
        {
          $match: {
            surgicalCategory: new mongoose.Types.ObjectId(surgicalCategoryId),
            isActive: true,
            implantType: { $exists: true, $ne: null }
          }
        },
        {
          $group: {
            _id: '$implantType'
          }
        },
        {
          $lookup: {
            from: 'implanttypes',
            localField: '_id',
            foreignField: '_id',
            as: 'implantTypeData'
          }
        },
        {
          $unwind: '$implantTypeData'
        },
        {
          $project: {
            _id: '$implantTypeData._id',
            name: '$implantTypeData.name'
          }
        },
        {
          $sort: { name: 1 }
        }
      ]);
      
      console.log(`✅ Found ${implantTypes.length} template-mode implant types`);
    }

    // Add cache control headers to prevent 304 responses
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');

    res.json({
      success: true,
      data: implantTypes
    });
  } catch (error) {
    console.error('Error fetching distinct implant types:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error while fetching implant types',
      error: error.message 
    });
  }
});

// Delete material (hard delete)
router.delete('/:id', async (req, res) => {
  try {
    const material = await MaterialMaster.findById(req.params.id);
    
    if (!material) {
      return res.status(404).json({ message: 'Material not found' });
    }

    // Hard delete - permanently remove the material
    await MaterialMaster.findByIdAndDelete(req.params.id);

    res.json({ message: 'Material deleted successfully' });
  } catch (error) {
    console.error('Error deleting material:', error);
    res.status(500).json({ message: 'Server error while deleting material' });
  }
});

module.exports = router;
