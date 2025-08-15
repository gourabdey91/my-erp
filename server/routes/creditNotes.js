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
    .populate('procedure', 'code name')
    .populate('items.surgicalCategory', 'code description')
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
    
    // Always filter procedures by hospital's categories using the new items structure
    if (hospitalCategoryIds.length > 0) {
      procedureFilter['items.surgicalCategoryId'] = { $in: hospitalCategoryIds };
    }
    
    // Apply additional filters if selected
    if (paymentType && paymentType !== '') {
      procedureFilter.paymentTypeId = paymentType;
    }
    if (surgicalCategory && surgicalCategory !== '') {
      // Filter procedures that have this specific category in their items
      procedureFilter['items.surgicalCategoryId'] = surgicalCategory;
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
      Procedure.find(procedureFilter)
        .populate('items.surgicalCategoryId', 'code description')
        .populate('paymentTypeId', 'code description')
        .select('_id code name items paymentTypeId totalLimit')
        .sort({ name: 1 })
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
    const { 
      hospital, 
      paymentType, 
      procedure, 
      percentage, 
      amount, 
      splitCategoryWise, 
      items, 
      validityFrom, 
      validityTo, 
      description, 
      businessUnit, 
      createdBy 
    } = req.body;

    // Basic validation
    if (!hospital || !validityFrom || !validityTo || !businessUnit || !createdBy) {
      return res.status(400).json({ 
        message: 'Hospital, validity dates, business unit, and created by are required' 
      });
    }

    // Validate either percentage or amount at header level (if not split category wise)
    if (!splitCategoryWise) {
      if (percentage !== undefined && amount !== undefined) {
        return res.status(400).json({ 
          message: 'Cannot specify both percentage and amount at header level' 
        });
      }
      if (percentage === undefined && amount === undefined) {
        return res.status(400).json({ 
          message: 'Either percentage or amount is required when not splitting category wise' 
        });
      }
      
      // Validate percentage range
      if (percentage !== undefined && (percentage < 0 || percentage > 100)) {
        return res.status(400).json({ 
          message: 'Percentage must be between 0 and 100' 
        });
      }
      
      // Validate amount
      if (amount !== undefined && amount < 0) {
        return res.status(400).json({ 
          message: 'Amount cannot be negative' 
        });
      }
    }

    // Validate items if split category wise
    if (splitCategoryWise) {
      if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ 
          message: 'Items are required when splitting category wise' 
        });
      }
      
      for (const item of items) {
        if (!item.surgicalCategory) {
          return res.status(400).json({ 
            message: 'Surgical category is required for each item' 
          });
        }
        
        if (item.percentage !== undefined && item.amount !== undefined) {
          return res.status(400).json({ 
            message: 'Cannot specify both percentage and amount at item level' 
          });
        }
        
        if (item.percentage === undefined && item.amount === undefined) {
          return res.status(400).json({ 
            message: 'Either percentage or amount is required for each item' 
          });
        }
        
        if (item.percentage !== undefined && (item.percentage < 0 || item.percentage > 100)) {
          return res.status(400).json({ 
            message: 'Item percentage must be between 0 and 100' 
          });
        }
        
        if (item.amount !== undefined && item.amount < 0) {
          return res.status(400).json({ 
            message: 'Item amount cannot be negative' 
          });
        }
      }
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
    if (procedure) {
      verifications.push(Procedure.findById(procedure));
    }

    // Verify categories in items if split category wise
    if (splitCategoryWise && items) {
      const categoryIds = items.map(item => item.surgicalCategory);
      const uniqueCategoryIds = [...new Set(categoryIds)];
      verifications.push(Category.find({ _id: { $in: uniqueCategoryIds } }));
    }

    if (verifications.length > 0) {
      const results = await Promise.all(verifications);
      let index = 0;
      
      if (paymentType && !results[index++]) {
        return res.status(404).json({ message: 'Payment type not found' });
      }
      if (procedure && !results[index++]) {
        return res.status(404).json({ message: 'Procedure not found' });
      }
      if (splitCategoryWise && items) {
        const categories = results[index++];
        const foundCategoryIds = categories.map(cat => cat._id.toString());
        const requestedCategoryIds = items.map(item => item.surgicalCategory);
        
        for (const categoryId of requestedCategoryIds) {
          if (!foundCategoryIds.includes(categoryId)) {
            return res.status(404).json({ message: `Surgical category ${categoryId} not found` });
          }
        }
      }
    }

    const creditNoteData = {
      hospital,
      paymentType: paymentType || undefined,
      procedure: procedure || undefined,
      validityFrom: fromDate,
      validityTo: toDate,
      description: description ? description.trim() : '',
      splitCategoryWise: splitCategoryWise || false,
      businessUnit,
      createdBy,
      updatedBy: createdBy
    };

    // Add header level percentage or amount (if not split category wise)
    if (!splitCategoryWise) {
      if (percentage !== undefined) {
        creditNoteData.percentage = parseFloat(percentage);
      }
      if (amount !== undefined) {
        creditNoteData.amount = parseFloat(amount);
      }
    }

    // Add items (if split category wise)
    if (splitCategoryWise && items) {
      creditNoteData.items = items.map(item => ({
        surgicalCategory: item.surgicalCategory,
        percentage: item.percentage !== undefined ? parseFloat(item.percentage) : undefined,
        amount: item.amount !== undefined ? parseFloat(item.amount) : undefined
      }));
    }

    const creditNote = new CreditNote(creditNoteData);
    await creditNote.save();
    
    const populatedCreditNote = await CreditNote.findById(creditNote._id)
      .populate('paymentType', 'code description')
      .populate('procedure', 'code name')
      .populate('items.surgicalCategory', 'code description')
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
    const { 
      percentage, 
      amount, 
      splitCategoryWise, 
      items, 
      validityFrom, 
      validityTo, 
      description, 
      updatedBy 
    } = req.body;

    if (!validityFrom || !validityTo || !updatedBy) {
      return res.status(400).json({ 
        message: 'Validity dates and updated by are required' 
      });
    }

    // Validate either percentage or amount at header level (if not split category wise)
    if (!splitCategoryWise) {
      if (percentage !== undefined && amount !== undefined) {
        return res.status(400).json({ 
          message: 'Cannot specify both percentage and amount at header level' 
        });
      }
      if (percentage === undefined && amount === undefined) {
        return res.status(400).json({ 
          message: 'Either percentage or amount is required when not splitting category wise' 
        });
      }
      
      if (percentage !== undefined && (percentage < 0 || percentage > 100)) {
        return res.status(400).json({ 
          message: 'Percentage must be between 0 and 100' 
        });
      }
      
      if (amount !== undefined && amount < 0) {
        return res.status(400).json({ 
          message: 'Amount cannot be negative' 
        });
      }
    }

    // Validate items if split category wise
    if (splitCategoryWise) {
      if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ 
          message: 'Items are required when splitting category wise' 
        });
      }
      
      for (const item of items) {
        if (!item.surgicalCategory) {
          return res.status(400).json({ 
            message: 'Surgical category is required for each item' 
          });
        }
        
        if (item.percentage !== undefined && item.amount !== undefined) {
          return res.status(400).json({ 
            message: 'Cannot specify both percentage and amount at item level' 
          });
        }
        
        if (item.percentage === undefined && item.amount === undefined) {
          return res.status(400).json({ 
            message: 'Either percentage or amount is required for each item' 
          });
        }
        
        if (item.percentage !== undefined && (item.percentage < 0 || item.percentage > 100)) {
          return res.status(400).json({ 
            message: 'Item percentage must be between 0 and 100' 
          });
        }
        
        if (item.amount !== undefined && item.amount < 0) {
          return res.status(400).json({ 
            message: 'Item amount cannot be negative' 
          });
        }
      }
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

    // Update basic fields
    creditNote.validityFrom = fromDate;
    creditNote.validityTo = toDate;
    creditNote.description = description ? description.trim() : '';
    creditNote.updatedBy = updatedBy;
    creditNote.splitCategoryWise = splitCategoryWise || false;

    // Update percentage/amount based on split category wise flag
    if (!splitCategoryWise) {
      // Clear items and set header level values
      creditNote.items = [];
      creditNote.percentage = percentage !== undefined ? parseFloat(percentage) : undefined;
      creditNote.amount = amount !== undefined ? parseFloat(amount) : undefined;
    } else {
      // Clear header level values and set items
      creditNote.percentage = undefined;
      creditNote.amount = undefined;
      creditNote.items = items.map(item => ({
        surgicalCategory: item.surgicalCategory,
        percentage: item.percentage !== undefined ? parseFloat(item.percentage) : undefined,
        amount: item.amount !== undefined ? parseFloat(item.amount) : undefined
      }));
    }

    await creditNote.save();

    const populatedCreditNote = await CreditNote.findById(creditNote._id)
      .populate('paymentType', 'code description')
      .populate('procedure', 'code name')
      .populate('items.surgicalCategory', 'code description')
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
