import React, { useState, useEffect, useCallback } from 'react';
import { inquiryAPI } from '../../services/inquiryAPI';
import InquiryItems from './InquiryItems';
import '../../shared/styles/unified-design.css';
import './Inquiry.css';

const InquiryForm = ({ inquiry, dropdownData, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    hospitalId: inquiry?.hospitalId || '',
    inquiryNumber: inquiry?.inquiryNumber || '',
    inquiryDate: inquiry?.inquiryDate || new Date().toISOString().split('T')[0],
    patientName: inquiry?.patientName || '',
    patientUHID: inquiry?.patientUHID || '',
    hospital: inquiry?.hospital || '',
    surgicalProcedure: inquiry?.surgicalProcedure || '',
    surgicalCategories: inquiry?.surgicalCategories || [], // Multiple categories from procedure
    paymentMethod: inquiry?.paymentMethod || '',
    categoryLimits: inquiry?.categoryLimits || [], // Individual category limits
    limit: {
      amount: inquiry?.limit?.amount || '',
      currency: inquiry?.limit?.currency || 'INR'
    },
    items: inquiry?.items || [],
    totalInquiryAmount: inquiry?.totalInquiryAmount || 0
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [filteredSurgicalCategories, setFilteredSurgicalCategories] = useState([]);
  const [filteredSurgicalProcedures, setFilteredSurgicalProcedures] = useState([]);

  // Fetch surgical procedures when category or payment method changes
  const fetchSurgicalProcedures = useCallback(async (hospitalId, categoryId, paymentMethodId) => {
    if (!hospitalId) {
      setFilteredSurgicalProcedures([]);
      return;
    }

    try {
      const response = await inquiryAPI.getProceduresByHospital(hospitalId, {
        category: categoryId,
        paymentMethod: paymentMethodId
      });
      
      if (response && response.success && response.data) {
        setFilteredSurgicalProcedures(response.data);
      } else {
        setFilteredSurgicalProcedures([]);
      }
    } catch (error) {
      console.error('Error fetching surgical procedures:', error);
      setFilteredSurgicalProcedures([]);
    }
  }, []);

  // Fetch surgical categories when hospital changes
  const fetchSurgicalCategories = useCallback(async (hospitalId) => {
    if (!hospitalId) {
      setFilteredSurgicalCategories([]);
      return;
    }

    try {
      const response = await inquiryAPI.getSurgicalCategoriesByHospital(hospitalId);
      
      if (response && response.success && response.data) {
        setFilteredSurgicalCategories(response.data);
      } else {
        setFilteredSurgicalCategories([]);
      }
    } catch (error) {
      console.error('Error fetching surgical categories:', error);
      setFilteredSurgicalCategories([]);
    }
  }, []);

  // Helper function to check if procedure has valid limits (non-zero)
  const procedureHasValidLimits = useCallback(() => {
    if (!formData.surgicalCategories || formData.surgicalCategories.length === 0) {
      return false;
    }
    
    // Check if any category has a limit > 0
    return formData.surgicalCategories.some(category => (category.limit || 0) > 0);
  }, [formData.surgicalCategories]);

  // Helper function to determine if limit field should be editable
  const isLimitFieldEditable = useCallback(() => {
    // If no procedure is selected, field is editable
    if (!formData.surgicalProcedure) {
      return true;
    }
    
    // If procedure has no categories or all limits are zero, field is editable
    return !procedureHasValidLimits();
  }, [formData.surgicalProcedure, procedureHasValidLimits]);

  // Initialize form data when inquiry changes
  useEffect(() => {
    if (inquiry) {
      // Set form data
      const newFormData = {
        inquiryNumber: inquiry.inquiryNumber || '',
        inquiryDate: inquiry.inquiryDate ? new Date(inquiry.inquiryDate).toISOString().split('T')[0] : '',
        patientName: inquiry.patientName || '',
        patientUHID: inquiry.patientUHID || '',
        hospital: inquiry.hospital?._id || inquiry.hospital || '',
        surgicalProcedure: inquiry.surgicalProcedure?._id || inquiry.surgicalProcedure || '',
        surgicalCategories: inquiry.surgicalProcedure?.items?.map(item => ({
          id: item.surgicalCategoryId?._id || item.surgicalCategoryId,
          name: item.surgicalCategoryId?.description || item.surgicalCategoryId?.name || 'Unknown Category',
          limit: item.limit || 0,
          currency: item.currency || 'INR'
        })) || [],
        paymentMethod: inquiry.paymentMethod?._id || inquiry.paymentMethod || '',
        categoryLimits: inquiry.surgicalProcedure?.items || [],
        limit: {
          amount: inquiry.limit?.amount || inquiry.surgicalProcedure?.totalLimit || '',
          currency: inquiry.limit?.currency || 'INR'
        },
        items: inquiry.items || [],
        totalInquiryAmount: inquiry.totalInquiryAmount || 0
      };
      
      setFormData(newFormData);
      
      // Fetch surgical categories for the hospital
      if (newFormData.hospital) {
        fetchSurgicalCategories(newFormData.hospital);
        
        // If payment method is available, fetch procedures
        if (newFormData.paymentMethod) {
          fetchSurgicalProcedures(newFormData.hospital, '', newFormData.paymentMethod);
        }
      }
    } else {
      // New inquiry
      setFormData({
        inquiryNumber: '',
        inquiryDate: new Date().toISOString().split('T')[0],
        patientName: '',
        patientUHID: '',
        hospital: '',
        surgicalProcedure: '',
        surgicalCategories: [],
        paymentMethod: '',
        categoryLimits: [],
        limit: {
          amount: '',
          currency: 'INR'
        },
        items: [],
        totalInquiryAmount: 0
      });
      setFilteredSurgicalCategories([]);
      setFilteredSurgicalProcedures([]);
    }
  }, [inquiry, fetchSurgicalCategories, fetchSurgicalProcedures]);

  // Handle input changes - CASCADING LOGIC LIKE MATERIAL MASTER
  const handleChange = (field, value) => {
    if (field === 'hospital') {
      // Hospital changed - clear procedure and fetch new procedures
      setFormData(prev => ({
        ...prev,
        hospital: value,
        surgicalProcedure: ''   // Clear surgical procedure when hospital changes
      }));
      
      // Fetch new surgical categories and procedures
      if (value) {
        fetchSurgicalCategories(value);
        fetchSurgicalProcedures(value, '', formData.paymentMethod); // Fetch all procedures for the hospital
      } else {
        setFilteredSurgicalCategories([]);
        setFilteredSurgicalProcedures([]);
      }
    } else if (field === 'paymentMethod') {
      // Payment method changed - clear procedure and fetch new procedures
      setFormData(prev => ({
        ...prev,
        paymentMethod: value,
        surgicalProcedure: '' // Clear surgical procedure when payment method changes
      }));
      
      // Fetch new procedures based on hospital and payment method
      if (formData.hospital) {
        fetchSurgicalProcedures(formData.hospital, '', value); // No category filter, just hospital and payment method
      } else {
        setFilteredSurgicalProcedures([]);
      }
    } else if (field === 'surgicalProcedure') {
      // Surgical procedure changed - update categories and limits from selected procedure
      const selectedProcedure = filteredSurgicalProcedures.find(proc => proc._id === value);
      
      if (selectedProcedure) {
        // Extract surgical categories and their individual limits
        const surgicalCategories = selectedProcedure.items?.map(item => ({
          id: item.surgicalCategoryId?._id || item.surgicalCategoryId,
          name: item.surgicalCategoryId?.description || item.surgicalCategoryId?.name || 'Unknown Category',
          limit: item.limit || 0,
          currency: item.currency || 'INR'
        })) || [];
        
        // Calculate total limit from all categories
        const totalLimit = surgicalCategories.reduce((sum, category) => sum + (category.limit || 0), 0);
        
        // Determine if we should use category limits or preserve user input
        const shouldUseUserInput = totalLimit === 0;
        
        setFormData(prev => ({
          ...prev,
          surgicalProcedure: value,
          surgicalCategories: surgicalCategories,
          categoryLimits: selectedProcedure.items || [],
          limit: {
            amount: shouldUseUserInput ? (prev.limit?.amount || 0) : totalLimit,
            currency: selectedProcedure.currency || prev.limit?.currency || 'INR'
          }
        }));
      } else {
        // Clear categories and limits if no procedure selected
        setFormData(prev => ({
          ...prev,
          surgicalProcedure: value,
          surgicalCategories: [],
          categoryLimits: [],
          limit: {
            amount: '',
            currency: 'INR'
          }
        }));
      }
    } else if (field === 'limit.amount') {
      // Allow manual edit of limit only if field is editable (no valid category limits)
      if (isLimitFieldEditable()) {
        setFormData(prev => ({
          ...prev,
          limit: {
            ...prev.limit,
            amount: value
          }
        }));
      }
    } else if (field === 'limit.currency') {
      // Allow manual edit of limit currency only if field is editable (no valid category limits)
      if (isLimitFieldEditable()) {
        setFormData(prev => ({
          ...prev,
          limit: {
            ...prev.limit,
            currency: value
          }
        }));
      }
    } else {
      // Regular field update
      setFormData(prev => ({
        ...prev,
        [field]: value
      }));
    }

    // Clear errors when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  // Handle items change
  const handleItemsChange = (updatedItems) => {
    // Calculate total inquiry amount
    const totalInquiryAmount = updatedItems.reduce((sum, item) => sum + (parseFloat(item.totalAmount) || 0), 0);
    
    setFormData(prev => ({
      ...prev,
      items: updatedItems,
      totalInquiryAmount: Math.round(totalInquiryAmount * 100) / 100
    }));
  };

  // Validate form
  const validateForm = () => {
    const newErrors = {};

    if (!formData.inquiryDate) {
      newErrors.inquiryDate = 'Inquiry date is required';
    }
    if (!formData.patientName.trim()) {
      newErrors.patientName = 'Patient name is required';
    } else if (formData.patientName.length > 80) {
      newErrors.patientName = 'Patient name must not exceed 80 characters';
    }
    if (!formData.patientUHID.trim()) {
      newErrors.patientUHID = 'Patient UHID is required';
    } else if (formData.patientUHID.length > 50) {
      newErrors.patientUHID = 'Patient UHID must not exceed 50 characters';
    }
    if (!formData.hospital) {
      newErrors.hospital = 'Hospital is required';
    }
    if (!formData.paymentMethod) {
      newErrors.paymentMethod = 'Payment method is required';
    }
    if (!formData.limit.amount || formData.limit.amount <= 0) {
      newErrors.limit = 'Limit amount is required and must be greater than 0';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Helper function to sort and renumber items
  const sortAndRenumberItems = (items) => {
    return items
      .sort((a, b) => (parseInt(a.serialNumber) || 999) - (parseInt(b.serialNumber) || 999))
      .map((item, index) => ({
        ...item,
        serialNumber: index + 1
      }));
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      // Sort and renumber items before submission
      const sortedItems = sortAndRenumberItems(formData.items);
      
      // Derive surgical category from selected procedure
      const selectedProcedure = filteredSurgicalProcedures.find(proc => proc._id === formData.surgicalProcedure);
      const derivedSurgicalCategory = selectedProcedure?.items?.[0]?.surgicalCategoryId?._id || 
                                      selectedProcedure?.items?.[0]?.surgicalCategoryId || null;
      
      // Clean up form data - convert empty strings to null for ObjectId fields
      const cleanedFormData = {
        ...formData,
        items: sortedItems,
        hospital: formData.hospital || null,
        surgicalCategory: derivedSurgicalCategory, // Derived from procedure, not user input
        surgicalProcedure: formData.surgicalProcedure || null,
        paymentMethod: formData.paymentMethod || null
      };
      
      await onSubmit(cleanedFormData);
    } catch (error) {
      console.error('Error submitting inquiry:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="unified-container">
      {/* Header */}
      <div className="unified-header">
        <div className="unified-header-content">
          <div className="unified-header-text">
            <h1>
              {inquiry ? 'Edit Inquiry' : 'Add New Inquiry'}
              {inquiry && formData.inquiryNumber && (
                <span className="inquiry-number-badge">#{formData.inquiryNumber}</span>
              )}
            </h1>
            <p>
              {inquiry 
                ? 'Update inquiry information and patient details with hospital-specific surgical categories.'
                : 'Create a new inquiry with patient information and hospital-specific surgical categories.'
              }
            </p>
          </div>
          <div className="unified-header-actions">
            <div className="header-total-amount">
              <span className="header-total-label">Total Amount:</span>
              <span className="header-total-value">
                {parseFloat(formData.totalInquiryAmount || 0).toLocaleString('en-IN', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                })} INR
              </span>
            </div>
            <button
              className="unified-btn unified-btn-secondary"
              onClick={onCancel}
              type="button"
              disabled={loading}
            >
              ← Back to List
            </button>
          </div>
        </div>
      </div>

      {/* Form Card */}
      <div className="unified-card">
        <div className="unified-card-content">
          <form onSubmit={handleSubmit}>
            <div className="form-section">
              <div className="form-section-title">
                Inquiry Details
              </div>
              
              <div className="unified-form-grid">
                <div className="unified-form-field">
                  <label className="unified-form-label">Inquiry Date</label>
                  <input
                    type="date"
                    className="unified-input"
                    value={formData.inquiryDate}
                    onChange={(e) => handleChange('inquiryDate', e.target.value)}
                  />
                  {errors.inquiryDate && (
                    <span className="unified-error-text">{errors.inquiryDate}</span>
                  )}
                </div>

                <div className="unified-form-field">
                  <label className="unified-form-label">Hospital</label>
                  <select
                    className="unified-input"
                    value={formData.hospital}
                    onChange={(e) => handleChange('hospital', e.target.value)}
                  >
                    <option value="">Select Hospital</option>
                    {dropdownData.hospitals?.map(hospital => (
                      <option key={hospital._id} value={hospital._id}>
                        {hospital.shortName || hospital.legalName}
                      </option>
                    ))}
                  </select>
                  {errors.hospital && (
                    <span className="unified-error-text">{errors.hospital}</span>
                  )}
                </div>

                <div className="unified-form-field">
                  <label className="unified-form-label">Patient Name</label>
                  <input
                    type="text"
                    className="unified-input"
                    placeholder="Enter patient name"
                    value={formData.patientName}
                    onChange={(e) => handleChange('patientName', e.target.value)}
                  />
                  {errors.patientName && (
                    <span className="unified-error-text">{errors.patientName}</span>
                  )}
                </div>

                <div className="unified-form-field">
                  <label className="unified-form-label">Patient UHID</label>
                  <input
                    type="text"
                    className="unified-input"
                    placeholder="Enter patient UHID"
                    value={formData.patientUHID}
                    onChange={(e) => handleChange('patientUHID', e.target.value)}
                  />
                  {errors.patientUHID && (
                    <span className="unified-error-text">{errors.patientUHID}</span>
                  )}
                </div>

                <div className="unified-form-field">
                  <label className="unified-form-label">Payment Method</label>
                  <select
                    className="unified-input"
                    value={formData.paymentMethod}
                    onChange={(e) => handleChange('paymentMethod', e.target.value)}
                  >
                    <option value="">Select Payment Method</option>
                    {dropdownData.paymentMethods?.map(payment => (
                      <option key={payment._id} value={payment._id}>
                        {payment.description}
                      </option>
                    ))}
                  </select>
                  {errors.paymentMethod && (
                    <span className="unified-error-text">{errors.paymentMethod}</span>
                  )}
                </div>

                <div className="unified-form-field">
                  <label className="unified-form-label">Surgical Procedure <span className="unified-optional">(Optional)</span></label>
                  <select
                    className="unified-input"
                    value={formData.surgicalProcedure}
                    onChange={(e) => handleChange('surgicalProcedure', e.target.value)}
                  >
                    <option value="">Select Procedure (Optional)</option>
                    {filteredSurgicalProcedures.map(procedure => (
                      <option key={procedure._id} value={procedure._id}>
                        {procedure.code} - {procedure.name} {procedure.totalLimit ? `(${procedure.totalLimit} ${procedure.currency || 'INR'})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Surgical Categories Display */}
                {formData.surgicalCategories && formData.surgicalCategories.length > 0 && (
                  <div className="unified-form-field">
                    <label className="unified-form-label">Surgical Categories</label>
                    <div className="categories-display">
                      {formData.surgicalCategories.map((category, index) => (
                        <div key={index} className="category-item">
                          <div className="category-info">
                            <span className="category-name">{category.name || 'Unknown Category'}</span>
                            <span className="category-limit">
                              ₹{parseFloat(category.limit || 0).toLocaleString('en-IN', {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2
                              })} {typeof category.currency === 'string' ? category.currency : 'INR'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="unified-form-field">
                  <label className="unified-form-label">
                    Total Limit Amount
                    {!isLimitFieldEditable() && (
                      <span className="field-helper">(Sum of all category limits - Read Only)</span>
                    )}
                    {isLimitFieldEditable() && (
                      <span className="field-helper">(Editable - No category limits defined)</span>
                    )}
                  </label>
                  <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <input
                      type="number"
                      className="unified-input"
                      placeholder="Enter limit amount"
                      value={formData.limit.amount}
                      onChange={(e) => handleChange('limit.amount', e.target.value)}
                      min="0"
                      step="0.01"
                      style={{ 
                        flex: '2',
                        backgroundColor: isLimitFieldEditable() ? 'white' : '#f8f9fa',
                        cursor: isLimitFieldEditable() ? 'text' : 'not-allowed'
                      }}
                      readOnly={!isLimitFieldEditable()}
                    />
                    <select
                      className="unified-input"
                      value={formData.limit.currency}
                      onChange={(e) => handleChange('limit.currency', e.target.value)}
                      style={{ 
                        flex: '1',
                        backgroundColor: isLimitFieldEditable() ? 'white' : '#f8f9fa',
                        cursor: isLimitFieldEditable() ? 'pointer' : 'not-allowed'
                      }}
                      disabled={!isLimitFieldEditable()}
                    >
                      <option value="INR">INR</option>
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                      <option value="GBP">GBP</option>
                      <option value="AUD">AUD</option>
                      <option value="CAD">CAD</option>
                    </select>
                  </div>
                  {formData.surgicalProcedure && (() => {
                    const selectedProcedure = filteredSurgicalProcedures.find(proc => proc._id === formData.surgicalProcedure);
                    const procedureHasLimit = selectedProcedure && selectedProcedure.totalLimit && selectedProcedure.totalLimit > 0;
                    
                    if (procedureHasLimit) {
                      return (
                        <small style={{ color: 'var(--gray-500)', fontSize: '0.875rem', marginTop: '0.25rem', display: 'block' }}>
                          Limit is automatically set from selected procedure ({selectedProcedure.totalLimit} {selectedProcedure.currency || 'INR'})
                        </small>
                      );
                    } else {
                      return (
                        <small style={{ color: 'var(--blue-600)', fontSize: '0.875rem', marginTop: '0.25rem', display: 'block' }}>
                          Procedure has no limit set - you can enter a custom limit amount
                        </small>
                      );
                    }
                  })()}
                  {!formData.surgicalProcedure && (
                    <small style={{ color: 'var(--blue-600)', fontSize: '0.875rem', marginTop: '0.25rem', display: 'block' }}>
                      Enter limit amount (no procedure selected)
                    </small>
                  )}
                  {errors.limit && (
                    <span className="unified-error-text">{errors.limit}</span>
                  )}
                </div>
              </div>
            </div>

            {/* Inquiry Items Section */}
            <InquiryItems
              items={formData.items}
              onItemsChange={handleItemsChange}
              hospital={dropdownData.hospitals?.find(h => h._id === formData.hospital) || null}
              procedure={filteredSurgicalProcedures?.find(p => p._id === formData.surgicalProcedure) || null}
              dropdownData={dropdownData}
            />

            {/* Inquiry Summary */}
            {formData.items.length > 0 && (
              <div className="unified-card" style={{ marginTop: '1rem' }}>
                <div className="unified-card-content">
                  <div className="inquiry-summary">
                    <div className="summary-row">
                      <span className="summary-label">Total Inquiry Amount:</span>
                      <span className="summary-value">
                        {parseFloat(formData.totalInquiryAmount || 0).toLocaleString('en-IN', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2
                        })} INR
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Form Actions */}
            <div className="unified-form-actions">
              <button
                type="button"
                className="unified-btn unified-btn-secondary"
                onClick={onCancel}
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="unified-btn unified-btn-primary"
                disabled={loading}
              >
                {loading ? 'Saving...' : (inquiry ? 'Update' : 'Create')} Inquiry
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default InquiryForm;
