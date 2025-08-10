const { connectDB } = require('../utils/database');
const { successResponse, errorResponse } = require('../utils/response');

/**
 * Health check handler for AWS Lambda
 */
const handler = async (event, context) => {
  // Set context to reuse connections
  context.callbackWaitsForEmptyEventLoop = false;

  try {
    console.log('Health check requested');
    
    // Test database connection
    let dbStatus = 'disconnected';
    try {
      await connectDB();
      dbStatus = 'connected';
    } catch (dbError) {
      console.error('Database health check failed:', dbError.message);
      dbStatus = 'error';
    }

    const healthData = {
      status: 'healthy',
      service: 'MyERP Backend',
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      database: dbStatus,
      timestamp: new Date().toISOString(),
      lambda: {
        region: context.invokedFunctionArn.split(':')[3],
        functionName: context.functionName,
        version: context.functionVersion,
        memoryLimitInMB: context.memoryLimitInMB
      }
    };

    console.log('Health check successful:', healthData);
    return successResponse(healthData);

  } catch (error) {
    console.error('Health check failed:', error);
    return errorResponse(error.message, 500);
  }
};

module.exports = { handler };
