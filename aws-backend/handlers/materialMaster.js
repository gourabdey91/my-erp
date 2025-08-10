const { connectDB } = require('../utils/database');
const { successResponse, errorResponse, notFoundResponse } = require('../utils/response');
const { withAuth, getUserId } = require('../utils/auth');
const MaterialMaster = require('../models/MaterialMaster');

/**
 * Get all material masters (authenticated)
 */
const getMaterialMasters = withAuth(async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false;

  try {
    await connectDB();

    const { 
      page = 1, 
      limit = 50, 
      search = '', 
      businessUnit = '',
      category = ''
    } = event.queryStringParameters || {};
    
    const query = {};
    
    // Search filter
    if (search) {
      query.$or = [
        { materialNumber: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { 'specification.brand': { $regex: search, $options: 'i' } }
      ];
    }
    
    // Business unit filter
    if (businessUnit) {
      query.businessUnit = businessUnit;
    }
    
    // Category filter
    if (category) {
      query.category = category;
    }

    const materials = await MaterialMaster.find(query)
      .populate('businessUnit', 'code name')
      .populate('category', 'name')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ materialNumber: 1 });

    const total = await MaterialMaster.countDocuments(query);

    return successResponse({
      materials,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        limit: parseInt(limit)
      }
    });

  } catch (error) {
    console.error('Get material masters error:', error);
    return errorResponse('Failed to fetch material masters', 500);
  }
});

/**
 * Create new material master (authenticated)
 */
const createMaterialMaster = withAuth(async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false;

  try {
    await connectDB();

    const materialData = JSON.parse(event.body);
    
    // Check if material number already exists
    const existing = await MaterialMaster.findOne({ 
      materialNumber: materialData.materialNumber,
      businessUnit: materialData.businessUnit 
    });
    
    if (existing) {
      return errorResponse('Material number already exists for this business unit', 409);
    }

    const newMaterial = new MaterialMaster({
      ...materialData,
      createdAt: new Date(),
      createdBy: getUserId(event)
    });

    await newMaterial.save();
    
    // Populate references before returning
    await newMaterial.populate('businessUnit', 'code name');
    await newMaterial.populate('category', 'name');

    return successResponse(newMaterial, 201);

  } catch (error) {
    console.error('Create material master error:', error);
    return errorResponse('Failed to create material master', 500);
  }
});

/**
 * Update material master (authenticated)
 */
const updateMaterialMaster = withAuth(async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false;

  try {
    await connectDB();

    const { id } = event.pathParameters;
    const updateData = JSON.parse(event.body);

    // Remove immutable fields
    delete updateData._id;
    delete updateData.createdAt;
    delete updateData.createdBy;

    const material = await MaterialMaster.findByIdAndUpdate(
      id,
      { 
        ...updateData, 
        updatedAt: new Date(),
        updatedBy: getUserId(event)
      },
      { new: true, runValidators: true }
    )
    .populate('businessUnit', 'code name')
    .populate('category', 'name');

    if (!material) {
      return notFoundResponse('Material Master');
    }

    return successResponse(material);

  } catch (error) {
    console.error('Update material master error:', error);
    return errorResponse('Failed to update material master', 500);
  }
});

/**
 * Delete material master (authenticated)
 */
const deleteMaterialMaster = withAuth(async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false;

  try {
    await connectDB();

    const { id } = event.pathParameters;

    const material = await MaterialMaster.findByIdAndDelete(id);
    if (!material) {
      return notFoundResponse('Material Master');
    }

    return successResponse({ 
      message: 'Material master deleted successfully', 
      id,
      materialNumber: material.materialNumber
    });

  } catch (error) {
    console.error('Delete material master error:', error);
    return errorResponse('Failed to delete material master', 500);
  }
});

module.exports = {
  getMaterialMasters,
  createMaterialMaster,
  updateMaterialMaster,
  deleteMaterialMaster
};
