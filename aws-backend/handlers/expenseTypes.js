const { connectDB } = require('../utils/database');
const { successResponse, errorResponse } = require('../utils/response');
const { withAuth, getUserId } = require('../utils/auth');
const ExpenseType = require('../models/ExpenseType');

const getExpenseTypes = withAuth(async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false;
  try {
    await connectDB();
    const expenseTypes = await ExpenseType.find().sort({ name: 1 });
    return successResponse(expenseTypes);
  } catch (error) {
    return errorResponse('Failed to fetch expense types', 500);
  }
});

const createExpenseType = withAuth(async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false;
  try {
    await connectDB();
    const data = JSON.parse(event.body);
    const newItem = new ExpenseType({ ...data, createdBy: getUserId(event) });
    await newItem.save();
    return successResponse(newItem, 201);
  } catch (error) {
    return errorResponse('Failed to create expense type', 500);
  }
});

module.exports = { getExpenseTypes, createExpenseType };
