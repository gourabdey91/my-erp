// Template handlers for remaining entities

// Payment Types
const paymentTypes = `const { connectDB } = require('../utils/database');
const { successResponse, errorResponse } = require('../utils/response');
const { withAuth, getUserId } = require('../utils/auth');
const PaymentType = require('../models/PaymentType');

const getPaymentTypes = withAuth(async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false;
  try {
    await connectDB();
    const paymentTypes = await PaymentType.find().sort({ name: 1 });
    return successResponse(paymentTypes);
  } catch (error) {
    return errorResponse('Failed to fetch payment types', 500);
  }
});

const createPaymentType = withAuth(async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false;
  try {
    await connectDB();
    const data = JSON.parse(event.body);
    const newItem = new PaymentType({ ...data, createdBy: getUserId(event) });
    await newItem.save();
    return successResponse(newItem, 201);
  } catch (error) {
    return errorResponse('Failed to create payment type', 500);
  }
});

module.exports = { getPaymentTypes, createPaymentType };`;

// Doctors
const doctors = `const { connectDB } = require('../utils/database');
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

module.exports = { getDoctors, createDoctor, updateDoctor, deleteDoctor };`;

// Hospitals
const hospitals = `const { connectDB } = require('../utils/database');
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

module.exports = { getHospitals, createHospital };`;

// Export all handlers
console.log('Payment Types Handler:');
console.log(paymentTypes);
console.log('\nDoctors Handler:');
console.log(doctors);
console.log('\nHospitals Handler:');
console.log(hospitals);
