import React, { useState, useEffect, useCallback } from 'react';
import TemplateItems from './TemplateItems';
import '../../shared/styles/unified-design.css';
import '../inquiry/Inquiry.css'; // Import inquiry styles for categories
import './Template.css';

const TemplateForm = ({ template, dropdownData, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    templateNumber: template?.templateNumber || '',
    description: template?.description || '',
    surgicalProcedure: template?.surgicalProcedure || '',
    surgicalCategories: template?.surgicalCategories || [], // Multiple categories from procedure
    paymentMethod: template?.paymentMethod || '',
    categoryLimits: template?.categoryLimits || [], // Individual category limits
    limit: {
      amount: template?.limit?.amount || '',
      currency: template?.limit?.currency || 'INR'
    },
    discountApplicable: template?.discountApplicable || false,
    hospitalDependent: template?.hospitalDependent || false, // New field for hospital dependency
    hospital: template?.hospital || '', // Hospital selection when dependent
    items: template?.items || [],
    totalTemplateAmount: template?.totalTemplateAmount || 0
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [filteredSurgicalProcedures, setFilteredSurgicalProcedures] = useState([]);

  // Fetch surgical procedures when category or payment method changes
  const fetchSurgicalProcedures = useCallback(async (categoryId, paymentMethodId) => {
    try {
      console.log('Fetching procedures with:', { categoryId, paymentMethodId });
      console.log('Available procedures from props:', dropdownData.surgicalProcedures);
      
      // Use procedures from dropdownData instead of making another API call
      let procedures = dropdownData.surgicalProcedures || [];
      
      console.log('All procedures:', procedures);
      
      // Filter by payment method if provided
      if (paymentMethodId && procedures.length > 0) {
        procedures = procedures.filter(proc => {
          const match = proc.paymentTypeId === paymentMethodId || 
                       (proc.paymentTypeId && proc.paymentTypeId._id === paymentMethodId) ||
                       proc.paymentMethod === paymentMethodId;
          console.log(`Procedure ${proc.code}: paymentTypeId=${proc.paymentTypeId}, match=${match}`);
          return match;
        });
      }
      
      console.log('Filtered procedures after payment method filter:', procedures);
      
      // Filter by category if provided
      if (categoryId && procedures.length > 0) {
        procedures = procedures.filter(proc => 
          proc.items && proc.items.some(item => 
            item.surgicalCategoryId === categoryId || 
            (item.surgicalCategoryId && item.surgicalCategoryId._id === categoryId)
          )
        );
      }
      
      console.log('Final filtered procedures:', procedures);
      setFilteredSurgicalProcedures(procedures);
    } catch (error) {
      console.error('Error filtering surgical procedures:', error);
      setFilteredSurgicalProcedures([]);
    }
  }, [dropdownData.surgicalProcedures]);

  // Initialize dropdown data and filtered procedures
  useEffect(() => {
    console.log('Dropdown data received:', dropdownData);
    console.log('Surgical procedures available:', dropdownData.surgicalProcedures?.length || 0);
    
    // Set initial procedures list when dropdown data is available
    if (dropdownData.surgicalProcedures && dropdownData.surgicalProcedures.length > 0) {
      console.log('Initializing procedures list with all procedures');
      setFilteredSurgicalProcedures(dropdownData.surgicalProcedures);
    }
  }, [dropdownData]);

  // Initialize form data when template changes
  useEffect(() => {
    if (template) {
      // Set form data
      const newFormData = {
        templateNumber: template.templateNumber || '',
        description: template.description || '',
        surgicalProcedure: template.surgicalProcedure?._id || template.surgicalProcedure || '',
        surgicalCategories: template.surgicalProcedure?.items?.map(item => ({
          id: item.surgicalCategoryId?._id || item.surgicalCategoryId,
          name: item.surgicalCategoryId?.description || item.surgicalCategoryId?.name || 'Unknown Category',
          limit: item.limit || 0,
          originalLimit: item.limit || 0, // Store original limit from procedure master
          currency: item.currency || 'INR',
          originalCurrency: item.currency || 'INR' // Store original currency from procedure master
        })) || [],
        paymentMethod: template.paymentMethod?._id || template.paymentMethod || '',
        categoryLimits: template.surgicalProcedure?.items || [],
        limit: {
          amount: template.limit?.amount || template.surgicalProcedure?.totalLimit || '',
          currency: template.limit?.currency || 'INR'
        },
        discountApplicable: template.discountApplicable || false,
        items: template.items || [],
        totalTemplateAmount: template.totalTemplateAmount || 0
      };
      
      setFormData(newFormData);
      
      // If payment method is available, fetch procedures
      if (newFormData.paymentMethod) {
        fetchSurgicalProcedures('', newFormData.paymentMethod);
      }
    } else {
      // New template
      setFormData({
        templateNumber: '',
        description: '',
        surgicalProcedure: '',
        surgicalCategories: [],
        paymentMethod: '',
        categoryLimits: [],
        limit: {
          amount: '',
          currency: 'INR'
        },
        discountApplicable: false,
        items: [],
        totalTemplateAmount: 0,
        hospitalDependent: false,
        hospital: ''
      });
      setFilteredSurgicalProcedures([]);
    }
  }, [template, fetchSurgicalProcedures]);

  // Handle input changes
  const handleChange = (field, value) => {
    if (field === 'paymentMethod') {
      // Payment method changed - clear procedure and fetch new procedures
      setFormData(prev => ({
        ...prev,
        paymentMethod: value,
        surgicalProcedure: '' // Clear surgical procedure when payment method changes
      }));
      
      // Fetch new procedures based on payment method
      fetchSurgicalProcedures('', value);
    } else if (field === 'surgicalProcedure') {
      // Surgical procedure changed - update categories and limits from selected procedure
      const selectedProcedure = filteredSurgicalProcedures.find(proc => proc._id === value);
      
      if (selectedProcedure) {
        // Extract surgical categories and their individual limits
        const surgicalCategories = selectedProcedure.items?.map(item => ({
          id: item.surgicalCategoryId?._id || item.surgicalCategoryId,
          name: item.surgicalCategoryId?.description || item.surgicalCategoryId?.name || 'Unknown Category',
          limit: item.limit || 0,
          originalLimit: item.limit || 0, // Store original limit from procedure master
          currency: item.currency || 'INR',
          originalCurrency: item.currency || 'INR' // Store original currency from procedure master
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
        // Clear procedure selection
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
    } else if (field.startsWith('limit.')) {
      const limitField = field.split('.')[1];
      setFormData(prev => ({
        ...prev,
        limit: {
          ...prev.limit,
          [limitField]: value
        }
      }));
    } else if (field.startsWith('categoryLimits.')) {
      // Handle individual category limit changes
      const [, index, limitField] = field.split('.');
      const categoryIndex = parseInt(index);
      
      setFormData(prev => {
        const newCategoryLimits = [...prev.categoryLimits];
        if (!newCategoryLimits[categoryIndex]) {
          newCategoryLimits[categoryIndex] = {};
        }
        newCategoryLimits[categoryIndex][limitField] = parseFloat(value) || 0;
        
        // Also update surgical categories display
        const newSurgicalCategories = [...prev.surgicalCategories];
        if (newSurgicalCategories[categoryIndex] && limitField === 'limit') {
          newSurgicalCategories[categoryIndex].limit = parseFloat(value) || 0;
        }
        
        // Recalculate total limit
        const newTotalLimit = newCategoryLimits.reduce((sum, cat) => sum + (parseFloat(cat.limit) || 0), 0);
        
        return {
          ...prev,
          categoryLimits: newCategoryLimits,
          surgicalCategories: newSurgicalCategories,
          limit: {
            ...prev.limit,
            amount: newTotalLimit > 0 ? newTotalLimit : prev.limit.amount
          }
        };
      });
    } else if (field === 'hospitalDependent') {
      // Hospital dependency changed - clear hospital field if unchecked
      setFormData(prev => ({
        ...prev,
        hospitalDependent: value,
        hospital: value ? prev.hospital : '' // Clear hospital if hospitalDependent is false
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  // Handle items change
  const handleItemsChange = (items) => {
    const totalAmount = items.reduce((sum, item) => sum + (parseFloat(item.totalAmount) || 0), 0);
    setFormData(prev => ({
      ...prev,
      items,
      totalTemplateAmount: totalAmount
    }));
  };

  // Validate form
  const validateForm = () => {
    const newErrors = {};

    if (!formData.description?.trim()) {
      newErrors.description = 'Description is required';
    }

    if (!formData.paymentMethod) {
      newErrors.paymentMethod = 'Payment method is required';
    }

    if (formData.hospitalDependent && !formData.hospital) {
      newErrors.hospital = 'Hospital is required when template is hospital dependent';
    }

    if (!formData.limit?.amount || formData.limit.amount <= 0) {
      newErrors.limit = 'Limit amount must be greater than 0';
    }

    if (formData.items.length === 0) {
      newErrors.items = 'At least one item is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      // Prepare submission data
      const submissionData = {
        ...formData,
        createdBy: !template ? JSON.parse(localStorage.getItem('user') || '{}')._id : undefined,
        updatedBy: template ? JSON.parse(localStorage.getItem('user') || '{}')._id : undefined
      };

      console.log('Submitting template data:', submissionData);
      await onSubmit(submissionData);
    } catch (error) {
      console.error('Form submission error:', error);
    } finally {
      setLoading(false);
    }
  };

  // Determine if category limits should be editable
  const isCategoryLimitEditable = (categoryIndex) => {
    const category = formData.surgicalCategories[categoryIndex];
    return !category || !category.originalLimit || category.originalLimit === 0;
  };

  return (
    <div className="unified-container">
      {/* Header */}
      <div className="unified-header">
        <div className="unified-header-content">
          <div className="unified-header-text">
            <h1>
              {template ? 'Edit Template' : 'Add New Template'}
              {template && formData.templateNumber && (
                <span className="inquiry-number-badge">#{formData.templateNumber}</span>
              )}
            </h1>
            <p>
              {template 
                ? 'Update template information and material combinations for faster order creation.'
                : 'Create a new template with material combinations for faster inquiry, sales order, and billing creation.'
              }
            </p>
          </div>
          <div className="unified-header-actions">
            <div className="header-total-amount">
              <span className="header-total-label">Total Amount:</span>
              <span className="header-total-value">
                ₹{parseFloat(formData.totalTemplateAmount || 0).toLocaleString('en-IN', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                })}
              </span>
            </div>
            <div className="hospital-dependency-toggle">
              <label className="toggle-label">
                <input
                  type="checkbox"
                  checked={formData.hospitalDependent}
                  onChange={(e) => handleChange('hospitalDependent', e.target.checked)}
                  className="toggle-checkbox"
                />
                <span className="toggle-slider"></span>
                <span className="toggle-text">Hospital Dependent</span>
              </label>
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
                Template Information
              </div>
              
              <div className="unified-form-grid">
                {/* Payment Method */}
                <div className="unified-form-field">
                  <label className="unified-form-label">Payment Method *</label>
                  <select
                    className={`unified-input ${errors.paymentMethod ? 'unified-input-error' : ''}`}
                    value={formData.paymentMethod}
                    onChange={(e) => handleChange('paymentMethod', e.target.value)}
                    disabled={loading}
                  >
                    <option value="">Select Payment Method</option>
                    {dropdownData.paymentMethods.map(method => (
                      <option key={method._id} value={method._id}>
                        {method.description}
                      </option>
                    ))}
                  </select>
                  {errors.paymentMethod && (
                    <span className="unified-error-text">{errors.paymentMethod}</span>
                  )}
                </div>

                {/* Hospital (only show if hospital dependent) */}
                {formData.hospitalDependent && (
                  <div className="unified-form-field">
                    <label className="unified-form-label">Hospital *</label>
                    <select
                      className={`unified-input ${errors.hospital ? 'unified-input-error' : ''}`}
                      value={formData.hospital}
                      onChange={(e) => handleChange('hospital', e.target.value)}
                      disabled={loading}
                    >
                      <option value="">Select Hospital</option>
                      {dropdownData.hospitals.map(hospital => (
                        <option key={hospital._id} value={hospital._id}>
                          {hospital.name}
                        </option>
                      ))}
                    </select>
                    {errors.hospital && (
                      <span className="unified-error-text">{errors.hospital}</span>
                    )}
                  </div>
                )}

                {/* Surgical Procedure */}
                <div className="unified-form-field">
                  <label className="unified-form-label">Surgical Procedure <span className="unified-optional">(Optional)</span></label>
                  <select
                    className="unified-input"
                    value={formData.surgicalProcedure}
                    onChange={(e) => handleChange('surgicalProcedure', e.target.value)}
                    disabled={loading || !formData.paymentMethod}
                  >
                    <option value="">Select Procedure (Optional)</option>
                    {filteredSurgicalProcedures.map(procedure => (
                      <option key={procedure._id} value={procedure._id}>
                        {procedure.code} - {procedure.name} {procedure.totalLimit ? `(${procedure.totalLimit} ${procedure.currency || 'INR'})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Discount Applicable */}
                <div className="unified-form-field">
                  <div className="unified-checkbox-container">
                    <label className="unified-checkbox-label">
                      <input
                        type="checkbox"
                        className="unified-checkbox"
                        checked={formData.discountApplicable}
                        onChange={(e) => handleChange('discountApplicable', e.target.checked)}
                        disabled={loading}
                      />
                      Discount Applicable
                    </label>
                    <div className="unified-help-text">
                      Enable discount columns in items section
                    </div>
                  </div>
                </div>

                {/* Empty space to balance grid */}
                <div className="unified-form-field"></div>
              </div>

              {/* Description - Full width below discount applicable */}
              <div className="unified-form-field">
                <label className="unified-form-label">Description *</label>
                <input
                  type="text"
                  className={`unified-input ${errors.description ? 'unified-input-error' : ''}`}
                  value={formData.description}
                  onChange={(e) => handleChange('description', e.target.value)}
                  placeholder="Enter template description"
                  maxLength={200}
                  disabled={loading}
                />
                {errors.description && (
                  <span className="unified-error-text">{errors.description}</span>
                )}
              </div>
            </div>

            {/* Surgical Categories and Limits */}
            {formData.surgicalCategories.length > 0 && (
              <div className="form-section">
                <div className="form-section-title">Surgical Categories & Limits</div>
                
                <div className="unified-form-field">
                  <label className="unified-form-label">Surgical Categories & Limits</label>
                  <div className="categories-display">
                    {formData.surgicalCategories.map((category, index) => (
                      <div key={category.id} className="category-item">
                        <div className="category-info">
                          <div className="category-name">
                            {category.name}
                            {!isCategoryLimitEditable(index) && (
                              <span className="field-helper" style={{ marginLeft: '8px', fontSize: '0.75rem' }}>
                                (From Procedure Master)
                              </span>
                            )}
                          </div>
                          <div className="category-limit-input">
                            <input
                              type="number"
                              className="unified-input"
                              placeholder={isCategoryLimitEditable(index) ? "Enter limit" : "From procedure master"}
                              value={category.limit || ''}
                              onChange={(e) => handleChange(`categoryLimits.${index}.limit`, e.target.value)}
                              min="0"
                              step="0.01"
                              style={{ 
                                width: '120px',
                                backgroundColor: !isCategoryLimitEditable(index) ? '#f8f9fa' : 'white',
                                cursor: !isCategoryLimitEditable(index) ? 'not-allowed' : 'text'
                              }}
                              readOnly={!isCategoryLimitEditable(index)}
                            />
                            <select
                              className="unified-input"
                              value={category.currency || 'INR'}
                              onChange={(e) => handleChange(`categoryLimits.${index}.currency`, e.target.value)}
                              style={{ 
                                width: '80px', 
                                marginLeft: '5px',
                                backgroundColor: !isCategoryLimitEditable(index) ? '#f8f9fa' : 'white',
                                cursor: !isCategoryLimitEditable(index) ? 'not-allowed' : 'pointer'
                              }}
                              disabled={!isCategoryLimitEditable(index)}
                            >
                              <option value="INR">INR</option>
                              <option value="USD">USD</option>
                              <option value="EUR">EUR</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="unified-form-field">
                  <label className="unified-form-label">
                    Total Limit Amount
                    <span className="field-helper">(Sum of all category limits - Always Read Only)</span>
                  </label>
                  <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <input
                      type="number"
                      className={`unified-input ${errors.limit ? 'unified-input-error' : ''}`}
                      placeholder="Total calculated limit"
                      value={formData.limit?.amount || ''}
                      onChange={(e) => handleChange('limit.amount', e.target.value)}
                      min="0"
                      step="0.01"
                      style={{ 
                        flex: '2',
                        backgroundColor: formData.surgicalCategories.some(cat => cat.originalLimit > 0) ? '#f8f9fa' : 'white',
                        cursor: formData.surgicalCategories.some(cat => cat.originalLimit > 0) ? 'not-allowed' : 'text'
                      }}
                      readOnly={formData.surgicalCategories.some(cat => cat.originalLimit > 0)}
                    />
                    <select
                      className="unified-input"
                      value={formData.limit?.currency || 'INR'}
                      onChange={(e) => handleChange('limit.currency', e.target.value)}
                      style={{ 
                        flex: '1',
                        backgroundColor: formData.surgicalCategories.some(cat => cat.originalLimit > 0) ? '#f8f9fa' : 'white',
                        cursor: formData.surgicalCategories.some(cat => cat.originalLimit > 0) ? 'not-allowed' : 'pointer'
                      }}
                      disabled={formData.surgicalCategories.some(cat => cat.originalLimit > 0)}
                    >
                      <option value="INR">INR</option>
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                    </select>
                  </div>
                  {errors.limit && (
                    <span className="unified-error-text">{errors.limit}</span>
                  )}
                </div>
              </div>
            )}

            {/* Template Items */}
            <TemplateItems
              items={formData.items}
              surgicalCategories={formData.surgicalCategories}
              discountApplicable={formData.discountApplicable}
              hospitalDependent={formData.hospitalDependent}
              hospital={formData.hospital}
              onChange={handleItemsChange}
              errors={errors.items}
              disabled={loading}
            />

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
                {loading ? 'Saving...' : (template ? 'Update Template' : 'Create Template')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default TemplateForm;
