import React, { useState, useEffect } from 'react';
import SimpleMaterialSelector from './SimpleMaterialSelector';
import { materialAPI } from '../../services/materialAPI';
import '../../shared/styles/unified-design.css';

const TemplateItems = ({ 
  items = [], 
  surgicalCategories = [], 
  discountApplicable = false, 
  hospitalDependent = false,
  hospital = '',
  onChange, 
  errors, 
  disabled = false 
}) => {
  const [templateItems, setTemplateItems] = useState(items);
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
    <div className="unified-card">
      <div className="unified-card-content">
        <div className="inquiry-items-container">
          <div className="form-section-title">Template Items</div>

          {errors && <div className="unified-error-text">{errors}</div>}

          {/* Items Table - Matching inquiry design */}
          <div className="unified-table-responsive">
            <table className="unified-table inquiry-items-table">
              <thead>
                <tr>
                  <th>S.No</th>
                  <th>Material No.</th>
                  <th>Unit Rate</th>
                  <th>Quantity</th>
                  <th>Unit</th>
                  {discountApplicable && <th>Disc %</th>}
                  {discountApplicable && <th>Disc Amt</th>}
                  <th>Total Amount</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {templateItems.map((item, index) => (
                  <React.Fragment key={index}>
                    {/* Main row */}
                    <tr className="inquiry-main-row">
                      <td data-label="S.No" className="text-center">
                        <input
                          type="text"
                          className="unified-input text-center"
                          style={{ width: '50px' }}
                          value={item.serialNumber.toString().padStart(2, '0')}
                          onChange={(e) => {
                            const numericValue = e.target.value.replace(/\D/g, '');
                            handleInputChange(index, 'serialNumber', numericValue || '1');
                          }}
                          placeholder="01"
                          disabled={disabled}
                        />
                      </td>
                      
                      <td data-label="Material No.">
                        <div className="material-number-container">
                          <input
                            type="text"
                            className="unified-input"
                            value={item.materialNumber || ''}
                            onChange={(e) => handleInputChange(index, 'materialNumber', e.target.value)}
                            placeholder="Enter material number"
                            disabled={disabled}
                          />
                          <button
                            type="button"
                            className="material-selector-btn"
                            onClick={() => handleMaterialSelector(index)}
                            disabled={disabled}
                            title="Select from material master"
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M21 21L16.514 16.506M19 10.5C19 15.194 15.194 19 10.5 19C5.806 19 2 15.194 2 10.5C2 5.806 5.806 2 10.5 2C15.194 2 19 5.806 19 10.5Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          </button>
                        </div>
                      </td>
                      
                      <td data-label="Unit Rate">
                        <input
                          type="number"
                          className="unified-input"
                          value={item.unitRate || ''}
                          onChange={(e) => handleInputChange(index, 'unitRate', e.target.value)}
                          placeholder="0.00"
                          step="0.01"
                          min="0"
                          disabled={disabled}
                        />
                      </td>
                      
                      <td data-label="Quantity">
                        <input
                          type="number"
                          className="unified-input text-center"
                          value={item.quantity || ''}
                          onChange={(e) => handleInputChange(index, 'quantity', e.target.value)}
                          placeholder="0"
                          step="0.01"
                          min="0.01"
                          disabled={disabled}
                        />
                      </td>
                      
                      <td data-label="Unit">
                        <input
                          type="text"
                          className="unified-input text-center"
                          value={item.unit || ''}
                          onChange={(e) => handleInputChange(index, 'unit', e.target.value)}
                          placeholder="Unit"
                          disabled={disabled}
                        />
                      </td>
                      
                      {discountApplicable && (
                        <td data-label="Disc %">
                          <input
                            type="number"
                            className="unified-input text-center"
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
                        <td data-label="Disc Amt">
                          <input
                            type="number"
                            className="unified-input"
                            value={item.discountAmount || ''}
                            onChange={(e) => handleInputChange(index, 'discountAmount', e.target.value)}
                            placeholder="0.00"
                            step="0.01"
                            min="0"
                            disabled={disabled}
                          />
                        </td>
                      )}
                      
                      <td data-label="Total Amount">
                        <input
                          type="text"
                          className="unified-input total-amount"
                          value={`₹${parseFloat(item.totalAmount || 0).toLocaleString('en-IN', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2
                          })}`}
                          readOnly
                          disabled
                        />
                      </td>
                      
                      <td data-label="Actions">
                        <div className="item-actions">
                          <button
                            type="button"
                            className="action-btn delete-btn"
                            onClick={() => handleRemoveItem(index)}
                            disabled={disabled || templateItems.length <= 1}
                            title="Remove Item"
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M3 6H5H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                              <path d="M8 6V4C8 3.46957 8.21071 2.96086 8.58579 2.58579C8.96086 2.21071 9.46957 2 10 2H14C14.5304 2 15.0391 2.21071 15.4142 2.58579C15.7893 2.96086 16 3.46957 16 4V6M19 6V20C19 20.5304 18.7893 21.0391 18.4142 21.4142C18.0391 21.7893 17.5304 22 17 22H7C6.46957 22 5.96086 21.7893 5.58579 21.4142C5.21071 21.0391 5 20.5304 5 20V6H19Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                              <path d="M10 11V17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                              <path d="M14 11V17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* Description row */}
                    <tr className="inquiry-description-row">
                      <td className="description-spacer"></td>
                      <td colSpan={discountApplicable ? 6 : 4} className="material-description-cell">
                        <div className="material-description-container">
                          <span className="description-label">Desc:</span>
                          <div className="description-content">
                            <span className="description-text">
                              {item.materialDescription ? (
                                item.materialDescription
                              ) : (
                                <span className="description-placeholder">Material description will appear here</span>
                              )}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="description-spacer"></td>
                      <td className="description-spacer"></td>
                    </tr>

                    {/* HSN and GST row */}
                    <tr className="inquiry-gst-row">
                      <td className="description-spacer"></td>
                      <td colSpan={2} className="hsn-code-cell">
                        <div className="hsn-code-container">
                          <span className="hsn-label">HSN:</span>
                          <div className="hsn-content">
                            <span className="hsn-text">
                              {item.hsnCode ? (
                                item.hsnCode
                              ) : (
                                <span className="hsn-placeholder">-</span>
                              )}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td colSpan={discountApplicable ? 3 : 1} className="hsn-code-cell">
                        <div className="gst-code-container">
                          <span className="gst-label">GST%:</span>
                          <div className="gst-content">
                            <span className="gst-text">
                              {item.gstPercentage ? (
                                `${item.gstPercentage}%`
                              ) : (
                                <span className="gst-placeholder">-</span>
                              )}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="description-spacer"></td>
                      <td className="description-spacer"></td>
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
            <SimpleMaterialSelector
              isOpen={materialSelectorOpen}
              onClose={() => {
                setMaterialSelectorOpen(false);
                setSelectedItemIndex(null);
              }}
              onSelect={handleMaterialSelect}
              surgicalCategories={surgicalCategories}
              hospital={hospitalDependent ? hospital : null}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default TemplateItems;
