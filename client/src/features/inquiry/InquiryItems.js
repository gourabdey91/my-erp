import React, { useState, useEffect } from 'react';
import MaterialSelector from './MaterialSelector';
import { materialAPI } from '../../services/materialAPI';
import '../../shared/styles/unified-design.css';

// Updated: All inputs now use unified-input class for consistency with main form
const InquiryItems = ({ items = [], onItemsChange, hospital, surgicalCategory, dropdownData }) => {
  const [inquiryItems, setInquiryItems] = useState(items);
  const [errors, setErrors] = useState({});
  const [materialSelectorOpen, setMaterialSelectorOpen] = useState(false);
  const [selectedItemIndex, setSelectedItemIndex] = useState(null);
  const [openDropdown, setOpenDropdown] = useState(null);

  // Dropdown management
  const toggleDropdown = (dropdownId) => {
    setOpenDropdown(openDropdown === dropdownId ? null : dropdownId);
  };

  const closeDropdown = () => {
    setOpenDropdown(null);
  };

  // Initialize with one empty item if no items provided
  useEffect(() => {
    console.log('InquiryItems useEffect - items:', items, 'hospital:', hospital);
    if (items.length === 0) {
      const emptyItem = createEmptyItem(1);
      setInquiryItems([emptyItem]);
    } else {
      setInquiryItems(items);
      // Simple: if hospital is available and items have material numbers, fetch descriptions
      const hospitalId = hospital?._id || hospital?.id;
      if (hospitalId) {
        console.log('Hospital available, calling fetchDescriptionsForItems with hospitalId:', hospitalId);
        fetchDescriptionsForItems(items, hospitalId);
      } else {
        console.log('Hospital not available yet:', hospital);
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
        const calculations = calculateItemTotal(item);
        return { ...item, totalAmount: calculations.totalAmount };
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
    totalAmount: 0,
    currency: 'INR'
  });

  // Calculate item totals
  const calculateItemTotal = (item) => {
    const unitRate = parseFloat(item.unitRate) || 0;
    const quantity = parseFloat(item.quantity) || 0;
    const gstPercentage = parseFloat(item.gstPercentage) || 0;
    const discountPercentage = parseFloat(item.discountPercentage) || 0;
    const discountAmount = parseFloat(item.discountAmount) || 0;

    const baseAmount = unitRate * quantity;
    const gstAmount = (baseAmount * gstPercentage) / 100;
    
    // Use discount amount if provided, otherwise calculate from percentage
    const finalDiscountAmount = discountAmount > 0 ? discountAmount : (baseAmount * discountPercentage) / 100;
    
    const totalAmount = baseAmount + gstAmount - finalDiscountAmount;
    
    return {
      baseAmount: Math.round(baseAmount * 100) / 100,
      gstAmount: Math.round(gstAmount * 100) / 100,
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
          isFromMaster: true
        };
      } else if (value?.trim() === '') {
        // Clear material data when material number is cleared
        updatedItems[index] = {
          ...updatedItems[index],
          materialDescription: '',
          hsnCode: '',
          unitRate: '',
          gstPercentage: '',
          unit: '',
          isFromMaster: false
        };
      }
    }
    
    // Auto-calculate totals when relevant fields change
    if (['unitRate', 'quantity', 'gstPercentage', 'discountPercentage', 'discountAmount'].includes(field)) {
      const calculations = calculateItemTotal(updatedItems[index]);
      
      // If discount amount is entered, clear discount percentage
      if (field === 'discountAmount' && value > 0) {
        updatedItems[index].discountPercentage = 0;
      }
      
      // If discount percentage is entered, clear discount amount
      if (field === 'discountPercentage' && value > 0) {
        updatedItems[index].discountAmount = 0;
      }
      
      updatedItems[index].totalAmount = calculations.totalAmount;
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
      const calculations = calculateItemTotal(updatedItems[selectedItemIndex]);
      updatedItems[selectedItemIndex].totalAmount = calculations.totalAmount;
      
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

  // Format currency display
  const formatCurrency = (amount, currency = 'INR') => {
    const numAmount = parseFloat(amount) || 0;
    return `${numAmount.toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })} ${currency}`;
  };

  // Calculate grand total
  const calculateGrandTotal = () => {
    const total = inquiryItems.reduce((sum, item) => sum + (parseFloat(item.totalAmount) || 0), 0);
    return Math.round(total * 100) / 100;
  };

  return (
    <div className="unified-card">
      <div className="unified-card-header">
        <h3>Item Details</h3>
        <button
          type="button"
          className="unified-btn unified-btn-sm unified-btn-primary"
          onClick={addItem}
        >
          + Add Item
        </button>
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
                  <th>GST %</th>
                  <th>Disc %</th>
                  <th>Disc Amt</th>
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
                            disabled={!hospital || !surgicalCategory}
                            title={!hospital || !surgicalCategory ? 'Please select hospital and surgical category first' : 'Select from material master'}
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

                      <td data-label="GST %">
                        <input
                          type="number"
                          className={`unified-input ${errors[`${index}_gstPercentage`] ? 'error' : ''}`}
                          value={item.gstPercentage}
                          onChange={(e) => !item.isFromMaster && handleInputChange(index, 'gstPercentage', e.target.value)}
                          placeholder="GST%"
                          min="0"
                          max="100"
                          step="0.01"
                          style={{ textAlign: 'right' }}
                          readOnly={item.isFromMaster}
                          title={item.isFromMaster ? "GST% is from material master" : "Enter GST%"}
                        />
                        {errors[`${index}_gstPercentage`] && (
                          <span className="unified-error-text">{errors[`${index}_gstPercentage`]}</span>
                        )}
                      </td>

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
                      <td colSpan="10" className="material-description-cell">
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
                      <td colSpan="10" className="hsn-code-cell">
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
                      disabled={!hospital || !surgicalCategory}
                      title="Select from material master"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M21 21L16.514 16.506M19 10.5C19 15.194 15.194 19 10.5 19C5.806 19 2 15.194 2 10.5C2 5.806 5.806 2 10.5 2C15.194 2 19 5.806 19 10.5Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </button>
                  </div>
                </div>

                <div className="mobile-field-group">
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
                  <div className="mobile-field-group mobile-field-half">
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
                </div>

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

        {/* Summary */}
        <div className="inquiry-items-summary">
          <div className="summary-row">
            <span className="summary-label">Grand Total:</span>
            <span className="summary-value">
              {formatCurrency(calculateGrandTotal(), 'INR')}
            </span>
          </div>
        </div>
      </div>

      {/* Material Selector Modal */}
      <MaterialSelector
        isOpen={materialSelectorOpen}
        onClose={closeMaterialSelector}
        onSelect={handleMaterialSelect}
        hospital={hospital}
        surgicalCategory={surgicalCategory}
        dropdownData={dropdownData}
      />
    </div>
  );
};

export default InquiryItems;
