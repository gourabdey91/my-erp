const express = require('express');
const router = express.Router();
const DeliveryChallanDetails = require('../models/DeliveryChallanDetails');
const Hospital = require('../models/Hospital');

// GET /api/delivery-challan-details - Get all delivery challan details with pagination and filters
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    const { search, hospitalId, consumed, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
    
    // Build query
    const query = { isActive: true };
    
    // Add business unit filter
    if (req.user && req.user.businessUnit) {
      query.businessUnit = req.user.businessUnit;
    }
    
    if (hospitalId) {
      query.hospital = hospitalId;
    }
    
    if (consumed !== undefined) {
      query.consumedIndicator = consumed === 'true';
    }
    
    if (search) {
      query.$or = [
        { deliveryChallanNumber: { $regex: search, $options: 'i' } },
        { salesOrderNumber: { $regex: search, $options: 'i' } }
      ];
    }
    
    // Execute query with pagination
    const [deliveryChallans, total] = await Promise.all([
      DeliveryChallanDetails.find(query)
        .populate('hospital', 'shortName legalName')
        .populate('businessUnit', 'name code')
        .populate('createdBy', 'fullName')
        .sort({ [sortBy]: sortOrder === 'desc' ? -1 : 1 })
        .skip(skip)
        .limit(limit),
      DeliveryChallanDetails.countDocuments(query)
    ]);
    
    res.json({
      deliveryChallans,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching delivery challan details:', error);
    res.status(500).json({ message: 'Server error while fetching delivery challan details' });
  }
});

// GET /api/delivery-challan-details/dropdown-data - Get dropdown data
router.get('/dropdown-data', async (req, res) => {
  try {
    const query = { isActive: true };
    
    // Add business unit filter for hospitals
    if (req.user && req.user.businessUnit) {
      query.businessUnit = req.user.businessUnit;
    }
    
    const hospitals = await Hospital.find(query)
      .select('_id shortName legalName')
      .sort({ shortName: 1 });

    res.json({ hospitals });
  } catch (error) {
    console.error('Error fetching dropdown data:', error);
    res.status(500).json({ message: 'Server error while fetching dropdown data' });
  }
});

// GET /api/delivery-challan-details/:id - Get single delivery challan details
router.get('/:id', async (req, res) => {
  try {
    const deliveryChallan = await DeliveryChallanDetails.findById(req.params.id)
      .populate('hospital', 'shortName legalName')
      .populate('businessUnit', 'name code')
      .populate('createdBy', 'fullName')
      .populate('updatedBy', 'fullName');
    
    if (!deliveryChallan) {
      return res.status(404).json({ message: 'Delivery challan details not found' });
    }
    
    res.json(deliveryChallan);
  } catch (error) {
    console.error('Error fetching delivery challan details:', error);
    res.status(500).json({ message: 'Server error while fetching delivery challan details' });
  }
});

// POST /api/delivery-challan-details - Create new delivery challan details
router.post('/', async (req, res) => {
  try {
    const {
      deliveryChallanNumber,
      hospital,
      challanDate,
      salesOrderNumber,
      consumedIndicator,
      createdBy,
      updatedBy
    } = req.body;
    
    // Validate required fields
    if (!deliveryChallanNumber || !hospital || !createdBy) {
      return res.status(400).json({ message: 'Delivery challan number, hospital, and created by are required' });
    }
    
    // Create new delivery challan details (business unit will be set automatically from hospital in pre-save middleware)
    const deliveryChallan = new DeliveryChallanDetails({
      deliveryChallanNumber,
      hospital,
      challanDate: challanDate ? new Date(challanDate) : undefined,
      salesOrderNumber,
      consumedIndicator: consumedIndicator || false,
      createdBy,
      updatedBy: updatedBy || createdBy
    });
    
    await deliveryChallan.save();
    
    // Populate the created delivery challan
    const populatedDeliveryChallan = await DeliveryChallanDetails.findById(deliveryChallan._id)
      .populate('hospital', 'shortName legalName')
      .populate('businessUnit', 'name code')
      .populate('createdBy', 'fullName');
    
    res.status(201).json(populatedDeliveryChallan);
  } catch (error) {
    if (error.code === 11000) {
      const field = Object.keys(error.keyValue)[0];
      return res.status(400).json({ 
        message: `A delivery challan with this ${field} already exists` 
      });
    }
    
    console.error('Error creating delivery challan details:', error);
    res.status(500).json({ message: 'Server error while creating delivery challan details' });
  }
});

// PUT /api/delivery-challan-details/:id - Update delivery challan details
router.put('/:id', async (req, res) => {
  try {
    const {
      deliveryChallanNumber,
      hospital,
      challanDate,
      salesOrderNumber,
      consumedIndicator,
      updatedBy
    } = req.body;
    
    const deliveryChallan = await DeliveryChallanDetails.findById(req.params.id);
    
    if (!deliveryChallan) {
      return res.status(404).json({ message: 'Delivery challan details not found' });
    }
    
    // Update fields
    if (deliveryChallanNumber !== undefined) deliveryChallan.deliveryChallanNumber = deliveryChallanNumber;
    if (hospital !== undefined) deliveryChallan.hospital = hospital;
    if (challanDate !== undefined) deliveryChallan.challanDate = challanDate ? new Date(challanDate) : undefined;
    if (salesOrderNumber !== undefined) deliveryChallan.salesOrderNumber = salesOrderNumber;
    if (consumedIndicator !== undefined) deliveryChallan.consumedIndicator = consumedIndicator;
    
    deliveryChallan.updatedBy = updatedBy;
    
    await deliveryChallan.save();
    
    // Populate the updated delivery challan
    const populatedDeliveryChallan = await DeliveryChallanDetails.findById(deliveryChallan._id)
      .populate('hospital', 'shortName legalName')
      .populate('businessUnit', 'name code')
      .populate('createdBy', 'fullName')
      .populate('updatedBy', 'fullName');
    
    res.json(populatedDeliveryChallan);
  } catch (error) {
    if (error.code === 11000) {
      const field = Object.keys(error.keyValue)[0];
      return res.status(400).json({ 
        message: `A delivery challan with this ${field} already exists` 
      });
    }
    
    console.error('Error updating delivery challan details:', error);
    res.status(500).json({ message: 'Server error while updating delivery challan details' });
  }
});

// DELETE /api/delivery-challan-details/:id - Soft delete delivery challan details
router.delete('/:id', async (req, res) => {
  try {
    const deliveryChallan = await DeliveryChallanDetails.findById(req.params.id);
    
    if (!deliveryChallan) {
      return res.status(404).json({ message: 'Delivery challan details not found' });
    }

    // Use findByIdAndUpdate to avoid validation issues during save
    const updatedDeliveryChallan = await DeliveryChallanDetails.findByIdAndUpdate(
      req.params.id,
      { 
        isActive: false,
        updatedBy: req.user?._id || deliveryChallan.updatedBy, // Fallback to existing updatedBy if no user
        updatedAt: new Date()
      },
      { new: true, runValidators: false } // Skip validators to avoid issues with required fields during soft delete
    );

    res.json({ message: 'Delivery challan details deleted successfully' });
  } catch (error) {
    console.error('Error deleting delivery challan details:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      message: 'Server error while deleting delivery challan details',
      error: error.message 
    });
  }
});

module.exports = router;
