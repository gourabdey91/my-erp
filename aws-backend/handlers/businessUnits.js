const { connectDB } = require('../utils/database');
const { successResponse, errorResponse, notFoundResponse } = require('../utils/response');
const { withAuth, getUserId } = require('../utils/auth');
const BusinessUnit = require('../models/BusinessUnit');

/**
 * Get all business units (authenticated)
 */
const getBusinessUnits = withAuth(async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false;

  try {
    await connectDB();

    const { search = '' } = event.queryStringParameters || {};
    
    const query = {};
    if (search) {
      query.$or = [
        { code: { $regex: search, $options: 'i' } },
        { name: { $regex: search, $options: 'i' } }
      ];
    }

    const businessUnits = await BusinessUnit.find(query)
      .sort({ code: 1 });

    return successResponse(businessUnits);

  } catch (error) {
    console.error('Get business units error:', error);
    return errorResponse('Failed to fetch business units', 500);
  }
});

/**
 * Create new business unit (authenticated)
 */
const createBusinessUnit = withAuth(async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false;

  try {
    await connectDB();

    const businessUnitData = JSON.parse(event.body);
    const { code, name } = businessUnitData;

    // Check if business unit already exists
    const existing = await BusinessUnit.findOne({ 
      $or: [{ code }, { name }] 
    });
    
    if (existing) {
      return errorResponse('Business unit already exists with this code or name', 409);
    }

    const newBusinessUnit = new BusinessUnit({
      code: code.toUpperCase(),
      name,
      createdAt: new Date(),
      createdBy: getUserId(event)
    });

    await newBusinessUnit.save();
    return successResponse(newBusinessUnit, 201);

  } catch (error) {
    console.error('Create business unit error:', error);
    if (error.code === 11000) {
      return errorResponse('Business unit already exists', 409);
    }
    return errorResponse('Failed to create business unit', 500);
  }
});

module.exports = {
  getBusinessUnits,
  createBusinessUnit
};
