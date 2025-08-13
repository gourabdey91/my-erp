const express = require('express');
const router = express.Router();
const User = require('../models/User');
const BusinessUnit = require('../models/BusinessUnit');
const Category = require('../models/Category');
const PaymentType = require('../models/PaymentType');
const ExpenseType = require('../models/ExpenseType');
const Procedure = require('../models/Procedure');
const Doctor = require('../models/Doctor');
const Hospital = require('../models/Hospital');
const ImplantType = require('../models/ImplantType');
const MaterialMaster = require('../models/MaterialMaster');
const DeliveryChallanDetails = require('../models/DeliveryChallanDetails');
const SalesOrder = require('../models/SalesOrder');
const Inquiry = require('../models/Inquiry');

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

    // Get expense types statistics
    const totalExpenseTypes = await ExpenseType.countDocuments();
    const activeExpenseTypes = await ExpenseType.countDocuments({ isActive: true });

    // Get doctors statistics
    const totalDoctors = await Doctor.countDocuments();
    const activeDoctors = await Doctor.countDocuments({ isActive: true });

    // Get hospitals statistics
    const totalHospitals = await Hospital.countDocuments();
    const activeHospitals = await Hospital.countDocuments({ isActive: true });

    // Get procedures statistics
    const totalProcedures = await Procedure.countDocuments();
    const activeProcedures = await Procedure.countDocuments({ isActive: true });

    // Get implant types statistics
    const totalImplantTypes = await ImplantType.countDocuments();
    const activeImplantTypes = await ImplantType.countDocuments({ isActive: true });

    // Get material master statistics
    const totalMaterials = await MaterialMaster.countDocuments();
    const activeMaterials = await MaterialMaster.countDocuments({ isActive: true });

    // Get delivery challan details statistics
    const totalDeliveryChallans = await DeliveryChallanDetails.countDocuments();
    const activeDeliveryChallans = await DeliveryChallanDetails.countDocuments({ isActive: true });

    // Get sales orders statistics
    const totalSalesOrders = await SalesOrder.countDocuments();
    const activeSalesOrders = await SalesOrder.countDocuments({ isActive: true });

    // Get inquiry statistics
    const totalInquiries = await Inquiry.countDocuments();
    const activeInquiries = await Inquiry.countDocuments({ isActive: true });

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
      expenseTypes: {
        total: totalExpenseTypes,
        active: activeExpenseTypes,
        count: activeExpenseTypes,
        label: 'Expense Types'
      },
      doctors: {
        total: totalDoctors,
        active: activeDoctors,
        count: activeDoctors,
        label: 'Doctors'
      },
      hospitals: {
        total: totalHospitals,
        active: activeHospitals,
        count: activeHospitals,
        label: 'Hospitals'
      },
      procedures: {
        total: totalProcedures,
        active: activeProcedures,
        count: activeProcedures,
        label: 'Procedures'
      },
      implantTypes: {
        total: totalImplantTypes,
        active: activeImplantTypes,
        count: activeImplantTypes,
        label: 'Implant Types'
      },
      materialMaster: {
        total: totalMaterials,
        active: activeMaterials,
        count: activeMaterials,
        label: 'Material Master'
      },
      deliveryChallanDetails: {
        total: totalDeliveryChallans,
        active: activeDeliveryChallans,
        count: activeDeliveryChallans,
        label: 'Delivery Challans'
      },
      salesOrders: {
        total: totalSalesOrders,
        active: activeSalesOrders,
        count: activeSalesOrders,
        label: 'Sales Orders'
      },
      inquiries: {
        total: totalInquiries,
        active: activeInquiries,
        count: activeInquiries,
        label: 'Inquiries'
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
