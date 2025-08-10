const { connectDB } = require('../utils/database');
const { successResponse, errorResponse } = require('../utils/response');
const { withAuth, getUserId } = require('../utils/auth');
const Category = require('../models/Category');

const getCategories = withAuth(async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false;

  try {
    await connectDB();
    const categories = await Category.find().sort({ name: 1 });
    return successResponse(categories);
  } catch (error) {
    console.error('Get categories error:', error);
    return errorResponse('Failed to fetch categories', 500);
  }
});

const createCategory = withAuth(async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false;

  try {
    await connectDB();
    const categoryData = JSON.parse(event.body);
    
    const newCategory = new Category({
      ...categoryData,
      createdAt: new Date(),
      createdBy: getUserId(event)
    });

    await newCategory.save();
    return successResponse(newCategory, 201);
  } catch (error) {
    console.error('Create category error:', error);
    return errorResponse('Failed to create category', 500);
  }
});

module.exports = { getCategories, createCategory };
