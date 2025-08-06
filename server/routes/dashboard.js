const express = require('express');
const router = express.Router();
const User = require('../models/User');
const BusinessUnit = require('../models/BusinessUnit');
const Category = require('../models/Category');
const PaymentType = require('../models/PaymentType');
const Procedure = require('../models/Procedure');

// GET /api/dashboard/stats - Get dashboard statistics
router.get('/stats', async (req, res) => {
  try {
    // Get user statistics
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ status: { $ne: 'inactive' } });

    // Get business unit statistics
    const totalBusinessUnits = await BusinessUnit.countDocuments();
    const activeBusinessUnits = await BusinessUnit.countDocuments({ isActive: true });

    // Get categories statistics
    const totalCategories = await Category.countDocuments();
    const activeCategories = await Category.countDocuments({ isActive: true });

    // Get payment types statistics
    const totalPaymentTypes = await PaymentType.countDocuments();
    const activePaymentTypes = await PaymentType.countDocuments({ isActive: true });

    // Get procedures statistics
    const totalProcedures = await Procedure.countDocuments();
    const activeProcedures = await Procedure.countDocuments({ isActive: true });

    // For now, we'll use placeholder data for other modules
    // These can be replaced with real models when those modules are implemented
    const dashboardStats = {
      users: {
        total: totalUsers,
        active: activeUsers,
        count: activeUsers,
        label: 'Active Users'
      },
      businessUnits: {
        total: totalBusinessUnits,
        active: activeBusinessUnits,
        count: activeBusinessUnits,
        label: 'Business Units'
      },
      categories: {
        total: totalCategories,
        active: activeCategories,
        count: activeCategories,
        label: 'Categories'
      },
      paymentTypes: {
        total: totalPaymentTypes,
        active: activePaymentTypes,
        count: activePaymentTypes,
        label: 'Payment Types'
      },
      procedures: {
        total: totalProcedures,
        active: activeProcedures,
        count: activeProcedures,
        label: 'Procedures'
      },
      billing: {
        total: 45,
        pending: 24,
        count: 24,
        label: 'Pending Bills'
      },
      reports: {
        total: 12,
        recent: 8,
        count: 8,
        label: 'Reports'
      },
      masterData: {
        total: 234,
        records: 156,
        count: 156,
        label: 'Records'
      },
      settings: {
        total: 10,
        configured: 3,
        count: 3,
        label: 'Settings'
      },
      support: {
        available: true,
        count: '24/7',
        label: 'Support'
      }
    };

    res.json({
      success: true,
      data: dashboardStats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching dashboard statistics',
      error: error.message
    });
  }
});

// GET /api/dashboard/summary - Get quick summary for dashboard
router.get('/summary', async (req, res) => {
  try {
    const userCount = await User.countDocuments();
    
    res.json({
      success: true,
      data: {
        totalUsers: userCount,
        systemStatus: 'Online',
        lastUpdated: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Dashboard summary error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching dashboard summary',
      error: error.message
    });
  }
});

module.exports = router;
