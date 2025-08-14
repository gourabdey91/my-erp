import React, { useState, useEffect } from 'react';
import MaterialSelector from './MaterialSelector';
import '../../shared/styles/unified-design.css';

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
    
    // Handle serial number changes - sort items when serial number is modified
    if (field === 'serialNumber') {
      const serialNum = parseInt(value) || 1;
      updatedItems[index].serialNumber = serialNum;
      
      // Sort items by serial number and renumber them sequentially
      const sortedItems = updatedItems.sort((a, b) => a.serialNumber - b.serialNumber);
      const renumberedItems = sortedItems.map((item, i) => ({
        ...item,
        serialNumber: i + 1
      }));
      
      setInquiryItems(renumberedItems);
      onItemsChange(renumberedItems);
    } else {
      setInquiryItems(updatedItems);
      onItemsChange(updatedItems);
    }
    
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

  // Format decimal input value for display
  const formatDecimalInput = (value) => {
    const numValue = parseFloat(value) || 0;
    return numValue.toFixed(2);
  };

  // Handle formatted decimal input change
  const handleDecimalInputChange = (index, field, value) => {
    // Remove any non-numeric characters except decimal point
    const cleanValue = value.replace(/[^\d.]/g, '');
    handleInputChange(index, field, cleanValue);
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
          {/* Items Table */}
          <div className="unified-table-responsive">
            <table className="unified-table unified-table-sm">
              <thead>
                <tr>
                  <th style={{ width: '60px' }}>S.No</th>
                  <th style={{ width: '120px' }}>Material Number *</th>
                  <th style={{ width: '120px' }}>HSN Code *</th>
                  <th style={{ width: '100px' }}>Unit Rate *</th>
                  <th style={{ width: '80px' }}>GST % *</th>
                  <th style={{ width: '80px' }}>Quantity *</th>
                  <th style={{ width: '60px' }}>Unit</th>
                  <th style={{ width: '80px' }}>Disc %</th>
                  <th style={{ width: '100px' }}>Disc Amt</th>
                  <th style={{ width: '120px' }}>Total Amount</th>
                  <th style={{ width: '60px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {inquiryItems.map((item, index) => (
                  <tr key={index}>
                    <td className="text-center">
                      <input
                        type="number"
                        className="unified-input-sm text-center"
                        style={{ width: '50px' }}
                        value={item.serialNumber}
                        onChange={(e) => handleInputChange(index, 'serialNumber', e.target.value)}
                        min="1"
                        title="Edit to reorder items. Items will be sorted and renumbered automatically."
                      />
                    </td>
                    <td>
                      <div className="material-input-group">
                        <input
                          type="text"
                          className={`unified-input-sm ${errors[`${index}_materialNumber`] ? 'error' : ''}`}
                          value={item.materialNumber}
                          onChange={(e) => handleInputChange(index, 'materialNumber', e.target.value)}
                          placeholder="Enter material number"
                          readOnly={!!item.materialDescription} // Read-only if selected from material master
                        />
                        <button
                          type="button"
                          className="material-selector-btn"
                          onClick={() => openMaterialSelector(index)}
                          disabled={!hospital || !surgicalCategory}
                          title={!hospital || !surgicalCategory ? 'Please select hospital and surgical category first' : 'Select from material master'}
                        >
                          📋 Select
                        </button>
                      </div>
                      {item.materialDescription && (
                        <small style={{ color: 'var(--gray-600)', fontSize: '0.75rem', marginTop: '0.25rem', display: 'block' }}>
                          {item.materialDescription}
                        </small>
                      )}
                      {errors[`${index}_materialNumber`] && (
                        <span className="unified-error-text">{errors[`${index}_materialNumber`]}</span>
                      )}
                    </td>
                    <td>
                      <input
                        type="text"
                        className={`unified-input-sm ${errors[`${index}_hsnCode`] ? 'error' : ''}`}
                        value={item.hsnCode}
                        onChange={(e) => handleInputChange(index, 'hsnCode', e.target.value)}
                        placeholder="HSN Code"
                        readOnly={!!item.materialDescription} // Read-only if selected from material master
                        title={item.materialDescription ? "HSN Code is derived from material master" : "Enter HSN Code"}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        className={`unified-input-sm ${errors[`${index}_unitRate`] ? 'error' : ''}`}
                        value={item.unitRate}
                        onChange={(e) => handleInputChange(index, 'unitRate', e.target.value)}
                        placeholder="0.00"
                        min="0"
                        step="0.01"
                        style={{ textAlign: 'right' }}
                        readOnly={!!item.materialDescription} // Read-only if selected from material master
                        title={item.materialDescription ? "Unit Rate is derived from material master" : "Enter Unit Rate"}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        className={`unified-input-sm ${errors[`${index}_gstPercentage`] ? 'error' : ''}`}
                        value={item.gstPercentage}
                        onChange={(e) => handleInputChange(index, 'gstPercentage', e.target.value)}
                        placeholder="GST%"
                        min="0"
                        max="100"
                        step="0.01"
                        readOnly={!!item.materialDescription} // Read-only if selected from material master
                        title={item.materialDescription ? "GST% is derived from material master" : "Enter GST%"}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        className={`unified-input-sm ${errors[`${index}_quantity`] ? 'error' : ''}`}
                        value={item.quantity}
                        onChange={(e) => handleInputChange(index, 'quantity', e.target.value)}
                        placeholder="0.00"
                        min="0.01"
                        step="0.01"
                        style={{ textAlign: 'right' }}
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        className="unified-input-sm"
                        value={item.unit}
                        onChange={(e) => handleInputChange(index, 'unit', e.target.value)}
                        placeholder="Unit"
                        readOnly
                        title="Unit is derived from material master"
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        className="unified-input-sm"
                        value={item.discountPercentage}
                        onChange={(e) => handleInputChange(index, 'discountPercentage', e.target.value)}
                        placeholder="0"
                        min="0"
                        max="100"
                        step="0.01"
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        className="unified-input-sm"
                        value={item.discountAmount}
                        onChange={(e) => handleInputChange(index, 'discountAmount', e.target.value)}
                        placeholder="0.00"
                        min="0"
                        step="0.01"
                        style={{ textAlign: 'right' }}
                      />
                    </td>
                    <td className="text-right">
                      <span className="unified-amount-text">
                        {formatCurrency(item.totalAmount)}
                      </span>
                    </td>
                    <td className="text-center">
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
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
