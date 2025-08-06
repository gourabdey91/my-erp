const express = require('express');
const router = express.Router();
const ExpenseTypeAssignment = require('../models/ExpenseTypeAssignment');
const Hospital = require('../models/Hospital');
const ExpenseType = require('../models/ExpenseType');
const PaymentType = require('../models/PaymentType');
const Category = require('../models/Category');
const Procedure = require('../models/Procedure');

// Get all assignments for a hospital
router.get('/hospital/:hospitalId', async (req, res) => {
  try {
    const assignments = await ExpenseTypeAssignment.find({
      hospital: req.params.hospitalId,
      isActive: true
    })
      .populate('expenseType', 'code name')
      .populate('paymentType', 'code description')
      .populate('category', 'code description')
      .populate('procedure', 'code name')
      .populate('createdBy', 'firstName lastName')
      .populate('updatedBy', 'firstName lastName')
      .sort({ validityFrom: -1 });
    res.json(assignments);
  } catch (error) {
    console.error('Error fetching expense type assignments:', error);
    res.status(500).json({ message: 'Server error while fetching assignments' });
  }
});

// Get options for dropdowns (excluding Clinical Charges)
router.get('/options/:hospitalId', async (req, res) => {
  try {
    const { hospitalId } = req.params;
    const { paymentType, category } = req.query;
    const hospital = await Hospital.findById(hospitalId).populate('surgicalCategories');
    if (!hospital) return res.status(404).json({ message: 'Hospital not found' });
    const hospitalCategoryIds = hospital.surgicalCategories.map(cat => cat._id ? cat._id : cat);
    const procedureFilter = { isActive: true };
    let categoryQuery = { isActive: true };
    if (hospitalCategoryIds.length > 0) {
      categoryQuery._id = { $in: hospitalCategoryIds };
      procedureFilter.categoryId = { $in: hospitalCategoryIds };
    }
    if (paymentType && paymentType !== '') procedureFilter.paymentTypeId = paymentType;
    if (category && category !== '') procedureFilter.categoryId = category;
    const [expenseTypes, paymentTypes, categories, procedures] = await Promise.all([
      ExpenseType.find({ isActive: true, name: { $ne: 'Clinical Charges' } })
        .select('_id code name').sort({ name: 1 }),
      PaymentType.find({ isActive: true }).select('_id code description').sort({ description: 1 }),
      Category.find(categoryQuery).select('_id code description').sort({ description: 1 }),
      Procedure.find(procedureFilter).select('_id code name').sort({ name: 1 })
    ]);
    res.json({ expenseTypes, paymentTypes, categories, procedures });
  } catch (error) {
    console.error('Error fetching options:', error);
    res.status(500).json({ message: 'Server error while fetching options' });
  }
});

// Create new assignment
router.post('/', async (req, res) => {
  try {
    const { hospital, expenseType, value, paymentType, category, procedure, validityFrom, validityTo, createdBy } = req.body;
    if (!hospital || !expenseType || value === undefined || !validityFrom || !validityTo || !createdBy) {
      return res.status(400).json({ message: 'Hospital, expense type, value, validity dates, and created by are required' });
    }
    const fromDate = new Date(validityFrom);
    const toDate = new Date(validityTo);
    if (toDate <= fromDate) {
      return res.status(400).json({ message: 'Validity to date must be after validity from date' });
    }
    const assignment = new ExpenseTypeAssignment({
      hospital,
      expenseType,
      value: parseFloat(value),
      paymentType: paymentType || undefined,
      category: category || undefined,
      procedure: procedure || undefined,
      validityFrom: fromDate,
      validityTo: toDate,
      createdBy,
      updatedBy: createdBy
    });
    await assignment.save();
    const populated = await ExpenseTypeAssignment.findById(assignment._id)
      .populate('expenseType', 'code name')
      .populate('paymentType', 'code description')
      .populate('category', 'code description')
      .populate('procedure', 'code name')
      .populate('createdBy', 'firstName lastName')
      .populate('updatedBy', 'firstName lastName');
    res.status(201).json(populated);
  } catch (error) {
    console.error('Error creating assignment:', error);
    res.status(500).json({ message: 'Server error while creating assignment' });
  }
});

// Update assignment
router.put('/:id', async (req, res) => {
  try {
    const { value, validityFrom, validityTo, updatedBy } = req.body;
    if (value === undefined || !validityFrom || !validityTo || !updatedBy) {
      return res.status(400).json({ message: 'Value, validity dates, and updated by are required' });
    }
    const fromDate = new Date(validityFrom);
    const toDate = new Date(validityTo);
    if (toDate <= fromDate) {
      return res.status(400).json({ message: 'Validity to date must be after validity from date' });
    }
    const assignment = await ExpenseTypeAssignment.findById(req.params.id);
    if (!assignment) return res.status(404).json({ message: 'Assignment not found' });
    assignment.value = parseFloat(value);
    assignment.validityFrom = fromDate;
    assignment.validityTo = toDate;
    assignment.updatedBy = updatedBy;
    await assignment.save();
    const populated = await ExpenseTypeAssignment.findById(assignment._id)
      .populate('expenseType', 'code name')
      .populate('paymentType', 'code description')
      .populate('category', 'code description')
      .populate('procedure', 'code name')
      .populate('createdBy', 'firstName lastName')
      .populate('updatedBy', 'firstName lastName');
    res.json(populated);
  } catch (error) {
    console.error('Error updating assignment:', error);
    res.status(500).json({ message: 'Server error while updating assignment' });
  }
});

// Delete assignment (soft delete)
router.delete('/:id', async (req, res) => {
  try {
    const { updatedBy } = req.body;
    if (!updatedBy) return res.status(400).json({ message: 'Updated by is required' });
    const assignment = await ExpenseTypeAssignment.findById(req.params.id);
    if (!assignment) return res.status(404).json({ message: 'Assignment not found' });
    assignment.isActive = false;
    assignment.updatedBy = updatedBy;
    await assignment.save();
    res.json({ message: 'Assignment deleted successfully' });
  } catch (error) {
    console.error('Error deleting assignment:', error);
    res.status(500).json({ message: 'Server error while deleting assignment' });
  }
});

module.exports = router;
