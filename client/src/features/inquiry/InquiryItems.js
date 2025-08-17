import React, { useState, useEffect } from 'react';
import MaterialSelector from './MaterialSelector';
import CopyFromTemplateModal from './CopyFromTemplateModal';
import { materialAPI } from '../../services/materialAPI';
import '../../shared/styles/unified-design.css';

// Updated: All inputs now use unified-input class for consistency with main form
const InquiryItems = ({ items = [], onItemsChange, hospital, procedure, dropdownData }) => {
  const [inquiryItems, setInquiryItems] = useState(items);
  const [errors, setErrors] = useState({});
  const [materialSelectorOpen, setMaterialSelectorOpen] = useState(false);
  const [selectedItemIndex, setSelectedItemIndex] = useState(null);
  const [openDropdown, setOpenDropdown] = useState(null);
  const [companyDetails, setCompanyDetails] = useState(null);
  const [copyTemplateModalOpen, setCopyTemplateModalOpen] = useState(false);

  // Dropdown management
  const toggleDropdown = (dropdownId) => {
    setOpenDropdown(openDropdown === dropdownId ? null : dropdownId);
  };

  const closeDropdown = () => {
    setOpenDropdown(null);
  };

  // Fetch company details
  const fetchCompanyDetails = async () => {
    try {
      const response = await fetch('/api/company-details');
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setCompanyDetails(data.data);
        }
      }
    } catch (error) {
      console.error('Error fetching company details:', error);
    }
  };

  // Initialize with one empty item if no items provided
  useEffect(() => {
    console.log('InquiryItems useEffect - items count:', items.length, 'hospital id:', hospital?._id);
    
    // Fetch company details
    fetchCompanyDetails();
    
    if (items.length === 0) {
      const emptyItem = createEmptyItem(1);
      setInquiryItems([emptyItem]);
    } else {
      // For existing inquiries, preserve the GST amounts from database
      setInquiryItems(items);
      
      // Only fetch descriptions for items that don't have material descriptions
      // but DO have material numbers - this prevents unnecessary GST recalculation
      const hospitalId = hospital?._id || hospital?.id;
      if (hospitalId) {
        const itemsNeedingDescriptions = items.filter(item => 
          item.materialNumber && !item.materialDescription
        );
        
        if (itemsNeedingDescriptions.length > 0) {
          console.log('Hospital available, calling fetchDescriptionsForItems for items missing descriptions');
          fetchDescriptionsForItems(itemsNeedingDescriptions, hospitalId);
        } else {
          console.log('All items have descriptions or no items need material data fetch');
        }
      } else {
        console.log('Hospital not available yet, hospital id:', hospital?._id);
      }
    }
  }, [items, hospital?._id, hospital?.id]);

  // Simple function to fetch material descriptions for items that have material numbers
  const fetchDescriptionsForItems = async (itemsToProcess, hospitalId) => {
    console.log('fetchDescriptionsForItems called with:', itemsToProcess.length, 'items');
    let hasChanges = false;
    const updatedItems = [];

    for (const item of itemsToProcess) {
      console.log('Processing item:', item.materialNumber, 'has description:', !!item.materialDescription);
      if (item.materialNumber && !item.materialDescription) {
        console.log('Fetching material data for:', item.materialNumber);
        const materialData = await fetchMaterialByNumber(item.materialNumber, hospitalId);
        
        if (materialData) {
          console.log('Found material data:', materialData);
          updatedItems.push({
            ...item,
            materialDescription: materialData.description,
            hsnCode: materialData.hsnCode,
            unitRate: materialData.assignedInstitutionalPrice,
            gstPercentage: materialData.gstPercentage,
            unit: materialData.unit,
            isFromMaster: true
          });
          hasChanges = true;
        } else {
          console.log('No material data found for:', item.materialNumber);
          updatedItems.push(item);
        }
      } else {
        updatedItems.push(item);
      }
    }

    if (hasChanges) {
      console.log('Updating items with material data');
      const itemsWithTotals = updatedItems.map(item => {
        // Only calculate GST if the item doesn't already have saved GST amounts
        // This prevents overwriting database values for existing inquiries
        const hasExistingGST = item.cgstAmount > 0 || item.sgstAmount > 0 || item.igstAmount > 0;
        
        if (!hasExistingGST && item.unitRate && item.quantity && item.gstPercentage) {
          // Get state codes for GST calculation only for new items
          const customerStateCode = hospital?.stateCode || '';
          const companyStateCode = companyDetails?.compliance?.stateCode || '';
          
          console.log('Calculating GST for new material - State codes:', { customerStateCode, companyStateCode });
          
          const calculations = calculateItemTotal(item, customerStateCode, companyStateCode);
          return { 
            ...item, 
            totalAmount: calculations.totalAmount,
            gstAmount: calculations.gstAmount,       // Total GST amount for database storage
            cgstAmount: calculations.cgstAmount,     // Central GST component
            sgstAmount: calculations.sgstAmount,     // State GST component  
            igstAmount: calculations.igstAmount      // Integrated GST component
          };
        } else {
          console.log('Using existing GST amounts from database for item:', item.materialNumber);
          // For existing items with saved GST, just return the item as-is
          // or recalculate total if needed without changing GST breakdown
          if (item.unitRate && item.quantity && item.gstAmount !== undefined) {
            const baseAmount = parseFloat(item.unitRate) * parseFloat(item.quantity);
            const gstAmount = parseFloat(item.gstAmount) || 0;
            const discountAmount = parseFloat(item.discountAmount) || ((baseAmount * parseFloat(item.discountPercentage || 0)) / 100);
            const totalAmount = Math.round((baseAmount + gstAmount - discountAmount) * 100) / 100;
            
            return {
              ...item,
              totalAmount: totalAmount
            };
          }
          return item;
        }
      });

      setInquiryItems(itemsWithTotals);
      onItemsChange(itemsWithTotals);
    } else {
      console.log('No changes needed, all items already have descriptions or no material numbers');
    }
  };

  // Create a new empty item
  const createEmptyItem = (serialNumber) => ({
    serialNumber,
    materialNumber: '',
    materialDescription: '', // This will be derived, not saved
    hsnCode: '',
    unitRate: '',
    gstPercentage: '',
    quantity: '',
    unit: '',
    discountPercentage: 0,
    discountAmount: 0,
    // GST breakdown fields - stored in database
    gstAmount: 0,        // Total GST amount (CGST + SGST + IGST) - will be stored in DB
    cgstAmount: 0,       // Central GST amount
    sgstAmount: 0,       // State GST amount  
    igstAmount: 0,       // Integrated GST amount
    totalAmount: 0,
    currency: 'INR'
  });

  // Calculate GST amounts based on state codes
  // This function handles GST calculation as per Indian tax regulations:
  // - Same State (Intrastate): CGST + SGST (50% each of total GST)
  // - Different State (Interstate): IGST only (100% of total GST)
  const calculateGSTAmounts = (gstAmount, customerStateCode, companyStateCode) => {
    const isSameState = customerStateCode === companyStateCode;
    
    let cgstAmount = 0, sgstAmount = 0, igstAmount = 0;
    
    if (isSameState) {
      // Same state: CGST + SGST (each is 50% of total GST)
      cgstAmount = gstAmount * 0.5;
      sgstAmount = gstAmount * 0.5;
      igstAmount = 0;
    } else {
      // Different state: IGST only (100% of total GST)
      cgstAmount = 0;
      sgstAmount = 0;
      igstAmount = gstAmount;
    }
    
    return {
      cgstAmount: Math.round(cgstAmount * 100) / 100,
      sgstAmount: Math.round(sgstAmount * 100) / 100,
      igstAmount: Math.round(igstAmount * 100) / 100
    };
  };

  // Calculate item totals
  const calculateItemTotal = (item, customerStateCode = '', companyStateCode = '') => {
    const unitRate = parseFloat(item.unitRate) || 0;
    const quantity = parseFloat(item.quantity) || 0;
    const gstPercentage = parseFloat(item.gstPercentage) || 0;
    const discountPercentage = parseFloat(item.discountPercentage) || 0;
    const discountAmount = parseFloat(item.discountAmount) || 0;

    const baseAmount = unitRate * quantity;
    const gstAmount = (baseAmount * gstPercentage) / 100;
    
    // Calculate GST breakdown based on state codes
    const gstBreakdown = calculateGSTAmounts(gstAmount, customerStateCode, companyStateCode);
    
    // Use discount amount if provided, otherwise calculate from percentage
    const finalDiscountAmount = discountAmount > 0 ? discountAmount : (baseAmount * discountPercentage) / 100;
    
    const totalAmount = baseAmount + gstAmount - finalDiscountAmount;
    
    return {
      baseAmount: Math.round(baseAmount * 100) / 100,
      gstAmount: Math.round(gstAmount * 100) / 100,        // Total GST amount - will be stored in DB
      cgstAmount: gstBreakdown.cgstAmount,                 // Central GST component
      sgstAmount: gstBreakdown.sgstAmount,                 // State GST component
      igstAmount: gstBreakdown.igstAmount,                 // Integrated GST component
      discountAmount: Math.round(finalDiscountAmount * 100) / 100,
      totalAmount: Math.round(totalAmount * 100) / 100
    };
  };

  // Format serial number as 2-digit string
  const formatSerialNumber = (num) => {
    const serialNum = parseInt(num) || 1;
    return serialNum.toString().padStart(2, '0');
  };

  // Fetch material data by material number
  const fetchMaterialByNumber = async (materialNumber, hospitalId) => {
    try {
      if (!materialNumber?.trim() || !hospitalId) {
        return null;
      }

      // Use the existing API with search parameter to find the material
      const response = await materialAPI.getAssignedMaterialsForInquiry(hospitalId, {
        search: materialNumber.trim()
      });

      if (response?.success && response.data?.length > 0) {
        // Find exact match for material number
        const exactMatch = response.data.find(
          material => material.materialNumber?.toUpperCase() === materialNumber.trim().toUpperCase()
        );
        return exactMatch || null;
      }
      return null;
    } catch (error) {
      console.error('Error fetching material by number:', error);
      return null;
    }
  };

  // Handle input change
  const handleInputChange = async (index, field, value) => {
    const updatedItems = [...inquiryItems];
    updatedItems[index] = { ...updatedItems[index], [field]: value };
    
    // If material number is changed, try to fetch material data
    if (field === 'materialNumber' && value?.trim() && hospital) {
      const hospitalId = typeof hospital === 'object' ? hospital._id : hospital;
      const materialData = await fetchMaterialByNumber(value, hospitalId);
      
      if (materialData) {
        // Auto-fill material data from master
        updatedItems[index] = {
          ...updatedItems[index],
          materialNumber: materialData.materialNumber,
          materialDescription: materialData.description,
          hsnCode: materialData.hsnCode,
          unitRate: materialData.assignedInstitutionalPrice,
          gstPercentage: materialData.gstPercentage,
          unit: materialData.unit,
          isFromMaster: true,
          // Reset GST amounts when new material is selected - they'll be calculated below
          cgstAmount: 0,
          sgstAmount: 0,
          igstAmount: 0,
          gstAmount: 0
        };
        
        // Calculate GST for the new material
        const customerStateCode = hospital?.stateCode || '';
        const companyStateCode = companyDetails?.compliance?.stateCode || '';
        
        console.log('New material selected - calculating GST with state codes:', { customerStateCode, companyStateCode });
        
        const calculations = calculateItemTotal(updatedItems[index], customerStateCode, companyStateCode);
        
        // Update all calculated fields
        updatedItems[index].totalAmount = calculations.totalAmount;
        updatedItems[index].gstAmount = calculations.gstAmount;
        updatedItems[index].cgstAmount = calculations.cgstAmount;
        updatedItems[index].sgstAmount = calculations.sgstAmount;
        updatedItems[index].igstAmount = calculations.igstAmount;
        
      } else if (value?.trim() === '') {
        // Clear material data when material number is cleared
        updatedItems[index] = {
          ...updatedItems[index],
          materialDescription: '',
          hsnCode: '',
          unitRate: '',
          gstPercentage: '',
          unit: '',
          isFromMaster: false,
          // Reset GST amounts when material is cleared
          cgstAmount: 0,
          sgstAmount: 0,
          igstAmount: 0,
          gstAmount: 0,
          totalAmount: 0
        };
      }
    }
    
    // Auto-calculate totals when relevant fields change (but only for items being actively edited)
    if (['unitRate', 'quantity', 'gstPercentage', 'discountPercentage', 'discountAmount'].includes(field)) {
      // Get state codes for GST calculation
      const customerStateCode = hospital?.stateCode || '';
      const companyStateCode = companyDetails?.compliance?.stateCode || '';
      
      console.log('Recalculating totals due to field change:', field, 'State codes:', { customerStateCode, companyStateCode });
      
      const calculations = calculateItemTotal(updatedItems[index], customerStateCode, companyStateCode);
      
      // If discount amount is entered, clear discount percentage
      if (field === 'discountAmount' && value > 0) {
        updatedItems[index].discountPercentage = 0;
      }
      
      // If discount percentage is entered, clear discount amount
      if (field === 'discountPercentage' && value > 0) {
        updatedItems[index].discountAmount = 0;
      }
      
      // Update all calculated fields with proper comments
      updatedItems[index].totalAmount = calculations.totalAmount;
      updatedItems[index].gstAmount = calculations.gstAmount;     // Total GST for database storage
      updatedItems[index].cgstAmount = calculations.cgstAmount;   // Central GST component
      updatedItems[index].sgstAmount = calculations.sgstAmount;   // State GST component
      updatedItems[index].igstAmount = calculations.igstAmount;   // Integrated GST component
    }
    
    // For serial number changes, just update without sorting (sort on save)
    if (field === 'serialNumber') {
      const serialNum = parseInt(value) || 1;
      updatedItems[index].serialNumber = serialNum;
    }
    
    setInquiryItems(updatedItems);
    onItemsChange(updatedItems);
    
    // Clear field-specific errors
    if (errors[`${index}_${field}`]) {
      const newErrors = { ...errors };
      delete newErrors[`${index}_${field}`];
      setErrors(newErrors);
    }
  };

  // Add new item
  const addItem = () => {
    const newSerialNumber = inquiryItems.length + 1;
    const newItem = createEmptyItem(newSerialNumber);
    const updatedItems = [...inquiryItems, newItem];
    setInquiryItems(updatedItems);
    onItemsChange(updatedItems);
  };

  // Copy items from template
  const handleCopyFromTemplate = (template) => {
    if (!template.items || template.items.length === 0) {
      console.warn('Template has no items to copy');
      return;
    }

    // Convert template items to inquiry items
    const templateItems = template.items.map((templateItem, index) => {
      const newSerialNumber = inquiryItems.length + index + 1;
      return {
        serialNumber: newSerialNumber,
        materialNumber: templateItem.materialNumber || '',
        materialDescription: templateItem.materialDescription || '',
        hsnCode: templateItem.hsnCode || '',
        unitRate: templateItem.unitRate || '',
        gstPercentage: templateItem.gstPercentage || '',
        quantity: templateItem.quantity || '',
        unit: templateItem.unit || '',
        discountPercentage: templateItem.discountPercentage || 0,
        discountAmount: templateItem.discountAmount || 0,
        totalAmount: templateItem.totalAmount || 0,
        gstAmount: templateItem.gstAmount || 0,
        currency: templateItem.currency || 'INR'
      };
    });

    const updatedItems = [...inquiryItems, ...templateItems];
    setInquiryItems(updatedItems);
    onItemsChange(updatedItems);
  };

  // Remove item
  const removeItem = (index) => {
    if (inquiryItems.length <= 1) return;
    
    const updatedItems = inquiryItems.filter((_, i) => i !== index);
    
    // Renumber serial numbers
    const renumberedItems = updatedItems.map((item, i) => ({
      ...item,
      serialNumber: i + 1
    }));
    
    setInquiryItems(renumberedItems);
    onItemsChange(renumberedItems);
    
    // Clear errors for removed item
    const newErrors = {};
    Object.keys(errors).forEach(key => {
      if (!key.startsWith(`${index}_`)) {
        newErrors[key] = errors[key];
      }
    });
    setErrors(newErrors);
  };

  // Open material selector
  const openMaterialSelector = (index) => {
    setSelectedItemIndex(index);
    setMaterialSelectorOpen(true);
  };

  // Handle material selection
  const handleMaterialSelect = (material) => {
    if (selectedItemIndex !== null) {
      const updatedItems = [...inquiryItems];
      updatedItems[selectedItemIndex] = {
        ...updatedItems[selectedItemIndex],
        materialNumber: material.materialNumber,
        materialDescription: material.description,
        hsnCode: material.hsnCode,
        unitRate: material.assignedInstitutionalPrice,
        gstPercentage: material.gstPercentage,
        unit: material.unit,
        isFromMaster: true // Flag to indicate this is from material master
      };
      
      // Recalculate totals
      const customerStateCode = hospital?.stateCode || '';
      const companyStateCode = companyDetails?.compliance?.stateCode || '';
      
      console.log('Material select - State codes:', { customerStateCode, companyStateCode });
      
      const calculations = calculateItemTotal(updatedItems[selectedItemIndex], customerStateCode, companyStateCode);
      // Update all calculated fields when material is selected
      updatedItems[selectedItemIndex].totalAmount = calculations.totalAmount;
      updatedItems[selectedItemIndex].gstAmount = calculations.gstAmount;     // Total GST for database
      updatedItems[selectedItemIndex].cgstAmount = calculations.cgstAmount;   // Central GST component
      updatedItems[selectedItemIndex].sgstAmount = calculations.sgstAmount;   // State GST component
      updatedItems[selectedItemIndex].igstAmount = calculations.igstAmount;   // Integrated GST component
      
      setInquiryItems(updatedItems);
      onItemsChange(updatedItems);
      
      // Clear material selector
      setMaterialSelectorOpen(false);
      setSelectedItemIndex(null);
    }
  };

  // Close material selector
  const closeMaterialSelector = () => {
    setMaterialSelectorOpen(false);
    setSelectedItemIndex(null);
  };

  // Calculate if same state for GST display logic
  // This function determines GST field visibility based on state comparison:
  // - Same State: Show CGST + SGST columns, hide IGST column
  // - Different State: Show CGST + IGST columns, hide SGST column
  const isSameState = () => {
    const customerStateCode = hospital?.stateCode || '';
    const companyStateCode = companyDetails?.compliance?.stateCode || '';
    return customerStateCode === companyStateCode;
  };

  // Debug logging for hospital data and discount allowed
  useEffect(() => {
    console.log('InquiryItems: hospital data received, id:', hospital?._id, 'name:', hospital?.shortName);
    console.log('InquiryItems: hospital.discountAllowed:', hospital?.discountAllowed);
    console.log('InquiryItems: discount fields should be visible:', !!hospital?.discountAllowed);
  }, [hospital]);

  // Calculate dynamic colspan for secondary rows based on visible columns
  const getTableColspan = () => {
    // Base columns: S.No, Material No., Unit Rate, Quantity, Unit, CGST Amt, (SGST/IGST), GST Amount, Total Amount, Actions = 10
    let colspan = 10; // Updated to include new GST Amount column
    
    // Add discount columns if allowed (Disc % and Disc Amt)
    if (hospital?.discountAllowed) {
      colspan += 2; // Disc % and Disc Amt
    }
    
    return colspan;
  };

  // Format currency display
  const formatCurrency = (amount, currency = 'INR') => {
    const numAmount = parseFloat(amount) || 0;
    return `${numAmount.toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })} ${currency}`;
  };

  return (
    <div className="unified-card">
      <div className="unified-card-header">
        <h3>Item Details</h3>
        <div className="card-header-actions">
          <button
            type="button"
            className="unified-btn unified-btn-sm unified-btn-secondary"
            onClick={() => setCopyTemplateModalOpen(true)}
            style={{ marginRight: '0.5rem' }}
          >
            Copy from Template
          </button>
          <button
            type="button"
            className="unified-btn unified-btn-sm unified-btn-primary"
            onClick={addItem}
          >
            + Add Item
          </button>
        </div>
      </div>
      
      <div className="unified-card-content">
        <div className="inquiry-items-container">
          {/* Items Table - Updated with responsive two-row layout */}
          <div className="unified-table-responsive">
            <table className="unified-table inquiry-items-table">
              <thead>
                <tr>
                  <th>S.No</th>
                  <th>Material No.</th>
                  <th>Unit Rate</th>
                  <th>Quantity</th>
                  <th>Unit</th>
                  {hospital?.discountAllowed && <th>Disc %</th>}
                  {hospital?.discountAllowed && <th>Disc Amt</th>}
                  {/* GST column headers - visibility based on state codes */}
                  <th>CGST Amt</th>
                  {isSameState() ? (
                    <th>SGST Amt</th>
                  ) : (
                    <th>IGST Amt</th>
                  )}
                  <th>GST Amount</th>
                  <th>Total Amount</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {inquiryItems.map((item, index) => (
                  <React.Fragment key={index}>
                    {/* Main row with all data fields */}
                    <tr className="inquiry-main-row">
                      <td data-label="S.No" className="text-center">
                        <input
                          type="text"
                          className="unified-input text-center"
                          style={{ width: '50px' }}
                          value={formatSerialNumber(item.serialNumber)}
                          onChange={(e) => {
                            // Allow only numeric input
                            const numericValue = e.target.value.replace(/\D/g, '');
                            handleInputChange(index, 'serialNumber', numericValue || '1');
                          }}
                          placeholder="01"
                          title="Enter serial number for custom ordering. Items will be sorted when saved."
                        />
                      </td>
                      
                      <td data-label="Material No.">
                        <div className="material-number-container">
                          <input
                            type="text"
                            className={`unified-input ${errors[`${index}_materialNumber`] ? 'error' : ''}`}
                            value={item.materialNumber}
                            onChange={(e) => handleInputChange(index, 'materialNumber', e.target.value)}
                            placeholder="Enter material number"
                            readOnly={item.isFromMaster}
                          />
                          <button
                            type="button"
                            className="material-selector-btn"
                            onClick={() => openMaterialSelector(index)}
                            disabled={!hospital}
                            title={!hospital ? 'Please select hospital first' : 'Select from material master'}
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M21 21L16.514 16.506M19 10.5C19 15.194 15.194 19 10.5 19C5.806 19 2 15.194 2 10.5C2 5.806 5.806 2 10.5 2C15.194 2 19 5.806 19 10.5Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          </button>
                        </div>
                        {errors[`${index}_materialNumber`] && (
                          <span className="unified-error-text">{errors[`${index}_materialNumber`]}</span>
                        )}
                      </td>

                      <td data-label="Unit Rate">
                        <input
                          type="number"
                          className={`unified-input ${errors[`${index}_unitRate`] ? 'error' : ''}`}
                          value={item.unitRate}
                          onChange={(e) => !item.isFromMaster && handleInputChange(index, 'unitRate', e.target.value)}
                          placeholder="0.00"
                          min="0"
                          step="0.01"
                          style={{ textAlign: 'right' }}
                          readOnly={item.isFromMaster}
                          title={item.isFromMaster ? "Unit Rate is from material master" : "Enter Unit Rate"}
                        />
                        {errors[`${index}_unitRate`] && (
                          <span className="unified-error-text">{errors[`${index}_unitRate`]}</span>
                        )}
                      </td>

                      <td data-label="Quantity">
                        <input
                          type="number"
                          className={`unified-input ${errors[`${index}_quantity`] ? 'error' : ''}`}
                          value={item.quantity}
                          onChange={(e) => handleInputChange(index, 'quantity', e.target.value)}
                          placeholder="1"
                          min="1"
                          style={{ textAlign: 'center' }}
                        />
                        {errors[`${index}_quantity`] && (
                          <span className="unified-error-text">{errors[`${index}_quantity`]}</span>
                        )}
                      </td>

                      <td data-label="Unit">
                        <input
                          type="text"
                          className="unified-input"
                          value={item.unit}
                          onChange={(e) => !item.isFromMaster && handleInputChange(index, 'unit', e.target.value)}
                          placeholder="Unit"
                          readOnly={item.isFromMaster}
                          title={item.isFromMaster ? "Unit is from material master" : "Enter Unit"}
                        />
                      </td>

                      {hospital?.discountAllowed && (
                        <td data-label="Disc %">
                          <input
                            type="number"
                            className="unified-input"
                            value={item.discountPercentage}
                            onChange={(e) => handleInputChange(index, 'discountPercentage', e.target.value)}
                            placeholder="0"
                            min="0"
                            max="100"
                            step="0.01"
                            style={{ textAlign: 'right' }}
                          />
                        </td>
                      )}

                      {hospital?.discountAllowed && (
                        <td data-label="Disc Amt">
                          <input
                            type="number"
                            className="unified-input"
                            value={item.discountAmount}
                            onChange={(e) => handleInputChange(index, 'discountAmount', e.target.value)}
                            placeholder="0.00"
                            min="0"
                            step="0.01"
                            style={{ textAlign: 'right' }}
                          />
                        </td>
                      )}

                      {/* GST Amount columns - visibility based on state comparison
                          Same State (Intrastate): CGST + SGST columns visible, IGST hidden
                          Different State (Interstate): CGST + IGST columns visible, SGST hidden
                          Total GST Amount: Always visible - sum of all GST components for database storage */}
                      <td data-label="CGST Amt">
                        <input
                          type="text"
                          className="unified-input gst-amount"
                          value={formatCurrency(item.cgstAmount || 0, item.currency)}
                          readOnly
                          style={{ textAlign: 'right', fontWeight: '500', color: '#6c757d' }}
                          title={`CGST amount: ${formatCurrency(item.cgstAmount || 0, item.currency)}`}
                        />
                      </td>

                      {isSameState() ? (
                        <td data-label="SGST Amt">
                          <input
                            type="text"
                            className="unified-input gst-amount"
                            value={formatCurrency(item.sgstAmount || 0, item.currency)}
                            readOnly
                            style={{ textAlign: 'right', fontWeight: '500', color: '#6c757d' }}
                            title={`SGST amount: ${formatCurrency(item.sgstAmount || 0, item.currency)}`}
                          />
                        </td>
                      ) : (
                        <td data-label="IGST Amt">
                          <input
                            type="text"
                            className="unified-input gst-amount"
                            value={formatCurrency(item.igstAmount || 0, item.currency)}
                            readOnly
                            style={{ textAlign: 'right', fontWeight: '500', color: '#6c757d' }}
                            title={`IGST amount: ${formatCurrency(item.igstAmount || 0, item.currency)}`}
                          />
                        </td>
                      )}

                      {/* Total GST Amount column - sum of CGST + SGST + IGST for database storage */}
                      <td data-label="GST Amount">
                        <input
                          type="text"
                          className="unified-input gst-amount"
                          value={formatCurrency(item.gstAmount || 0, item.currency)}
                          readOnly
                          style={{ textAlign: 'right', fontWeight: '600', color: '#17a2b8' }}
                          title={`Total GST amount: ${formatCurrency(item.gstAmount || 0, item.currency)} (CGST + SGST + IGST)`}
                        />
                      </td>

                      <td data-label="Total Amount">
                        <input
                          type="text"
                          className="unified-input total-amount"
                          value={formatCurrency(item.totalAmount, item.currency)}
                          readOnly
                          style={{ textAlign: 'right', fontWeight: '600', color: '#28a745' }}
                          title={`Total amount for this item: ${formatCurrency(item.totalAmount, item.currency)}`}
                        />
                      </td>

                      <td data-label="Actions">
                        <div className="unified-table-actions">
                          {inquiryItems.length > 1 && (
                            <button
                              type="button"
                              className="unified-table-action delete"
                              onClick={() => removeItem(index)}
                              title="Remove Item"
                            >
                              🗑️
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>

                    {/* Secondary row for material description - SAP Fiori style */}
                    <tr className="inquiry-description-row">
                      <td colSpan={getTableColspan()} className="material-description-cell">
                        <div className="material-description-container">
                          <span className="description-label">Material Description:</span>
                          <div className="description-content">
                            {item.materialDescription ? (
                              <span className="description-text">
                                {item.materialDescription}
                              </span>
                            ) : (
                              <span className="description-placeholder">No description available</span>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>

                    {/* Third row for HSN Code - SAP Fiori style */}
                    <tr className="inquiry-hsn-row">
                      <td colSpan={getTableColspan()} className="hsn-code-cell">
                        <div className="hsn-code-container">
                          <span className="hsn-label">HSN Code:</span>
                          <div className="hsn-content">
                            {item.hsnCode ? (
                              <span className="hsn-text">{item.hsnCode}</span>
                            ) : (
                              <span className="hsn-placeholder">Not specified</span>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>

                    {/* Fourth row for GST% - SAP Fiori style */}
                    <tr className="inquiry-gst-row">
                      <td colSpan={getTableColspan()} className="gst-code-cell">
                        <div className="gst-code-container">
                          <span className="gst-label">GST %:</span>
                          <div className="gst-content">
                            {item.gstPercentage ? (
                              <span className="gst-text">{item.gstPercentage}%</span>
                            ) : (
                              <span className="gst-placeholder">Not specified</span>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Mobile Cards View */}
        <div className="unified-mobile-cards">
          {inquiryItems.map((item, index) => (
            <div key={`mobile-${index}`} className="unified-mobile-card">
              <div className="unified-card-header">
                <div>
                  <h3 className="unified-card-title">
                    {item.materialNumber || `Item ${formatSerialNumber(item.serialNumber)}`}
                  </h3>
                  {item.materialDescription && (
                    <div className="card-subtitle">{item.materialDescription}</div>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="unified-card-badge">
                    {formatCurrency(item.totalAmount, item.currency)}
                  </span>
                  <div className="unified-card-menu">
                    <button
                      type="button"
                      className="unified-menu-trigger"
                      onClick={() => toggleDropdown(`item-${index}`)}
                    >
                      ⋮
                    </button>
                    {openDropdown === `item-${index}` && (
                      <div className="unified-dropdown-menu">
                        {inquiryItems.length > 1 && (
                          <button
                            className="unified-dropdown-item danger"
                            onClick={() => {
                              closeDropdown();
                              removeItem(index);
                            }}
                          >
                            <span className="action-icon">🗑️</span>
                            Remove Item
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="unified-card-content">
                <div className="mobile-field-group">
                  <label className="mobile-field-label">Serial No.</label>
                  <input
                    type="text"
                    className="unified-input mobile-field-input"
                    value={formatSerialNumber(item.serialNumber)}
                    onChange={(e) => handleInputChange(index, 'serialNumber', e.target.value)}
                  />
                </div>

                <div className="mobile-field-group">
                  <label className="mobile-field-label">Material No.</label>
                  <div className="material-number-container">
                    <input
                      type="text"
                      className="unified-input mobile-field-input"
                      value={item.materialNumber}
                      onChange={(e) => handleInputChange(index, 'materialNumber', e.target.value)}
                      placeholder="Enter material number"
                    />
                    <button
                      type="button"
                      className="material-selector-btn"
                      onClick={() => openMaterialSelector(index)}
                      disabled={!hospital}
                      title="Select from material master"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M21 21L16.514 16.506M19 10.5C19 15.194 15.194 19 10.5 19C5.806 19 2 15.194 2 10.5C2 5.806 5.806 2 10.5 2C15.194 2 19 5.806 19 10.5Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </button>
                  </div>
                </div>

                <div className="mobile-field-group mobile-description-field">
                  <label className="mobile-field-label">Material Description</label>
                  <textarea
                    className="unified-input mobile-field-input"
                    value={item.materialDescription}
                    onChange={(e) => !item.isFromMaster && handleInputChange(index, 'materialDescription', e.target.value)}
                    placeholder={item.isFromMaster ? "Description from material master" : "Enter material description"}
                    rows="2"
                    readOnly={item.isFromMaster}
                  />
                </div>

                <div className="mobile-field-group">
                  <label className="mobile-field-label">Unit Rate</label>
                  <input
                    type="number"
                    className="unified-input mobile-field-input"
                    value={item.unitRate}
                    onChange={(e) => !item.isFromMaster && handleInputChange(index, 'unitRate', e.target.value)}
                    placeholder="0.00"
                    step="0.01"
                    readOnly={item.isFromMaster}
                  />
                </div>

                <div className="mobile-field-row">
                  <div className="mobile-field-group mobile-field-half">
                    <label className="mobile-field-label">Quantity</label>
                    <input
                      type="number"
                      className="unified-input mobile-field-input"
                      value={item.quantity}
                      onChange={(e) => handleInputChange(index, 'quantity', parseInt(e.target.value) || 1)}
                      min="1"
                    />
                  </div>
                  <div className="mobile-field-group mobile-field-half">
                    <label className="mobile-field-label">Unit</label>
                    <input
                      type="text"
                      className="unified-input mobile-field-input"
                      value={item.unit}
                      onChange={(e) => !item.isFromMaster && handleInputChange(index, 'unit', e.target.value)}
                      placeholder={item.isFromMaster ? "Unit from material master" : "Enter unit"}
                      readOnly={item.isFromMaster}
                    />
                  </div>
                </div>

                <div className="mobile-field-group">
                  <label className="mobile-field-label">HSN Code</label>
                  <input
                    type="text"
                    className="unified-input mobile-field-input"
                    value={item.hsnCode}
                    onChange={(e) => !item.isFromMaster && handleInputChange(index, 'hsnCode', e.target.value)}
                    placeholder={item.isFromMaster ? "HSN from material master" : "Enter HSN code"}
                    readOnly={item.isFromMaster}
                  />
                </div>

                <div className="mobile-field-row">
                  <div className={`mobile-field-group ${hospital?.discountAllowed ? 'mobile-field-half' : ''}`}>
                    <label className="mobile-field-label">GST %</label>
                    <input
                      type="number"
                      className="unified-input mobile-field-input"
                      value={item.gstPercentage}
                      onChange={(e) => !item.isFromMaster && handleInputChange(index, 'gstPercentage', e.target.value)}
                      placeholder={item.isFromMaster ? "GST from material master" : "Enter GST %"}
                      step="0.01"
                      min="0"
                      readOnly={item.isFromMaster}
                    />
                  </div>
                  {hospital?.discountAllowed && (
                    <div className="mobile-field-group mobile-field-half">
                      <label className="mobile-field-label">Disc %</label>
                      <input
                        type="number"
                        className="unified-input mobile-field-input"
                        value={item.discountPercentage}
                        onChange={(e) => handleInputChange(index, 'discountPercentage', parseFloat(e.target.value) || 0)}
                        step="0.01"
                        min="0"
                      />
                    </div>
                  )}
                </div>

                {hospital?.discountAllowed && (
                  <div className="mobile-field-group">
                    <label className="mobile-field-label">Discount Amount</label>
                    <input
                      type="number"
                      className="unified-input mobile-field-input"
                      value={item.discountAmount}
                      onChange={(e) => handleInputChange(index, 'discountAmount', parseFloat(e.target.value) || 0)}
                      step="0.01"
                      min="0"
                    />
                  </div>
                )}

                <div className="mobile-field-row">
                  <div className="mobile-field-group mobile-field-half">
                    <label className="mobile-field-label">CGST Amt</label>
                    <input
                      type="text"
                      className="unified-input mobile-field-input gst-amount"
                      value={formatCurrency(item.cgstAmount || 0, item.currency)}
                      readOnly
                    />
                  </div>
                  <div className="mobile-field-group mobile-field-half">
                    {isSameState() ? (
                      <>
                        <label className="mobile-field-label">SGST Amt</label>
                        <input
                          type="text"
                          className="unified-input mobile-field-input gst-amount"
                          value={formatCurrency(item.sgstAmount || 0, item.currency)}
                          readOnly
                        />
                      </>
                    ) : (
                      <>
                        <label className="mobile-field-label">IGST Amt</label>
                        <input
                          type="text"
                          className="unified-input mobile-field-input gst-amount"
                          value={formatCurrency(item.igstAmount || 0, item.currency)}
                          readOnly
                        />
                      </>
                    )}
                  </div>
                </div>

                {/* Total GST Amount field for mobile view */}
                <div className="mobile-field-group">
                  <label className="mobile-field-label">GST Amount (Total)</label>
                  <input
                    type="text"
                    className="unified-input mobile-field-input gst-amount"
                    value={formatCurrency(item.gstAmount || 0, item.currency)}
                    readOnly
                    style={{ fontWeight: '600', color: '#17a2b8' }}
                    title={`Total GST: ${formatCurrency(item.gstAmount || 0, item.currency)} (CGST + SGST + IGST)`}
                  />
                </div>

                <div className="mobile-field-group">
                  <label className="mobile-field-label">Total Amount</label>
                  <input
                    type="text"
                    className="unified-input mobile-field-input total-amount"
                    value={formatCurrency(item.totalAmount, item.currency)}
                    readOnly
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Material Selector Modal */}
      <MaterialSelector
        isOpen={materialSelectorOpen}
        onClose={closeMaterialSelector}
        onSelect={handleMaterialSelect}
        hospital={hospital}
        procedure={procedure}
        dropdownData={dropdownData}
      />

      {/* Copy from Template Modal */}
      <CopyFromTemplateModal
        isOpen={copyTemplateModalOpen}
        onClose={() => setCopyTemplateModalOpen(false)}
        onCopyTemplate={handleCopyFromTemplate}
        procedure={procedure}
        dropdownData={dropdownData}
      />
    </div>
  );
};

export default InquiryItems;
