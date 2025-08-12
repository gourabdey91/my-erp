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
    const categoryMap = new Map(existingCategories.map(cat => [cat.code.toLowerCase().trim(), cat]));

    for (let i = 0; i < jsonData.length; i++) {
      const row = jsonData[i];
      const rowIndex = i + 2; // Excel rows start from 2 (after header)
      const validationErrors = [];

      // Clean and extract data
      const implantTypeName = row['Implants type'] || row['Implant Type'] || '';
      const surgicalCategory = row['Surgical category'] || row['Surgical Category'] || '';
      const subCategory = row['Subcategory'] || row['Sub Category'] || row['SubCategory'] || '';
      const length = row['length'] || row['Length'] || '';

      // Validate required fields
      if (!implantTypeName.toString().trim()) {
        validationErrors.push('Implant type is required');
      }
      if (!surgicalCategory.toString().trim()) {
        validationErrors.push('Surgical category is required');
      }
      if (!subCategory.toString().trim()) {
        validationErrors.push('Subcategory is required');
      }
      // Length is optional, no required validation

      let implantTypeObj = null;
      let categoryObj = null;
      let lengthValue = null;

      // Validate implant type exists
      if (implantTypeName.toString().trim()) {
        implantTypeObj = implantTypeMap.get(implantTypeName.toString().toLowerCase().trim());
        if (!implantTypeObj) {
          validationErrors.push(`Implant type "${implantTypeName}" not found`);
        }
      }

      // Validate surgical category exists
      if (surgicalCategory.toString().trim()) {
        categoryObj = categoryMap.get(surgicalCategory.toString().toLowerCase().trim());
        if (!categoryObj) {
          validationErrors.push(`Surgical category "${surgicalCategory}" not found`);
        }
      }

      // Validate length is a valid number (if provided)
      if (length.toString().trim()) {
        lengthValue = parseFloat(length.toString().trim());
        if (isNaN(lengthValue) || lengthValue < 0) {
          validationErrors.push('Length must be a valid positive number');
        }
      } else {
        // Length is optional, set to null if not provided
        lengthValue = null;
      }

      // Check for duplicate entries within the uploaded data
      const duplicateInUpload = processedData.find(item => 
        item.implantTypeName.toLowerCase() === implantTypeName.toString().toLowerCase().trim() &&
        item.surgicalCategory.toLowerCase() === surgicalCategory.toString().toLowerCase().trim() &&
        item.subCategory.toLowerCase() === subCategory.toString().toLowerCase().trim() &&
        ((item.length === null && lengthValue === null) || (item.length === lengthValue))
      );

      if (duplicateInUpload) {
        validationErrors.push('Duplicate entry found in uploaded data');
      }

      // Check for existing entries in database
      if (implantTypeObj && categoryObj && subCategory.toString().trim()) {
        const existingSubcategory = implantTypeObj.subcategories?.find(sub =>
          sub.subCategory.toLowerCase() === subCategory.toString().toLowerCase().trim() &&
          sub.surgicalCategory.toString() === categoryObj._id.toString() &&
          ((sub.length === null && lengthValue === null) || (sub.length === lengthValue))
        );

        if (existingSubcategory) {
          validationErrors.push('Entry already exists in database');
        }
      }

      const processedRow = {
        rowIndex,
        implantTypeName: implantTypeName.toString().trim(),
        surgicalCategory: surgicalCategory.toString().trim(),
        subCategory: subCategory.toString().trim(),
        length: lengthValue,
        implantTypeId: implantTypeObj?._id,
        surgicalCategoryId: categoryObj?._id,
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

    if (!data || !Array.isArray(data)) {
      return res.status(400).json({ message: 'Invalid data provided' });
    }

    if (!updatedBy) {
      return res.status(400).json({ message: 'Updated by user is required' });
    }

    // Filter only valid rows
    const validRows = data.filter(row => row.isValid && row.implantTypeId && row.surgicalCategoryId);

    if (validRows.length === 0) {
      return res.status(400).json({ message: 'No valid rows to save' });
    }

    let savedCount = 0;
    const errors = [];

    // Group by implant type for batch updates
    const groupedByImplantType = validRows.reduce((acc, row) => {
      const key = row.implantTypeId.toString();
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(row);
      return acc;
    }, {});

    for (const [implantTypeId, rows] of Object.entries(groupedByImplantType)) {
      try {
        const implantType = await ImplantType.findById(implantTypeId);
        if (!implantType) {
          errors.push(`Implant type not found for ID: ${implantTypeId}`);
          continue;
        }

        // Add new subcategories
        for (const row of rows) {
          const newSubcategory = {
            subCategory: row.subCategory,
            length: row.length,
            surgicalCategory: row.surgicalCategoryId
          };

          implantType.subcategories.push(newSubcategory);
          savedCount++;
        }

        implantType.updatedBy = updatedBy;
        implantType.updatedAt = new Date();
        await implantType.save();

      } catch (error) {
        console.error(`Error saving data for implant type ${implantTypeId}:`, error);
        errors.push(`Error saving data for implant type: ${error.message}`);
      }
    }

    res.json({
      message: `Successfully saved ${savedCount} subcategory entries`,
      savedCount,
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
      if (!surgicalCategory.toString().trim()) {
        validationErrors.push('Surgical Category is required');
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

      // Validate surgical category exists
      if (surgicalCategory.toString().trim()) {
        categoryObj = categoryMap.get(surgicalCategory.toString().toLowerCase().trim());
        if (!categoryObj) {
          validationErrors.push(`Surgical category "${surgicalCategory}" not found`);
        }
      }

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
        surgicalCategory: surgicalCategory.toString().trim(),
        implantType: implantType.toString().trim(),
        subCategory: subCategory.toString().trim(),
        lengthMm: lengthValue,
        unit: unit.toString().trim() || 'NOS',
        surgicalCategoryId: categoryObj?._id,
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

    // Filter only valid rows
    const validRows = data.filter(row => row.isValid);

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
          surgicalCategory: row.surgicalCategoryId,
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
