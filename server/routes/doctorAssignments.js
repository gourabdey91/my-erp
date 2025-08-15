const express = require('express');
const router = express.Router();
const DoctorAssignment = require('../models/DoctorAssignment');
const Hospital = require('../models/Hospital');
const Doctor = require('../models/Doctor');
const PaymentType = require('../models/PaymentType');
const Category = require('../models/Category');
const Procedure = require('../models/Procedure');
const ExpenseType = require('../models/ExpenseType');

// Get all doctor assignments for a hospital
router.get('/hospital/:hospitalId', async (req, res) => {
  try {
    const { hospitalId } = req.params;
    
    const doctorAssignments = await DoctorAssignment.find({
      hospital: hospitalId,
      isActive: true
    })
    .populate('doctor', 'name email specialization')
    .populate('expenseType', 'code name')
    .populate('paymentType', 'code description')
    .populate('surgicalCategory', 'code description')
    .populate('procedure', 'code name')
    .populate('items.surgicalCategory', 'code description')
    .populate('createdBy', 'firstName lastName')
    .populate('updatedBy', 'firstName lastName')
    .sort({ priority: -1, validityFrom: -1 }); // Sort by priority first, then by date

    res.json(doctorAssignments);
  } catch (error) {
    console.error('Error fetching doctor assignments:', error);
    res.status(500).json({ message: 'Server error while fetching doctor assignments' });
  }
});

// Get doctors, payment types, categories, procedures, and expense types for dropdowns
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
    
    const [doctors, paymentTypes, categories, procedures, expenseTypes] = await Promise.all([
      // Only doctors who have surgical categories that overlap with hospital's categories
      Doctor.find({
        isActive: true,
        surgicalCategories: { $in: hospitalCategoryIds }
      }).select('_id name email specialization').sort({ name: 1 }),
      
      // All payment types - independent entity
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
        .sort({ name: 1 }),
      
      // Find Clinical Charges expense type (hardcoded)
      ExpenseType.find({
        code: 'CLINICAL', // Assuming Clinical Charges has code 'CLINICAL'
        isActive: true
      }).select('_id code name')
    ]);

    console.log('Fetching doctor assignment options for hospital:', hospitalId);
    console.log('Filter - Payment Type:', paymentType || 'All');
    console.log('Filter - Surgical Category:', surgicalCategory || 'All');
    console.log('Hospital categories:', hospitalCategoryIds.length);
    console.log('Doctors found (filtered by hospital categories):', doctors.length);
    console.log('Payment types found:', paymentTypes.length);
    console.log('Hospital categories found:', categories.length);
    console.log('Procedures found (filtered):', procedures.length);
    console.log('Clinical expense types found:', expenseTypes.length);

    res.json({
      doctors,
      paymentTypes,
      categories,
      procedures,
      expenseTypes
    });
  } catch (error) {
    console.error('Error fetching doctor assignment options:', error);
    res.status(500).json({ message: 'Server error while fetching options' });
  }
});

// Create new doctor assignment
router.post('/', async (req, res) => {
  try {
    const { 
      hospital, 
      doctor, 
      expenseType, 
      paymentType, 
      surgicalCategory, 
      procedure, 
      
      // New fields
      amountType,
      percentage,
      amount,
      splitCategoryWise,
      items,
      
      // Legacy fields (for backward compatibility)
      chargeType, 
      chargeValue, 
      
      validityFrom, 
      validityTo, 
      description, 
      createdBy 
    } = req.body;

    // Validation
    if (!hospital || !doctor || !expenseType || !validityFrom || !validityTo || !createdBy) {
      return res.status(400).json({ 
        message: 'Hospital, doctor, expense type, validity dates, and created by are required' 
      });
    }

    // Validate new amount/percentage fields
    if (splitCategoryWise) {
      // Validate category-wise items
      if (!items || items.length === 0) {
        return res.status(400).json({ 
          message: 'Items are required when maintaining values category-wise' 
        });
      }
      
      // Validate each item
      for (const item of items) {
        if (!item.surgicalCategory) {
          return res.status(400).json({ 
            message: 'Surgical category is required for each item' 
          });
        }
        
        if (item.amountType === 'percentage') {
          if (item.percentage === undefined || item.percentage === null || item.percentage === '') {
            return res.status(400).json({ 
              message: 'Percentage is required for percentage-type items' 
            });
          }
          const percentageValue = parseFloat(item.percentage);
          if (percentageValue < 0 || percentageValue > 100) {
            return res.status(400).json({ 
              message: 'Percentage must be between 0 and 100' 
            });
          }
        } else if (item.amountType === 'amount') {
          if (item.amount === undefined || item.amount === null || item.amount === '') {
            return res.status(400).json({ 
              message: 'Amount is required for amount-type items' 
            });
          }
          const amountValue = parseFloat(item.amount);
          if (amountValue < 0) {
            return res.status(400).json({ 
              message: 'Amount cannot be negative' 
            });
          }
        }
      }
    } else {
      // Validate header-level values
      if (amountType === 'percentage') {
        if (percentage === undefined || percentage === null || percentage === '') {
          return res.status(400).json({ 
            message: 'Percentage is required when amount type is percentage' 
          });
        }
        const percentageValue = parseFloat(percentage);
        if (percentageValue < 0 || percentageValue > 100) {
          return res.status(400).json({ 
            message: 'Percentage must be between 0 and 100' 
          });
        }
      } else if (amountType === 'amount') {
        if (amount === undefined || amount === null || amount === '') {
          return res.status(400).json({ 
            message: 'Amount is required when amount type is amount' 
          });
        }
        const amountValue = parseFloat(amount);
        if (amountValue < 0) {
          return res.status(400).json({ 
            message: 'Amount cannot be negative' 
          });
        }
      }
    }

    // Validate legacy charge value if provided (for backward compatibility)
    if (chargeType && chargeValue !== undefined && chargeValue !== null) {
      if (chargeType === 'percentage' && (chargeValue < 0 || chargeValue > 100)) {
        return res.status(400).json({ 
          message: 'Percentage must be between 0 and 100' 
        });
      }
      if (chargeValue < 0) {
        return res.status(400).json({ 
          message: 'Charge value cannot be negative' 
        });
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

    // Verify hospital and doctor exist
    const [hospitalExists, doctorExists] = await Promise.all([
      Hospital.findById(hospital),
      Doctor.findById(doctor)
    ]);
    
    if (!hospitalExists) {
      return res.status(404).json({ message: 'Hospital not found' });
    }
    if (!doctorExists) {
      return res.status(404).json({ message: 'Doctor not found' });
    }

    // Verify optional references exist if provided
    const verifications = [];
    if (expenseType) {
      verifications.push(ExpenseType.findById(expenseType));
    }
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
      if (expenseType && !results[index++]) {
        return res.status(404).json({ message: 'Expense type not found' });
      }
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

    const doctorAssignment = new DoctorAssignment({
      hospital,
      doctor,
      expenseType,
      paymentType: paymentType || undefined,
      surgicalCategory: surgicalCategory || undefined,
      procedure: procedure || undefined,
      
      // New fields
      amountType: amountType || 'percentage',
      percentage: !splitCategoryWise && amountType === 'percentage' ? parseFloat(percentage) : undefined,
      amount: !splitCategoryWise && amountType === 'amount' ? parseFloat(amount) : undefined,
      splitCategoryWise: splitCategoryWise || false,
      items: splitCategoryWise && items ? items.map(item => ({
        surgicalCategory: item.surgicalCategory,
        amountType: item.amountType,
        percentage: item.amountType === 'percentage' ? parseFloat(item.percentage) : undefined,
        amount: item.amountType === 'amount' ? parseFloat(item.amount) : undefined
      })) : [],
      
      // Legacy fields (for backward compatibility)
      chargeType: chargeType || undefined,
      chargeValue: chargeValue !== undefined && chargeValue !== null ? parseFloat(chargeValue) : undefined,
      
      validityFrom: fromDate,
      validityTo: toDate,
      description: description ? description.trim() : '',
      createdBy,
      updatedBy: createdBy
    });

    await doctorAssignment.save();
    
    const populatedAssignment = await DoctorAssignment.findById(doctorAssignment._id)
      .populate('doctor', 'name email specialization')
      .populate('expenseType', 'code name')
      .populate('paymentType', 'code description')
      .populate('surgicalCategory', 'code description')
      .populate('procedure', 'code name')
      .populate('items.surgicalCategory', 'code description')
      .populate('createdBy', 'firstName lastName')
      .populate('updatedBy', 'firstName lastName');

    res.status(201).json(populatedAssignment);
  } catch (error) {
    console.error('Error creating doctor assignment:', error);
    if (error.name === 'ValidationError') {
      const message = Object.values(error.errors)[0].message;
      res.status(400).json({ message });
    } else {
      res.status(500).json({ message: 'Server error while creating doctor assignment' });
    }
  }
});

// Update doctor assignment
router.put('/:id', async (req, res) => {
  try {
    const { 
      // New fields
      amountType,
      percentage,
      amount,
      splitCategoryWise,
      items,
      
      // Legacy fields
      chargeType, 
      chargeValue, 
      
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

    // Validate new amount/percentage fields
    if (splitCategoryWise !== undefined) {
      if (splitCategoryWise) {
        // Validate category-wise items
        if (!items || items.length === 0) {
          return res.status(400).json({ 
            message: 'Items are required when maintaining values category-wise' 
          });
        }
        
        // Validate each item
        for (const item of items) {
          if (!item.surgicalCategory) {
            return res.status(400).json({ 
              message: 'Surgical category is required for each item' 
            });
          }
          
          if (item.amountType === 'percentage') {
            if (item.percentage === undefined || item.percentage === null || item.percentage === '') {
              return res.status(400).json({ 
                message: 'Percentage is required for percentage-type items' 
              });
            }
            const percentageValue = parseFloat(item.percentage);
            if (percentageValue < 0 || percentageValue > 100) {
              return res.status(400).json({ 
                message: 'Percentage must be between 0 and 100' 
              });
            }
          } else if (item.amountType === 'amount') {
            if (item.amount === undefined || item.amount === null || item.amount === '') {
              return res.status(400).json({ 
                message: 'Amount is required for amount-type items' 
              });
            }
            const amountValue = parseFloat(item.amount);
            if (amountValue < 0) {
              return res.status(400).json({ 
                message: 'Amount cannot be negative' 
              });
            }
          }
        }
      } else {
        // Validate header-level values
        if (amountType === 'percentage') {
          if (percentage === undefined || percentage === null || percentage === '') {
            return res.status(400).json({ 
              message: 'Percentage is required when amount type is percentage' 
            });
          }
          const percentageValue = parseFloat(percentage);
          if (percentageValue < 0 || percentageValue > 100) {
            return res.status(400).json({ 
              message: 'Percentage must be between 0 and 100' 
            });
          }
        } else if (amountType === 'amount') {
          if (amount === undefined || amount === null || amount === '') {
            return res.status(400).json({ 
              message: 'Amount is required when amount type is amount' 
            });
          }
          const amountValue = parseFloat(amount);
          if (amountValue < 0) {
            return res.status(400).json({ 
              message: 'Amount cannot be negative' 
            });
          }
        }
      }
    }

    // Validate legacy charge value if provided (for backward compatibility)
    if (chargeType && chargeValue !== undefined && chargeValue !== null) {
      if (chargeType === 'percentage' && (chargeValue < 0 || chargeValue > 100)) {
        return res.status(400).json({ 
          message: 'Percentage must be between 0 and 100' 
        });
      }
      if (chargeValue < 0) {
        return res.status(400).json({ 
          message: 'Charge value cannot be negative' 
        });
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

    const doctorAssignment = await DoctorAssignment.findById(req.params.id);
    if (!doctorAssignment) {
      return res.status(404).json({ message: 'Doctor assignment not found' });
    }

    // Update new fields if provided
    if (amountType !== undefined) {
      doctorAssignment.amountType = amountType;
    }
    if (splitCategoryWise !== undefined) {
      doctorAssignment.splitCategoryWise = splitCategoryWise;
      
      if (splitCategoryWise) {
        // Clear header values when using category-wise
        doctorAssignment.percentage = undefined;
        doctorAssignment.amount = undefined;
        // Set category-wise items
        doctorAssignment.items = items ? items.map(item => ({
          surgicalCategory: item.surgicalCategory,
          amountType: item.amountType,
          percentage: item.amountType === 'percentage' ? parseFloat(item.percentage) : undefined,
          amount: item.amountType === 'amount' ? parseFloat(item.amount) : undefined
        })) : [];
      } else {
        // Clear items when not using category-wise
        doctorAssignment.items = [];
        // Set header values
        if (amountType === 'percentage' && percentage !== undefined) {
          doctorAssignment.percentage = parseFloat(percentage);
          doctorAssignment.amount = undefined;
        } else if (amountType === 'amount' && amount !== undefined) {
          doctorAssignment.amount = parseFloat(amount);
          doctorAssignment.percentage = undefined;
        }
      }
    } else {
      // Update header values if not switching mode
      if (percentage !== undefined) {
        doctorAssignment.percentage = parseFloat(percentage);
      }
      if (amount !== undefined) {
        doctorAssignment.amount = parseFloat(amount);
      }
      if (items !== undefined) {
        doctorAssignment.items = items.map(item => ({
          surgicalCategory: item.surgicalCategory,
          amountType: item.amountType,
          percentage: item.amountType === 'percentage' ? parseFloat(item.percentage) : undefined,
          amount: item.amountType === 'amount' ? parseFloat(item.amount) : undefined
        }));
      }
    }
    
    // Update legacy fields (for backward compatibility)
    if (chargeType !== undefined) {
      doctorAssignment.chargeType = chargeType || undefined;
    }
    if (chargeValue !== undefined) {
      doctorAssignment.chargeValue = chargeValue !== null ? parseFloat(chargeValue) : undefined;
    }
    
    // Always update these fields
    doctorAssignment.validityFrom = fromDate;
    doctorAssignment.validityTo = toDate;
    doctorAssignment.description = description ? description.trim() : '';
    doctorAssignment.updatedBy = updatedBy;

    await doctorAssignment.save();

    const populatedAssignment = await DoctorAssignment.findById(doctorAssignment._id)
      .populate('doctor', 'name email specialization')
      .populate('expenseType', 'code name')
      .populate('paymentType', 'code description')
      .populate('surgicalCategory', 'code description')
      .populate('procedure', 'code name')
      .populate('items.surgicalCategory', 'code description')
      .populate('createdBy', 'firstName lastName')
      .populate('updatedBy', 'firstName lastName');

    res.json(populatedAssignment);
  } catch (error) {
    console.error('Error updating doctor assignment:', error);
    if (error.name === 'ValidationError') {
      const message = Object.values(error.errors)[0].message;
      res.status(400).json({ message });
    } else {
      res.status(500).json({ message: 'Server error while updating doctor assignment' });
    }
  }
});

// Delete doctor assignment (soft delete)
router.delete('/:id', async (req, res) => {
  try {
    const { updatedBy } = req.body;

    if (!updatedBy) {
      return res.status(400).json({ message: 'Updated by is required' });
    }

    const doctorAssignment = await DoctorAssignment.findById(req.params.id);
    if (!doctorAssignment) {
      return res.status(404).json({ message: 'Doctor assignment not found' });
    }

    doctorAssignment.isActive = false;
    doctorAssignment.updatedBy = updatedBy;
    await doctorAssignment.save();

    res.json({ message: 'Doctor assignment deleted successfully' });
  } catch (error) {
    console.error('Error deleting doctor assignment:', error);
    res.status(500).json({ message: 'Server error while deleting doctor assignment' });
  }
});

module.exports = router;
