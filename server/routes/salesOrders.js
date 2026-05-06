const express = require('express');
const router = express.Router();
const SalesOrder = require('../models/SalesOrder');
const Hospital = require('../models/Hospital');
const Doctor = require('../models/Doctor');
const Category = require('../models/Category');
const PaymentType = require('../models/PaymentType');
const Procedure = require('../models/Procedure');
const CompanyDetails = require('../models/CompanyDetails');
const NumberRange = require('../models/NumberRange');
const User = require('../models/User');

// Get all sales orders with pagination and search
router.get('/', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = '',
      customer = '',
      surgicalCategory = '',
      paymentType = '',
      status = '',
      sortBy = 'documentDate',
      sortOrder = 'desc'
    } = req.query;

    const query = { isActive: true };

    // Add search functionality
    if (search) {
      query.$or = [
        { salesOrderNumber: { $regex: search, $options: 'i' } },
        { patientName: { $regex: search, $options: 'i' } },
        { uhid: { $regex: search, $options: 'i' } }
      ];
    }

    // Add filters
    if (customer) query.customer = customer;
    if (surgicalCategory) query.surgicalCategory = surgicalCategory;
    if (paymentType) query.paymentType = paymentType;
    if (status) query.status = status;

    // Execute query with pagination
    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      sort: { [sortBy]: sortOrder === 'desc' ? -1 : 1 },
      populate: [
        { path: 'customer', select: 'shortName legalName code' },
        { 
          path: 'procedure', 
          select: 'name code totalLimit currency items',
          populate: {
            path: 'items.surgicalCategoryId',
            select: 'name description code'
          }
        },
        { path: 'paymentType', select: 'description code' },
        { path: 'surgeon', select: 'name' },
        { path: 'consultingDoctor', select: 'name' },
        { path: 'surgicalCategory', select: 'name code description' },
        { path: 'createdBy', select: 'name email' },
        { path: 'updatedBy', select: 'name email' }
      ]
    };

    const result = await SalesOrder.paginate(query, options);

    res.json({
      success: true,
      data: result.docs,
      pagination: {
        currentPage: result.page,
        totalPages: result.totalPages,
        totalItems: result.totalDocs,
        itemsPerPage: result.limit,
        hasNextPage: result.hasNextPage,
        hasPrevPage: result.hasPrevPage
      }
    });
  } catch (error) {
    console.error('Error fetching sales orders:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching sales orders',
      error: error.message
    });
  }
});

// Get surgical categories for a hospital - MUST be before /:id route
router.get('/hospital/:hospitalId/surgical-categories', async (req, res) => {
  try {
    const { hospitalId } = req.params;
    
    // Get hospital with populated surgical categories
    const hospital = await Hospital.findById(hospitalId)
      .populate('surgicalCategories', 'description code name _id')
      .select('surgicalCategories');
    
    if (!hospital) {
      return res.status(404).json({
        success: false,
        message: 'Hospital not found'
      });
    }

    res.json({
      success: true,
      data: hospital.surgicalCategories || []
    });
  } catch (error) {
    console.error('Error fetching surgical categories:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching surgical categories',
      error: error.message
    });
  }
});

// Get procedures filtered by hospital - MUST be before /:id route
router.get('/procedures/:hospitalId', async (req, res) => {
  try {
    const { hospitalId } = req.params;
    const { category, paymentType } = req.query;
    
    // Get hospital with surgical categories to filter procedures
    const hospital = await Hospital.findById(hospitalId).populate('surgicalCategories');
    if (!hospital) {
      return res.status(404).json({
        success: false,
        message: 'Hospital not found'
      });
    }
    
    const hospitalCategoryIds = hospital.surgicalCategories.map(cat => cat._id.toString());
    
    // Build procedure filter
    const procedureFilter = { isActive: true };
    
    // Filter by selected category (if specified)
    if (category && category !== '') {
      procedureFilter['items.surgicalCategoryId'] = category;
    } else {
      // If no specific category, filter by hospital's categories
      if (hospitalCategoryIds.length > 0) {
        procedureFilter['items.surgicalCategoryId'] = { $in: hospitalCategoryIds };
      }
    }
    
    // Filter by payment type (if specified)
    if (paymentType && paymentType !== '') {
      procedureFilter.paymentTypeId = paymentType;
    }
    
    // Fetch procedures with population
    const procedures = await Procedure.find(procedureFilter)
      .populate('items.surgicalCategoryId', 'code description name')
      .populate('paymentTypeId', 'code description')
      .select('_id code name items paymentTypeId totalLimit')
      .sort({ name: 1 });
    
    res.json({
      success: true,
      data: procedures
    });
  } catch (error) {
    console.error('Error fetching procedures:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching procedures',
      error: error.message
    });
  }
});

// Get dropdown data for sales order form - MUST be before /:id route
router.get('/meta/dropdown-data', async (req, res) => {
  try {
    const [customers, doctors, categories, procedures, paymentTypes] = await Promise.all([
      Hospital.find({ isActive: true })
        .select('shortName legalName code stateCode customerIsHospital _id'),
      Doctor.find({ isActive: true })
        .select('name specialization _id'),
      Category.find({ isActive: true })
        .select('code description name _id'),
      Procedure.find({ isActive: true })
        .populate('items.surgicalCategoryId', 'code description name')
        .select('name code items totalLimit currency _id'),
      PaymentType.find({ isActive: true })
        .select('code description _id')
    ]);

    res.json({
      customers,
      doctors,
      categories,
      procedures,
      paymentTypes
    });
  } catch (error) {
    console.error('Error fetching dropdown data:', error);
    res.status(500).json({
      customers: [],
      doctors: [],
      categories: [],
      procedures: [],
      paymentTypes: []
    });
  }
});

// Get sales order by ID
router.get('/:id', async (req, res) => {
  try {
    const salesOrder = await SalesOrder.findById(req.params.id)
      .populate('customer', 'shortName legalName code stateCode')
      .populate({
        path: 'procedure',
        select: 'name code totalLimit currency items',
        populate: {
          path: 'items.surgicalCategoryId',
          select: 'name description code'
        }
      })
      .populate('paymentType', 'description code')
      .populate('surgeon', 'name')
      .populate('consultingDoctor', 'name')
      .populate('surgicalCategory', 'name code description')
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email');

    if (!salesOrder) {
      return res.status(404).json({
        success: false,
        message: 'Sales order not found'
      });
    }

    res.json({
      success: true,
      data: salesOrder
    });
  } catch (error) {
    console.error('Error fetching sales order:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching sales order',
      error: error.message
    });
  }
});

// Create new sales order
router.post('/', async (req, res) => {
  try {
    const {
      patientName,
      uhid,
      customer,
      surgicalCategory,
      procedure,
      surgeon,
      consultingDoctor,
      paymentType,
      items = [],
      rounding = 0,
      notes = '',
      businessUnit
    } = req.body;

    // Validate required fields
    if (!customer) {
      return res.status(400).json({
        success: false,
        message: 'Missing required field: customer'
      });
    }

    // Get customer details for state code and to check if hospital
    const customerData = await Hospital.findById(customer);
    if (!customerData) {
      return res.status(400).json({
        success: false,
        message: 'Customer hospital not found'
      });
    }

    // For hospital customers, patientName, uhid, and paymentType are required
    if (customerData.customerIsHospital) {
      if (!patientName) {
        return res.status(400).json({
          success: false,
          message: 'Missing required field: patientName'
        });
      }
      if (!uhid) {
        return res.status(400).json({
          success: false,
          message: 'Missing required field: uhid'
        });
      }
      if (!paymentType) {
        return res.status(400).json({
          success: false,
          message: 'Missing required field: paymentType'
        });
      }
    }

    // Get company details for GST calculation
    const company = await CompanyDetails.findOne({ isActive: true });
    if (!company) {
      return res.status(400).json({
        success: false,
        message: 'Company details not found'
      });
    }

    // Get next sales order number using NumberRange model
    const businessUnitId = businessUnit || '6767dd82b1eeccc42e09b59b'; // Default business unit
    const createdByUser = req.user?._id || '6767dd82b1eeccc42e09b565'; // Default user
    const salesOrderNumber = await NumberRange.getNextNumberForType(businessUnitId, 'SalesOrder', createdByUser);

    // Create sales order object
    const salesOrderData = {
      salesOrderNumber,
      documentDate: new Date(),
      patientName: patientName || '',
      uhid: uhid || '',
      customer,
      surgicalCategory: surgicalCategory || undefined,
      procedure: procedure || undefined,
      surgeon: surgeon || undefined,
      consultingDoctor: consultingDoctor || undefined,
      paymentType: paymentType || undefined,
      items,
      rounding,
      notes,
      businessUnit: businessUnit || '6767dd82b1eeccc42e09b59b', // Default business unit
      status: 'DRAFT',
      isActive: true,
      createdBy: req.user?._id || '6767dd82b1eeccc42e09b565', // Default user
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const salesOrder = new SalesOrder(salesOrderData);
    await salesOrder.save();

    // Populate and return
    const populatedSalesOrder = await SalesOrder.findById(salesOrder._id)
      .populate('customer', 'shortName legalName code')
      .populate('surgeon', 'name')
      .populate('consultingDoctor', 'name')
      .populate('surgicalCategory', 'name code')
      .populate('procedure', 'name code');

    res.status(201).json({
      success: true,
      message: 'Sales order created successfully',
      data: populatedSalesOrder
    });
  } catch (error) {
    console.error('❌ Error creating sales order:', error.message);
    console.error('Error details:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating sales order',
      error: error.message,
      details: error.errors ? Object.keys(error.errors).map(key => `${key}: ${error.errors[key].message}`) : []
    });
  }
});

// Update sales order
router.put('/:id', async (req, res) => {
  try {
    const salesOrder = await SalesOrder.findById(req.params.id);
    
    if (!salesOrder) {
      return res.status(404).json({
        success: false,
        message: 'Sales order not found'
      });
    }

    // Update allowed fields
    const allowedFields = [
      'patientName',
      'uhid',
      'surgicalCategory',
      'procedure',
      'surgeon',
      'consultingDoctor',
      'paymentType',
      'items',
      'rounding',
      'notes',
      'status'
    ];

    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        salesOrder[field] = req.body[field];
      }
    });

    salesOrder.updatedBy = req.user?._id || '6767dd82b1eeccc42e09b565';
    salesOrder.updatedAt = new Date();

    await salesOrder.save();

    // Populate and return
    const populatedSalesOrder = await SalesOrder.findById(salesOrder._id)
      .populate('customer', 'shortName legalName code')
      .populate('surgeon', 'name')
      .populate('surgicalCategory', 'name code')
      .populate('procedure', 'name code')
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email');

    res.json({
      success: true,
      message: 'Sales order updated successfully',
      data: populatedSalesOrder
    });
  } catch (error) {
    console.error('Error updating sales order:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating sales order',
      error: error.message
    });
  }
});

// Delete sales order (soft delete)
router.delete('/:id', async (req, res) => {
  try {
    const salesOrder = await SalesOrder.findById(req.params.id);
    
    if (!salesOrder) {
      return res.status(404).json({
        success: false,
        message: 'Sales order not found'
      });
    }

    // Don't allow deletion of confirmed or delivered orders
    if (['CONFIRMED', 'DELIVERED'].includes(salesOrder.status)) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete confirmed or delivered sales orders'
      });
    }

    salesOrder.isActive = false;
    salesOrder.updatedBy = req.user?._id || '6767dd82b1eeccc42e09b565';
    await salesOrder.save();

    res.json({
      success: true,
      message: 'Sales order deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting sales order:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting sales order',
      error: error.message
    });
  }
});

// Add item to sales order
router.post('/:id/items', async (req, res) => {
  try {
    const salesOrder = await SalesOrder.findById(req.params.id);
    
    if (!salesOrder) {
      return res.status(404).json({
        success: false,
        message: 'Sales order not found'
      });
    }

    if (salesOrder.status !== 'DRAFT') {
      return res.status(400).json({
        success: false,
        message: 'Can only add items to DRAFT sales orders'
      });
    }

    const {
      materialNumber,
      materialDescription,
      hsnCode,
      unitRate,
      gstPercentage,
      quantity,
      unit,
      discountPercentage = 0,
      discountAmount = 0
    } = req.body;

    // Calculate total amount
    const baseAmount = unitRate * quantity;
    const discount = discountAmount || ((baseAmount * discountPercentage) / 100);
    const amountAfterDiscount = baseAmount - discount;
    const gstAmount = (amountAfterDiscount * gstPercentage) / 100;
    const totalAmount = amountAfterDiscount + gstAmount;

    const newItem = {
      serialNumber: (salesOrder.items?.length || 0) + 1,
      materialNumber,
      materialDescription,
      hsnCode,
      unitRate: Math.round(unitRate * 100) / 100,
      gstPercentage: Math.round(gstPercentage * 100) / 100,
      quantity: Math.round(quantity * 100) / 100,
      unit,
      discountPercentage: Math.round(discountPercentage * 100) / 100,
      discountAmount: Math.round(discount * 100) / 100,
      totalAmount: Math.round(totalAmount * 100) / 100,
      gstAmount: Math.round(gstAmount * 100) / 100,
      cgstAmount: 0,
      sgstAmount: 0,
      igstAmount: 0,
      currency: 'INR'
    };

    salesOrder.items.push(newItem);
    await salesOrder.save();

    res.status(201).json({
      success: true,
      message: 'Item added successfully',
      data: salesOrder
    });
  } catch (error) {
    console.error('Error adding item:', error);
    res.status(500).json({
      success: false,
      message: 'Error adding item',
      error: error.message
    });
  }
});

// Update item in sales order
router.put('/:id/items/:itemIndex', async (req, res) => {
  try {
    const { id, itemIndex } = req.params;
    const salesOrder = await SalesOrder.findById(id);
    
    if (!salesOrder) {
      return res.status(404).json({
        success: false,
        message: 'Sales order not found'
      });
    }

    if (salesOrder.status !== 'DRAFT') {
      return res.status(400).json({
        success: false,
        message: 'Can only update items in DRAFT sales orders'
      });
    }

    const idx = parseInt(itemIndex);
    if (idx < 0 || idx >= salesOrder.items.length) {
      return res.status(400).json({
        success: false,
        message: 'Invalid item index'
      });
    }

    const item = salesOrder.items[idx];
    const {
      materialNumber,
      materialDescription,
      hsnCode,
      unitRate,
      gstPercentage,
      quantity,
      unit,
      discountPercentage = 0,
      discountAmount = 0
    } = req.body;

    // Recalculate totals
    const baseAmount = unitRate * quantity;
    const discount = discountAmount || ((baseAmount * discountPercentage) / 100);
    const amountAfterDiscount = baseAmount - discount;
    const gstAmount = (amountAfterDiscount * gstPercentage) / 100;
    const totalAmount = amountAfterDiscount + gstAmount;

    item.materialNumber = materialNumber;
    item.materialDescription = materialDescription;
    item.hsnCode = hsnCode;
    item.unitRate = Math.round(unitRate * 100) / 100;
    item.gstPercentage = Math.round(gstPercentage * 100) / 100;
    item.quantity = Math.round(quantity * 100) / 100;
    item.unit = unit;
    item.discountPercentage = Math.round(discountPercentage * 100) / 100;
    item.discountAmount = Math.round(discount * 100) / 100;
    item.totalAmount = Math.round(totalAmount * 100) / 100;
    item.gstAmount = Math.round(gstAmount * 100) / 100;

    await salesOrder.save();

    res.json({
      success: true,
      message: 'Item updated successfully',
      data: salesOrder
    });
  } catch (error) {
    console.error('Error updating item:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating item',
      error: error.message
    });
  }
});

// Delete item from sales order
router.delete('/:id/items/:itemIndex', async (req, res) => {
  try {
    const { id, itemIndex } = req.params;
    const salesOrder = await SalesOrder.findById(id);
    
    if (!salesOrder) {
      return res.status(404).json({
        success: false,
        message: 'Sales order not found'
      });
    }

    if (salesOrder.status !== 'DRAFT') {
      return res.status(400).json({
        success: false,
        message: 'Can only delete items from DRAFT sales orders'
      });
    }

    const idx = parseInt(itemIndex);
    if (idx < 0 || idx >= salesOrder.items.length) {
      return res.status(400).json({
        success: false,
        message: 'Invalid item index'
      });
    }

    salesOrder.items.splice(idx, 1);

    // Renumber remaining items
    salesOrder.items.forEach((item, index) => {
      item.serialNumber = index + 1;
    });

    await salesOrder.save();

    res.json({
      success: true,
      message: 'Item deleted successfully',
      data: salesOrder
    });
  } catch (error) {
    console.error('Error deleting item:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting item',
      error: error.message
    });
  }
});

module.exports = router;
