const { connectDB } = require('../utils/database');
const { successResponse, errorResponse } = require('../utils/response');
const { withAuth, getUserId } = require('../utils/auth');
const SalesOrder = require('../models/SalesOrder');

const getSalesOrders = withAuth(async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false;
  try {
    await connectDB();
    const { page = 1, limit = 20 } = event.queryStringParameters || {};
    
    const salesOrders = await SalesOrder.find()
      .populate('doctor', 'name')
      .populate('hospital', 'name')
      .populate('businessUnit', 'code name')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    const total = await SalesOrder.countDocuments();

    return successResponse({
      salesOrders,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    return errorResponse('Failed to fetch sales orders', 500);
  }
});

const createSalesOrder = withAuth(async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false;
  try {
    await connectDB();
    const data = JSON.parse(event.body);
    const newSalesOrder = new SalesOrder({ 
      ...data, 
      createdBy: getUserId(event),
      createdAt: new Date()
    });
    await newSalesOrder.save();
    
    // Populate before returning
    await newSalesOrder.populate('doctor', 'name');
    await newSalesOrder.populate('hospital', 'name');
    await newSalesOrder.populate('businessUnit', 'code name');
    
    return successResponse(newSalesOrder, 201);
  } catch (error) {
    return errorResponse('Failed to create sales order', 500);
  }
});

module.exports = { getSalesOrders, createSalesOrder };
