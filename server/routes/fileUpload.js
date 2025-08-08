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

    // Get existing categories and implant types for validation
    const existingCategories = await Category.find({ isActive: true }).lean();
    const existingImplantTypes = await ImplantType.find({ isActive: true }).lean();

    // Create lookup maps for faster validation
    const categoryMap = new Map(existingCategories.map(cat => [cat.code.toLowerCase().trim(), cat]));
    const implantTypeMap = new Map(existingImplantTypes.map(it => [it.name.toLowerCase().trim(), it]));

    for (let i = 0; i < jsonData.length; i++) {
      const row = jsonData[i];
      const rowIndex = i + 2; // Excel rows start from 2 (after header)
      const validationErrors = [];

      // Clean and extract data
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
      const unit = row['Unit'] || row['unit'] || 'PCS';

      // Validate required fields
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

      let categoryObj = null;
      let implantTypeObj = null;
      let mrpValue = null;
      let institutionalPriceValue = null;
      let distributionPriceValue = null;
      let gstValue = null;
      let lengthValue = null;

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

      if (lengthMm.toString().trim()) {
        lengthValue = parseFloat(lengthMm.toString().trim());
        if (isNaN(lengthValue) || lengthValue < 0) {
          validationErrors.push('Length must be a valid positive number');
        }
      }

      // Check for duplicate material numbers within uploaded data
      const duplicateInUpload = processedData.find(item => 
        item.materialNumber.toLowerCase() === materialNumber.toString().toLowerCase().trim()
      );

      if (duplicateInUpload) {
        validationErrors.push('Duplicate material number found in uploaded data');
      }

      // Check for existing material numbers in database
      if (materialNumber.toString().trim()) {
        const existingMaterial = await MaterialMaster.findOne({
          materialNumber: materialNumber.toString().trim(),
          isActive: true
        });

        if (existingMaterial) {
          validationErrors.push('Material number already exists in database');
        }
      }

      const processedRow = {
        rowIndex,
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
        unit: unit.toString().trim() || 'PCS',
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
          unit: row.unit || 'PCS',
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

module.exports = router;
