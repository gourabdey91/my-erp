/**
 * Standard API response utilities for AWS Lambda
 */

const createResponse = (statusCode, body, headers = {}) => {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': process.env.CORS_ORIGIN || '*',
      'Access-Control-Allow-Headers': 'Content-Type,Authorization',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
      ...headers
    },
    body: JSON.stringify(body)
  };
};

const successResponse = (data, statusCode = 200) => {
  return createResponse(statusCode, {
    success: true,
    data,
    timestamp: new Date().toISOString()
  });
};

const errorResponse = (message, statusCode = 500, details = null) => {
  return createResponse(statusCode, {
    success: false,
    error: {
      message,
      details,
      timestamp: new Date().toISOString()
    }
  });
};

const validationErrorResponse = (errors) => {
  return createResponse(400, {
    success: false,
    error: {
      message: 'Validation failed',
      details: errors,
      timestamp: new Date().toISOString()
    }
  });
};

const notFoundResponse = (resource = 'Resource') => {
  return createResponse(404, {
    success: false,
    error: {
      message: `${resource} not found`,
      timestamp: new Date().toISOString()
    }
  });
};

const unauthorizedResponse = (message = 'Unauthorized access') => {
  return createResponse(401, {
    success: false,
    error: {
      message,
      timestamp: new Date().toISOString()
    }
  });
};

module.exports = {
  createResponse,
  successResponse,
  errorResponse,
  validationErrorResponse,
  notFoundResponse,
  unauthorizedResponse
};
