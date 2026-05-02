const express = require('express');
const router = express.Router();
const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs');
const Inquiry = require('../models/Inquiry');
const Hospital = require('../models/Hospital');
const Category = require('../models/Category');
const PaymentType = require('../models/PaymentType');
const Procedure = require('../models/Procedure');
const CompanyDetails = require('../models/CompanyDetails');

// Get all inquiries with pagination and search
router.get('/', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = '',
      hospital = '',
      surgicalCategory = '',
      paymentMethod = '',
      sortBy = 'inquiryDate',
      sortOrder = 'desc'
    } = req.query;

    const query = { isActive: true };

    // Add search functionality
    if (search) {
      query.$or = [
        { inquiryNumber: { $regex: search, $options: 'i' } },
        { patientName: { $regex: search, $options: 'i' } },
        { patientUHID: { $regex: search, $options: 'i' } }
      ];
    }

    // Add filters
    if (hospital) query.hospital = hospital;
    if (surgicalCategory) query.surgicalCategory = surgicalCategory;
    if (paymentMethod) query.paymentMethod = paymentMethod;

    // Execute query with pagination
    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      sort: { [sortBy]: sortOrder === 'desc' ? -1 : 1 },
      populate: [
        { path: 'hospital', select: 'shortName legalName code' },
        { 
          path: 'surgicalProcedure', 
          select: 'name code totalLimit currency items',
          populate: {
            path: 'items.surgicalCategoryId',
            select: 'name description code'
          }
        },
        { path: 'paymentMethod', select: 'description code' },
        { path: 'createdBy', select: 'name email' },
        { path: 'updatedBy', select: 'name email' }
      ]
    };

    const result = await Inquiry.paginate(query, options);

    res.json({
      success: true,
      data: result.docs,
      pagination: {
        currentPage: result.page,
        totalPages: result.totalPages,
        totalItems: result.totalDocs,
        itemsPerPage: result.limit,
        hasNextPage: result.hasNextPage,
        hasPrevPage: result.hasPrevPage
      }
    });
  } catch (error) {
    console.error('Error fetching inquiries:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching inquiries',
      error: error.message
    });
  }
});

// Get inquiry by ID
router.get('/:id', async (req, res) => {
  try {
    const inquiry = await Inquiry.findById(req.params.id)
      .populate('hospital', 'shortName legalName code')
      .populate({
        path: 'surgicalProcedure',
        select: 'name code totalLimit currency items',
        populate: {
          path: 'items.surgicalCategoryId',
          select: 'name description code'
        }
      })
      .populate('paymentMethod', 'description code')
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email');

    if (!inquiry) {
      return res.status(404).json({
        success: false,
        message: 'Inquiry not found'
      });
    }

    res.json({
      success: true,
      data: inquiry
    });
  } catch (error) {
    console.error('Error fetching inquiry:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching inquiry',
      error: error.message
    });
  }
});

// Create new inquiry
router.post('/', async (req, res) => {
  try {
    const inquiryData = {
      ...req.body,
      createdBy: req.user?.id || '507f1f77bcf86cd799439011' // Default user ID for development
    };

    const inquiry = new Inquiry(inquiryData);
    await inquiry.save();

    await inquiry.populate([
      { path: 'hospital', select: 'shortName legalName code' },
      { 
        path: 'surgicalProcedure', 
        select: 'name code amount currency items',
        populate: {
          path: 'items.surgicalCategoryId',
          select: 'description code'
        }
      },
      { path: 'paymentMethod', select: 'description code' },
      { path: 'createdBy', select: 'name email' }
    ]);

    res.status(201).json({
      success: true,
      message: 'Inquiry created successfully',
      data: inquiry
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Inquiry number already exists',
        error: 'Duplicate inquiry number'
      });
    }

    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: errors.length === 1 ? errors[0] : `Multiple validation errors: ${errors.join('; ')}`,
        errors
      });
    }

    // Handle custom validation errors (like material validation)
    if (error.message && error.message.includes('Material validation failed')) {
      return res.status(400).json({
        success: false,
        message: error.message,
        error: 'Material validation error'
      });
    }

    // Handle limit validation errors
    if (error.message && error.message.includes('exceeds the limit')) {
      return res.status(400).json({
        success: false,
        message: error.message,
        error: 'Limit validation error'
      });
    }

    res.status(500).json({
      success: false,
      message: error.message || 'Error creating inquiry',
      error: 'Internal server error'
    });
  }
});

// Update inquiry
router.put('/:id', async (req, res) => {
  try {
    const updateData = {
      ...req.body,
      updatedBy: req.user?.id || '507f1f77bcf86cd799439011' // Default user ID for development
    };

    // First find the inquiry
    const inquiry = await Inquiry.findById(req.params.id);
    
    if (!inquiry) {
      return res.status(404).json({
        success: false,
        message: 'Inquiry not found'
      });
    }

    // Update the inquiry properties
    Object.assign(inquiry, updateData);
    
    // Save the inquiry (this will trigger pre-save middleware including limit validation)
    await inquiry.save();
    
    // Populate the saved inquiry for response
    await inquiry.populate([
      { path: 'hospital', select: 'shortName legalName code' },
      { 
        path: 'surgicalProcedure', 
        select: 'name code amount currency items',
        populate: {
          path: 'items.surgicalCategoryId',
          select: 'description code'
        }
      },
      { path: 'paymentMethod', select: 'description code' },
      { path: 'createdBy', select: 'name email' },
      { path: 'updatedBy', select: 'name email' }
    ]);

    res.json({
      success: true,
      message: 'Inquiry updated successfully',
      data: inquiry
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: errors.length === 1 ? errors[0] : `Multiple validation errors: ${errors.join('; ')}`,
        errors
      });
    }

    // Handle custom validation errors (like material validation)
    if (error.message && error.message.includes('Material validation failed')) {
      return res.status(400).json({
        success: false,
        message: error.message,
        error: 'Material validation error'
      });
    }

    // Handle limit validation errors
    if (error.message && error.message.includes('exceeds the limit')) {
      return res.status(400).json({
        success: false,
        message: error.message,
        error: 'Limit validation error'
      });
    }

    res.status(500).json({
      success: false,
      message: error.message || 'Error updating inquiry',
      error: 'Internal server error'
    });
  }
});

// Soft delete inquiry
router.delete('/:id', async (req, res) => {
  try {
    const inquiry = await Inquiry.findByIdAndUpdate(
      req.params.id,
      { 
        isActive: false,
        updatedBy: req.user?.id || '507f1f77bcf86cd799439011' // Default user ID for development
      },
      { new: true }
    );

    if (!inquiry) {
      return res.status(404).json({
        success: false,
        message: 'Inquiry not found'
      });
    }

    res.json({
      success: true,
      message: 'Inquiry deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting inquiry:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting inquiry',
      error: error.message
    });
  }
});

// Get surgical categories by hospital
router.get('/hospital/:hospitalId/surgical-categories', async (req, res) => {
  try {
    const { hospitalId } = req.params;
    console.log('=== SURGICAL CATEGORIES ENDPOINT ===');
    console.log('Hospital ID requested:', hospitalId);
    
    // Get hospital with populated surgical categories
    const hospital = await Hospital.findById(hospitalId)
      .populate('surgicalCategories', 'description code')
      .select('surgicalCategories');
    
    console.log('Hospital found:', !!hospital);
    if (hospital) {
      console.log('Surgical categories count:', hospital.surgicalCategories.length);
      console.log('Surgical categories:', hospital.surgicalCategories.map(cat => ({ id: cat._id, description: cat.description, code: cat.code })));
    }
    
    if (!hospital) {
      console.log('Hospital not found with ID:', hospitalId);
      return res.status(404).json({
        success: false,
        message: 'Hospital not found'
      });
    }

    const response = {
      success: true,
      data: hospital.surgicalCategories || []
    };
    console.log('Sending response:', response);
    res.json(response);
  } catch (error) {
    console.error('Error fetching surgical categories:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching surgical categories',
      error: error.message
    });
  }
});

// Get procedures filtered by category and payment method
router.get('/procedures/:hospitalId', async (req, res) => {
  try {
    const { hospitalId } = req.params;
    const { category, paymentMethod } = req.query;
    
    console.log('=== PROCEDURES ENDPOINT ===');
    console.log('Hospital ID:', hospitalId);
    console.log('Category:', category);
    console.log('Payment Method:', paymentMethod);
    
    // Get hospital with surgical categories to filter procedures
    const hospital = await Hospital.findById(hospitalId).populate('surgicalCategories');
    if (!hospital) {
      return res.status(404).json({
        success: false,
        message: 'Hospital not found'
      });
    }
    
    const hospitalCategoryIds = hospital.surgicalCategories.map(cat => cat._id.toString());
    console.log('Hospital category IDs:', hospitalCategoryIds);
    
    // Build procedure filter
    const procedureFilter = { isActive: true };
    
    // Filter by selected category (if specified)
    if (category && category !== '') {
      procedureFilter['items.surgicalCategoryId'] = category;
    } else {
      // If no specific category, filter by hospital's categories using new structure
      if (hospitalCategoryIds.length > 0) {
        procedureFilter['items.surgicalCategoryId'] = { $in: hospitalCategoryIds };
      }
    }
    
    // Filter by payment method (if specified)
    if (paymentMethod && paymentMethod !== '') {
      procedureFilter.paymentTypeId = paymentMethod;
    }
    
    console.log('Procedure filter:', procedureFilter);
    
    // Fetch procedures with population
    const procedures = await Procedure.find(procedureFilter)
      .populate('items.surgicalCategoryId', 'code description')
      .populate('paymentTypeId', 'code description')
      .select('_id code name items paymentTypeId totalLimit')
      .sort({ name: 1 });
    
    console.log('Found procedures:', procedures.length);
    
    res.json({
      success: true,
      data: procedures
    });
  } catch (error) {
    console.error('Error fetching procedures:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching procedures',
      error: error.message
    });
  }
});

// Get inquiry statistics
router.get('/stats/overview', async (req, res) => {
  try {
    const totalInquiries = await Inquiry.countDocuments({ isActive: true });
    const thisMonthStart = new Date();
    thisMonthStart.setDate(1);
    thisMonthStart.setHours(0, 0, 0, 0);
    
    const thisMonthInquiries = await Inquiry.countDocuments({
      isActive: true,
      inquiryDate: { $gte: thisMonthStart }
    });

    res.json({
      success: true,
      data: {
        total: totalInquiries,
        thisMonth: thisMonthInquiries
      }
    });
  } catch (error) {
    console.error('Error fetching inquiry statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching inquiry statistics',
      error: error.message
    });
  }
});

// Generate PDF for inquiry
router.get('/:id/pdf', async (req, res) => {
  const { docType = 'Estimation for Inquiry' } = req.query; // Default to Estimation for inquiry
  try {
    const inquiry = await Inquiry.findById(req.params.id)
      .populate({
        path: 'hospital',
        select: 'shortName legalName code address city state businessUnit',
        populate: {
          path: 'businessUnit',
          select: '_id'
        }
      })
      .populate({
        path: 'surgicalProcedure',
        select: 'name code totalLimit currency items',
        populate: {
          path: 'items.surgicalCategoryId',
          select: 'name description code'
        }
      })
      .populate('paymentMethod', 'description code')
      .populate('createdBy', 'name email');

    if (!inquiry) {
      console.error('Inquiry not found:', req.params.id);
      return res.status(404).json({
        success: false,
        message: 'Inquiry not found'
      });
    }

    // Ensure tax amounts are calculated for each item (they may not be if inquiry was fetched without triggering pre-save hook)
    if (inquiry.items && inquiry.items.length > 0) {
      console.log('DEBUG: Processing', inquiry.items.length, 'items');
      
      // Get hospital and company state codes to determine tax type
      let hospitalStateCode = inquiry.hospital?.state || '';
      let companyStateCode = '';
      
      // Try to fetch company state code from database
      try {
        const CompanyDetailsModel = require('../models/CompanyDetails');
        const companyDetails = await CompanyDetailsModel.findOne({});
        if (companyDetails && companyDetails.compliance && companyDetails.compliance.stateCode) {
          companyStateCode = companyDetails.compliance.stateCode;
        }
      } catch (e) {
        console.log('Could not fetch company state code:', e.message);
      }
      
      console.log('DEBUG: State codes - Hospital:', hospitalStateCode, 'Company:', companyStateCode);
      const isSameState = hospitalStateCode === companyStateCode && hospitalStateCode !== '';
      console.log('DEBUG: Is same state transaction?', isSameState);
      
      inquiry.items.forEach((item, idx) => {
        console.log(`DEBUG: Item ${idx} BEFORE fix:`, {
          cgst: item.cgstAmount,
          sgst: item.sgstAmount,
          igst: item.igstAmount,
          gst: item.gstAmount,
          total: item.totalAmount
        });
        
        // Recalculate tax based on state codes
        const gstAmount = item.gstAmount || 0;
        if (gstAmount > 0) {
          if (isSameState) {
            // Intra-state: CGST 50% + SGST 50%
            item.cgstAmount = Math.round((gstAmount * 0.5) * 100) / 100;
            item.sgstAmount = Math.round((gstAmount * 0.5) * 100) / 100;
            item.igstAmount = 0;
            console.log(`DEBUG: Item ${idx} - CGST/SGST intra-state: CGST=${item.cgstAmount}, SGST=${item.sgstAmount}`);
          } else {
            // Inter-state: IGST 100%
            item.cgstAmount = 0;
            item.sgstAmount = 0;
            item.igstAmount = gstAmount;
            console.log(`DEBUG: Item ${idx} - IGST inter-state: IGST=${item.igstAmount}`);
          }
        }
        
        console.log(`DEBUG: Item ${idx} AFTER fix:`, {
          cgst: item.cgstAmount,
          sgst: item.sgstAmount,
          igst: item.igstAmount,
          gst: item.gstAmount
        });
      });
    }

    // Debug logging
    console.log('Inquiry Hospital:', inquiry.hospital?._id);
    console.log('Inquiry Hospital BusinessUnit:', inquiry.hospital?.businessUnit);

    let businessUnitId = inquiry.hospital?.businessUnit?._id || inquiry.hospital?.businessUnit;

    // Fetch company details for the business unit (if available)
    let companyDetails = null;
    
    if (businessUnitId) {
      companyDetails = await CompanyDetails.findOne({
        businessUnit: businessUnitId,
        isActive: true
      });

      console.log('Company Details Query:', { businessUnit: businessUnitId });
      console.log('Company Details Found:', !!companyDetails);
    }

    // Fallback: Try to find any active company details if specific one not found
    if (!companyDetails) {
      console.log('Trying fallback: fetching any active CompanyDetails');
      companyDetails = await CompanyDetails.findOne({ isActive: true });
    }

    if (!companyDetails) {
      console.error('No company details found. Using default values.');
      // Provide default/fallback values
      companyDetails = {
        companyName: 'SS AGENCY',
        address: {
          street: '45, 2nd Floor District Center, Chandrasekharpur, Infront of LIC Office, Bhubaneswar',
          city: 'Bhubaneswar',
          state: 'Odisha',
          pincode: '751001'
        },
        contact: {
          mobile1: '+91-8790077225',
          mobile2: '7606022509',
          email: 'crm.ss.agency@gmail.com'
        },
        compliance: {
          dlNumber: 'MBJ-NZ-0013/W/MBJ-NZ-0014/WC/MBJ-NZ-0015/WX',
          gstNumber: '21AAHPP9714G1ZR',
          stateCode: '21'
        }
      };
    }

    // Create PDF Document - Optimized for A4 printing
    const doc = new PDFDocument({
      size: 'A4',
      margin: 12,
      bufferPages: true,
      info: {
        Title: `Inquiry_${inquiry.inquiryNumber}`,
        Author: 'SS AGENCY',
        Subject: 'TAX INVOICE'
      }
    });

    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Inquiry_${inquiry.inquiryNumber}.pdf"`);

    // Pipe the PDF to response
    doc.pipe(res);

    const margin = 12;
    const pageWidth = 576; // A4 width (210mm) minus margins (12+12)
    let y = margin;

    // Register Calibri font with proper bold support
    let calibriAvailable = false;
    let calibriBoldAvailable = false;

    try {
      // Try common Calibri paths on Windows
      const calibriPath = 'C:\\Windows\\Fonts\\calibri.ttf';
      const calibriBoldPath = 'C:\\Windows\\Fonts\\calibrib.ttf';
      
      if (fs.existsSync(calibriPath)) {
        try {
          doc.registerFont('Calibri', calibriPath);
          calibriAvailable = true;
        } catch (e) {
          console.log('Could not register Calibri:', e.message);
        }
      }
      
      if (fs.existsSync(calibriBoldPath)) {
        try {
          doc.registerFont('CaliBold', calibriBoldPath);
          calibriBoldAvailable = true;
        } catch (e) {
          console.log('Could not register CaliBold:', e.message);
        }
      }
    } catch (e) {
      console.log('Font setup error:', e.message);
    }

    // Font helper - Use Calibri if available, fallback to Helvetica
    const getFont = (bold = false) => {
      if (bold) {
        // Prefer CaliBold, fallback to Helvetica-Bold
        return calibriBoldAvailable ? 'CaliBold' : 'Helvetica-Bold';
      }
      // Prefer Calibri, fallback to Helvetica
      return calibriAvailable ? 'Calibri' : 'Helvetica';
    };
    const fontBaseSize = 12;

    // ===== SET GLOBAL LINE WIDTH FOR ALL BORDERS =====
    doc.lineWidth(0.5); // Reduced border thickness throughout PDF

    // ===== TITLE ROW: DYNAMIC DOCUMENT TYPE =====
    doc.rect(margin, y, pageWidth, 20).stroke();
    doc.fontSize(12).font(getFont(true)).text(docType, margin + 10, y + 3, { width: pageWidth - 20, align: 'center' });
    y += 20;

    // ===== HEADER SECTION: Redesigned as TABLE with Logo Column + Address Column =====
    const leftSectionWidth = pageWidth * 0.55;
    const rightSectionWidth = pageWidth * 0.45;
    const leftX = margin;
    const rightX = margin + leftSectionWidth;
    const headerHeight = 140;

    // Draw main border for left section
    doc.rect(leftX, y, leftSectionWidth, headerHeight).stroke();

    // LEFT COLUMN: Logo (fixed width of 40px)
    const logoColumnWidth = 40;
    const logoSize = 30;
    const logoX = leftX + 5;
    const logoY = y + 5;

    // Try to load and display logo - adjust path for different environments
    let logoPath = path.join(__dirname, '../public/SsAgency.png');
    if (!fs.existsSync(logoPath)) {
      logoPath = path.join(__dirname, '../../public/SsAgency.png');
    }

    if (fs.existsSync(logoPath)) {
      try {
        doc.image(logoPath, logoX, logoY, { width: logoSize, height: logoSize });
      } catch (e) {
        console.log('Logo loading error:', e.message);
      }
    } else {
      console.log('Logo file not found at:', logoPath);
    }

    // RIGHT COLUMN: Company Details (all address/contact info)
    const addressColumnX = leftX + logoColumnWidth;
    const addressColumnWidth = leftSectionWidth - logoColumnWidth;
    const addressStartY = y + 3;

    doc.fontSize(12).font(getFont(true));
    
    // Build address from company details with safety checks
    const street = companyDetails?.address?.street || '43, 2nd Floor District Center, Chandrasekharpur';
    const city = companyDetails?.address?.city || 'Bhubaneswar';
    const state = companyDetails?.address?.state || 'Odisha';
    const pincode = companyDetails?.address?.pincode || '751016';
    const mobile1 = companyDetails?.contact?.mobile1 || '8790077225';
    const mobile2 = companyDetails?.contact?.mobile2 || '7606022509';
    const email = companyDetails?.contact?.email || 'crm.ss.agency@gmail.com';
    const dlNumber = companyDetails?.compliance?.dlNumber || 'MBJ-NZ-0013/W/MBJ-NZ-0014/WC/MBJ-NZ-0015/WX';
    const gstNumber = companyDetails?.compliance?.gstNumber || '21AAHPP9714G1ZR';
    const stateCode = companyDetails?.compliance?.stateCode || '21';
    const companyName = companyDetails?.companyName || 'SS AGENCY';

    const addressTextPadding = 4;
    const addressTextWidth = addressColumnWidth - (2 * addressTextPadding);
    const lineGap = -1; // Negative gap to compress lines and prevent overflow
    
    let currentY = addressStartY;

    // Helper to draw text and return next Y position accounting for text wrapping
    const drawAddressLine = (text, currentY, bold = false) => {
      doc.fontSize(12).font(bold ? getFont(true) : getFont());
      const textHeight = doc.heightOfString(text, { width: addressTextWidth });
      doc.text(text, addressColumnX + addressTextPadding, currentY, { width: addressTextWidth });
      return currentY + textHeight + lineGap;
    };

    // Draw company details in address column
    currentY = drawAddressLine(companyName, currentY, true);
    currentY = drawAddressLine(street, currentY, false);
    currentY = drawAddressLine(`${city}, ${state} - ${pincode}`, currentY, false);
    currentY = drawAddressLine(`Mob. ${mobile1}, ${mobile2}`, currentY, false);
    currentY = drawAddressLine(`Email-${email}`, currentY, false);
    currentY = drawAddressLine(`DL No.: ${dlNumber}`, currentY, false);
    currentY = drawAddressLine(`GSTIN/UIN: ${gstNumber}`, currentY, false);

    // Right section - Invoice details table
    // Draw main border for right section (same height as left section = 140)
    doc.rect(rightX, y, rightSectionWidth, headerHeight).stroke();

    // Split right section into 2 columns
    const rightCol1Width = rightSectionWidth * 0.5;
    const rightCol2Width = rightSectionWidth * 0.5;

    // Row height
    const cellRowHeight = 28;
    let rowY = y;

    // Helper function to draw a cell with label on top and value below with proper spacing
    const drawInvoiceCell = (label, value, cellX, cellY, cellWidth) => {
      doc.rect(cellX, cellY, cellWidth, cellRowHeight).stroke();
      
      // Label with small top margin
      doc.fontSize(12).font(getFont(true)).text(label, cellX + 4, cellY + 2, { width: cellWidth - 8 });
      // Value with margin from label
      doc.fontSize(12).font(getFont()).text(value || '', cellX + 4, cellY + 14, { width: cellWidth - 8 });
    };

    // Row 1: Invoice No. | Dated
    drawInvoiceCell('Invoice No.', inquiry.inquiryNumber, rightX, rowY, rightCol1Width);
    drawInvoiceCell('Dated', new Date(inquiry.inquiryDate).toLocaleDateString('en-IN'), rightX + rightCol1Width, rowY, rightCol2Width);
    rowY += cellRowHeight;

    // Row 2: Delivery Note | Case Number
    drawInvoiceCell('Delivery Note', '', rightX, rowY, rightCol1Width);
    drawInvoiceCell('Case Number', '', rightX + rightCol1Width, rowY, rightCol2Width);
    rowY += cellRowHeight;

    // Row 3: Reference No. & Date | Other References
    drawInvoiceCell('Reference No. & Date', '', rightX, rowY, rightCol1Width);
    drawInvoiceCell('Other References', '', rightX + rightCol1Width, rowY, rightCol2Width);
    rowY += cellRowHeight;

    // Row 4: Dispatch Doc. No. | Delivery Note Date
    drawInvoiceCell('Dispatch Doc. No.', '', rightX, rowY, rightCol1Width);
    drawInvoiceCell('Delivery Note Date', '', rightX + rightCol1Width, rowY, rightCol2Width);
    rowY += cellRowHeight;

    // Row 5: Dispatch Through | Destination
    drawInvoiceCell('Dispatch Through', '', rightX, rowY, rightCol1Width);
    drawInvoiceCell('Destination', '', rightX + rightCol1Width, rowY, rightCol2Width);

    y += headerHeight;

    // ===== BUYER SECTION =====
    // Calculate dynamic height based on address length
    doc.fontSize(12).font(getFont());
    const fullAddress = inquiry.hospital?.address || '';
    const addressHeight = doc.heightOfString(fullAddress, { width: pageWidth - 20 });
    const buyerSectionHeight = Math.max(60, addressHeight + 40); // Min 60px, or content + 40px padding
    
    doc.rect(margin, y, pageWidth, buyerSectionHeight).stroke();

    doc.fontSize(12).font(getFont(true)).text('Buyer (Bill to)', margin + 5, y + 5);
    doc.fontSize(12).font(getFont(true)).text(inquiry.hospital?.legalName || inquiry.hospital?.shortName || '', margin + 5, y + 18);
    
    doc.fontSize(12).font(getFont());
    doc.text(fullAddress, margin + 5, y + 32, { width: pageWidth - 10 });

    // ===== ITEMS TABLE - No gap, continuous from buyer section =====
    y += buyerSectionHeight;

    // Column positions - Optimized spacing for 9 columns
    const colSl = margin;
    const colSlWidth = 35;
    
    const colProduct = colSl + colSlWidth;
    const colProductWidth = 70;
    
    const colDesc = colProduct + colProductWidth;
    const colDescWidth = 130;
    
    const colHSN = colDesc + colDescWidth;
    const colHSNWidth = 65;
    
    const colQty = colHSN + colHSNWidth;
    const colQtyWidth = 40;
    
    const colPrice = colQty + colQtyWidth;
    const colPriceWidth = 70;
    
    const colUnit = colPrice + colPriceWidth;
    const colUnitWidth = 35;
    
    const colDisc = colUnit + colUnitWidth;
    const colDiscWidth = 50;
    
    const colAmount = colDisc + colDiscWidth;
    const colAmountWidth = 66;

    const rowHeight = 16; // Tighter row height
    const fixedItemRows = 12; // Always 12 rows for items

    // Helper function to draw vertical grid lines
    const drawTableGridLines = (startY, numRows, includeHeader = false) => {
      const totalHeight = numRows * rowHeight;
      
      // Left border (left side of Sl No)
      doc.moveTo(margin, startY).lineTo(margin, startY + totalHeight).stroke();
      
      // Vertical lines between columns
      doc.moveTo(colProduct, startY).lineTo(colProduct, startY + totalHeight).stroke();
      doc.moveTo(colDesc, startY).lineTo(colDesc, startY + totalHeight).stroke();
      doc.moveTo(colHSN, startY).lineTo(colHSN, startY + totalHeight).stroke();
      doc.moveTo(colQty, startY).lineTo(colQty, startY + totalHeight).stroke();
      doc.moveTo(colPrice, startY).lineTo(colPrice, startY + totalHeight).stroke();
      doc.moveTo(colUnit, startY).lineTo(colUnit, startY + totalHeight).stroke();
      doc.moveTo(colDisc, startY).lineTo(colDisc, startY + totalHeight).stroke();
      doc.moveTo(colAmount, startY).lineTo(colAmount, startY + totalHeight).stroke();
      
      // Right border (right side of Amount)
      doc.moveTo(margin + pageWidth, startY).lineTo(margin + pageWidth, startY + totalHeight).stroke();
      
      // Top border
      doc.moveTo(margin, startY).lineTo(margin + pageWidth, startY).stroke();
      // Bottom border
      doc.moveTo(margin, startY + totalHeight).lineTo(margin + pageWidth, startY + totalHeight).stroke();
    };

    // Header row with full borders
    const headerY = y;
    drawTableGridLines(headerY, 1, true);
    
    doc.fontSize(11).font(getFont(true));
    doc.text('Sl No.', colSl + 2, headerY + 2, { width: colSlWidth - 4 });
    doc.text('Product', colProduct + 2, headerY + 2, { width: colProductWidth - 4 });
    doc.text('Description of Goods', colDesc + 2, headerY + 2, { width: colDescWidth - 4 });
    doc.text('HSN/SAC', colHSN, headerY + 2, { width: colHSNWidth, align: 'center' });
    doc.text('Qty', colQty + 2, headerY + 2, { width: colQtyWidth - 4, align: 'center' });
    doc.text('Unit Price', colPrice + 2, headerY + 2, { width: colPriceWidth - 4, align: 'right' });
    doc.text('Unit', colUnit + 2, headerY + 2, { width: colUnitWidth - 4, align: 'center' });
    doc.text('Disc. %', colDisc + 2, headerY + 2, { width: colDiscWidth - 4, align: 'right' });
    doc.text('Amount', colAmount, headerY + 2, { width: colAmountWidth, align: 'right' });

    // Data rows - Fixed 12 rows with only vertical separators
    let itemsStartY = headerY + rowHeight;
    
    let totalAmount = 0;
    let totalQty = 0;
    let rowCount = 0;
    let totalCGST = 0;
    let totalSGST = 0;
    let totalIGST = 0;

    if (inquiry.items && inquiry.items.length > 0) {
      inquiry.items.forEach((item, index) => {
        if (rowCount < fixedItemRows) {
          const rowY = itemsStartY + (rowCount * rowHeight);

          // Amount should be BEFORE GST (totalAmount includes GST, so subtract gstAmount)
          const totalAmountWithGST = parseFloat(item.totalAmount || 0);
          const gstAmount = parseFloat(item.gstAmount || 0);
          const amount = totalAmountWithGST - gstAmount;  // Amount before GST
          const rate = parseFloat(item.unitRate || 0);
          const qty = parseFloat(item.quantity || 0);
          const disc = parseFloat(item.discountPercentage || 0);
          const cgstAmt = parseFloat(item.cgstAmount || 0);
          const sgstAmt = parseFloat(item.sgstAmount || 0);
          const igstAmt = parseFloat(item.igstAmount || 0);
          
          // Debug logging for first item
          if (index === 0) {
            console.log('PDF Item Tax Breakdown:', {
              cgstAmount: item.cgstAmount,
              sgstAmount: item.sgstAmount,
              igstAmount: item.igstAmount,
              gstAmount: item.gstAmount,
              totalAmount: item.totalAmount,
              allFields: Object.keys(item.toObject ? item.toObject() : item)
            });
          }

          doc.fontSize(11).font(getFont());
          doc.text((index + 1).toString(), colSl + 2, rowY + 2, { width: colSlWidth - 4 });
          doc.text(item.materialNumber || '', colProduct + 2, rowY + 2, { width: colProductWidth - 4 });
          doc.text(item.description || 'Implant', colDesc + 2, rowY + 2, { width: colDescWidth - 4 });
          doc.text(item.hsnCode || '', colHSN, rowY + 2, { width: colHSNWidth, align: 'center' });
          doc.text(qty.toFixed(0), colQty + 2, rowY + 2, { width: colQtyWidth - 4, align: 'center' });
          doc.text('₹ ' + rate.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), colPrice + 2, rowY + 2, { width: colPriceWidth - 4, align: 'right' });
          doc.text('NOS', colUnit + 2, rowY + 2, { width: colUnitWidth - 4, align: 'center' });
          doc.text(disc.toFixed(2) + '%', colDisc + 2, rowY + 2, { width: colDiscWidth - 4, align: 'right' });
          doc.text('₹ ' + amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), colAmount, rowY + 2, { width: colAmountWidth, align: 'right' });

          totalAmount += amount;     // Sum of amounts BEFORE GST
          totalCGST += cgstAmt;      // Sum all CGST amounts from items
          totalSGST += sgstAmt;      // Sum all SGST amounts from items
          totalIGST += igstAmt;      // Sum all IGST amounts from items
          totalQty += qty;
          rowCount++;
        }
      });
    }

    // Draw vertical lines for all 15 item rows (even if not all filled)
    drawTableGridLines(itemsStartY, fixedItemRows, false);

    // Tax amounts are already calculated from items
    const cgstAmount = Math.round(totalCGST * 100) / 100;
    const sgstAmount = Math.round(totalSGST * 100) / 100;
    let igstAmount = Math.round(totalIGST * 100) / 100;
    const roundingAmount = 0; // Can be calculated if needed
    
    console.log('DEBUG: Tax Totals from items:', {
      totalCGST,
      totalSGST,
      totalIGST,
      cgstAmount,
      sgstAmount,
      igstAmount
    });
    
    // Detect tax type: IGST or CGST/SGST
    // IGST is used when: igstAmount > 0, OR when total tax > 0 but both CGST and SGST are 0
    const totalTax = cgstAmount + sgstAmount + igstAmount;
    const isIGST = igstAmount > 0 || (totalTax > 0 && cgstAmount === 0 && sgstAmount === 0);
    
    console.log('DEBUG: IGST Detection:', {
      totalTax,
      isIGST,
      'igstAmount > 0': igstAmount > 0,
      'totalTax > 0 && cgst === 0 && sgst === 0': totalTax > 0 && cgstAmount === 0 && sgstAmount === 0
    });
    
    // If IGST is detected but igstAmount is 0, calculate it from total tax
    if (isIGST && igstAmount === 0 && totalTax > 0) {
      console.log('DEBUG: Fallback calculation - setting igstAmount to', totalTax);
      igstAmount = totalTax;
    }
    
    // Calculate total with appropriate tax
    let totalWithTax;
    if (isIGST) {
      totalWithTax = totalAmount + igstAmount + roundingAmount;
    } else {
      totalWithTax = totalAmount + cgstAmount + sgstAmount + roundingAmount;
    }

    // Row 16: Subtotal - Border from Sl No to Amount column (full row width)
    let subtotalY = itemsStartY + (fixedItemRows * rowHeight);
    doc.fontSize(11).font(getFont());
    
    // Draw borders: left (from margin), right (to end of Amount), top and bottom spans full width
    doc.moveTo(margin, subtotalY).lineTo(margin + pageWidth, subtotalY).stroke(); // Top border
    doc.moveTo(margin, subtotalY + rowHeight).lineTo(margin + pageWidth, subtotalY + rowHeight).stroke(); // Bottom border
    
    // Left border (at Sl No column)
    doc.moveTo(margin, subtotalY).lineTo(margin, subtotalY + rowHeight).stroke();
    
    // Right border (at end of Amount column)
    doc.moveTo(margin + pageWidth, subtotalY).lineTo(margin + pageWidth, subtotalY + rowHeight).stroke();
    
    doc.text('₹ ' + totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), colAmount, subtotalY + 2, { width: colAmountWidth, align: 'right' });

    // Rows 17+: Tax rows (dynamic based on IGST or CGST/SGST) + Rounding - FULL grid like items rows
    let taxY = subtotalY + rowHeight;
    
    // Determine tax row count: 
    // - If IGST: 2 rows (IGST + Rounding)
    // - If CGST/SGST: 3 rows (CGST + SGST + Rounding)
    const taxRowCount = isIGST ? 2 : 3;
    
    // Draw full grid for tax rows (same as items rows)
    drawTableGridLines(taxY, taxRowCount, false);
    
    doc.fontSize(11).font(getFont());
    
    if (isIGST) {
      // IGST Row
      doc.text('IGST @ 5 %', colDesc + 2, taxY + 2, { width: colDescWidth - 4 });
      doc.text('₹ ' + igstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), colAmount, taxY + 2, { width: colAmountWidth, align: 'right' });
    } else {
      // CGST Row
      doc.text('CGST @ 2.5 %', colDesc + 2, taxY + 2, { width: colDescWidth - 4 });
      doc.text('₹ ' + cgstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), colAmount, taxY + 2, { width: colAmountWidth, align: 'right' });
      
      // SGST Row
      taxY += rowHeight;
      doc.text('SGST/UTGST @ 2.5 %', colDesc + 2, taxY + 2, { width: colDescWidth - 4 });
      doc.text('₹ ' + sgstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), colAmount, taxY + 2, { width: colAmountWidth, align: 'right' });
    }

    // Rounding Row (always last)
    taxY += rowHeight;
    doc.text('Rounding', colDesc + 2, taxY + 2, { width: colDescWidth - 4 });
    doc.text('₹ ' + roundingAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), colAmount, taxY + 2, { width: colAmountWidth, align: 'right' });

    // Row 20: Total - FULL grid with all columns
    taxY += rowHeight;
    
    // Draw full grid for Total row
    const totalRowStartY = taxY;
    const totalRowHeight = rowHeight;
    
    // Left border
    doc.moveTo(margin, totalRowStartY).lineTo(margin, totalRowStartY + totalRowHeight).stroke();
    
    // Vertical lines between columns
    doc.moveTo(colProduct, totalRowStartY).lineTo(colProduct, totalRowStartY + totalRowHeight).stroke();
    doc.moveTo(colDesc, totalRowStartY).lineTo(colDesc, totalRowStartY + totalRowHeight).stroke();
    doc.moveTo(colHSN, totalRowStartY).lineTo(colHSN, totalRowStartY + totalRowHeight).stroke();
    doc.moveTo(colQty, totalRowStartY).lineTo(colQty, totalRowStartY + totalRowHeight).stroke();
    doc.moveTo(colPrice, totalRowStartY).lineTo(colPrice, totalRowStartY + totalRowHeight).stroke();
    doc.moveTo(colUnit, totalRowStartY).lineTo(colUnit, totalRowStartY + totalRowHeight).stroke();
    doc.moveTo(colDisc, totalRowStartY).lineTo(colDisc, totalRowStartY + totalRowHeight).stroke();
    doc.moveTo(colAmount, totalRowStartY).lineTo(colAmount, totalRowStartY + totalRowHeight).stroke();
    
    // Right border
    doc.moveTo(margin + pageWidth, totalRowStartY).lineTo(margin + pageWidth, totalRowStartY + totalRowHeight).stroke();
    
    // Top border
    doc.moveTo(margin, totalRowStartY).lineTo(margin + pageWidth, totalRowStartY).stroke();
    // Bottom border
    doc.moveTo(margin, totalRowStartY + totalRowHeight).lineTo(margin + pageWidth, totalRowStartY + totalRowHeight).stroke();
    
    // Total Row content
    doc.fontSize(11).font(getFont(true));
    doc.text('Total', colDesc + 2, totalRowStartY + 2, { width: colDescWidth - 4 });
    doc.text(totalQty.toFixed(0), colQty + 2, totalRowStartY + 2, { width: colQtyWidth - 4, align: 'center' });
    doc.text('NOS', colUnit + 2, totalRowStartY + 2, { width: colUnitWidth - 4, align: 'center' });
    doc.text('₹ ' + totalWithTax.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), colAmount, totalRowStartY + 2, { width: colAmountWidth, align: 'right' });

    // Position y after total row - NO gap, start immediately
    y = totalRowStartY + totalRowHeight;

    // ===== AMOUNT IN WORDS (WITH BORDER) =====
    const amountInWordsY = y;
    const amountInWordsHeight = 20;
    
    // Draw border around Amount in words section (like company details, buyer details)
    doc.rect(margin, amountInWordsY, pageWidth, amountInWordsHeight).stroke();
    
    // Split text: bold label + normal amount
    doc.fontSize(12).font(getFont(true));
    doc.text('Amount Chargeable (in words): ', margin + 5, amountInWordsY + 3, { continued: true });
    doc.fontSize(12).font(getFont());
    doc.text(numberToWords(Math.floor(totalWithTax)) + ' Rupees Only', { width: pageWidth - 60, align: 'left' });

    // ===== TAX BREAKDOWN TABLE (NO gap, start immediately after) =====
    y = amountInWordsY + amountInWordsHeight;
    
    if (isIGST) {
      // IGST mode: 3 columns
      const taxTableColWidth = pageWidth / 3;

      // Row 1 - Headers
      doc.rect(margin, y, taxTableColWidth, 15).stroke();
      doc.rect(margin + taxTableColWidth, y, taxTableColWidth, 15).stroke();
      doc.rect(margin + taxTableColWidth * 2, y, taxTableColWidth, 15).stroke();

      doc.fontSize(12).font(getFont(true));
      doc.text('Taxable Value', margin + 5, y + 2, { height: 15 });
      doc.text('IGST (₹)', margin + taxTableColWidth + 5, y + 2, { height: 15 });
      doc.text('Total Amount (₹)', margin + taxTableColWidth * 2 + 5, y + 2, { height: 15 });

      // Row 2 - Values
      y += 15;
      doc.rect(margin, y, taxTableColWidth, 15).stroke();
      doc.rect(margin + taxTableColWidth, y, taxTableColWidth, 15).stroke();
      doc.rect(margin + taxTableColWidth * 2, y, taxTableColWidth, 15).stroke();

      doc.fontSize(12).font(getFont());
      doc.text(totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), margin + 5, y + 2, { width: taxTableColWidth - 10, height: 15, align: 'right' });
      doc.text(igstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), margin + taxTableColWidth + 5, y + 2, { width: taxTableColWidth - 10, height: 15, align: 'right' });
      doc.text(totalWithTax.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), margin + taxTableColWidth * 2 + 5, y + 2, { width: taxTableColWidth - 10, height: 15, align: 'right' });
    } else {
      // CGST/SGST mode: 4 columns
      const taxTableColWidth = pageWidth / 4;

      // Row 1 - Headers
      doc.rect(margin, y, taxTableColWidth, 15).stroke();
      doc.rect(margin + taxTableColWidth, y, taxTableColWidth, 15).stroke();
      doc.rect(margin + taxTableColWidth * 2, y, taxTableColWidth, 15).stroke();
      doc.rect(margin + taxTableColWidth * 3, y, taxTableColWidth, 15).stroke();

      doc.fontSize(12).font(getFont(true));
      doc.text('Taxable Value', margin + 5, y + 2, { height: 15 });
      doc.text('CGST (₹)', margin + taxTableColWidth + 5, y + 2, { height: 15 });
      doc.text('SGST/UTGST (₹)', margin + taxTableColWidth * 2 + 5, y + 2, { height: 15 });
      doc.text('Total Amount (₹)', margin + taxTableColWidth * 3 + 5, y + 2, { height: 15 });

      // Row 2 - Values
      y += 15;
      doc.rect(margin, y, taxTableColWidth, 15).stroke();
      doc.rect(margin + taxTableColWidth, y, taxTableColWidth, 15).stroke();
      doc.rect(margin + taxTableColWidth * 2, y, taxTableColWidth, 15).stroke();
      doc.rect(margin + taxTableColWidth * 3, y, taxTableColWidth, 15).stroke();

      doc.fontSize(12).font(getFont());
      doc.text(totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), margin + 5, y + 2, { width: taxTableColWidth - 10, height: 15, align: 'right' });
      doc.text(cgstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), margin + taxTableColWidth + 5, y + 2, { width: taxTableColWidth - 10, height: 15, align: 'right' });
      doc.text(sgstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), margin + taxTableColWidth * 2 + 5, y + 2, { width: taxTableColWidth - 10, height: 15, align: 'right' });
      doc.text(totalWithTax.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), margin + taxTableColWidth * 3 + 5, y + 2, { width: taxTableColWidth - 10, height: 15, align: 'right' });
    }

    // ===== TAX AMOUNT IN WORDS (WITH BORDER & BOLD) =====
    // (Row 3 of tax table removed - redundant total row)
    y += 15;
    const taxAmountInWordsY = y;
    const taxAmountInWordsHeight = 20;
    
    // Draw border around Tax amount in words section
    doc.rect(margin, taxAmountInWordsY, pageWidth, taxAmountInWordsHeight).stroke();
    
    // Calculate total tax amount for display
    const totalTaxAmount = isIGST ? igstAmount : (cgstAmount + sgstAmount);
    
    // Split text: bold label + normal amount
    doc.fontSize(12).font(getFont(true));
    doc.text('Tax Amount (in words): ', margin + 5, taxAmountInWordsY + 3, { continued: true });
    doc.fontSize(12).font(getFont());
    doc.text(numberToWords(Math.floor(totalTaxAmount)) + ' Rupees Only', { width: pageWidth - 60, align: 'left' });

    // ===== REMARKS SECTION (WITH TABLE STRUCTURE) =====
    y = taxAmountInWordsY + taxAmountInWordsHeight;
    const remarksStartY = y;
    const remarksHeight = 115; // Increased height to accommodate declaration text

    // Draw border around Remarks section
    doc.rect(margin, remarksStartY, pageWidth, remarksHeight).stroke();
    
    // Remarks heading - Bold
    doc.fontSize(12).font(getFont(true));
    doc.text('Remarks', margin + 5, remarksStartY + 5);
    
    // Table structure with 3 columns
    const col1Start = margin + 5;
    const col2Start = margin + 140;
    const col3Start = margin + 155;
    
    doc.fontSize(11).font(getFont());
    let tableY = remarksStartY + 22;
    const tableRowHeight = 13;
    
    // Row 1: Patient Name
    doc.text('Patient Name', col1Start, tableY);
    doc.text(':', col2Start, tableY);
    doc.text(inquiry.patientName || '', col3Start, tableY, { width: pageWidth - col3Start - 5 });
    tableY += tableRowHeight;
    
    // Row 2: Surgeon Name
    doc.text('Surgeon Name', col1Start, tableY);
    doc.text(':', col2Start, tableY);
    doc.text(`Dr ${inquiry.patientName || ''}`, col3Start, tableY, { width: pageWidth - col3Start - 5 });
    tableY += tableRowHeight;
    
    // Row 3: Patient IP No
    doc.text('Patient IP No.', col1Start, tableY);
    doc.text(':', col2Start, tableY);
    doc.text(inquiry.patientUHID || '', col3Start, tableY, { width: pageWidth - col3Start - 5 });
    tableY += tableRowHeight;
    
    // Row 4: Date of Surgery (NO bottom border line, declaration will be at bottom)
    doc.text('Date of Surgery', col1Start, tableY);
    doc.text(':', col2Start, tableY);
    doc.text(new Date(inquiry.inquiryDate).toLocaleDateString('en-IN'), col3Start, tableY, { width: pageWidth - col3Start - 5 });
    tableY += tableRowHeight;
    
    // Declaration - Bold label on same line as text, wraps to next line
    doc.fontSize(11).font(getFont(true));
    doc.text('Declaration:', col1Start, tableY, { continued: true });
    doc.fontSize(11).font(getFont());
    doc.text(' We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.', { width: pageWidth - col1Start - 10, align: 'left' });

    // ===== SIGNATURE SECTION (TWO COLUMN LAYOUT WITH BORDERS) =====
    y = remarksStartY + remarksHeight; // No gap, start immediately
    const signatureSectionHeight = 80; // Increased height
    const midLine = margin + pageWidth / 2;
    
    // Draw vertical divider in middle
    doc.moveTo(midLine, y).lineTo(midLine, y + signatureSectionHeight).stroke();
    
    // Left column border (left, top, bottom)
    doc.moveTo(margin, y).lineTo(margin, y + signatureSectionHeight).stroke(); // Left
    doc.moveTo(margin, y).lineTo(midLine, y).stroke(); // Top
    doc.moveTo(margin, y + signatureSectionHeight).lineTo(midLine, y + signatureSectionHeight).stroke(); // Bottom
    
    // Right column border (right, top, bottom)
    doc.moveTo(midLine + 0.5, y).lineTo(margin + pageWidth, y).stroke(); // Top
    doc.moveTo(margin + pageWidth, y).lineTo(margin + pageWidth, y + signatureSectionHeight).stroke(); // Right
    doc.moveTo(midLine + 0.5, y + signatureSectionHeight).lineTo(margin + pageWidth, y + signatureSectionHeight).stroke(); // Bottom
    
    // Left column: Label at BOTTOM
    doc.fontSize(11).font(getFont());
    doc.text("Receiver's Signature & Stamp", margin + 5, y + signatureSectionHeight - 15, { width: pageWidth / 2 - 10, align: 'center' });
    
    // Right column: "For SS Agency" at TOP (NO underline, just text)
    doc.text(`For ${companyName}`, midLine + 5, y + 8, { width: pageWidth / 2 - 10, align: 'center' });
    
    // Right column: Label at BOTTOM
    doc.text('Authorized Signatory', midLine + 5, y + signatureSectionHeight - 15, { width: pageWidth / 2 - 10, align: 'center' });

    // Finalize PDF
    doc.end();
  } catch (error) {
    console.error('Error generating PDF:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating PDF',
      error: error.message
    });
  }
});

// Helper function to convert number to words
function numberToWords(num) {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const scales = ['', 'Thousand', 'Lakh', 'Crore'];

  if (num === 0) return 'Zero';

  let parts = [];
  let scaleIndex = 0;

  while (num > 0) {
    let part = num % (scaleIndex === 0 ? 1000 : 100);
    if (part !== 0) {
      let partStr = '';
      let hundreds = Math.floor(part / 100);
      let remainder = part % 100;

      if (hundreds > 0) {
        partStr += ones[hundreds] + ' Hundred ';
      }

      if (remainder >= 20) {
        partStr += tens[Math.floor(remainder / 10)] + ' ';
        if (remainder % 10 > 0) {
          partStr += ones[remainder % 10] + ' ';
        }
      } else if (remainder >= 10) {
        partStr += teens[remainder - 10] + ' ';
      } else if (remainder > 0) {
        partStr += ones[remainder] + ' ';
      }

      if (scales[scaleIndex]) {
        partStr += scales[scaleIndex] + ' ';
      }

      parts.unshift(partStr);
    }

    num = Math.floor(num / (scaleIndex === 0 ? 1000 : 100));
    scaleIndex++;
  }

  return parts.join('').trim();
}

module.exports = router;
