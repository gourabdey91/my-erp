const { connectDB } = require('../utils/database');
const { successResponse, errorResponse, notFoundResponse } = require('../utils/response');
const { withAuth, getUserId } = require('../utils/auth');
const Doctor = require('../models/Doctor');

const getDoctors = withAuth(async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false;
  try {
    await connectDB();
    const { search = '' } = event.queryStringParameters || {};
    const query = search ? { $or: [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } }
    ]} : {};
    const doctors = await Doctor.find(query).sort({ name: 1 });
    return successResponse(doctors);
  } catch (error) {
    return errorResponse('Failed to fetch doctors', 500);
  }
});

const createDoctor = withAuth(async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false;
  try {
    await connectDB();
    const data = JSON.parse(event.body);
    const newDoctor = new Doctor({ ...data, createdBy: getUserId(event) });
    await newDoctor.save();
    return successResponse(newDoctor, 201);
  } catch (error) {
    return errorResponse('Failed to create doctor', 500);
  }
});

const updateDoctor = withAuth(async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false;
  try {
    await connectDB();
    const { id } = event.pathParameters;
    const data = JSON.parse(event.body);
    const doctor = await Doctor.findByIdAndUpdate(id, data, { new: true });
    if (!doctor) return notFoundResponse('Doctor');
    return successResponse(doctor);
  } catch (error) {
    return errorResponse('Failed to update doctor', 500);
  }
});

const deleteDoctor = withAuth(async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false;
  try {
    await connectDB();
    const { id } = event.pathParameters;
    const doctor = await Doctor.findByIdAndDelete(id);
    if (!doctor) return notFoundResponse('Doctor');
    return successResponse({ message: 'Doctor deleted', id });
  } catch (error) {
    return errorResponse('Failed to delete doctor', 500);
  }
});

module.exports = { getDoctors, createDoctor, updateDoctor, deleteDoctor };
