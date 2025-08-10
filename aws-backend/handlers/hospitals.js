const { connectDB } = require('../utils/database');
const { successResponse, errorResponse } = require('../utils/response');
const { withAuth, getUserId } = require('../utils/auth');
const Hospital = require('../models/Hospital');

const getHospitals = withAuth(async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false;
  try {
    await connectDB();
    const { search = '' } = event.queryStringParameters || {};
    const query = search ? { name: { $regex: search, $options: 'i' } } : {};
    const hospitals = await Hospital.find(query).sort({ name: 1 });
    return successResponse(hospitals);
  } catch (error) {
    return errorResponse('Failed to fetch hospitals', 500);
  }
});

const createHospital = withAuth(async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false;
  try {
    await connectDB();
    const data = JSON.parse(event.body);
    const newHospital = new Hospital({ ...data, createdBy: getUserId(event) });
    await newHospital.save();
    return successResponse(newHospital, 201);
  } catch (error) {
    return errorResponse('Failed to create hospital', 500);
  }
});

module.exports = { getHospitals, createHospital };
