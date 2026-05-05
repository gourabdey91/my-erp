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
const NumberRange = require('../models/NumberRange');

// Helper to log to both console and file
const logBoth = (msg) => {
  console.log(msg);
  const timestamp = new Date().toISOString();
  fs.appendFileSync(path.join(__dirname, '../pdf-debug.log'), `${timestamp}: ${msg}\n`);
};

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

// Generate PDF for inquiry - MOVED HERE to match before /:id route
router.get('/:id/pdf', async (req, res) => {
  logBoth('\n\n' + '='.repeat(50));
  logBoth('🔴🔴🔴 PDF ENDPOINT HIT! Inquiry ID: ' + req.params.id);
  logBoth('='.repeat(50));
  
  const { docType = 'Estimation' } = req.query;
  try {
    console.log('Starting PDF generation for:', req.params.id);
    
    // Fetch inquiry with hospital (including businessUnit)
    const inquiry = await Inquiry.findById(req.params.id)
      .populate({
        path: 'hospital',
        select: 'shortName legalName code address city stateCode businessUnit',
        populate: {
          path: 'businessUnit',
          select: '_id name code'
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
      .populate('createdBy', 'name email')
      .populate('surgeon', 'name email');

    if (!inquiry) {
      console.error('Inquiry not found:', req.params.id);
      return res.status(404).json({
        success: false,
        message: 'Inquiry not found'
      });
    }

    console.log('DIAGNOSTIC: ✓ Inquiry fetched successfully');
    console.log('DIAGNOSTIC: inquiry.items length?', inquiry.items ? inquiry.items.length : 'UNDEFINED');
    console.log('DIAGNOSTIC: inquiry.hospital.stateCode?', inquiry.hospital?.stateCode);
    console.log('DIAGNOSTIC: inquiry.hospital.businessUnit?', inquiry.hospital?.businessUnit);

    // Get hospital state code
    const hospitalStateCode = inquiry.hospital?.stateCode || '';
    let companyStateCode = '';
    let companyDetails = null;

    // Fetch company details using hospital's businessUnit
    console.log('\n========== FETCHING COMPANY DETAILS ==========');
    
    const businessUnitId = inquiry.hospital?.businessUnit?._id || inquiry.hospital?.businessUnit;
    console.log('Business Unit ID:', businessUnitId);
    
    if (businessUnitId) {
      try {
        companyDetails = await CompanyDetails.findOne({
          businessUnit: businessUnitId,
          isActive: true
        });
        
        if (companyDetails) {
          companyStateCode = companyDetails.compliance?.stateCode || '';
          console.log('✓ Company Details found for Business Unit:', businessUnitId);
          console.log('Company State Code:', companyStateCode);
          console.log('Company Code:', companyDetails.companyCode);
          console.log('Company Name:', companyDetails.companyName);
        } else {
          console.log('⚠ No Company Details found for Business Unit:', businessUnitId);
        }
      } catch (error) {
        console.log('Error fetching company details:', error.message);
      }
    } else {
      console.log('⚠ No Business Unit found in Hospital');
    }

    // If no company details found, try to get any active company
    if (!companyDetails) {
      try {
        companyDetails = await CompanyDetails.findOne({ isActive: true });
        if (companyDetails) {
          companyStateCode = companyDetails.compliance?.stateCode || '';
          console.log('✓ Fallback: Using any active Company Details');
          console.log('Company State Code:', companyStateCode);
        }
      } catch (error) {
        console.log('Error fetching fallback company details:', error.message);
      }
    }

    // Use default if still no company details
    if (!companyDetails) {
      console.error('No company details found. Using default values.');
      companyDetails = {
        companyName: 'SS AGENCY',
        companyCode: 'SS-001',
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
      companyStateCode = '21';
    }

    // Calculate IGST/CGST+SGST based on state codes
    if (inquiry.items && inquiry.items.length > 0) {
      console.log('\n========== GST CALCULATION ==========');
      console.log('Hospital State:', hospitalStateCode);
      console.log('Company State:', companyStateCode);
      
      const isSameState = hospitalStateCode === companyStateCode && hospitalStateCode !== '';
      console.log('Same State?', isSameState);
      console.log('Processing', inquiry.items.length, 'items');
      
      inquiry.items.forEach((item, idx) => {
        let gstAmount = item.gstAmount || 0;
        
        // Calculate GST amount if not provided
        if (gstAmount === 0 && item.totalAmount > 0) {
          const baseAmount = item.unitRate * item.quantity;
          const discountAmount = item.discountAmount || ((baseAmount * item.discountPercentage) / 100);
          const amountBeforeGST = baseAmount - discountAmount;
          gstAmount = item.totalAmount - amountBeforeGST;
        }
        
        // Recalculate taxes only if we have valid state codes
        if (gstAmount > 0 && hospitalStateCode !== '' && companyStateCode !== '') {
          if (isSameState) {
            // Same state: CGST + SGST
            item.cgstAmount = Math.round((gstAmount * 0.5) * 100) / 100;
            item.sgstAmount = Math.round((gstAmount * 0.5) * 100) / 100;
            item.igstAmount = 0;
            console.log(`Item ${idx + 1}: Same State - CGST: ${item.cgstAmount}, SGST: ${item.sgstAmount}`);
          } else {
            // Different state: IGST only
            item.cgstAmount = 0;
            item.sgstAmount = 0;
            item.igstAmount = gstAmount;
            console.log(`Item ${idx + 1}: Different State - IGST: ${item.igstAmount}`);
          }
        } else {
          console.log(`Item ${idx + 1}: Missing state codes or GST - preserving DB values`);
        }
      });
    }

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

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Inquiry_${inquiry.inquiryNumber}.pdf"`);
    doc.pipe(res);

    const margin = 12;
    const pageWidth = 576;
    let y = margin;

    let calibriAvailable = false;
    let calibriBoldAvailable = false;

    try {
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

    const getFont = (bold = false) => {
      if (bold) {
        return calibriBoldAvailable ? 'CaliBold' : 'Helvetica-Bold';
      }
      return calibriAvailable ? 'Calibri' : 'Helvetica';
    };

    doc.lineWidth(0.5);
    doc.rect(margin, y, pageWidth, 20).stroke();
    doc.fontSize(12).font(getFont(true)).text(docType, margin + 10, y + 3, { width: pageWidth - 20, align: 'center' });
    y += 20;

    const leftSectionWidth = pageWidth * 0.55;
    const rightSectionWidth = pageWidth * 0.45;
    const leftX = margin;
    const rightX = margin + leftSectionWidth;
    const headerHeight = 140;

    doc.rect(leftX, y, leftSectionWidth, headerHeight).stroke();

    const logoColumnWidth = 40;
    const logoSize = 30;
    const logoX = leftX + 5;
    const logoY = y + 5;

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
    }

    const addressColumnX = leftX + logoColumnWidth;
    const addressColumnWidth = leftSectionWidth - logoColumnWidth;
    const addressStartY = y + 3;

    doc.fontSize(12).font(getFont(true));
    
    const street = companyDetails?.address?.street || '43, 2nd Floor District Center, Chandrasekharpur';
    const city = companyDetails?.address?.city || 'Bhubaneswar';
    const state = companyDetails?.address?.state || 'Odisha';
    const pincode = companyDetails?.address?.pincode || '751016';
    const mobile1 = companyDetails?.contact?.mobile1 || '8790077225';
    const mobile2 = companyDetails?.contact?.mobile2 || '7606022509';
    const email = companyDetails?.contact?.email || 'crm.ss.agency@gmail.com';
    const dlNumber = companyDetails?.compliance?.dlNumber || 'MBJ-NZ-0013/W/MBJ-NZ-0014/WC/MBJ-NZ-0015/WX';
    const gstNumber = companyDetails?.compliance?.gstNumber || '21AAHPP9714G1ZR';
    const companyName = companyDetails?.companyName || 'SS AGENCY';

    const addressTextPadding = 4;
    const addressTextWidth = addressColumnWidth - (2 * addressTextPadding);
    const lineGap = -1;
    
    let currentY = addressStartY;

    const drawAddressLine = (text, currentY, bold = false) => {
      doc.fontSize(12).font(bold ? getFont(true) : getFont());
      const textHeight = doc.heightOfString(text, { width: addressTextWidth });
      doc.text(text, addressColumnX + addressTextPadding, currentY, { width: addressTextWidth });
      return currentY + textHeight + lineGap;
    };

    currentY = drawAddressLine(companyName, currentY, true);
    currentY = drawAddressLine(street, currentY, false);
    currentY = drawAddressLine(`${city}, ${state} - ${pincode}`, currentY, false);
    currentY = drawAddressLine(`Mob. ${mobile1}, ${mobile2}`, currentY, false);
    currentY = drawAddressLine(`Email-${email}`, currentY, false);
    currentY = drawAddressLine(`DL No.: ${dlNumber}`, currentY, false);
    currentY = drawAddressLine(`GSTIN/UIN: ${gstNumber}`, currentY, false);

    doc.rect(rightX, y, rightSectionWidth, headerHeight).stroke();

    const rightCol1Width = rightSectionWidth * 0.5;
    const rightCol2Width = rightSectionWidth * 0.5;
    const cellRowHeight = 28;
    let rowY = y;

    const drawInvoiceCell = (label, value, cellX, cellY, cellWidth) => {
      doc.rect(cellX, cellY, cellWidth, cellRowHeight).stroke();
      doc.fontSize(12).font(getFont(true)).text(label, cellX + 4, cellY + 2, { width: cellWidth - 8 });
      doc.fontSize(12).font(getFont()).text(value || '', cellX + 4, cellY + 14, { width: cellWidth - 8 });
    };

    drawInvoiceCell('Invoice No.', inquiry.inquiryNumber, rightX, rowY, rightCol1Width);
    drawInvoiceCell('Dated', new Date(inquiry.inquiryDate).toLocaleDateString('en-IN'), rightX + rightCol1Width, rowY, rightCol2Width);
    rowY += cellRowHeight;

    drawInvoiceCell('Delivery Note', '', rightX, rowY, rightCol1Width);
    drawInvoiceCell('Case Number', '', rightX + rightCol1Width, rowY, rightCol2Width);
    rowY += cellRowHeight;

    drawInvoiceCell('Reference No. & Date', '', rightX, rowY, rightCol1Width);
    drawInvoiceCell('Other References', '', rightX + rightCol1Width, rowY, rightCol2Width);
    rowY += cellRowHeight;

    drawInvoiceCell('Dispatch Doc. No.', '', rightX, rowY, rightCol1Width);
    drawInvoiceCell('Delivery Note Date', '', rightX + rightCol1Width, rowY, rightCol2Width);
    rowY += cellRowHeight;

    drawInvoiceCell('Dispatch Through', '', rightX, rowY, rightCol1Width);
    drawInvoiceCell('Destination', '', rightX + rightCol1Width, rowY, rightCol2Width);

    y += headerHeight;

    doc.fontSize(12).font(getFont());
    const fullAddress = inquiry.hospital?.address || '';
    const hospitalCountry = inquiry.hospital?.country || 'India'; // DEBUG: Adding country
    const addressWithCountry = fullAddress + (fullAddress ? ', ' : '') + hospitalCountry;
    const addressHeight = doc.heightOfString(addressWithCountry, { width: pageWidth - 20 });
    const buyerSectionHeight = Math.max(60, addressHeight + 40);
    
    doc.rect(margin, y, pageWidth, buyerSectionHeight).stroke();

    doc.fontSize(12).font(getFont(true)).text('Buyer (Bill to)', margin + 5, y + 5);
    doc.fontSize(12).font(getFont(true)).text(inquiry.hospital?.legalName || inquiry.hospital?.shortName || '', margin + 5, y + 18);
    
    doc.fontSize(12).font(getFont());
    doc.text(addressWithCountry, margin + 5, y + 32, { width: pageWidth - 10 });
    logBoth('🏢 HOSPITAL: ' + inquiry.hospital?.shortName + ', COUNTRY: ' + hospitalCountry);

    y += buyerSectionHeight;

    const colSl = margin;
    const colSlWidth = 35;
    const colProduct = colSl + colSlWidth;
    const colProductWidth = 50;
    const colDesc = colProduct + colProductWidth;
    const colDescWidth = 180;
    const colHSN = colDesc + colDescWidth;
    const colHSNWidth = 45;
    const colQty = colHSN + colHSNWidth;
    const colQtyWidth = 30;
    const colPrice = colQty + colQtyWidth;
    const colPriceWidth = 70;
    const colUnit = colPrice + colPriceWidth;
    const colUnitWidth = 35;
    const colDisc = colUnit + colUnitWidth;
    const colDiscWidth = 40;
    const colAmount = colDisc + colDiscWidth;
    const colAmountWidth = 66;

    const rowHeight = 20;
    const taxRowHeight = 16;
    let fixedItemRows = 10;  // Default, will be recalculated below

    const drawTableGridLines = (startY, numRows, includeHeader = false) => {
      const totalHeight = numRows * rowHeight;
      
      doc.moveTo(margin, startY).lineTo(margin, startY + totalHeight).stroke();
      doc.moveTo(colProduct, startY).lineTo(colProduct, startY + totalHeight).stroke();
      doc.moveTo(colDesc, startY).lineTo(colDesc, startY + totalHeight).stroke();
      doc.moveTo(colHSN, startY).lineTo(colHSN, startY + totalHeight).stroke();
      doc.moveTo(colQty, startY).lineTo(colQty, startY + totalHeight).stroke();
      doc.moveTo(colPrice, startY).lineTo(colPrice, startY + totalHeight).stroke();
      doc.moveTo(colUnit, startY).lineTo(colUnit, startY + totalHeight).stroke();
      doc.moveTo(colDisc, startY).lineTo(colDisc, startY + totalHeight).stroke();
      doc.moveTo(colAmount, startY).lineTo(colAmount, startY + totalHeight).stroke();
      doc.moveTo(margin + pageWidth, startY).lineTo(margin + pageWidth, startY + totalHeight).stroke();
      doc.moveTo(margin, startY).lineTo(margin + pageWidth, startY).stroke();
      doc.moveTo(margin, startY + totalHeight).lineTo(margin + pageWidth, startY + totalHeight).stroke();
    };

    const drawTableGridLinesTax = (startY, numRows) => {
      const totalHeight = numRows * taxRowHeight;
      
      doc.moveTo(margin, startY).lineTo(margin, startY + totalHeight).stroke();
      doc.moveTo(colProduct, startY).lineTo(colProduct, startY + totalHeight).stroke();
      doc.moveTo(colDesc, startY).lineTo(colDesc, startY + totalHeight).stroke();
      doc.moveTo(colHSN, startY).lineTo(colHSN, startY + totalHeight).stroke();
      doc.moveTo(colQty, startY).lineTo(colQty, startY + totalHeight).stroke();
      doc.moveTo(colPrice, startY).lineTo(colPrice, startY + totalHeight).stroke();
      doc.moveTo(colUnit, startY).lineTo(colUnit, startY + totalHeight).stroke();
      doc.moveTo(colDisc, startY).lineTo(colDisc, startY + totalHeight).stroke();
      doc.moveTo(colAmount, startY).lineTo(colAmount, startY + totalHeight).stroke();
      doc.moveTo(margin + pageWidth, startY).lineTo(margin + pageWidth, startY + totalHeight).stroke();
      doc.moveTo(margin, startY).lineTo(margin + pageWidth, startY).stroke();
      doc.moveTo(margin, startY + totalHeight).lineTo(margin + pageWidth, startY + totalHeight).stroke();
    };

    const headerY = y;
    drawTableGridLines(headerY, 1, true);
    
    doc.fontSize(8).font(getFont(true));
    doc.text('Sl No.', colSl + 2, headerY + 3, { width: colSlWidth - 4 });
    doc.text('Product', colProduct + 2, headerY + 3, { width: colProductWidth - 4 });
    doc.text('Description of Goods', colDesc + 2, headerY + 3, { width: colDescWidth - 4 });
    doc.text('HSN/SAC', colHSN, headerY + 3, { width: colHSNWidth, align: 'center' });
    doc.text('Qty', colQty + 2, headerY + 3, { width: colQtyWidth - 4, align: 'center' });
    doc.text('Unit Price', colPrice + 2, headerY + 3, { width: colPriceWidth - 4, align: 'right' });
    doc.text('Unit', colUnit + 2, headerY + 3, { width: colUnitWidth - 4, align: 'center' });
    doc.text('Disc. %', colDisc + 2, headerY + 3, { width: colDiscWidth - 4, align: 'right' });
    doc.text('Amount', colAmount, headerY + 3, { width: colAmountWidth, align: 'right' });

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

          const totalAmountWithGST = parseFloat(item.totalAmount || 0);
          const gstAmount = parseFloat(item.gstAmount || 0);
          const amount = totalAmountWithGST - gstAmount;
          const rate = parseFloat(item.unitRate || 0);
          const qty = parseFloat(item.quantity || 0);
          const disc = parseFloat(item.discountPercentage || 0);
          const cgstAmt = parseFloat(item.cgstAmount || 0);
          const sgstAmt = parseFloat(item.sgstAmount || 0);
          const igstAmt = parseFloat(item.igstAmount || 0);
          
          if (index === 0) {
            console.log('PDF ITEMS LOOP - First item tax values:', {
              cgstAmt, sgstAmt, igstAmt, gstAmount, totalAmount: item.totalAmount
            });
          }

          doc.fontSize(8).font(getFont());
          doc.text((index + 1).toString(), colSl + 2, rowY + 4, { width: colSlWidth - 4 });
          doc.text(item.materialNumber || '', colProduct + 2, rowY + 4, { width: colProductWidth - 4 });
          doc.text(item.materialDescription || 'Implant', colDesc + 2, rowY + 4, { width: colDescWidth - 4 });
          doc.text(item.hsnCode || '', colHSN, rowY + 4, { width: colHSNWidth, align: 'center' });
          doc.text(qty.toFixed(0), colQty + 2, rowY + 4, { width: colQtyWidth - 4, align: 'center' });
          doc.text('₹ ' + rate.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), colPrice + 2, rowY + 4, { width: colPriceWidth - 4, align: 'right' });
          doc.text('NOS', colUnit + 2, rowY + 4, { width: colUnitWidth - 4, align: 'center' });
          doc.text(disc.toFixed(2) + '%', colDisc + 2, rowY + 4, { width: colDiscWidth - 4, align: 'right' });
          doc.text('₹ ' + amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), colAmount, rowY + 4, { width: colAmountWidth, align: 'right' });

          totalAmount += amount;
          totalCGST += cgstAmt;
          totalSGST += sgstAmt;
          totalIGST += igstAmt;
          totalQty += qty;
          rowCount++;
        }
      });
    }

    // Calculate actual item rows needed (don't show empty rows if we have few items)
    const actualItemCount = inquiry.items ? inquiry.items.length : 0;
    fixedItemRows = Math.max(Math.min(actualItemCount + 2, 10), 3);  // +2 for buffer, min 3, max 10

    drawTableGridLines(itemsStartY, fixedItemRows, false);
    
    console.log('DEBUG: ACCUMULATED TOTALS:', { totalCGST, totalSGST, totalIGST, totalAmount });

    const cgstAmount = Math.round(totalCGST * 100) / 100;
    const sgstAmount = Math.round(totalSGST * 100) / 100;
    let igstAmount = Math.round(totalIGST * 100) / 100;
    const roundingAmount = inquiry.rounding || 0;
    
    const totalTax = cgstAmount + sgstAmount + igstAmount;
    const isIGST = igstAmount > 0 || (totalTax > 0 && cgstAmount === 0 && sgstAmount === 0);
    
    console.log('\n========== TAX TYPE DETECTION ==========');
    console.log('CGST:', cgstAmount, 'SGST:', sgstAmount, 'IGST:', igstAmount);
    console.log('====> FINAL DECISION: isIGST =', isIGST);
    
    if (isIGST && igstAmount === 0 && totalTax > 0) {
      igstAmount = totalTax;
    }

    // Always add all taxes
    let totalWithTax = totalAmount + cgstAmount + sgstAmount + igstAmount + roundingAmount;
    logBoth('💰 TOTAL CALC: Amount=' + totalAmount + ' + CGST=' + cgstAmount + ' + SGST=' + sgstAmount + ' + IGST=' + igstAmount + ' = ' + totalWithTax);

    let subtotalY = itemsStartY + (fixedItemRows * rowHeight);
    doc.fontSize(8).font(getFont());
    
    doc.moveTo(margin, subtotalY).lineTo(margin + pageWidth, subtotalY).stroke();
    doc.moveTo(margin, subtotalY + taxRowHeight).lineTo(margin + pageWidth, subtotalY + taxRowHeight).stroke();
    doc.moveTo(margin, subtotalY).lineTo(margin, subtotalY + taxRowHeight).stroke();
    doc.moveTo(margin + pageWidth, subtotalY).lineTo(margin + pageWidth, subtotalY + taxRowHeight).stroke();
    
    doc.text('₹ ' + totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), colAmount, subtotalY + 2, { width: colAmountWidth, align: 'right' });

    let taxY = subtotalY + taxRowHeight;
    const taxRowCount = isIGST ? 3 : 4;  // Show 2 taxes (CGST+SGST or IGST) + Rounding + blank row for alignment
    
    drawTableGridLinesTax(taxY, taxRowCount);
    
    // CONDITIONAL TAX RENDERING - Show IGST or CGST/SGST based on location
    doc.fontSize(8).font(getFont());
    
    if (isIGST) {
      console.log('\n🟣 RENDERING IGST (Inter-state)');
      logBoth('🟣 RENDERING IGST - Amount: ' + igstAmount);
      
      doc.text('IGST @ 5 %', colDesc + 2, taxY + 2, { width: colDescWidth - 4 });
      doc.text('₹ ' + igstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), colAmount, taxY + 2, { width: colAmountWidth, align: 'right' });
      
      taxY += taxRowHeight;
    } else {
      console.log('\n🟢 RENDERING CGST & SGST (Same state)');
      logBoth('🟢 RENDERING CGST & SGST - CGST: ' + cgstAmount + ', SGST: ' + sgstAmount);
      
      doc.text('CGST @ 2.5 %', colDesc + 2, taxY + 2, { width: colDescWidth - 4 });
      doc.text('₹ ' + cgstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), colAmount, taxY + 2, { width: colAmountWidth, align: 'right' });
      
      taxY += taxRowHeight;
      doc.text('SGST/UTGST @ 2.5 %', colDesc + 2, taxY + 2, { width: colDescWidth - 4 });
      doc.text('₹ ' + sgstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), colAmount, taxY + 2, { width: colAmountWidth, align: 'right' });
      
      taxY += taxRowHeight;
    }

    doc.text('Rounding', colDesc + 2, taxY + 2, { width: colDescWidth - 4 });
    doc.text('₹ ' + roundingAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), colAmount, taxY + 2, { width: colAmountWidth, align: 'right' });

    taxY += taxRowHeight;
    
    const totalRowStartY = taxY;
    const totalRowHeight = taxRowHeight;
    
    doc.moveTo(margin, totalRowStartY).lineTo(margin, totalRowStartY + totalRowHeight).stroke();
    doc.moveTo(colProduct, totalRowStartY).lineTo(colProduct, totalRowStartY + totalRowHeight).stroke();
    doc.moveTo(colDesc, totalRowStartY).lineTo(colDesc, totalRowStartY + totalRowHeight).stroke();
    doc.moveTo(colHSN, totalRowStartY).lineTo(colHSN, totalRowStartY + totalRowHeight).stroke();
    doc.moveTo(colQty, totalRowStartY).lineTo(colQty, totalRowStartY + totalRowHeight).stroke();
    doc.moveTo(colPrice, totalRowStartY).lineTo(colPrice, totalRowStartY + totalRowHeight).stroke();
    doc.moveTo(colUnit, totalRowStartY).lineTo(colUnit, totalRowStartY + totalRowHeight).stroke();
    doc.moveTo(colDisc, totalRowStartY).lineTo(colDisc, totalRowStartY + totalRowHeight).stroke();
    doc.moveTo(colAmount, totalRowStartY).lineTo(colAmount, totalRowStartY + totalRowHeight).stroke();
    doc.moveTo(margin + pageWidth, totalRowStartY).lineTo(margin + pageWidth, totalRowStartY + totalRowHeight).stroke();
    doc.moveTo(margin, totalRowStartY).lineTo(margin + pageWidth, totalRowStartY).stroke();
    doc.moveTo(margin, totalRowStartY + totalRowHeight).lineTo(margin + pageWidth, totalRowStartY + totalRowHeight).stroke();
    
    doc.fontSize(8).font(getFont(true));
    doc.text('Total', colDesc + 2, totalRowStartY + 2, { width: colDescWidth - 4 });
    doc.text(totalQty.toFixed(0), colQty + 2, totalRowStartY + 2, { width: colQtyWidth - 4, align: 'center' });
    doc.text('NOS', colUnit + 2, totalRowStartY + 2, { width: colUnitWidth - 4, align: 'center' });
    doc.text('₹ ' + totalWithTax.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), colAmount, totalRowStartY + 2, { width: colAmountWidth, align: 'right' });

    y = totalRowStartY + totalRowHeight;

    const amountInWordsY = y;
    const amountInWordsHeight = 16;
    
    doc.rect(margin, amountInWordsY, pageWidth, amountInWordsHeight).stroke();
    
    doc.fontSize(9).font(getFont(true));
    doc.text('Amount Chargeable (in words): ', margin + 8, amountInWordsY + 4, { continued: true });
    doc.fontSize(9).font(getFont());
    // Include rounding in the words: ensure total includes rounding with paisa
    const finalChargeable = totalAmount + cgstAmount + sgstAmount + igstAmount + roundingAmount;
    doc.text(amountToWords(finalChargeable), { width: pageWidth - 70, align: 'left' });

    y = amountInWordsY + amountInWordsHeight;
    
    if (isIGST) {
      const taxTableColWidth = pageWidth / 3;

      doc.rect(margin, y, taxTableColWidth, 14).stroke();
      doc.rect(margin + taxTableColWidth, y, taxTableColWidth, 14).stroke();
      doc.rect(margin + taxTableColWidth * 2, y, taxTableColWidth, 14).stroke();

      doc.fontSize(9).font(getFont(true));
      doc.text('Taxable Value', margin + 8, y + 4, { height: 14 });
      doc.text('IGST (₹)', margin + taxTableColWidth + 8, y + 4, { height: 14 });
      doc.text('Total Tax (₹)', margin + taxTableColWidth * 2 + 8, y + 4, { height: 14 });

      y += 14;
      doc.rect(margin, y, taxTableColWidth, 14).stroke();
      doc.rect(margin + taxTableColWidth, y, taxTableColWidth, 14).stroke();
      doc.rect(margin + taxTableColWidth * 2, y, taxTableColWidth, 14).stroke();

      doc.fontSize(9).font(getFont());
      // Show: Taxable Value | IGST | Total Tax (sum of all taxes)
      const totalTaxIGST = igstAmount;
      doc.text(totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), margin + 8, y + 4, { width: taxTableColWidth - 12, height: 14, align: 'right' });
      doc.text(igstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), margin + taxTableColWidth + 8, y + 4, { width: taxTableColWidth - 12, height: 14, align: 'right' });
      doc.text(totalTaxIGST.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), margin + taxTableColWidth * 2 + 8, y + 4, { width: taxTableColWidth - 12, height: 14, align: 'right' });
    } else {
      const taxTableColWidth = pageWidth / 4;

      doc.rect(margin, y, taxTableColWidth, 14).stroke();
      doc.rect(margin + taxTableColWidth, y, taxTableColWidth, 14).stroke();
      doc.rect(margin + taxTableColWidth * 2, y, taxTableColWidth, 14).stroke();
      doc.rect(margin + taxTableColWidth * 3, y, taxTableColWidth, 14).stroke();

      doc.fontSize(9).font(getFont(true));
      doc.text('Taxable Value', margin + 8, y + 4, { height: 14 });
      doc.text('CGST (₹)', margin + taxTableColWidth + 8, y + 4, { height: 14 });
      doc.text('SGST/UTGST (₹)', margin + taxTableColWidth * 2 + 8, y + 4, { height: 14 });
      doc.text('Total Tax (₹)', margin + taxTableColWidth * 3 + 8, y + 4, { height: 14 });

      y += 14;
      doc.rect(margin, y, taxTableColWidth, 14).stroke();
      doc.rect(margin + taxTableColWidth, y, taxTableColWidth, 14).stroke();
      doc.rect(margin + taxTableColWidth * 2, y, taxTableColWidth, 14).stroke();
      doc.rect(margin + taxTableColWidth * 3, y, taxTableColWidth, 14).stroke();

      doc.fontSize(9).font(getFont());
      // Show: Taxable Value | CGST | SGST | Total Tax (CGST + SGST)
      const totalTaxCGSTSGST = cgstAmount + sgstAmount;
      doc.text(totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), margin + 8, y + 4, { width: taxTableColWidth - 12, height: 14, align: 'right' });
      doc.text(cgstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), margin + taxTableColWidth + 8, y + 4, { width: taxTableColWidth - 12, height: 14, align: 'right' });
      doc.text(sgstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), margin + taxTableColWidth * 2 + 8, y + 4, { width: taxTableColWidth - 12, height: 14, align: 'right' });
      doc.text(totalTaxCGSTSGST.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), margin + taxTableColWidth * 3 + 8, y + 4, { width: taxTableColWidth - 12, height: 14, align: 'right' });
    }

    y += 14;
    const taxAmountInWordsY = y;
    const taxAmountInWordsHeight = 16;
    
    doc.rect(margin, taxAmountInWordsY, pageWidth, taxAmountInWordsHeight).stroke();
    
    const totalTaxAmount = isIGST ? igstAmount : (cgstAmount + sgstAmount);
    
    doc.fontSize(9).font(getFont(true));
    doc.text('Tax Amount (in words): ', margin + 8, taxAmountInWordsY + 4, { continued: true });
    doc.fontSize(9).font(getFont());
    doc.text(amountToWords(totalTaxAmount), { width: pageWidth - 70, align: 'left' });

    y = taxAmountInWordsY + taxAmountInWordsHeight;
    const remarksStartY = y;
    const remarksHeight = 85;

    doc.rect(margin, remarksStartY, pageWidth, remarksHeight).stroke();
    
    doc.fontSize(10).font(getFont(true));
    doc.text('Remarks', margin + 8, remarksStartY + 4);
    
    const col1Start = margin + 8;
    const col2Start = margin + 148;
    const col3Start = margin + 163;
    
    doc.fontSize(9).font(getFont());
    let tableY = remarksStartY + 18;
    const tableRowHeight = 11;
    
    doc.text('Patient Name', col1Start, tableY);
    doc.text(':', col2Start, tableY);
    doc.text(inquiry.patientName || '', col3Start, tableY, { width: pageWidth - col3Start - 5 });
    tableY += tableRowHeight;
    
    doc.text('Surgeon Name', col1Start, tableY);
    doc.text(':', col2Start, tableY);
    const surgeonName = inquiry.surgeon?.name || inquiry.surgeon || 'Not Assigned';
    doc.text(surgeonName, col3Start, tableY, { width: pageWidth - col3Start - 5 });
    tableY += tableRowHeight;
    
    doc.text('Patient IP No.', col1Start, tableY);
    doc.text(':', col2Start, tableY);
    doc.text(inquiry.patientUHID || '', col3Start, tableY, { width: pageWidth - col3Start - 5 });
    tableY += tableRowHeight;
    
    doc.text('Date of Surgery', col1Start, tableY);
    doc.text(':', col2Start, tableY);
    doc.text(new Date(inquiry.inquiryDate).toLocaleDateString('en-IN'), col3Start, tableY, { width: pageWidth - col3Start - 5 });
    tableY += tableRowHeight;
    
    doc.fontSize(9).font(getFont(true));
    doc.text('Declaration:', col1Start, tableY, { continued: true });
    doc.fontSize(9).font(getFont());
    doc.text(' We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.', { width: pageWidth - col1Start - 10, align: 'left' });

    y = remarksStartY + remarksHeight;
    const signatureSectionHeight = 60;
    const midLine = margin + pageWidth / 2;
    
    doc.moveTo(midLine, y).lineTo(midLine, y + signatureSectionHeight).stroke();
    doc.moveTo(margin, y).lineTo(margin, y + signatureSectionHeight).stroke();
    doc.moveTo(margin, y).lineTo(midLine, y).stroke();
    doc.moveTo(margin, y + signatureSectionHeight).lineTo(midLine, y + signatureSectionHeight).stroke();
    
    doc.moveTo(midLine + 0.5, y).lineTo(margin + pageWidth, y).stroke();
    doc.moveTo(margin + pageWidth, y).lineTo(margin + pageWidth, y + signatureSectionHeight).stroke();
    doc.moveTo(midLine + 0.5, y + signatureSectionHeight).lineTo(margin + pageWidth, y + signatureSectionHeight).stroke();
    
    doc.fontSize(9).font(getFont());
    doc.text("Receiver's Signature & Stamp", margin + 5, y + signatureSectionHeight - 10, { width: pageWidth / 2 - 10, align: 'center' });
    doc.text(`For ${companyName}`, midLine + 5, y + 5, { width: pageWidth / 2 - 10, align: 'center' });
    doc.text('Authorized Signatory', midLine + 5, y + signatureSectionHeight - 10, { width: pageWidth / 2 - 10, align: 'center' });

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

// Create new inquiry
router.post('/', async (req, res) => {
  try {
    const inquiryData = {
      ...req.body,
      createdBy: req.user?.id || '507f1f77bcf86cd799439011' // Default user ID for development
    };

    // Generate inquiry number from NumberRange
    if (!inquiryData.inquiryNumber && inquiryData.hospital) {
      // Get hospital to find business unit
      const hospital = await Hospital.findById(inquiryData.hospital).populate('businessUnit');
      if (hospital && hospital.businessUnit) {
        const inquiryNumber = await NumberRange.getNextNumberForType(
          hospital.businessUnit._id,
          'Inquiry',
          req.user?.id || '507f1f77bcf86cd799439011'
        );
        inquiryData.inquiryNumber = inquiryNumber;
        console.log('✓ Generated inquiry number:', inquiryNumber);
      } else {
        console.error('❌ Cannot generate inquiry number: hospital or business unit not found');
        return res.status(400).json({
          success: false,
          message: 'Hospital or business unit not found'
        });
      }
    }

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

// OLD DUPLICATE PDF ROUTE REMOVED - moved before POST route to fix Express matching order

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

// Helper function to convert amount to words with paisa
function amountToWords(amount) {
  let rupees = Math.floor(amount);
  let paisa = Math.round((amount - rupees) * 100);
  
  // Handle edge case where paisa rounds to 100 (carry over to rupees)
  if (paisa >= 100) {
    rupees += Math.floor(paisa / 100);
    paisa = paisa % 100;
  }
  
  let words = numberToWords(rupees) + ' Rupees';
  
  if (paisa > 0) {
    words += ' and ' + numberToWords(paisa) + ' Paisa';
  }
  
  return words + ' Only';
}

module.exports = router;
