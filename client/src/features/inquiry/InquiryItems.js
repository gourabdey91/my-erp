import React, { useState, useEffect } from 'react';
import MaterialSelector from './MaterialSelector';
import MobileCard from '../../shared/components/MobileCard';
import '../../shared/styles/unified-design.css';

// Updated: All inputs now use unified-input class for consistency with main form
const InquiryItems = ({ items = [], onItemsChange, hospital, surgicalCategory, dropdownData }) => {
  const [inquiryItems, setInquiryItems] = useState(items);
  const [errors, setErrors] = useState({});
  const [materialSelectorOpen, setMaterialSelectorOpen] = useState(false);
  const [selectedItemIndex, setSelectedItemIndex] = useState(null);

  // Initialize with one empty item if no items provided
  useEffect(() => {
    if (items.length === 0) {
      const emptyItem = createEmptyItem(1);
      setInquiryItems([emptyItem]);
    } else {
      setInquiryItems(items);
    }
  }, [items]);

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

  // Handle input change
  const handleInputChange = (index, field, value) => {
    const updatedItems = [...inquiryItems];
    updatedItems[index] = { ...updatedItems[index], [field]: value };
    
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
        materialDescription: material.description, // This will be shown but not saved
        hsnCode: material.hsnCode,
        unitRate: material.assignedInstitutionalPrice, // Fixed: use assignedInstitutionalPrice
        gstPercentage: material.gstPercentage,
        unit: material.unit
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
                  <th>Material Description</th>
                  <th>Unit Rate</th>
                  <th>Quantity</th>
                  <th>Unit</th>
                  <th>HSN Code</th>
                  <th>GST %</th>
                  <th>Disc %</th>
                  <th>Disc Amt</th>
                  <th>Total Amount</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {inquiryItems.map((item, index) => (
                  <tr key={index}>
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
                          readOnly={!!item.materialDescription}
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

                    <td data-label="Material Description">
                      {item.materialDescription ? (
                        <div className="material-description-display">
                          <span className="material-description-text">
                            {item.materialDescription}
                          </span>
                          <small className="material-description-note">
                            (From Material Master)
                          </small>
                        </div>
                      ) : (
                        <input
                          type="text"
                          className="unified-input"
                          value={item.materialDescription || ''}
                          onChange={(e) => handleInputChange(index, 'materialDescription', e.target.value)}
                          placeholder="Enter material description"
                          title="Material description - auto-filled when selected from material master"
                        />
                      )}
                    </td>

                    <td data-label="Unit Rate">
                      <input
                        type="number"
                        className={`unified-input ${errors[`${index}_unitRate`] ? 'error' : ''}`}
                        value={item.unitRate}
                        onChange={(e) => handleInputChange(index, 'unitRate', e.target.value)}
                        placeholder="0.00"
                        min="0"
                        step="0.01"
                        style={{ textAlign: 'right' }}
                        readOnly={!!item.materialDescription}
                        title={item.materialDescription ? "Unit Rate is derived from material master" : "Enter Unit Rate"}
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
                        onChange={(e) => handleInputChange(index, 'unit', e.target.value)}
                        placeholder="Unit"
                        readOnly
                        title="Unit is derived from material master"
                      />
                    </td>

                    <td data-label="HSN Code">
                      <input
                        type="text"
                        className={`unified-input ${errors[`${index}_hsnCode`] ? 'error' : ''}`}
                        value={item.hsnCode}
                        onChange={(e) => handleInputChange(index, 'hsnCode', e.target.value)}
                        placeholder="HSN Code"
                        readOnly={!!item.materialDescription}
                        title={item.materialDescription ? "HSN Code is derived from material master" : "Enter HSN Code"}
                      />
                      {errors[`${index}_hsnCode`] && (
                        <span className="unified-error-text">{errors[`${index}_hsnCode`]}</span>
                      )}
                    </td>

                    <td data-label="GST %">
                      <input
                        type="number"
                        className={`unified-input ${errors[`${index}_gstPercentage`] ? 'error' : ''}`}
                        value={item.gstPercentage}
                        onChange={(e) => handleInputChange(index, 'gstPercentage', e.target.value)}
                        placeholder="GST%"
                        min="0"
                        max="100"
                        step="0.01"
                        style={{ textAlign: 'right' }}
                        readOnly={!!item.materialDescription}
                        title={item.materialDescription ? "GST% is derived from material master" : "Enter GST%"}
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
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Mobile Cards View */}
        <div className="unified-mobile-cards">
          {inquiryItems.map((item, index) => (
            <MobileCard
              key={`mobile-${index}`}
              id={`item-${index}`}
              title={item.materialNumber || `Item ${formatSerialNumber(item.serialNumber)}`}
              subtitle={item.materialDescription || 'No description'}
              badge={{
                text: formatCurrency(item.totalAmount, item.currency),
                type: 'success'
              }}
              fields={[
                { label: 'Serial No.', value: formatSerialNumber(item.serialNumber) },
                { label: 'Unit Rate', value: formatCurrency(item.unitRate) },
                { label: 'Quantity', value: item.quantity },
                { label: 'Unit', value: item.unit || 'N/A' },
                { label: 'HSN Code', value: item.hsnCode || 'N/A' },
                { label: 'GST %', value: `${item.gstPercentage || 0}%` },
                { label: 'Discount %', value: `${item.discountPercentage || 0}%` },
                { label: 'Discount Amount', value: formatCurrency(item.discountAmount) }
              ]}
              actions={[
                {
                  label: 'Select Material',
                  icon: '🔍',
                  onClick: () => openMaterialSelector(index),
                  disabled: !hospital || !surgicalCategory
                },
                ...(inquiryItems.length > 1 ? [{
                  label: 'Remove Item',
                  icon: '🗑️',
                  variant: 'danger',
                  onClick: () => removeItem(index)
                }] : [])
              ]}
            />
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
