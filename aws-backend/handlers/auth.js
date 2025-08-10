const bcrypt = require('bcryptjs');
const { connectDB } = require('../utils/database');
const { successResponse, errorResponse, validationErrorResponse } = require('../utils/response');
const { generateToken } = require('../utils/auth');
const User = require('../models/User');

/**
 * User login handler
 */
const login = async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false;

  try {
    await connectDB();

    const { email, password } = JSON.parse(event.body);

    // Validation
    if (!email || !password) {
      return validationErrorResponse(['Email and password are required']);
    }

    // Find user
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return errorResponse('Invalid email or password', 401);
    }

    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return errorResponse('Invalid email or password', 401);
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate token
    const token = generateToken({
      userId: user._id,
      email: user.email,
      role: user.role
    });

    // Remove password from response
    const userResponse = user.toObject();
    delete userResponse.password;

    return successResponse({
      token,
      user: userResponse,
      expiresIn: '24h'
    });

  } catch (error) {
    console.error('Login error:', error);
    return errorResponse('Login failed', 500);
  }
};

/**
 * User registration handler
 */
const register = async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false;

  try {
    await connectDB();

    const userData = JSON.parse(event.body);
    const { name, email, password, businessUnit } = userData;

    // Validation
    const errors = [];
    if (!name) errors.push('Name is required');
    if (!email) errors.push('Email is required');
    if (!password) errors.push('Password is required');
    if (!businessUnit) errors.push('Business unit is required');
    if (password && password.length < 6) errors.push('Password must be at least 6 characters');

    if (errors.length > 0) {
      return validationErrorResponse(errors);
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return errorResponse('User already exists with this email', 409);
    }

    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create user
    const newUser = new User({
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      businessUnit,
      role: 'user',
      isActive: true,
      createdAt: new Date()
    });

    await newUser.save();

    // Generate token
    const token = generateToken({
      userId: newUser._id,
      email: newUser.email,
      role: newUser.role
    });

    // Remove password from response
    const userResponse = newUser.toObject();
    delete userResponse.password;

    return successResponse({
      token,
      user: userResponse,
      expiresIn: '24h'
    }, 201);

  } catch (error) {
    console.error('Registration error:', error);
    if (error.code === 11000) {
      return errorResponse('User already exists with this email', 409);
    }
    return errorResponse('Registration failed', 500);
  }
};

module.exports = {
  login,
  register
};
