const express = require('express');
const router = express.Router();
const CreditNote = require('../models/CreditNote');
const Hospital = require('../models/Hospital');
const PaymentType = require('../models/PaymentType');
const Category = require('../models/Category');
const Procedure = require('../models/Procedure');

// Get all credit notes for a hospital
router.get('/hospital/:hospitalId', async (req, res) => {
  try {
    const { hospitalId } = req.params;
    
    const creditNotes = await CreditNote.find({
      hospital: hospitalId,
      isActive: true
    })
    .populate('paymentType', 'code description')
    .populate('surgicalCategory', 'code description')
    .populate('procedure', 'code name')
    .populate('createdBy', 'firstName lastName')
    .populate('updatedBy', 'firstName lastName')
    .sort({ priority: -1, validityFrom: -1 }); // Sort by priority first, then by date

    res.json(creditNotes);
  } catch (error) {
    console.error('Error fetching credit notes:', error);
    res.status(500).json({ message: 'Server error while fetching credit notes' });
  }
});

// Get payment types, categories, and procedures for dropdowns
router.get('/options/:hospitalId', async (req, res) => {
  try {
    const { hospitalId } = req.params;
    const { paymentType, surgicalCategory } = req.query; // Get filter parameters
    
    // Get hospital's surgical categories first
    const hospital = await Hospital.findById(hospitalId).populate('surgicalCategories');
    if (!hospital) {
      return res.status(404).json({ message: 'Hospital not found' });
    }
    
    const hospitalCategoryIds = hospital.surgicalCategories.map(cat => cat._id);
    
    // Build procedure filter based on selected payment type and/or category
    const procedureFilter = { isActive: true };
    
    // Always filter procedures by hospital's categories
    if (hospitalCategoryIds.length > 0) {
      procedureFilter.categoryId = { $in: hospitalCategoryIds };
    }
    
    // Apply additional filters if selected
    if (paymentType && paymentType !== '') {
      procedureFilter.paymentTypeId = paymentType;
    }
    if (surgicalCategory && surgicalCategory !== '') {
      procedureFilter.categoryId = surgicalCategory;
    }
    
    const [paymentTypes, categories, procedures] = await Promise.all([
      // All payment types - independent entity (ignore businessUnitId for now)
      PaymentType.find({
        isActive: true
      }).select('_id code description').sort({ description: 1 }),
      
      // Only categories that are associated with this hospital
      Category.find({
        _id: { $in: hospitalCategoryIds },
        isActive: true
      }).select('_id code description').sort({ description: 1 }),

      // Procedures filtered by payment type and/or category if selected
      Procedure.find(procedureFilter).select('_id code name').sort({ name: 1 })
    ]);

    console.log('Fetching options for hospital:', hospitalId);
    console.log('Filter - Payment Type:', paymentType || 'All');
    console.log('Filter - Surgical Category:', surgicalCategory || 'All');
    console.log('Payment types found:', paymentTypes.length);
    console.log('Hospital categories found:', categories.length);
    console.log('Procedures found (filtered):', procedures.length);

    res.json({
      paymentTypes,
      categories,
      procedures
    });
  } catch (error) {
    console.error('Error fetching options:', error);
    res.status(500).json({ message: 'Server error while fetching options' });
  }
});

// Create new credit note
router.post('/', async (req, res) => {
  try {
    const { hospital, paymentType, surgicalCategory, procedure, percentage, validityFrom, validityTo, description, businessUnit, createdBy } = req.body;

    // Validation
    if (!hospital || percentage === undefined || percentage === null || !validityFrom || !validityTo || !businessUnit || !createdBy) {
      return res.status(400).json({ 
        message: 'Hospital, percentage, validity dates, business unit, and created by are required' 
      });
    }

    if (percentage < 0 || percentage > 100) {
      return res.status(400).json({ 
        message: 'Percentage must be between 0 and 100' 
      });
    }

    // Validate dates
    const fromDate = new Date(validityFrom);
    const toDate = new Date(validityTo);
    
    if (toDate <= fromDate) {
      return res.status(400).json({ 
        message: 'Validity to date must be after validity from date' 
      });
    }

    // Verify hospital exists
    const hospitalExists = await Hospital.findById(hospital);
    if (!hospitalExists) {
      return res.status(404).json({ message: 'Hospital not found' });
    }

    // Verify optional references exist if provided
    const verifications = [];
    if (paymentType) {
      verifications.push(PaymentType.findById(paymentType));
    }
    if (surgicalCategory) {
      verifications.push(Category.findById(surgicalCategory));
    }
    if (procedure) {
      verifications.push(Procedure.findById(procedure));
    }

    if (verifications.length > 0) {
      const results = await Promise.all(verifications);
      let index = 0;
      if (paymentType && !results[index++]) {
        return res.status(404).json({ message: 'Payment type not found' });
      }
      if (surgicalCategory && !results[index++]) {
        return res.status(404).json({ message: 'Surgical category not found' });
      }
      if (procedure && !results[index++]) {
        return res.status(404).json({ message: 'Procedure not found' });
      }
    }

    const creditNote = new CreditNote({
      hospital,
      paymentType: paymentType || undefined,
      surgicalCategory: surgicalCategory || undefined,
      procedure: procedure || undefined,
      percentage: parseFloat(percentage),
      validityFrom: fromDate,
      validityTo: toDate,
      description: description ? description.trim() : '',
      businessUnit,
      createdBy,
      updatedBy: createdBy
    });

    await creditNote.save();
    
    const populatedCreditNote = await CreditNote.findById(creditNote._id)
      .populate('paymentType', 'code description')
      .populate('surgicalCategory', 'code description')
      .populate('procedure', 'code name')
      .populate('createdBy', 'firstName lastName')
      .populate('updatedBy', 'firstName lastName');

    res.status(201).json(populatedCreditNote);
  } catch (error) {
    console.error('Error creating credit note:', error);
    if (error.name === 'ValidationError') {
      const message = Object.values(error.errors)[0].message;
      res.status(400).json({ message });
    } else {
      res.status(500).json({ message: 'Server error while creating credit note' });
    }
  }
});

// Update credit note
router.put('/:id', async (req, res) => {
  try {
    const { percentage, validityFrom, validityTo, description, updatedBy } = req.body;

    if (percentage === undefined || percentage === null || !validityFrom || !validityTo || !updatedBy) {
      return res.status(400).json({ 
        message: 'Percentage, validity dates, and updated by are required' 
      });
    }

    if (percentage < 0 || percentage > 100) {
      return res.status(400).json({ 
        message: 'Percentage must be between 0 and 100' 
      });
    }

    // Validate dates
    const fromDate = new Date(validityFrom);
    const toDate = new Date(validityTo);
    
    if (toDate <= fromDate) {
      return res.status(400).json({ 
        message: 'Validity to date must be after validity from date' 
      });
    }

    const creditNote = await CreditNote.findById(req.params.id);
    if (!creditNote) {
      return res.status(404).json({ message: 'Credit note not found' });
    }

    creditNote.percentage = parseFloat(percentage);
    creditNote.validityFrom = fromDate;
    creditNote.validityTo = toDate;
    creditNote.description = description ? description.trim() : '';
    creditNote.updatedBy = updatedBy;

    await creditNote.save();

    const populatedCreditNote = await CreditNote.findById(creditNote._id)
      .populate('paymentType', 'code description')
      .populate('surgicalCategory', 'code description')
      .populate('procedure', 'code name')
      .populate('createdBy', 'firstName lastName')
      .populate('updatedBy', 'firstName lastName');

    res.json(populatedCreditNote);
  } catch (error) {
    console.error('Error updating credit note:', error);
    if (error.name === 'ValidationError') {
      const message = Object.values(error.errors)[0].message;
      res.status(400).json({ message });
    } else {
      res.status(500).json({ message: 'Server error while updating credit note' });
    }
  }
});

// Delete credit note (soft delete)
router.delete('/:id', async (req, res) => {
  try {
    const { updatedBy } = req.body;

    if (!updatedBy) {
      return res.status(400).json({ message: 'Updated by is required' });
    }

    const creditNote = await CreditNote.findById(req.params.id);
    if (!creditNote) {
      return res.status(404).json({ message: 'Credit note not found' });
    }

    creditNote.isActive = false;
    creditNote.updatedBy = updatedBy;
    await creditNote.save();

    res.json({ message: 'Credit note deleted successfully' });
  } catch (error) {
    console.error('Error deleting credit note:', error);
    res.status(500).json({ message: 'Server error while deleting credit note' });
  }
});

module.exports = router;
