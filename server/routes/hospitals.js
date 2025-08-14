const express = require('express');
const router = express.Router();
const Hospital = require('../models/Hospital');
const Category = require('../models/Category');
const MaterialMaster = require('../models/MaterialMaster');

// Get all hospitals for a business unit or all hospitals
router.get('/', async (req, res) => {
  try {
    const { businessUnitId } = req.query;
    
    let query = { isActive: true };
    
    // If businessUnitId is provided, filter by it
    if (businessUnitId) {
      query.businessUnit = businessUnitId;
    }

    const hospitals = await Hospital.find(query)
    .populate('surgicalCategories', 'code description')
    .populate('businessUnit', 'name')
    .populate('createdBy', 'firstName lastName')
    .populate('updatedBy', 'firstName lastName')
    .populate({
      path: 'materialAssignments.material',
      select: 'materialNumber description hsnCode surgicalCategory implantType subCategory',
      populate: {
        path: 'surgicalCategory implantType',
        select: 'description name'
      }
    })
    .sort({ shortName: 1 });

    res.json(hospitals);
  } catch (error) {
    console.error('Error fetching hospitals:', error);
    res.status(500).json({ message: 'Server error while fetching hospitals' });
  }
});

// Get surgical categories for dropdown
router.get('/categories/:businessUnitId', async (req, res) => {
  try {
    const { businessUnitId } = req.params;
    console.log('Fetching categories for business unit:', businessUnitId);
    
    const categories = await Category.find({
      businessUnitId: businessUnitId,
      isActive: true
    }).select('_id code description').sort({ description: 1 });

    console.log('Found categories:', categories.length);
    console.log('Categories data:', categories);
    
    res.json(categories);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ message: 'Server error while fetching categories' });
  }
});

// Get hospital by ID
router.get('/:id', async (req, res) => {
  try {
    const hospital = await Hospital.findById(req.params.id)
      .populate('surgicalCategories', 'code description')
      .populate('createdBy', 'firstName lastName')
      .populate('updatedBy', 'firstName lastName')
      .populate({
        path: 'materialAssignments.material',
        select: 'materialNumber description hsnCode surgicalCategory implantType subCategory',
        populate: {
          path: 'surgicalCategory implantType',
          select: 'description name'
        }
      });

    if (!hospital) {
      return res.status(404).json({ message: 'Hospital not found' });
    }

    res.json(hospital);
  } catch (error) {
    console.error('Error fetching hospital:', error);
    res.status(500).json({ message: 'Server error while fetching hospital' });
  }
});

// Create new hospital
router.post('/', async (req, res) => {
  try {
    const { shortName, legalName, address, gstNumber, stateCode, surgicalCategories, paymentTerms, defaultPricing, discountAllowed, customerIsHospital, businessUnit, createdBy } = req.body;

    console.log('=== HOSPITAL CREATION DEBUG ===');
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    console.log('GST Number received:', gstNumber);
    console.log('GST Number uppercased:', gstNumber.toUpperCase());

    // Validation
    if (!shortName || !legalName || !address || !gstNumber || !stateCode || !surgicalCategories || !businessUnit || !createdBy) {
      return res.status(400).json({ 
        message: 'All fields are required' 
      });
    }

    if (shortName.length < 2 || shortName.length > 50) {
      return res.status(400).json({ 
        message: 'Short name must be between 2 and 50 characters' 
      });
    }

    if (legalName.length < 2 || legalName.length > 100) {
      return res.status(400).json({ 
        message: 'Legal name must be between 2 and 100 characters' 
      });
    }

    if (address.length > 200) {
      return res.status(400).json({ 
        message: 'Address cannot exceed 200 characters' 
      });
    }

    if (!Array.isArray(surgicalCategories) || surgicalCategories.length === 0) {
      return res.status(400).json({ 
        message: 'At least one surgical category must be selected' 
      });
    }

    // Validate GST number format
    const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}[Z]{1}[0-9A-Z]{1}$/;
    if (!gstRegex.test(gstNumber.toUpperCase())) {
      return res.status(400).json({ 
        message: 'Please enter a valid GST number' 
      });
    }

    // Check if GST number already exists globally (since hospitals are now global master data)
    console.log('Checking for existing GST number...');
    const existingByGST = await Hospital.findOne({ 
      gstNumber: gstNumber.toUpperCase(), 
      isActive: true 
    });

    console.log('Existing hospital with GST:', existingByGST ? existingByGST.shortName : 'None found');

    if (existingByGST) {
      console.log('GST conflict detected - returning error');
      return res.status(400).json({ 
        message: 'Hospital with this GST number already exists. GST numbers must be unique.' 
      });
    }

    // Verify surgical categories exist (remove business unit dependency)
    const validCategories = await Category.find({
      _id: { $in: surgicalCategories },
      isActive: true
    });

    if (validCategories.length !== surgicalCategories.length) {
      return res.status(400).json({ 
        message: 'One or more selected surgical categories are invalid' 
      });
    }

    console.log('Creating hospital object...');
    const hospital = new Hospital({
      shortName: shortName.trim(),
      legalName: legalName.trim(),
      address: address.trim(),
      gstNumber: gstNumber.toUpperCase().trim(),
      stateCode: stateCode.trim(),
      surgicalCategories,
      paymentTerms: paymentTerms || 30,
      defaultPricing: defaultPricing !== undefined ? defaultPricing : false,
      discountAllowed: discountAllowed !== undefined ? discountAllowed : false,
      customerIsHospital: customerIsHospital !== undefined ? customerIsHospital : true,
      businessUnit,
      createdBy,
      updatedBy: createdBy
    });

    console.log('Saving hospital to database...');
    await hospital.save();
    console.log('Hospital saved successfully with ID:', hospital._id);
    
    const populatedHospital = await Hospital.findById(hospital._id)
      .populate('surgicalCategories', 'code description')
      .populate('createdBy', 'firstName lastName')
      .populate('updatedBy', 'firstName lastName');

    res.status(201).json(populatedHospital);
  } catch (error) {
    console.error('Error creating hospital:', error);
    if (error.code === 11000) {
      res.status(400).json({ message: 'Hospital with this information already exists' });
    } else if (error.name === 'ValidationError') {
      const message = Object.values(error.errors)[0].message;
      res.status(400).json({ message });
    } else {
      res.status(500).json({ message: 'Server error while creating hospital' });
    }
  }
});

// Update hospital
router.put('/:id', async (req, res) => {
  try {
    const { shortName, legalName, address, gstNumber, stateCode, surgicalCategories, paymentTerms, defaultPricing, discountAllowed, customerIsHospital, updatedBy } = req.body;

    if (!shortName || !legalName || !address || !gstNumber || !stateCode || !surgicalCategories || !updatedBy) {
      return res.status(400).json({ 
        message: 'All fields are required' 
      });
    }

    if (shortName.length < 2 || shortName.length > 50) {
      return res.status(400).json({ 
        message: 'Short name must be between 2 and 50 characters' 
      });
    }

    if (legalName.length < 2 || legalName.length > 100) {
      return res.status(400).json({ 
        message: 'Legal name must be between 2 and 100 characters' 
      });
    }

    if (address.length > 200) {
      return res.status(400).json({ 
        message: 'Address cannot exceed 200 characters' 
      });
    }

    if (!Array.isArray(surgicalCategories) || surgicalCategories.length === 0) {
      return res.status(400).json({ 
        message: 'At least one surgical category must be selected' 
      });
    }

    // Validate GST number format
    const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}[Z]{1}[0-9A-Z]{1}$/;
    if (!gstRegex.test(gstNumber.toUpperCase())) {
      return res.status(400).json({ 
        message: 'Please enter a valid GST number' 
      });
    }

    const hospital = await Hospital.findById(req.params.id);
    if (!hospital) {
      return res.status(404).json({ message: 'Hospital not found' });
    }

    // Check if GST number conflicts with another hospital globally
    if (gstNumber.toUpperCase().trim() !== hospital.gstNumber) {
      const existingByGST = await Hospital.findOne({ 
        gstNumber: gstNumber.toUpperCase().trim(), 
        isActive: true,
        _id: { $ne: req.params.id }
      });

      if (existingByGST) {
        return res.status(400).json({ 
          message: 'Hospital with this GST number already exists. GST numbers must be unique.' 
        });
      }
    }

    // Verify surgical categories exist (remove business unit dependency)
    const validCategories = await Category.find({
      _id: { $in: surgicalCategories },
      isActive: true
    });

    if (validCategories.length !== surgicalCategories.length) {
      return res.status(400).json({ 
        message: 'One or more selected surgical categories are invalid' 
      });
    }

    hospital.shortName = shortName.trim();
    hospital.legalName = legalName.trim();
    hospital.address = address.trim();
    hospital.gstNumber = gstNumber.toUpperCase().trim();
    hospital.stateCode = stateCode.trim();
    hospital.surgicalCategories = surgicalCategories;
    hospital.paymentTerms = paymentTerms || 30;
    hospital.defaultPricing = defaultPricing !== undefined ? defaultPricing : false;
    hospital.discountAllowed = discountAllowed !== undefined ? discountAllowed : false;
    hospital.customerIsHospital = customerIsHospital !== undefined ? customerIsHospital : true;
    hospital.updatedBy = updatedBy;

    await hospital.save();

    const populatedHospital = await Hospital.findById(hospital._id)
      .populate('surgicalCategories', 'code description')
      .populate('createdBy', 'firstName lastName')
      .populate('updatedBy', 'firstName lastName');

    res.json(populatedHospital);
  } catch (error) {
    console.error('Error updating hospital:', error);
    if (error.code === 11000) {
      res.status(400).json({ message: 'Hospital with this information already exists' });
    } else if (error.name === 'ValidationError') {
      const message = Object.values(error.errors)[0].message;
      res.status(400).json({ message });
    } else {
      res.status(500).json({ message: 'Server error while updating hospital' });
    }
  }
});

// Delete hospital (soft delete)
router.delete('/:id', async (req, res) => {
  try {
    const { updatedBy } = req.body;

    if (!updatedBy) {
      return res.status(400).json({ message: 'Updated by is required' });
    }

    const hospital = await Hospital.findById(req.params.id);
    if (!hospital) {
      return res.status(404).json({ message: 'Hospital not found' });
    }

    hospital.isActive = false;
    hospital.updatedBy = updatedBy;
    await hospital.save();

    res.json({ message: 'Hospital deleted successfully' });
  } catch (error) {
    console.error('Error deleting hospital:', error);
    res.status(500).json({ message: 'Server error while deleting hospital' });
  }
});

// Get available materials for hospital assignment
router.get('/:hospitalId/available-materials', async (req, res) => {
  try {
    const { hospitalId } = req.params;
    
    // Get hospital with its surgical categories and assigned materials
    const hospital = await Hospital.findById(hospitalId)
      .populate('surgicalCategories', '_id')
      .populate('materialAssignments.material', '_id');
    
    if (!hospital) {
      return res.status(404).json({ message: 'Hospital not found' });
    }

    // Get assigned material IDs
    const assignedMaterialIds = hospital.materialAssignments
      .filter(assignment => assignment.isActive)
      .map(assignment => assignment.material._id.toString());

    // Get materials that match hospital's surgical categories and are not already assigned
    const availableMaterials = await MaterialMaster.find({
      surgicalCategory: { $in: hospital.surgicalCategories },
      isActive: true,
      _id: { $nin: assignedMaterialIds }
    })
    .populate('surgicalCategory', 'description')
    .populate('implantType', 'name')
    .select('materialNumber description mrp institutionalPrice surgicalCategory implantType subCategory')
    .sort({ materialNumber: 1 });

    res.json(availableMaterials);
  } catch (error) {
    console.error('Error fetching available materials:', error);
    res.status(500).json({ message: 'Server error while fetching available materials' });
  }
});

// Add material assignment to hospital
router.post('/:hospitalId/materials', async (req, res) => {
  try {
    const { hospitalId } = req.params;
    const { materialId, mrp, institutionalPrice, updatedBy } = req.body;

    if (!materialId || !updatedBy) {
      return res.status(400).json({ message: 'Material ID and updatedBy are required' });
    }

    const hospital = await Hospital.findById(hospitalId);
    if (!hospital) {
      return res.status(404).json({ message: 'Hospital not found' });
    }

    // Check if material exists
    const material = await MaterialMaster.findById(materialId);
    if (!material) {
      return res.status(404).json({ message: 'Material not found' });
    }

    // Check if material is already assigned (active or inactive)
    const existingActiveAssignment = hospital.materialAssignments.find(
      assignment => assignment.material.toString() === materialId && assignment.isActive
    );

    if (existingActiveAssignment) {
      return res.status(400).json({ message: 'Material is already assigned to this hospital' });
    }

    // Check for inactive assignment to reactivate
    const existingInactiveAssignment = hospital.materialAssignments.find(
      assignment => assignment.material.toString() === materialId && !assignment.isActive
    );

    // Use material prices if hospital has default pricing, otherwise use provided prices
    const finalMrp = hospital.defaultPricing ? material.mrp : (mrp || material.mrp);
    const finalInstitutionalPrice = hospital.defaultPricing ? material.institutionalPrice : (institutionalPrice || material.institutionalPrice);

    if (existingInactiveAssignment) {
      // Reactivate existing assignment with new prices
      existingInactiveAssignment.mrp = finalMrp;
      existingInactiveAssignment.institutionalPrice = finalInstitutionalPrice;
      existingInactiveAssignment.isActive = true;
      existingInactiveAssignment.assignedAt = new Date();
    } else {
      // Add new material assignment
      hospital.materialAssignments.push({
        material: materialId,
        mrp: finalMrp,
        institutionalPrice: finalInstitutionalPrice,
        isActive: true,
        assignedAt: new Date()
      });
    }

    hospital.updatedBy = updatedBy;
    await hospital.save();

    // Return the updated hospital with populated material assignments
    const updatedHospital = await Hospital.findById(hospitalId)
      .populate('materialAssignments.material', 'materialNumber description hsnCode surgicalCategory implantType subCategory');

    res.json(updatedHospital);
  } catch (error) {
    console.error('Error adding material assignment:', error);
    res.status(500).json({ message: 'Server error while adding material assignment' });
  }
});

// Update material assignment pricing
router.put('/:hospitalId/materials/:assignmentId', async (req, res) => {
  try {
    const { hospitalId, assignmentId } = req.params;
    const { mrp, institutionalPrice, updatedBy } = req.body;

    if (!updatedBy) {
      return res.status(400).json({ message: 'updatedBy is required' });
    }

    const hospital = await Hospital.findById(hospitalId);
    if (!hospital) {
      return res.status(404).json({ message: 'Hospital not found' });
    }

    const assignment = hospital.materialAssignments.id(assignmentId);
    if (!assignment) {
      return res.status(404).json({ message: 'Material assignment not found' });
    }

    // Only allow updates if hospital doesn't have default pricing
    if (hospital.defaultPricing) {
      return res.status(400).json({ message: 'Cannot update pricing when default pricing is enabled' });
    }

    assignment.mrp = mrp;
    assignment.institutionalPrice = institutionalPrice;
    hospital.updatedBy = updatedBy;

    await hospital.save();

    res.json({ message: 'Material pricing updated successfully' });
  } catch (error) {
    console.error('Error updating material assignment:', error);
    res.status(500).json({ message: 'Server error while updating material assignment' });
  }
});

// Remove material assignment from hospital
router.delete('/:hospitalId/materials/:assignmentId', async (req, res) => {
  try {
    const { hospitalId, assignmentId } = req.params;
    const { updatedBy } = req.body;

    if (!updatedBy) {
      return res.status(400).json({ message: 'updatedBy is required' });
    }

    const hospital = await Hospital.findById(hospitalId);
    if (!hospital) {
      return res.status(404).json({ message: 'Hospital not found' });
    }

    const assignment = hospital.materialAssignments.id(assignmentId);
    if (!assignment) {
      return res.status(404).json({ message: 'Material assignment not found' });
    }

    assignment.isActive = false;
    hospital.updatedBy = updatedBy;

    await hospital.save();

    res.json({ message: 'Material assignment removed successfully' });
  } catch (error) {
    console.error('Error removing material assignment:', error);
    res.status(500).json({ message: 'Server error while removing material assignment' });
  }
});

// Update specific field of material assignment
router.patch('/:hospitalId/materials/:assignmentId/field', async (req, res) => {
  try {
    const { hospitalId, assignmentId } = req.params;
    const { updatedBy, ...updateFields } = req.body;

    if (!updatedBy) {
      return res.status(400).json({ message: 'updatedBy is required' });
    }

    const hospital = await Hospital.findById(hospitalId);
    if (!hospital) {
      return res.status(404).json({ message: 'Hospital not found' });
    }

    const assignment = hospital.materialAssignments.id(assignmentId);
    if (!assignment) {
      return res.status(404).json({ message: 'Material assignment not found' });
    }

    // Update the specific fields
    Object.keys(updateFields).forEach(field => {
      if (field in assignment) {
        assignment[field] = updateFields[field];
      }
    });

    hospital.updatedBy = updatedBy;
    await hospital.save();

    res.json({ 
      message: 'Material assignment updated successfully',
      assignment: assignment
    });
  } catch (error) {
    console.error('Error updating material assignment field:', error);
    res.status(500).json({ message: 'Server error while updating material assignment' });
  }
});

// Cleanup duplicate material assignments (admin endpoint)
router.post('/cleanup-duplicates', async (req, res) => {
  try {
    console.log('Starting cleanup of duplicate material assignments...');
    
    const hospitals = await Hospital.find({
      materialAssignments: { $exists: true, $not: { $size: 0 } }
    });

    let totalCleaned = 0;
    const results = [];
    
    for (const hospital of hospitals) {
      let cleaned = 0;
      const materialMap = new Map();
      const cleanAssignments = [];
      
      // Group assignments by material ID
      for (const assignment of hospital.materialAssignments) {
        const materialId = assignment.material.toString();
        
        if (!materialMap.has(materialId)) {
          materialMap.set(materialId, []);
        }
        materialMap.get(materialId).push(assignment);
      }
      
      // For each material, keep only one assignment (prefer active ones)
      for (const [materialId, assignments] of materialMap) {
        if (assignments.length > 1) {
          // Find active assignment or the most recent one
          const activeAssignment = assignments.find(a => a.isActive);
          const mostRecent = assignments.sort((a, b) => new Date(b.assignedAt) - new Date(a.assignedAt))[0];
          
          const keepAssignment = activeAssignment || mostRecent;
          cleanAssignments.push(keepAssignment);
          cleaned += assignments.length - 1;
        } else {
          cleanAssignments.push(assignments[0]);
        }
      }
      
      if (cleaned > 0) {
        hospital.materialAssignments = cleanAssignments;
        await hospital.save();
        totalCleaned += cleaned;
        results.push({
          hospitalName: hospital.shortName,
          duplicatesRemoved: cleaned
        });
      }
    }

    res.json({
      message: 'Cleanup completed successfully',
      totalDuplicatesRemoved: totalCleaned,
      hospitalsAffected: results.length,
      details: results
    });

  } catch (error) {
    console.error('Error during cleanup:', error);
    res.status(500).json({ message: 'Server error during cleanup' });
  }
});

// Bulk upload material assignments from CSV/Excel
router.post('/:hospitalId/material-assignments/bulk-upload', async (req, res) => {
  try {
    const { hospitalId } = req.params;
    const { assignments } = req.body; // Array of assignment data

    // Validate hospital exists
    const hospital = await Hospital.findById(hospitalId);
    if (!hospital) {
      return res.status(404).json({ message: 'Hospital not found' });
    }

    const processedData = [];
    let validRows = 0;
    let invalidRows = 0;

    for (let i = 0; i < assignments.length; i++) {
      const assignment = assignments[i];
      const rowNumber = i + 2; // Assuming row 1 is header
      
      const processedRow = {
        rowIndex: rowNumber,
        materialNumber: assignment.materialNumber || '',
        mrp: assignment.mrp || '',
        institutionalPrice: assignment.institutionalPrice || '',
        flaggedBilled: assignment.flaggedBilled || false,
        isValid: true,
        validationErrors: [],
        material: null
      };

      try {
        // Validate required fields
        if (!assignment.materialNumber) {
          processedRow.validationErrors.push('Material Number is required');
          processedRow.isValid = false;
        }

        // Find material by material number
        if (assignment.materialNumber) {
          const material = await MaterialMaster.findOne({ 
            materialNumber: assignment.materialNumber 
          }).populate('surgicalCategory implantType', 'description name');

          if (!material) {
            processedRow.validationErrors.push(`Material ${assignment.materialNumber} not found in Material Master`);
            processedRow.isValid = false;
          } else {
            processedRow.material = {
              _id: material._id,
              description: material.description,
              surgicalCategory: material.surgicalCategory?.description || '',
              implantType: material.implantType?.name || '',
              subCategory: material.subCategory || '',
              lengthMm: material.lengthMm,
              masterMrp: material.mrp,
              masterInstitutionalPrice: material.institutionalPrice
            };

            // Check if assignment already exists
            const existingAssignment = hospital.materialAssignments.find(
              ma => ma.material.toString() === material._id.toString()
            );

            if (existingAssignment) {
              processedRow.validationErrors.push(`Material already assigned to this hospital`);
              processedRow.isValid = false;
            }

            // Set pricing - use from upload or fetch from material master
            if (!processedRow.mrp && material.mrp) {
              processedRow.mrp = material.mrp;
              processedRow.mrpSource = 'Material Master';
            } else if (processedRow.mrp) {
              processedRow.mrpSource = 'Upload File';
            }

            if (!processedRow.institutionalPrice && material.institutionalPrice) {
              processedRow.institutionalPrice = material.institutionalPrice;
              processedRow.institutionalPriceSource = 'Material Master';
            } else if (processedRow.institutionalPrice) {
              processedRow.institutionalPriceSource = 'Upload File';
            }

            // Validate pricing
            if (!processedRow.mrp && !material.mrp) {
              processedRow.validationErrors.push('MRP is required (not found in Material Master)');
              processedRow.isValid = false;
            }

            if (!processedRow.institutionalPrice && !material.institutionalPrice) {
              processedRow.validationErrors.push('Institutional Price is required (not found in Material Master)');
              processedRow.isValid = false;
            }
          }
        }

      } catch (error) {
        console.error(`Error processing row ${rowNumber}:`, error);
        processedRow.validationErrors.push(`Processing error: ${error.message}`);
        processedRow.isValid = false;
      }

      processedData.push(processedRow);
      
      if (processedRow.isValid) {
        validRows++;
      } else {
        invalidRows++;
      }
    }

    res.json({
      message: 'File processed successfully',
      totalRows: assignments.length,
      validRows,
      invalidRows,
      data: processedData
    });

  } catch (error) {
    console.error('Error during bulk upload processing:', error);
    res.status(500).json({ message: 'Server error during bulk upload processing', error: error.message });
  }
});

// Save processed material assignments to database
router.post('/:hospitalId/material-assignments/save-processed', async (req, res) => {
  try {
    const { hospitalId } = req.params;
    const { processedData } = req.body;

    // Validate hospital exists
    const hospital = await Hospital.findById(hospitalId);
    if (!hospital) {
      return res.status(404).json({ message: 'Hospital not found' });
    }

    const results = [];
    let successCount = 0;
    let errorCount = 0;

    // Filter only valid rows
    const validRows = processedData.filter(row => row.isValid && row.material);

    for (const row of validRows) {
      try {
        // Create new assignment
        const newAssignment = {
          material: row.material._id,
          mrp: parseFloat(row.mrp) || 0,
          institutionalPrice: parseFloat(row.institutionalPrice) || 0,
          flaggedBilled: row.flaggedBilled === 'true' || row.flaggedBilled === true || false
        };

        hospital.materialAssignments.push(newAssignment);
        
        results.push({
          row: row.rowIndex,
          materialNumber: row.materialNumber,
          description: row.material.description,
          status: 'success',
          mrp: newAssignment.mrp,
          institutionalPrice: newAssignment.institutionalPrice
        });
        
        successCount++;

      } catch (error) {
        console.error(`Error saving row ${row.rowIndex}:`, error);
        results.push({
          row: row.rowIndex,
          materialNumber: row.materialNumber,
          status: 'error',
          error: error.message
        });
        errorCount++;
      }
    }

    // Save the hospital with new assignments
    if (successCount > 0) {
      await hospital.save();
    }

    res.json({
      message: 'Save completed',
      successCount,
      errorCount,
      results
    });

  } catch (error) {
    console.error('Error during save:', error);
    res.status(500).json({ message: 'Server error during save', error: error.message });
  }
});

// Get assigned materials for inquiry selection with filtering
router.get('/:hospitalId/assigned-materials-for-inquiry', async (req, res) => {
  try {
    const { hospitalId } = req.params;
    const { 
      surgicalCategory, 
      implantType, 
      subCategory, 
      lengthMm,
      search 
    } = req.query;

    // Get hospital with assigned materials
    const hospital = await Hospital.findById(hospitalId)
      .populate({
        path: 'materialAssignments.material',
        populate: [
          { path: 'surgicalCategory', select: 'description code' },
          { path: 'implantType', select: 'name subcategories' }
        ]
      });

    if (!hospital) {
      return res.status(404).json({ 
        success: false,
        message: 'Hospital not found' 
      });
    }

    // Filter active material assignments
    let materials = hospital.materialAssignments
      .filter(assignment => assignment.isActive && assignment.material)
      .map(assignment => ({
        ...assignment.material.toObject(),
        assignmentId: assignment._id,
        assignedMrp: assignment.mrp,
        assignedInstitutionalPrice: assignment.institutionalPrice
      }));

    // Apply filters
    if (surgicalCategory) {
      materials = materials.filter(material => 
        material.surgicalCategory && material.surgicalCategory._id.toString() === surgicalCategory
      );
    }

    if (implantType) {
      materials = materials.filter(material => {
        if (!material.implantType) return false;
        
        // Check if implantType filter matches either ID or name
        return material.implantType._id.toString() === implantType || 
               material.implantType.name === implantType;
      });
    }

    if (subCategory) {
      materials = materials.filter(material => 
        material.subCategory && material.subCategory.toLowerCase().includes(subCategory.toLowerCase())
      );
    }

    if (lengthMm) {
      const targetLength = parseFloat(lengthMm);
      materials = materials.filter(material => 
        material.lengthMm && Math.abs(material.lengthMm - targetLength) < 0.1
      );
    }

    if (search) {
      const searchTerm = search.toLowerCase();
      materials = materials.filter(material =>
        material.materialNumber.toLowerCase().includes(searchTerm) ||
        material.description.toLowerCase().includes(searchTerm) ||
        material.hsnCode.includes(searchTerm)
      );
    }

    res.json({
      success: true,
      data: materials,
      count: materials.length
    });

  } catch (error) {
    console.error('Error fetching assigned materials for inquiry:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error while fetching assigned materials',
      error: error.message 
    });
  }
});

module.exports = router;
