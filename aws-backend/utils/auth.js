const jwt = require('jsonwebtoken');
const { unauthorizedResponse } = require('./response');

/**
 * Authentication middleware for AWS Lambda
 */
const authenticateToken = (event) => {
  const authHeader = event.headers.Authorization || event.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    throw new Error('Access token is required');
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return decoded;
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
};

/**
 * Generate JWT token
 */
const generateToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: '24h'
  });
};

/**
 * Higher-order function to wrap Lambda handlers with authentication
 */
const withAuth = (handler) => {
  return async (event, context) => {
    try {
      const user = authenticateToken(event);
      event.user = user; // Attach user to event object
      return await handler(event, context);
    } catch (error) {
      console.error('Authentication error:', error.message);
      return unauthorizedResponse(error.message);
    }
  };
};

/**
 * Extract user ID from authenticated request
 */
const getUserId = (event) => {
  return event.user?.userId;
};

/**
 * Check if user has admin role
 */
const isAdmin = (event) => {
  return event.user?.role === 'admin';
};

module.exports = {
  authenticateToken,
  generateToken,
  withAuth,
  getUserId,
  isAdmin
};
