const express = require('express');
const router = express.Router();
const SalesOrder = require('../models/SalesOrder');
const SalesOrderSequence = require('../models/SalesOrderSequence');
const MaterialMaster = require('../models/MaterialMaster');
const Hospital = require('../models/Hospital');
const Doctor = require('../models/Doctor');
const DoctorAssignment = require('../models/DoctorAssignment');
const Category = require('../models/Category');
const Procedure = require('../models/Procedure');
const PaymentType = require('../models/PaymentType');
const CompanyDetails = require('../models/CompanyDetails');

// Get all sales orders with pagination and filters
router.get('/', async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      search = '', 
      customer = '',
      status = '',
      dateFrom = '',
      dateTo = '',
      surgeon = ''
    } = req.query;

    // For now, we'll use a default business unit - this should be from auth later
    const businessUnit = '6767dd82b1eeccc42e09b59b'; // This should come from req.user.businessUnit
    if (!businessUnit) {
      return res.status(400).json({ message: 'Business unit is required' });
    }

    const query = { 
      businessUnit: businessUnit,
      isActive: true 
    };

    // Apply filters
    if (customer) query.customer = customer;
    if (status) query.status = status;
    if (surgeon) query.surgeon = surgeon;

    // Date range filter
    if (dateFrom || dateTo) {
      query.documentDate = {};
      if (dateFrom) query.documentDate.$gte = new Date(dateFrom);
      if (dateTo) query.documentDate.$lte = new Date(dateTo);
    }

    // Search functionality
    if (search) {
      query.$or = [
        { salesOrderNumber: { $regex: search, $options: 'i' } },
        { customerName: { $regex: search, $options: 'i' } },
        { patientName: { $regex: search, $options: 'i' } },
        { uhid: { $regex: search, $options: 'i' } }
      ];
    }

    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      sort: { documentDate: -1, salesOrderNumber: -1 },
      populate: [
        { path: 'customer', select: 'shortName legalName' },
        { path: 'surgeon', select: 'name' },
        { path: 'consultingDoctor', select: 'name' },
        { path: 'surgicalCategory', select: 'name' },
        { path: 'procedure', select: 'name' },
        { path: 'createdBy', select: 'name email' }
      ]
    };

    const result = await SalesOrder.paginate(query, options);

    res.json({
      salesOrders: result.docs,
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.totalDocs,
        totalPages: result.totalPages,
        hasNext: result.hasNextPage,
        hasPrev: result.hasPrevPage
      }
    });
  } catch (error) {
    console.error('Error fetching sales orders:', error);
    res.status(500).json({ message: 'Failed to fetch sales orders' });
  }
});

// Get sales order by ID
router.get('/:id', async (req, res) => {
  try {
    const salesOrder = await SalesOrder.findById(req.params.id)
      .populate('customer', 'shortName legalName address gstNumber stateCode')
      .populate('surgeon', 'name')
      .populate('consultingDoctor', 'name')
      .populate('surgicalCategory', 'name')
      .populate('procedure', 'name')
      .populate('items.material', 'materialNumber description hsnCode unit gstPercentage')
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email');

    if (!salesOrder) {
      return res.status(404).json({ message: 'Sales order not found' });
    }

    // Check business unit access
    if (salesOrder.businessUnit.toString() !== req.user.businessUnit.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json(salesOrder);
  } catch (error) {
    console.error('Error fetching sales order:', error);
    res.status(500).json({ message: 'Failed to fetch sales order' });
  }
});

// Create new sales order
router.post('/', async (req, res) => {
  try {
    const businessUnit = req.user.businessUnit;
    if (!businessUnit) {
      return res.status(400).json({ message: 'Business unit is required' });
    }

    // Get next sales order number
    const sequence = await SalesOrderSequence.getSequenceForBusinessUnit(businessUnit, req.user._id);
    const salesOrderNumber = sequence.getNextNumber();

    // Get company details for GST calculation
    const company = await CompanyDetails.findOne({ isActive: true });
    if (!company) {
      return res.status(400).json({ message: 'Company details not found' });
    }

    // Get customer details
    const customer = await Hospital.findById(req.body.customer);
    if (!customer) {
      return res.status(400).json({ message: 'Customer not found' });
    }

    // Determine GST type based on state codes
    const gstType = company.compliance.stateCode === customer.stateCode ? 'INTRA_STATE' : 'INTER_STATE';

    // Process items and calculate totals
    let totalAmount = 0;
    let totalDiscount = 0;
    let totalGST = 0;
    let totalCGST = 0;
    let totalSGST = 0;
    let totalIGST = 0;

    const processedItems = [];

    for (let i = 0; i < req.body.items.length; i++) {
      const item = req.body.items[i];
      
      // Get material details
      const material = await MaterialMaster.findById(item.material);
      if (!material) {
        return res.status(400).json({ message: `Material not found for item ${i + 1}` });
      }

      // Calculate item amounts
      const quantity = parseFloat(item.quantity);
      const unitPrice = parseFloat(item.unitPrice);
      const discountPercentage = parseFloat(item.discountPercentage || 0);
      
      const basicAmount = quantity * unitPrice;
      const discountAmount = (basicAmount * discountPercentage) / 100;
      const discountedAmount = basicAmount - discountAmount;
      
      // Calculate GST
      const gstPercentage = material.gstPercentage;
      let cgstPercentage = 0, sgstPercentage = 0, igstPercentage = 0;
      let cgstAmount = 0, sgstAmount = 0, igstAmount = 0;
      
      if (gstType === 'INTRA_STATE') {
        cgstPercentage = gstPercentage / 2;
        sgstPercentage = gstPercentage / 2;
        cgstAmount = (discountedAmount * cgstPercentage) / 100;
        sgstAmount = (discountedAmount * sgstPercentage) / 100;
      } else {
        igstPercentage = gstPercentage;
        igstAmount = (discountedAmount * igstPercentage) / 100;
      }
      
      const gstAmount = cgstAmount + sgstAmount + igstAmount;
      const lineTotal = discountedAmount + gstAmount;

      const processedItem = {
        serialNumber: i + 1,
        material: material._id,
        materialNumber: material.materialNumber,
        materialDescription: material.description,
        hsnCode: material.hsnCode,
        unit: material.unit,
        quantity,
        unitPrice,
        discountPercentage,
        discountAmount: Math.round(discountAmount * 100) / 100,
        gstPercentage,
        gstAmount: Math.round(gstAmount * 100) / 100,
        cgstPercentage,
        cgstAmount: Math.round(cgstAmount * 100) / 100,
        sgstPercentage,
        sgstAmount: Math.round(sgstAmount * 100) / 100,
        igstPercentage,
        igstAmount: Math.round(igstAmount * 100) / 100,
        lineTotal: Math.round(lineTotal * 100) / 100
      };

      processedItems.push(processedItem);

      // Add to totals
      totalAmount += basicAmount;
      totalDiscount += discountAmount;
      totalGST += gstAmount;
      totalCGST += cgstAmount;
      totalSGST += sgstAmount;
      totalIGST += igstAmount;
    }

    const grandTotal = totalAmount - totalDiscount + totalGST;

    // Create sales order
    const salesOrderData = {
      ...req.body,
      salesOrderNumber,
      customerName: customer.legalName,
      customerStateCode: customer.stateCode,
      companyStateCode: company.compliance.stateCode,
      gstType,
      items: processedItems,
      totalAmount: Math.round(totalAmount * 100) / 100,
      totalDiscount: Math.round(totalDiscount * 100) / 100,
      totalGST: Math.round(totalGST * 100) / 100,
      totalCGST: Math.round(totalCGST * 100) / 100,
      totalSGST: Math.round(totalSGST * 100) / 100,
      totalIGST: Math.round(totalIGST * 100) / 100,
      grandTotal: Math.round(grandTotal * 100) / 100,
      businessUnit,
      createdBy: req.user._id
    };

    const salesOrder = new SalesOrder(salesOrderData);
    await salesOrder.save();

    // Increment sequence number
    await sequence.incrementNumber();

    // Populate and return
    const populatedSalesOrder = await SalesOrder.findById(salesOrder._id)
      .populate('customer', 'shortName legalName')
      .populate('surgeon', 'name')
      .populate('consultingDoctor', 'name')
      .populate('surgicalCategory', 'name')
      .populate('procedure', 'name');

    res.status(201).json(populatedSalesOrder);
  } catch (error) {
    console.error('Error creating sales order:', error);
    res.status(500).json({ message: 'Failed to create sales order' });
  }
});

// Update sales order
router.put('/:id', async (req, res) => {
  try {
    const salesOrder = await SalesOrder.findById(req.params.id);
    
    if (!salesOrder) {
      return res.status(404).json({ message: 'Sales order not found' });
    }

    // Check business unit access - this should be from auth later
    // if (salesOrder.businessUnit.toString() !== req.user.businessUnit.toString()) {
    //   return res.status(403).json({ message: 'Access denied' });
    // }

    // Don't allow editing of confirmed or delivered orders
    if (['CONFIRMED', 'DELIVERED'].includes(salesOrder.status)) {
      return res.status(400).json({ message: 'Cannot edit confirmed or delivered sales orders' });
    }

    // Similar processing as create for items and totals calculation
    // ... (implementation similar to create route)

    const updatedSalesOrder = await SalesOrder.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedBy: req.user._id },
      { new: true, runValidators: true }
    ).populate('customer', 'shortName legalName')
     .populate('surgeon', 'name')
     .populate('consultingDoctor', 'name')
     .populate('surgicalCategory', 'name')
     .populate('procedure', 'name');

    res.json(updatedSalesOrder);
  } catch (error) {
    console.error('Error updating sales order:', error);
    res.status(500).json({ message: 'Failed to update sales order' });
  }
});

// Delete sales order (soft delete)
router.delete('/:id', async (req, res) => {
  try {
    const salesOrder = await SalesOrder.findById(req.params.id);
    
    if (!salesOrder) {
      return res.status(404).json({ message: 'Sales order not found' });
    }

    // Check business unit access
    if (salesOrder.businessUnit.toString() !== req.user.businessUnit.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Don't allow deletion of confirmed or delivered orders
    if (['CONFIRMED', 'DELIVERED'].includes(salesOrder.status)) {
      return res.status(400).json({ message: 'Cannot delete confirmed or delivered sales orders' });
    }

    salesOrder.isActive = false;
    salesOrder.updatedBy = req.user._id;
    await salesOrder.save();

    res.json({ message: 'Sales order deleted successfully' });
  } catch (error) {
    console.error('Error deleting sales order:', error);
    res.status(500).json({ message: 'Failed to delete sales order' });
  }
});

// Get dropdown data for sales order form
router.get('/meta/dropdown-data', async (req, res) => {
  try {
    // Remove businessUnit requirement since it's causing issues
    // const businessUnit = req.user.businessUnit;

    const [customers, doctors, categories, procedures, materials, paymentTypes] = await Promise.all([
      Hospital.find({ isActive: true })
        .populate('surgicalCategories', 'code description')
        .select('shortName legalName stateCode discountAllowed customerIsHospital surgicalCategories'),
      Doctor.find({ isActive: true }).select('name specialization'),
      Category.find({ isActive: true }).select('code description'),
      Procedure.find({ isActive: true }).populate('paymentTypeId', 'code description').select('name categoryId paymentTypeId'),
      MaterialMaster.find({ isActive: true }).select('materialNumber description hsnCode unit institutionalPrice gstPercentage'),
      PaymentType.find({ isActive: true }).select('code description')
    ]);

    res.json({
      customers,
      doctors,
      categories,
      procedures,
      materials,
      paymentTypes
    });
  } catch (error) {
    console.error('Error fetching dropdown data:', error);
    res.status(500).json({ message: 'Failed to fetch dropdown data' });
  }
});

// Get filtered doctors by customer
router.get('/meta/doctors/:customerId', async (req, res) => {
  try {
    const { customerId } = req.params;
    
    // Get doctor assignments for this customer
    const assignments = await DoctorAssignment.find({ 
      hospital: customerId, 
      isActive: true 
    })
      .populate('doctor', 'name specialization')
      .select('doctor');
      
    const doctors = assignments.map(assignment => assignment.doctor).filter(doctor => doctor);
    
    res.json({ doctors });
  } catch (error) {
    console.error('Error fetching filtered doctors:', error);
    res.status(500).json({ message: 'Failed to fetch filtered doctors' });
  }
});

// Get filtered doctors by customer and surgical category
router.get('/meta/doctors/:customerId/:surgicalCategoryId', async (req, res) => {
  try {
    const { customerId, surgicalCategoryId } = req.params;
    
    // Get doctor assignments for this customer and surgical category
    const query = { hospital: customerId, isActive: true };
    if (surgicalCategoryId && surgicalCategoryId !== 'undefined' && surgicalCategoryId !== 'null') {
      query.surgicalCategory = surgicalCategoryId;
    }
    
    const assignments = await DoctorAssignment.find(query)
      .populate('doctor', 'name specialization')
      .select('doctor');
      
    const doctors = assignments.map(assignment => assignment.doctor).filter(doctor => doctor);
    
    res.json({ doctors });
  } catch (error) {
    console.error('Error fetching filtered doctors:', error);
    res.status(500).json({ message: 'Failed to fetch filtered doctors' });
  }
});

// Get procedures by payment type
router.get('/meta/procedures/:paymentTypeId', async (req, res) => {
  try {
    const { paymentTypeId } = req.params;
    
    const procedures = await Procedure.find({ 
      paymentTypes: paymentTypeId,
      isActive: true 
    }).select('name category');
    
    res.json({ procedures });
  } catch (error) {
    console.error('Error fetching filtered procedures:', error);
    res.status(500).json({ message: 'Failed to fetch filtered procedures' });
  }
});

// Get materials by customer (for price filtering)
router.get('/meta/materials/:customerId', async (req, res) => {
  try {
    const customer = await Hospital.findById(req.params.customerId)
      .populate('materialAssignments.material', 'materialNumber description hsnCode unit gstPercentage');

    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    // Return assigned materials with custom pricing if available
    const materials = customer.materialAssignments
      .filter(assignment => assignment.isActive)
      .map(assignment => ({
        ...assignment.material.toObject(),
        institutionalPrice: assignment.institutionalPrice,
        customPricing: true
      }));

    // Also include all other materials with default pricing
    const assignedMaterialIds = materials.map(m => m._id.toString());
    const otherMaterials = await MaterialMaster.find({
      isActive: true,
      _id: { $nin: assignedMaterialIds }
    }).select('materialNumber description hsnCode unit institutionalPrice gstPercentage');

    const allMaterials = [
      ...materials,
      ...otherMaterials.map(m => ({ ...m.toObject(), customPricing: false }))
    ];

    res.json({ materials: allMaterials, discountAllowed: customer.discountAllowed });
  } catch (error) {
    console.error('Error fetching customer materials:', error);
    res.status(500).json({ message: 'Failed to fetch customer materials' });
  }
});

// Sales order sequence management routes

// Get current sequence for business unit
router.get('/meta/sequence', async (req, res) => {
  try {
    const businessUnit = req.user.businessUnit;
    const sequence = await SalesOrderSequence.getSequenceForBusinessUnit(businessUnit, req.user._id);
    res.json(sequence);
  } catch (error) {
    console.error('Error fetching sequence:', error);
    res.status(500).json({ message: 'Failed to fetch sequence' });
  }
});

// Update sequence number
router.put('/meta/sequence', async (req, res) => {
  try {
    const businessUnit = req.user.businessUnit;
    const { currentNumber } = req.body;

    if (!currentNumber || currentNumber < 1) {
      return res.status(400).json({ message: 'Invalid sequence number' });
    }

    const sequence = await SalesOrderSequence.findOneAndUpdate(
      { businessUnit, isActive: true },
      { 
        currentNumber: parseInt(currentNumber),
        updatedBy: req.user._id,
        updatedAt: new Date()
      },
      { new: true }
    );

    if (!sequence) {
      return res.status(404).json({ message: 'Sequence not found' });
    }

    res.json(sequence);
  } catch (error) {
    console.error('Error updating sequence:', error);
    res.status(500).json({ message: 'Failed to update sequence' });
  }
});

module.exports = router;
