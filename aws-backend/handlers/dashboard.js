const { connectDB } = require('../utils/database');
const { successResponse, errorResponse } = require('../utils/response');
const { withAuth } = require('../utils/auth');
const MaterialMaster = require('../models/MaterialMaster');
const User = require('../models/User');
const SalesOrder = require('../models/SalesOrder');
const Doctor = require('../models/Doctor');
const Hospital = require('../models/Hospital');

/**
 * Get dashboard statistics (authenticated)
 */
const getStats = withAuth(async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false;

  try {
    await connectDB();

    // Get counts for all major entities
    const [
      totalMaterials,
      totalUsers,
      totalDoctors,
      totalHospitals,
      totalSalesOrders,
      recentSalesOrders
    ] = await Promise.all([
      MaterialMaster.countDocuments(),
      User.countDocuments(),
      Doctor.countDocuments(),
      Hospital.countDocuments(),
      SalesOrder.countDocuments(),
      SalesOrder.find()
        .populate('doctor', 'name')
        .populate('hospital', 'name')
        .sort({ createdAt: -1 })
        .limit(5)
    ]);

    // Calculate monthly growth (simplified)
    const currentDate = new Date();
    const lastMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
    
    const [
      materialGrowth,
      salesGrowth
    ] = await Promise.all([
      MaterialMaster.countDocuments({ createdAt: { $gte: lastMonth } }),
      SalesOrder.countDocuments({ createdAt: { $gte: lastMonth } })
    ]);

    const stats = {
      overview: {
        totalMaterials,
        totalUsers,
        totalDoctors,
        totalHospitals,
        totalSalesOrders
      },
      growth: {
        materialsThisMonth: materialGrowth,
        salesThisMonth: salesGrowth
      },
      recentActivity: {
        recentSalesOrders
      },
      lastUpdated: new Date().toISOString()
    };

    return successResponse(stats);

  } catch (error) {
    console.error('Get dashboard stats error:', error);
    return errorResponse('Failed to fetch dashboard statistics', 500);
  }
});

module.exports = {
  getStats
};
