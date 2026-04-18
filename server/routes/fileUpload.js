const express = require('express');
const multer = require('multer');
const xlsx = require('xlsx');
const path = require('path');
const fs = require('fs');
const ImplantType = require('../models/ImplantType');
const Category = require('../models/Category');
const MaterialMaster = require('../models/MaterialMaster');

const router = express.Router();

// Configure multer for file upload
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({
  storage: storage,
  fileFilter: function (req, file, cb) {
    if (file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
        file.mimetype === 'application/vnd.ms-excel') {
      cb(null, true);
    } else {
      cb(new Error('Only Excel files are allowed!'), false);
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// Upload and process Excel file
router.post('/implant-subcategories', upload.single('excelFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    // Read Excel file
    const workbook = xlsx.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = xlsx.utils.sheet_to_json(worksheet);

    // Process and validate data
    const processedData = [];
    const errors = [];

    // Get all existing implant types and categories for validation
    const existingImplantTypes = await ImplantType.find({ isActive: true }).lean();
    const existingCategories = await Category.find({ isActive: true }).lean();

    // Create lookup maps for faster validation
    const implantTypeMap = new Map(existingImplantTypes.map(it => [it.name.toLowerCase().trim(), it]));
    // Use both code AND description for category lookup (more flexible)
    const categoryMap = new Map();
    existingCategories.forEach(cat => {
      categoryMap.set(cat.code.toLowerCase().trim(), cat);
      categoryMap.set(cat.description.toLowerCase().trim(), cat);
    });

    console.log(`Loaded ${existingImplantTypes.length} implant types and ${existingCategories.length} categories`);

    for (let i = 0; i < jsonData.length; i++) {
      const row = jsonData[i];
      const rowIndex = i + 2; // Excel rows start from 2 (after header)

      // Clean and extract data
      const implantTypeName = row['Implants type'] || row['Implant Type'] || '';
      const surgicalCategoryRaw = row['Surgical category'] || row['Surgical Category'] || '';
      const subCategory = row['Subcategory'] || row['Sub Category'] || row['SubCategory'] || '';
      const length = row['length'] || row['Length'] || '';

      // Split surgical categories by comma (handles comma-separated values)
      const surgicalCategories = surgicalCategoryRaw
        .toString()
        .split(',')
        .map(cat => cat.trim())
        .filter(cat => cat.length > 0);

      // Validate required fields at row level
      const baseValidationErrors = [];
      if (!implantTypeName.toString().trim()) {
        baseValidationErrors.push('Implant type is required');
      }
      if (surgicalCategories.length === 0) {
        baseValidationErrors.push('Surgical category is required');
      }
      if (!subCategory.toString().trim()) {
        baseValidationErrors.push('Subcategory is required');
      }

      let implantTypeObj = null;
      let lengthValue = null;

      // Check implant type - create if doesn't exist (marked as needsCreation)
      if (implantTypeName.toString().trim()) {
        implantTypeObj = implantTypeMap.get(implantTypeName.toString().toLowerCase().trim());
        if (!implantTypeObj) {
          // Mark this for creation during save - no error, just flag it
          implantTypeObj = {
            _id: null,
            name: implantTypeName.toString().trim(),
            needsCreation: true
          };
        }
      }

      // Validate length is a valid number (if provided)
      if (length.toString().trim()) {
        lengthValue = parseFloat(length.toString().trim());
        if (isNaN(lengthValue) || lengthValue < 0) {
          baseValidationErrors.push('Length must be a valid positive number');
        }
      } else {
        lengthValue = null;
      }

      // Validate ALL surgical categories and collect their IDs
      const surgicalCategoryIds = [];
      const surgicalCategoryNames = [];
      const categoryValidationErrors = [];

      for (const surgicalCategory of surgicalCategories) {
        const categoryObj = categoryMap.get(surgicalCategory.toLowerCase().trim());
        if (!categoryObj) {
          categoryValidationErrors.push(`Surgical category "${surgicalCategory}" not found`);
        } else {
          surgicalCategoryIds.push(categoryObj._id);
          surgicalCategoryNames.push(categoryObj.description || surgicalCategory);
        }
      }

      const validationErrors = [...baseValidationErrors, ...categoryValidationErrors];

      // Check for duplicate entries within the uploaded data
      // Key: implant type + subcategory + length (NOT surgical category - same item can be in multiple categories)
      const duplicateInUpload = processedData.find(item => 
        item.implantTypeName.toLowerCase() === implantTypeName.toString().toLowerCase().trim() &&
        item.subCategory.toLowerCase() === subCategory.toString().toLowerCase().trim() &&
        ((item.length === null && lengthValue === null) || (item.length === lengthValue))
      );

      if (duplicateInUpload) {
        validationErrors.push('Duplicate entry found in uploaded data');
      }

      // Check for existing entries in database
      if (implantTypeObj && !implantTypeObj.needsCreation && subCategory.toString().trim()) {
        const existingSubcategory = implantTypeObj.subcategories?.find(sub =>
          sub.subCategory.toLowerCase() === subCategory.toString().toLowerCase().trim() &&
          ((sub.length === null && lengthValue === null) || (sub.length === lengthValue))
        );

        if (existingSubcategory) {
          validationErrors.push('Entry already exists in database');
        }
      }

      const processedRow = {
        rowIndex,
        implantTypeName: implantTypeName.toString().trim(),
        surgicalCategories: surgicalCategoryNames, // Display names for UI
        surgicalCategoryIds: surgicalCategoryIds,   // IDs for database
        subCategory: subCategory.toString().trim(),
        length: lengthValue,
        implantTypeId: implantTypeObj?._id,
        validationErrors,
        isValid: validationErrors.length === 0
      };

      processedData.push(processedRow);
    }

    // Clean up uploaded file
    fs.unlinkSync(req.file.path);

    console.log(`Validation complete: Total=${processedData.length}, Valid=${processedData.filter(row => row.isValid).length}, Invalid=${processedData.filter(row => !row.isValid).length}`);
    if (processedData.length > 0) {
      console.log('Sample validated row:', JSON.stringify(processedData[0], null, 2));
    }

    res.json({
      data: processedData,
      totalRows: processedData.length,
      validRows: processedData.filter(row => row.isValid).length,
      invalidRows: processedData.filter(row => !row.isValid).length
    });

  } catch (error) {
    console.error('Error processing file:', error);
    // Clean up file if it exists
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ message: 'Error processing file', error: error.message });
  }
});

// Save validated data to database
router.post('/save-implant-subcategories', async (req, res) => {
  try {
    const { data, updatedBy } = req.body;

    console.log(`Save request received: ${data?.length} rows, updatedBy: ${updatedBy}`);

    if (!data || !Array.isArray(data)) {
      return res.status(400).json({ message: 'Invalid data provided' });
    }

    if (!updatedBy) {
      return res.status(400).json({ message: 'Updated by user is required' });
    }

    // Filter only valid rows that have surgical categories
    const validRows = data.filter(row => row.isValid && row.surgicalCategoryIds && row.surgicalCategoryIds.length > 0);

    console.log(`After filtering: ${validRows.length} valid rows with surgical categories`);
    if (validRows.length > 0) {
      console.log('First valid row:', JSON.stringify(validRows[0], null, 2));
    }

    if (validRows.length === 0) {
      console.log('No valid rows to save after filtering');
      return res.status(400).json({ message: 'No valid rows to save' });
    }

    let savedCount = 0;
    const errors = [];
    const createdImplantTypes = new Map(); // Track newly created types to avoid duplicates

    // Group by implant type name for processing
    const groupedByImplantTypeName = validRows.reduce((acc, row) => {
      const key = row.implantTypeName;
      if (!acc[key]) {
        acc[key] = {
          implantTypeId: row.implantTypeId,
          rows: []
        };
      }
      acc[key].rows.push(row);
      return acc;
    }, {});

    for (const [implantTypeName, group] of Object.entries(groupedByImplantTypeName)) {
      try {
        let implantType = null;
        let implantTypeId = group.implantTypeId;

        // If implantTypeId is not set, we need to create the implant type
        if (!implantTypeId) {
          // Check if we already created this type in this batch
          if (createdImplantTypes.has(implantTypeName)) {
            implantTypeId = createdImplantTypes.get(implantTypeName);
          } else {
            // Create new implant type
            const newImplantType = new ImplantType({
              name: implantTypeName,
              isActive: true,
              createdBy: updatedBy,
              updatedBy: updatedBy
            });
            await newImplantType.save();
            implantTypeId = newImplantType._id;
            createdImplantTypes.set(implantTypeName, implantTypeId);
            console.log(`Created new implant type: ${implantTypeName} with ID: ${implantTypeId}`);
          }
        }

        // Now fetch or use the implant type
        implantType = await ImplantType.findById(implantTypeId);
        if (!implantType) {
          errors.push(`Implant type not found for: ${implantTypeName}`);
          continue;
        }

        // Add new subcategories with multiple surgical categories
        for (const row of group.rows) {
          const newSubcategory = {
            subCategory: row.subCategory,
            length: row.length,
            surgicalCategories: row.surgicalCategoryIds  // Array of category IDs
          };

          implantType.subcategories.push(newSubcategory);
          savedCount++;
          console.log(`Added subcategory: ${row.subCategory} with ${row.surgicalCategoryIds.length} surgical categories`);
        }

        console.log(`Saving ${group.rows.length} subcategories to implant type: ${implantTypeName} (ID: ${implantTypeId})`);

        implantType.updatedBy = updatedBy;
        implantType.updatedAt = new Date();
        await implantType.save();

        console.log(`Successfully saved implant type: ${implantTypeName}`);

      } catch (error) {
        console.error(`Error saving data for implant type ${implantTypeName}:`, error);
        errors.push(`Error saving data for implant type "${implantTypeName}": ${error.message}`);
      }
    }

    res.json({
      message: `Successfully saved ${savedCount} subcategory entries`,
      savedCount,
      createdImplantTypes: createdImplantTypes.size > 0 ? Array.from(createdImplantTypes.keys()) : undefined,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error) {
    console.error('Error saving data:', error);
    res.status(500).json({ message: 'Error saving data to database', error: error.message });
  }
});

// Upload and process Material Master Excel file
router.post('/material-master', upload.single('excelFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    // Read Excel file
    const workbook = xlsx.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = xlsx.utils.sheet_to_json(worksheet);

    // Process and validate data
    const processedData = [];
    const errors = [];

    // Get existing data for validation
    const BusinessUnit = require('../models/BusinessUnit');
    const existingBusinessUnits = await BusinessUnit.find({ isActive: true }).lean();
    const existingCategories = await Category.find({ isActive: true }).lean();
    const existingImplantTypes = await ImplantType.find({ isActive: true }).lean();

    // Create lookup maps for faster validation
    const businessUnitMap = new Map(existingBusinessUnits.map(bu => [bu.code.toLowerCase().trim(), bu]));
    const categoryMap = new Map(existingCategories.map(cat => [cat.code.toLowerCase().trim(), cat]));
    const implantTypeMap = new Map(existingImplantTypes.map(it => [it.name.toLowerCase().trim(), it]));

    for (let i = 0; i < jsonData.length; i++) {
      const row = jsonData[i];
      const rowIndex = i + 2; // Excel rows start from 2 (after header)
      const validationErrors = [];

      // Clean and extract data - BU is now the first column
      const businessUnitCode = row['BU'] || row['Business Unit'] || row['businessUnit'] || '';
      const materialNumber = row['Material Number'] || row['materialNumber'] || '';
      const description = row['Description'] || row['description'] || '';
      const hsnCode = row['HSN Code'] || row['hsnCode'] || '';
      const gstPercentage = row['GST %'] || row['gstPercentage'] || '';
      const currency = row['Currency'] || row['currency'] || 'INR';
      const mrp = row['MRP'] || row['mrp'] || '';
      const institutionalPrice = row['Institutional Price'] || row['institutionalPrice'] || '';
      const distributionPrice = row['Distribution Price'] || row['distributionPrice'] || '';
      const surgicalCategory = row['Surgical Category'] || row['surgicalCategory'] || '';
      const implantType = row['Implant Type'] || row['implantType'] || '';
      const subCategory = row['Sub Category'] || row['subCategory'] || '';
      const lengthMm = row['Length (mm)'] || row['lengthMm'] || '';
      const unit = row['Unit'] || row['unit'] || 'NOS';

      // Validate required fields
      if (!businessUnitCode.toString().trim()) {
        validationErrors.push('Business Unit (BU) is required');
      }
      if (!materialNumber.toString().trim()) {
        validationErrors.push('Material Number is required');
      }
      if (!description.toString().trim()) {
        validationErrors.push('Description is required');
      }
      if (!hsnCode.toString().trim()) {
        validationErrors.push('HSN Code is required');
      }
      
      // Validate that required pricing fields are present
      if (!mrp.toString().trim()) {
        validationErrors.push('MRP is required');
      }
      if (!institutionalPrice.toString().trim()) {
        validationErrors.push('Institutional Price is required');
      }
      if (!distributionPrice.toString().trim()) {
        validationErrors.push('Distribution Price is required');
      }
      if (!gstPercentage.toString().trim()) {
        validationErrors.push('GST Percentage is required');
      }

      let businessUnitObj = null;
      let categoryObj = null;
      let implantTypeObj = null;
      let mrpValue = null;
      let institutionalPriceValue = null;
      let distributionPriceValue = null;
      let gstValue = null;
      let lengthValue = null;

      // Validate business unit exists
      if (businessUnitCode.toString().trim()) {
        businessUnitObj = businessUnitMap.get(businessUnitCode.toString().toLowerCase().trim());
        if (!businessUnitObj) {
          validationErrors.push(`Business Unit "${businessUnitCode}" not found`);
        }
      }

      // Parse and validate multiple surgical categories (comma-separated)
      const surgicalCategories = surgicalCategory
        .toString()
        .split(',')
        .map(cat => cat.trim())
        .filter(cat => cat.length > 0);

      const surgicalCategoryIds = [];
      const surgicalCategoryNames = [];
      const categoryValidationErrors = [];

      if (surgicalCategories.length === 0) {
        validationErrors.push('Surgical Category is required');
      }

      for (const cat of surgicalCategories) {
        const foundCategoryObj = categoryMap.get(cat.toLowerCase().trim());
        if (!foundCategoryObj) {
          categoryValidationErrors.push(`Surgical category "${cat}" not found`);
        } else {
          surgicalCategoryIds.push(foundCategoryObj._id);
          surgicalCategoryNames.push(foundCategoryObj.description || cat);
        }
      }

      validationErrors.push(...categoryValidationErrors);

      // Validate implant type exists (if provided)
      if (implantType.toString().trim()) {
        implantTypeObj = implantTypeMap.get(implantType.toString().toLowerCase().trim());
        if (!implantTypeObj) {
          validationErrors.push(`Implant type "${implantType}" not found`);
        }
      }

      // Validate numeric fields
      if (mrp.toString().trim()) {
        mrpValue = parseFloat(mrp.toString().trim());
        if (isNaN(mrpValue) || mrpValue < 0) {
          validationErrors.push('MRP must be a valid positive number');
        }
      }

      if (institutionalPrice.toString().trim()) {
        institutionalPriceValue = parseFloat(institutionalPrice.toString().trim());
        if (isNaN(institutionalPriceValue) || institutionalPriceValue < 0) {
          validationErrors.push('Institutional Price must be a valid positive number');
        }
      }

      if (distributionPrice.toString().trim()) {
        distributionPriceValue = parseFloat(distributionPrice.toString().trim());
        if (isNaN(distributionPriceValue) || distributionPriceValue < 0) {
          validationErrors.push('Distribution Price must be a valid positive number');
        }
      }

      if (gstPercentage.toString().trim()) {
        gstValue = parseFloat(gstPercentage.toString().trim());
        if (isNaN(gstValue) || gstValue < 0 || gstValue > 100) {
          validationErrors.push('GST % must be a valid number between 0 and 100');
        }
      }

      // Parse Length (mm) - handle empty/missing values properly
      if (lengthMm && lengthMm.toString().trim() !== '' && lengthMm.toString().trim() !== 'N/A') {
        lengthValue = parseFloat(lengthMm.toString().trim());
        if (isNaN(lengthValue) || lengthValue < 0) {
          validationErrors.push('Length must be a valid positive number');
        }
      } else {
        // Length is empty/missing - this is allowed
        lengthValue = null;
      }
      
      // Business logic validation: If Implant Type is provided, Sub Category and Length should be provided
      if (implantTypeObj) {
        if (!subCategory.toString().trim()) {
          validationErrors.push('Sub Category is required when Implant Type is specified');
        }
        // Length is optional - removed required validation
      }

      // Check for duplicate material numbers within uploaded data (considering BU + Material Number combination)
      const duplicateInUpload = processedData.find(item => 
        item.businessUnitCode.toLowerCase() === businessUnitCode.toString().toLowerCase().trim() &&
        item.materialNumber.toLowerCase() === materialNumber.toString().toLowerCase().trim()
      );

      if (duplicateInUpload) {
        validationErrors.push('Duplicate BU + Material Number combination found in uploaded data');
      }

      // Check for existing material numbers in database (considering BU + Material Number combination)
      if (businessUnitObj && materialNumber.toString().trim()) {
        const existingMaterial = await MaterialMaster.findOne({
          businessUnitId: businessUnitObj._id,
          materialNumber: materialNumber.toString().trim(),
          isActive: true
        });

        if (existingMaterial) {
          validationErrors.push('BU + Material Number combination already exists in database');
        }
      }

      const processedRow = {
        rowIndex,
        businessUnitCode: businessUnitCode.toString().trim(),
        businessUnitId: businessUnitObj?._id,
        materialNumber: materialNumber.toString().trim(),
        description: description.toString().trim(),
        hsnCode: hsnCode.toString().trim(),
        gstPercentage: gstValue,
        currency: currency.toString().trim() || 'INR',
        mrp: mrpValue,
        institutionalPrice: institutionalPriceValue,
        distributionPrice: distributionPriceValue,
        surgicalCategories: surgicalCategoryNames,     // Display names for UI
        surgicalCategoryIds: surgicalCategoryIds,       // IDs for database (array)
        implantType: implantType.toString().trim(),
        subCategory: subCategory.toString().trim(),
        lengthMm: lengthValue,
        unit: unit.toString().trim() || 'NOS',
        implantTypeId: implantTypeObj?._id,
        validationErrors,
        isValid: validationErrors.length === 0
      };

      processedData.push(processedRow);
    }

    // Clean up uploaded file
    fs.unlinkSync(req.file.path);

    res.json({
      data: processedData,
      totalRows: processedData.length,
      validRows: processedData.filter(row => row.isValid).length,
      invalidRows: processedData.filter(row => !row.isValid).length
    });

  } catch (error) {
    console.error('Error processing material master file:', error);
    // Clean up file if it exists
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ message: 'Error processing file', error: error.message });
  }
});

// Save Material Master data to database
router.post('/save-material-master', async (req, res) => {
  try {
    const { data, updatedBy } = req.body;

    if (!data || !Array.isArray(data)) {
      return res.status(400).json({ message: 'Invalid data provided' });
    }

    if (!updatedBy) {
      return res.status(400).json({ message: 'Updated by user is required' });
    }

    // Filter only valid rows that have surgical categories
    const validRows = data.filter(row => row.isValid && row.surgicalCategoryIds && row.surgicalCategoryIds.length > 0);

    if (validRows.length === 0) {
      return res.status(400).json({ message: 'No valid rows to save' });
    }

    let savedCount = 0;
    const errors = [];

    for (const row of validRows) {
      try {
        const materialData = {
          businessUnitId: row.businessUnitId,
          materialNumber: row.materialNumber,
          description: row.description,
          hsnCode: row.hsnCode,
          gstPercentage: row.gstPercentage || 0,
          currency: row.currency,
          mrp: row.mrp || 0,
          institutionalPrice: row.institutionalPrice || 0,
          distributionPrice: row.distributionPrice || 0,
          surgicalCategories: row.surgicalCategoryIds || [],  // Array of category IDs
          implantType: row.implantTypeId || null,
          subCategory: row.subCategory || null,
          lengthMm: row.lengthMm || null,
          unit: row.unit || 'NOS',
          createdBy: updatedBy,
          updatedBy: updatedBy
        };

        const material = new MaterialMaster(materialData);
        await material.save();
        savedCount++;

      } catch (error) {
        console.error(`Error saving material ${row.materialNumber}:`, error);
        errors.push(`Error saving material ${row.materialNumber}: ${error.message}`);
      }
    }

    res.json({
      message: `Successfully saved ${savedCount} material records`,
      savedCount,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error) {
    console.error('Error saving material data:', error);
    res.status(500).json({ message: 'Error saving data to database', error: error.message });
  }
});

// Material Master Validation endpoint
router.post('/material-validation', upload.single('excelFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    // Read Excel file
    const workbook = xlsx.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = xlsx.utils.sheet_to_json(worksheet);

    // Clean up uploaded file
    fs.unlinkSync(req.file.path);

    if (jsonData.length === 0) {
      return res.status(400).json({ message: 'No data found in Excel file' });
    }

    const validationResults = [];
    let validCount = 0;
    let invalidCount = 0;

    for (let i = 0; i < jsonData.length; i++) {
      const row = jsonData[i];
      const rowIndex = i + 2; // Excel rows start from 2 (after header)
      
      // Extract data from row
      const materialNumber = row['Material Number'] || row['material number'] || row['materialNumber'] || '';
      const description = row['Description'] || row['description'] || '';
      const hsnCode = row['HSN Code'] || row['hsn code'] || row['hsnCode'] || '';
      const gstPercent = parseFloat(row['GST %'] || row['gst %'] || row['gstPercent'] || 0);
      const mrp = parseFloat(row['MRP'] || row['mrp'] || 0);
      const institutionalPrice = parseFloat(row['Institutional Price'] || row['institutional price'] || row['institutionalPrice'] || 0);

      const validationItem = {
        rowIndex,
        materialNumber: materialNumber.toString().trim(),
        description: description.toString().trim(),
        hsnCode: hsnCode.toString().trim(),
        gstPercent,
        mrp,
        institutionalPrice,
        isValid: true,
        errors: []
      };

      // Skip empty rows
      if (!materialNumber.toString().trim()) {
        continue;
      }

      try {
        // Find material in database
        const dbMaterial = await MaterialMaster.findOne({ 
          materialNumber: materialNumber.toString().trim() 
        }).lean();

        if (!dbMaterial) {
          validationItem.isValid = false;
          validationItem.errors.push('Material not found in database');
          invalidCount++;
        } else {
          // Store database values for comparison
          validationItem.dbMaterialNumber = dbMaterial.materialNumber;
          validationItem.dbDescription = dbMaterial.description;
          validationItem.dbHsnCode = dbMaterial.hsnCode;
          validationItem.dbGstPercent = dbMaterial.gstPercentage;
          validationItem.dbMrp = dbMaterial.mrp;
          validationItem.dbInstitutionalPrice = dbMaterial.institutionalPrice;

          // Compare each field
          if (validationItem.description !== dbMaterial.description) {
            validationItem.isValid = false;
            validationItem.errors.push('Description mismatch');
          }

          if (validationItem.hsnCode !== dbMaterial.hsnCode) {
            validationItem.isValid = false;
            validationItem.errors.push('HSN Code mismatch');
          }

          if (Math.abs(validationItem.gstPercent - dbMaterial.gstPercentage) > 0.01) {
            validationItem.isValid = false;
            validationItem.errors.push('GST % mismatch');
          }

          if (Math.abs(validationItem.mrp - dbMaterial.mrp) > 0.01) {
            validationItem.isValid = false;
            validationItem.errors.push('MRP mismatch');
          }

          if (Math.abs(validationItem.institutionalPrice - dbMaterial.institutionalPrice) > 0.01) {
            validationItem.isValid = false;
            validationItem.errors.push('Institutional Price mismatch');
          }

          if (validationItem.isValid) {
            validCount++;
          } else {
            invalidCount++;
          }
        }

      } catch (error) {
        console.error(`Error validating row ${rowIndex}:`, error);
        validationItem.isValid = false;
        validationItem.errors.push('Database validation error');
        invalidCount++;
      }

      validationResults.push(validationItem);
    }

    res.json({
      success: true,
      data: validationResults,
      totalRows: validationResults.length,
      validRows: validCount,
      invalidRows: invalidCount,
      message: `Validation complete. ${validCount} valid records, ${invalidCount} invalid records`
    });

  } catch (error) {
    console.error('Error validating material data:', error);
    
    // Clean up uploaded file in case of error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({ 
      success: false,
      message: 'Error validating material data', 
      error: error.message 
    });
  }
});

module.exports = router;
