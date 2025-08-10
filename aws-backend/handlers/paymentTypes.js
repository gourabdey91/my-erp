const { connectDB } = require('../utils/database');
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

module.exports = { getPaymentTypes, createPaymentType };
