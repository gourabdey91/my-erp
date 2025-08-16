import React, { useState, useEffect } from 'react';
import MaterialSelector from '../inquiry/MaterialSelector';
import { materialAPI } from '../../services/materialAPI';
import '../../shared/styles/unified-design.css';

const TemplateItems = ({ 
  items = [], 
  surgicalCategories = [], 
  discountApplicable = false, 
  onChange, 
  errors, 
  disabled = false 
}) => {
  const [templateItems, setTemplateItems] = useState(items);
  const [itemErrors, setItemErrors] = useState({});
  const [materialSelectorOpen, setMaterialSelectorOpen] = useState(false);
  const [selectedItemIndex, setSelectedItemIndex] = useState(null);
  const [companyDetails, setCompanyDetails] = useState(null);

  // Create empty item
  const createEmptyItem = (serialNumber) => ({
    serialNumber,
    materialNumber: '',
    materialDescription: '',
    hsnCode: '',
    unitRate: '',
    gstPercentage: '',
    quantity: '',
    unit: '',
    discountPercentage: 0,
    discountAmount: 0,
    totalAmount: 0,
    gstAmount: 0,
    cgstAmount: 0,
    sgstAmount: 0,
    igstAmount: 0,
    currency: 'INR'
  });

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
    fetchCompanyDetails();
    
    if (items.length === 0) {
      const emptyItem = createEmptyItem(1);
      setTemplateItems([emptyItem]);
    } else {
      setTemplateItems(items);
    }
  }, [items]);

  // Fetch material by number
  const fetchMaterialByNumber = async (materialNumber) => {
    try {
      const response = await materialAPI.getByMaterialNumber(materialNumber);
      if (response.success && response.data) {
        return response.data;
      }
      return null;
    } catch (error) {
      console.error('Error fetching material:', error);
      return null;
    }
  };

  // Calculate GST amounts
  const calculateGSTAmounts = (baseAmount, gstPercentage, customerStateCode, companyStateCode) => {
    const gstAmount = (baseAmount * gstPercentage) / 100;
    const cgstAmount = gstAmount * 0.5; // Always 50%
    
    // Same state: SGST = 50%, IGST = 0
    // Different state: SGST = 0, IGST = 50%
    const isSameState = customerStateCode === companyStateCode;
    const sgstAmount = isSameState ? gstAmount * 0.5 : 0;
    const igstAmount = isSameState ? 0 : gstAmount * 0.5;
    
    return {
      gstAmount: Math.round(gstAmount * 100) / 100,
      cgstAmount: Math.round(cgstAmount * 100) / 100,
      sgstAmount: Math.round(sgstAmount * 100) / 100,
      igstAmount: Math.round(igstAmount * 100) / 100
    };
  };

  // Calculate item total
  const calculateItemTotal = (item) => {
    const unitRate = parseFloat(item.unitRate) || 0;
    const quantity = parseFloat(item.quantity) || 0;
    const gstPercentage = parseFloat(item.gstPercentage) || 0;
    const discountPercentage = parseFloat(item.discountPercentage) || 0;
    const discountAmount = parseFloat(item.discountAmount) || 0;

    const baseAmount = unitRate * quantity;
    
    // Calculate discount
    const calculatedDiscountAmount = discountAmount || ((baseAmount * discountPercentage) / 100);
    
    // Calculate GST
    const gstAmounts = calculateGSTAmounts(
      baseAmount, 
      gstPercentage, 
      'DEFAULT', // Customer state code - you might want to make this configurable
      companyDetails?.stateCode || 'DEFAULT'
    );
    
    const totalAmount = baseAmount + gstAmounts.gstAmount - calculatedDiscountAmount;
    
    return {
      ...gstAmounts,
      discountAmount: Math.round(calculatedDiscountAmount * 100) / 100,
      totalAmount: Math.round(totalAmount * 100) / 100
    };
  };

  // Handle input change
  const handleInputChange = async (index, field, value) => {
    if (disabled) return;

    const updatedItems = [...templateItems];
    const item = { ...updatedItems[index] };

    // Handle material number change
    if (field === 'materialNumber') {
      item.materialNumber = value;
      
      if (value && value.length >= 3) {
        const materialData = await fetchMaterialByNumber(value);
        if (materialData) {
          item.materialDescription = materialData.description;
          item.hsnCode = materialData.hsnCode;
          item.unitRate = materialData.assignedInstitutionalPrice || materialData.mrp || '';
          item.gstPercentage = materialData.gstPercentage || '';
          item.unit = materialData.unit || '';
        }
      } else if (!value) {
        // Clear material-related fields when material number is cleared
        item.materialDescription = '';
        item.hsnCode = '';
        item.unitRate = '';
        item.gstPercentage = '';
        item.unit = '';
      }
    } else {
      item[field] = value;
    }

    // Recalculate totals if relevant fields changed
    if (['unitRate', 'quantity', 'gstPercentage', 'discountPercentage', 'discountAmount'].includes(field)) {
      const calculations = calculateItemTotal(item);
      Object.assign(item, calculations);
    }

    updatedItems[index] = item;
    setTemplateItems(updatedItems);
    onChange(updatedItems);
  };

  // Add new item
  const handleAddItem = () => {
    if (disabled) return;
    
    const newSerialNumber = templateItems.length + 1;
    const newItem = createEmptyItem(newSerialNumber);
    const updatedItems = [...templateItems, newItem];
    setTemplateItems(updatedItems);
    onChange(updatedItems);
  };

  // Remove item
  const handleRemoveItem = (index) => {
    if (disabled) return;
    
    if (templateItems.length <= 1) {
      return; // Don't allow removing the last item
    }
    
    const updatedItems = templateItems.filter((_, i) => i !== index);
    // Renumber serial numbers
    const renumberedItems = updatedItems.map((item, i) => ({
      ...item,
      serialNumber: i + 1
    }));
    
    setTemplateItems(renumberedItems);
    onChange(renumberedItems);
  };

  // Open material selector
  const handleMaterialSelector = (index) => {
    if (disabled) return;
    
    setSelectedItemIndex(index);
    setMaterialSelectorOpen(true);
  };

  // Handle material selection
  const handleMaterialSelect = (material) => {
    if (selectedItemIndex !== null) {
      handleInputChange(selectedItemIndex, 'materialNumber', material.materialNumber);
    }
    setMaterialSelectorOpen(false);
    setSelectedItemIndex(null);
  };

  return (
    <div className="unified-form-section">
      <div className="template-items-header">
        <h3 className="template-items-title">Template Items</h3>
        <div className={`template-discount-indicator ${discountApplicable ? 'enabled' : 'disabled'}`}>
          {discountApplicable ? '✓ Discount columns enabled' : '✗ Discount columns disabled'}
        </div>
      </div>

      {errors && <div className="unified-form-error">{errors}</div>}

      <div className="unified-table-responsive">
        <table className="unified-table">
          <thead>
            <tr>
              <th>S.No</th>
              <th>Material Number</th>
              <th>Material Description</th>
              <th>HSN Code</th>
              <th>Unit Rate</th>
              <th>GST %</th>
              <th>Quantity</th>
              <th>Unit</th>
              {discountApplicable && <th>Discount %</th>}
              {discountApplicable && <th>Discount Amount</th>}
              <th>Total Amount</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {templateItems.map((item, index) => (
              <React.Fragment key={index}>
                {/* Main row */}
                <tr>
                  <td>{item.serialNumber}</td>
                  <td>
                    <div className="unified-form-input-group">
                      <input
                        type="text"
                        className="unified-form-input"
                        value={item.materialNumber || ''}
                        onChange={(e) => handleInputChange(index, 'materialNumber', e.target.value)}
                        placeholder="Material Number"
                        disabled={disabled}
                      />
                      <button
                        type="button"
                        className="unified-btn unified-btn-secondary unified-btn-sm"
                        onClick={() => handleMaterialSelector(index)}
                        disabled={disabled}
                      >
                        📋
                      </button>
                    </div>
                  </td>
                  <td>
                    <input
                      type="text"
                      className="unified-form-input"
                      value={item.materialDescription || ''}
                      onChange={(e) => handleInputChange(index, 'materialDescription', e.target.value)}
                      placeholder="Material Description"
                      disabled={disabled}
                    />
                  </td>
                  <td>
                    <input
                      type="text"
                      className="unified-form-input"
                      value={item.hsnCode || ''}
                      onChange={(e) => handleInputChange(index, 'hsnCode', e.target.value)}
                      placeholder="HSN Code"
                      disabled={disabled}
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      className="unified-form-input"
                      value={item.unitRate || ''}
                      onChange={(e) => handleInputChange(index, 'unitRate', e.target.value)}
                      placeholder="0.00"
                      step="0.01"
                      min="0"
                      disabled={disabled}
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      className="unified-form-input"
                      value={item.gstPercentage || ''}
                      onChange={(e) => handleInputChange(index, 'gstPercentage', e.target.value)}
                      placeholder="0.00"
                      step="0.01"
                      min="0"
                      max="100"
                      disabled={disabled}
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      className="unified-form-input"
                      value={item.quantity || ''}
                      onChange={(e) => handleInputChange(index, 'quantity', e.target.value)}
                      placeholder="0"
                      step="0.01"
                      min="0.01"
                      disabled={disabled}
                    />
                  </td>
                  <td>
                    <input
                      type="text"
                      className="unified-form-input"
                      value={item.unit || ''}
                      onChange={(e) => handleInputChange(index, 'unit', e.target.value)}
                      placeholder="Unit"
                      disabled={disabled}
                    />
                  </td>
                  {discountApplicable && (
                    <td>
                      <input
                        type="number"
                        className="unified-form-input"
                        value={item.discountPercentage || ''}
                        onChange={(e) => handleInputChange(index, 'discountPercentage', e.target.value)}
                        placeholder="0.00"
                        step="0.01"
                        min="0"
                        max="100"
                        disabled={disabled}
                      />
                    </td>
                  )}
                  {discountApplicable && (
                    <td>
                      <input
                        type="number"
                        className="unified-form-input"
                        value={item.discountAmount || ''}
                        onChange={(e) => handleInputChange(index, 'discountAmount', e.target.value)}
                        placeholder="0.00"
                        step="0.01"
                        min="0"
                        disabled={disabled}
                      />
                    </td>
                  )}
                  <td>
                    <span className="unified-amount-text">
                      ₹{parseFloat(item.totalAmount || 0).toLocaleString('en-IN', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                      })}
                    </span>
                  </td>
                  <td>
                    <div className="unified-table-actions">
                      <button
                        type="button"
                        className="unified-table-action delete"
                        onClick={() => handleRemoveItem(index)}
                        disabled={disabled || templateItems.length <= 1}
                        title="Remove Item"
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>

                {/* Secondary row for additional info */}
                <tr className="unified-table-secondary-row">
                  <td colSpan={discountApplicable ? 12 : 10}>
                    <div className="unified-secondary-row-content">
                      <div className="unified-secondary-field">
                        <strong>Material Description:</strong> {item.materialDescription || '-'}
                      </div>
                      <div className="unified-secondary-field">
                        <strong>HSN Code:</strong> {item.hsnCode || '-'}
                      </div>
                      <div className="unified-secondary-field">
                        <strong>GST %:</strong> {item.gstPercentage || '0'}%
                      </div>
                      <div className="unified-secondary-field">
                        <strong>GST Amount:</strong> ₹{parseFloat(item.gstAmount || 0).toFixed(2)}
                      </div>
                      <div className="unified-secondary-field">
                        <strong>CGST:</strong> ₹{parseFloat(item.cgstAmount || 0).toFixed(2)}
                      </div>
                      <div className="unified-secondary-field">
                        <strong>SGST:</strong> ₹{parseFloat(item.sgstAmount || 0).toFixed(2)}
                      </div>
                      <div className="unified-secondary-field">
                        <strong>IGST:</strong> ₹{parseFloat(item.igstAmount || 0).toFixed(2)}
                      </div>
                    </div>
                  </td>
                </tr>
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add Item Button */}
      <div className="unified-form-actions" style={{ marginTop: '16px' }}>
        <button
          type="button"
          className="unified-btn unified-btn-primary"
          onClick={handleAddItem}
          disabled={disabled}
        >
          Add Item
        </button>
      </div>

      {/* Material Selector Modal */}
      {materialSelectorOpen && (
        <MaterialSelector
          isOpen={materialSelectorOpen}
          onClose={() => {
            setMaterialSelectorOpen(false);
            setSelectedItemIndex(null);
          }}
          onSelect={handleMaterialSelect}
          surgicalCategories={surgicalCategories}
        />
      )}
    </div>
  );
};

export default TemplateItems;
