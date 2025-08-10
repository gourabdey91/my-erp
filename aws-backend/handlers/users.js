const { connectDB } = require('../utils/database');
const { successResponse, errorResponse, notFoundResponse } = require('../utils/response');
const { withAuth, getUserId } = require('../utils/auth');
const User = require('../models/User');

/**
 * Get all users (authenticated)
 */
const getUsers = withAuth(async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false;

  try {
    await connectDB();

    const { page = 1, limit = 10, search = '' } = event.queryStringParameters || {};
    
    const query = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const users = await User.find(query)
      .select('-password') // Exclude password
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    const total = await User.countDocuments(query);

    return successResponse({
      users,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        limit: parseInt(limit)
      }
    });

  } catch (error) {
    console.error('Get users error:', error);
    return errorResponse('Failed to fetch users', 500);
  }
});

/**
 * Create new user (authenticated)
 */
const createUser = withAuth(async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false;

  try {
    await connectDB();

    const userData = JSON.parse(event.body);
    const { name, email, businessUnit, role = 'user' } = userData;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return errorResponse('User already exists with this email', 409);
    }

    // Create user with default password (they should change it)
    const newUser = new User({
      name,
      email: email.toLowerCase(),
      password: 'defaultPassword123', // User should change this
      businessUnit,
      role,
      isActive: true,
      createdAt: new Date(),
      createdBy: getUserId(event)
    });

    await newUser.save();

    // Remove password from response
    const userResponse = newUser.toObject();
    delete userResponse.password;

    return successResponse(userResponse, 201);

  } catch (error) {
    console.error('Create user error:', error);
    return errorResponse('Failed to create user', 500);
  }
});

/**
 * Update user (authenticated)
 */
const updateUser = withAuth(async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false;

  try {
    await connectDB();

    const { id } = event.pathParameters;
    const updateData = JSON.parse(event.body);

    // Remove sensitive fields from update
    delete updateData.password;
    delete updateData._id;

    const user = await User.findByIdAndUpdate(
      id,
      { ...updateData, updatedAt: new Date() },
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return notFoundResponse('User');
    }

    return successResponse(user);

  } catch (error) {
    console.error('Update user error:', error);
    return errorResponse('Failed to update user', 500);
  }
});

/**
 * Delete user (authenticated)
 */
const deleteUser = withAuth(async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false;

  try {
    await connectDB();

    const { id } = event.pathParameters;

    const user = await User.findByIdAndDelete(id);
    if (!user) {
      return notFoundResponse('User');
    }

    return successResponse({ message: 'User deleted successfully', id });

  } catch (error) {
    console.error('Delete user error:', error);
    return errorResponse('Failed to delete user', 500);
  }
});

module.exports = {
  getUsers,
  createUser,
  updateUser,
  deleteUser
};
