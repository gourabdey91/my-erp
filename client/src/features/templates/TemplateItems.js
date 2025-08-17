import React, { useState, useEffect } from 'react';
import SimpleMaterialSelector from './SimpleMaterialSelector';
import { materialAPI } from '../../services/materialAPI';
import '../../shared/styles/unified-design.css';

const TemplateItems = ({ 
  items = [], 
  discountApplicable = false, 
  hospitalDependent = false,
  hospital = '',
  surgicalCategory = '',
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

  // Handle input change with GST recalculation
  const handleInputChange = (index, field, value) => {
    if (disabled) return;

    const updatedItems = [...templateItems];
    updatedItems[index] = { ...updatedItems[index], [field]: value };

    // Recalculate totals for fields that affect calculations
    if (['unitRate', 'quantity', 'gstPercentage', 'discountPercentage', 'discountAmount'].includes(field)) {
      const customerStateCode = hospitalDependent && hospital ? (hospital.stateCode || '') : '';
      const companyStateCode = companyDetails?.compliance?.stateCode || '';
      
      console.log('Input change - recalculating GST with state codes:', { customerStateCode, companyStateCode, field, value });
      
      const calculations = calculateItemTotal(updatedItems[index], customerStateCode, companyStateCode);
      
      // Update all calculated fields
      updatedItems[index].gstAmount = calculations.gstAmount;
      updatedItems[index].totalAmount = calculations.totalAmount;
      
      if (field === 'discountPercentage' && parseFloat(value) > 0) {
        // Clear discount amount when percentage is set
        updatedItems[index].discountAmount = 0;
      } else if (field === 'discountAmount' && parseFloat(value) > 0) {
        // Clear discount percentage when amount is set
        updatedItems[index].discountPercentage = 0;
      }
    }

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

  // Calculate item totals
  const calculateItemTotal = (item, customerStateCode = '', companyStateCode = '') => {
    const unitRate = parseFloat(item.unitRate) || 0;
    const quantity = parseFloat(item.quantity) || 0;
    const gstPercentage = parseFloat(item.gstPercentage) || 0;
    const discountPercentage = parseFloat(item.discountPercentage) || 0;
    const discountAmount = parseFloat(item.discountAmount) || 0;

    const baseAmount = unitRate * quantity;
    const gstAmount = Math.round((baseAmount * gstPercentage) / 100 * 100) / 100;
    
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

  // Check if same state for GST calculations
  const isSameState = () => {
    if (!hospitalDependent || !hospital) return false;
    
    // For hospital-dependent templates, get state codes from hospital and company
    const customerStateCode = hospital?.stateCode || '';
    const companyStateCode = companyDetails?.compliance?.stateCode || '';
    return customerStateCode === companyStateCode;
  };

  // Open material selector
  const handleMaterialSelector = (index) => {
    if (disabled) return;
    
    setSelectedItemIndex(index);
    setMaterialSelectorOpen(true);
  };

  // Handle material selection with auto-population
  const handleMaterialSelect = (material) => {
    if (selectedItemIndex !== null) {
      const updatedItems = [...templateItems];
      
      // Auto-populate all fields from material data
      updatedItems[selectedItemIndex] = {
        ...updatedItems[selectedItemIndex],
        materialNumber: material.materialNumber,
        materialDescription: material.description,
        hsnCode: material.hsnCode,
        unitRate: hospitalDependent && hospital 
          ? (material.assignedInstitutionalPrice || material.institutionalPrice || material.mrp || 0)
          : (material.institutionalPrice || material.mrp || 0),
        gstPercentage: material.gstPercentage || 0,
        unit: material.unit,
        isFromMaster: true // Flag to indicate this is from material master
      };
      
      // If quantity exists, recalculate GST amounts
      if (parseFloat(updatedItems[selectedItemIndex].quantity) > 0) {
        const customerStateCode = hospitalDependent && hospital ? (hospital.stateCode || '') : '';
        const companyStateCode = companyDetails?.compliance?.stateCode || '';
        
        console.log('Material select - calculating GST with state codes:', { customerStateCode, companyStateCode });
        
        const calculations = calculateItemTotal(updatedItems[selectedItemIndex], customerStateCode, companyStateCode);
        
        // Update all calculated fields
        updatedItems[selectedItemIndex].gstAmount = calculations.gstAmount;
        updatedItems[selectedItemIndex].totalAmount = calculations.totalAmount;
      }
      
      setTemplateItems(updatedItems);
      onChange(updatedItems);
    }
    setMaterialSelectorOpen(false);
    setSelectedItemIndex(null);
  };

  // Calculate dynamic colspan for description row
  const getDescriptionColspan = () => {
    // Base columns: Material No. + Unit Rate + Quantity + Unit = 4
    let colspan = 4;
    
    // Add discount columns if applicable (Disc % and Disc Amt)
    if (discountApplicable) {
      colspan += 2;
    }
    
    return colspan;
  };

  // Calculate dynamic colspan for GST row
  const getGstColspan = () => {
    // Base: (Disc % + Disc Amt if applicable) + CGST + (SGST/IGST) + GST Amount + Total Amount + Actions
    let colspan = 5; // CGST + (SGST/IGST) + GST Amount + Total Amount + Actions
    
    // Add discount columns if applicable
    if (discountApplicable) {
      colspan += 2;
    }
    
    // Add extra column if showing both SGST and IGST (template mode)
    if (!hospitalDependent || !hospital) {
      colspan += 1; // Extra column for both SGST and IGST
    }
    
    return colspan;
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
                  <th>GST Amount</th>
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
                      
                      {/* Total GST Amount */}
                      <td data-label="GST Amount">
                        <input
                          type="text"
                          className="unified-input text-center"
                          value={`₹${parseFloat(item.gstAmount || 0).toLocaleString('en-IN', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2
                          })}`}
                          readOnly
                          disabled
                        />
                      </td>
                      
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
                      <td colSpan={getDescriptionColspan()} className="material-description-cell">
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
                      <td colSpan={getGstColspan()} className="hsn-code-cell">
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

          {/* Mobile Cards View */}
          <div className="unified-mobile-cards">
            {templateItems.map((item, index) => (
              <div key={`mobile-${index}`} className="unified-mobile-card">
                <div className="unified-card-header">
                  <div>
                    <h3 className="unified-card-title">
                      {item.materialNumber || `Item ${item.serialNumber}`}
                    </h3>
                    {item.materialDescription && (
                      <div className="card-subtitle">{item.materialDescription}</div>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="unified-card-badge">
                      ₹{parseFloat(item.totalAmount || 0).toLocaleString('en-IN', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                      })}
                    </span>
                    <div className="unified-card-menu">
                      <button
                        type="button"
                        className="unified-menu-trigger"
                        onClick={() => {
                          // Toggle dropdown logic can be added here if needed
                        }}
                      >
                        ⋮
                      </button>
                    </div>
                  </div>
                </div>
                
                <div className="unified-card-content">
                  <div className="mobile-field-group">
                    <label className="mobile-field-label">Serial No.</label>
                    <input
                      type="text"
                      className="unified-input mobile-field-input"
                      value={item.serialNumber}
                      onChange={(e) => handleInputChange(index, 'serialNumber', e.target.value)}
                      disabled={disabled}
                    />
                  </div>

                  <div className="mobile-field-group">
                    <label className="mobile-field-label">Material No.</label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input
                        type="text"
                        className="unified-input mobile-field-input"
                        value={item.materialNumber}
                        placeholder="Click Browse to select material"
                        readOnly
                        style={{ flex: 1 }}
                      />
                      <button
                        type="button"
                        className="unified-btn unified-btn-secondary unified-btn-sm"
                        onClick={() => {
                          setSelectedItemIndex(index);
                          setMaterialSelectorOpen(true);
                        }}
                        disabled={disabled}
                        style={{ whiteSpace: 'nowrap' }}
                      >
                        Browse
                      </button>
                    </div>
                  </div>

                  <div className="mobile-field-group">
                    <label className="mobile-field-label">Unit Rate</label>
                    <input
                      type="number"
                      className="unified-input mobile-field-input"
                      value={item.unitRate}
                      onChange={(e) => handleInputChange(index, 'unitRate', e.target.value)}
                      min="0"
                      step="0.01"
                      disabled={disabled}
                    />
                  </div>

                  <div className="mobile-field-group">
                    <label className="mobile-field-label">Quantity</label>
                    <input
                      type="number"
                      className="unified-input mobile-field-input"
                      value={item.quantity}
                      onChange={(e) => handleInputChange(index, 'quantity', e.target.value)}
                      min="0.01"
                      step="0.01"
                      disabled={disabled}
                    />
                  </div>

                  <div className="mobile-field-group">
                    <label className="mobile-field-label">Unit</label>
                    <input
                      type="text"
                      className="unified-input mobile-field-input"
                      value={item.unit}
                      onChange={(e) => handleInputChange(index, 'unit', e.target.value)}
                      disabled={disabled}
                    />
                  </div>

                  {discountApplicable && (
                    <>
                      <div className="mobile-field-group">
                        <label className="mobile-field-label">Discount %</label>
                        <input
                          type="number"
                          className="unified-input mobile-field-input"
                          value={item.discountPercentage}
                          onChange={(e) => handleInputChange(index, 'discountPercentage', e.target.value)}
                          min="0"
                          max="100"
                          step="0.01"
                          disabled={disabled}
                        />
                      </div>

                      <div className="mobile-field-group">
                        <label className="mobile-field-label">Discount Amount</label>
                        <input
                          type="number"
                          className="unified-input mobile-field-input"
                          value={item.discountAmount}
                          readOnly
                          disabled={disabled}
                        />
                      </div>
                    </>
                  )}

                  <div className="mobile-field-group">
                    <label className="mobile-field-label">Total Amount</label>
                    <input
                      type="number"
                      className="unified-input mobile-field-input"
                      value={item.totalAmount}
                      readOnly
                      disabled={disabled}
                    />
                  </div>

                  {/* Mobile Actions */}
                  <div className="mobile-field-group">
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                      {templateItems.length > 1 && (
                        <button
                          type="button"
                          className="unified-btn unified-btn-danger unified-btn-sm"
                          onClick={() => handleRemoveItem(index)}
                          disabled={disabled}
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
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
              hospital={hospitalDependent ? hospital : null}
              surgicalCategory={surgicalCategory}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default TemplateItems;
