const express = require('express');
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
      filter.implantType = implantType;
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

    if (!implantType) {
      return res.status(400).json({ message: 'Implant type is required' });
    }

    if (!subCategory || !subCategory.trim()) {
      return res.status(400).json({ message: 'Subcategory is required' });
    }

    if (!lengthMm || lengthMm <= 0) {
      return res.status(400).json({ message: 'Valid length is required' });
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

    // Verify surgical category and implant type exist
    const [categoryExists, implantTypeExists] = await Promise.all([
      Category.findById(surgicalCategory),
      ImplantType.findById(implantType)
    ]);

    if (!categoryExists) {
      return res.status(400).json({ message: 'Invalid surgical category' });
    }

    if (!implantTypeExists) {
      return res.status(400).json({ message: 'Invalid implant type' });
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
      implantType,
      subCategory: subCategory.trim(),
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
        implantType,
        subCategory: subCategory.trim(),
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

// Get implant types filtered by surgical category
router.get('/implant-types/:surgicalCategoryId', async (req, res) => {
  try {
    const surgicalCategoryId = req.params.surgicalCategoryId;
    
    // Find implant types that have subcategories linked to the surgical category
    const implantTypes = await ImplantType.find({
      isActive: true,
      'subcategories.surgicalCategory': surgicalCategoryId
    }).select('_id name').sort({ name: 1 });

    res.json(implantTypes);
  } catch (error) {
    console.error('Error fetching filtered implant types:', error);
    res.status(500).json({ message: 'Server error while fetching implant types' });
  }
});

// Get subcategories filtered by surgical category and implant type
router.get('/subcategories/:surgicalCategoryId/:implantTypeId', async (req, res) => {
  try {
    const { surgicalCategoryId, implantTypeId } = req.params;
    
    const implantType = await ImplantType.findById(implantTypeId)
      .populate('subcategories.surgicalCategory', 'code description');
    
    if (!implantType) {
      return res.status(404).json({ message: 'Implant type not found' });
    }

    // Filter subcategories by surgical category
    const filteredSubcategories = implantType.subcategories.filter(
      subcat => subcat.surgicalCategory._id.toString() === surgicalCategoryId
    );

    res.json(filteredSubcategories);
  } catch (error) {
    console.error('Error fetching filtered subcategories:', error);
    res.status(500).json({ message: 'Server error while fetching subcategories' });
  }
});

// Get unique lengths filtered by surgical category, implant type, and subcategory
router.get('/lengths/:surgicalCategoryId/:implantTypeId/:subCategory', async (req, res) => {
  try {
    const { surgicalCategoryId, implantTypeId, subCategory } = req.params;
    
    const implantType = await ImplantType.findById(implantTypeId);
    
    if (!implantType) {
      return res.status(404).json({ message: 'Implant type not found' });
    }

    // Filter subcategories and get unique lengths
    const matchingSubcategories = implantType.subcategories.filter(
      subcat => 
        subcat.surgicalCategory.toString() === surgicalCategoryId && 
        subcat.subCategory === subCategory
    );

    const lengths = [...new Set(
      matchingSubcategories
        .map(subcat => subcat.length)
        .filter(length => length != null)
    )].sort((a, b) => a - b);

    res.json(lengths);
  } catch (error) {
    console.error('Error fetching filtered lengths:', error);
    res.status(500).json({ message: 'Server error while fetching lengths' });
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
