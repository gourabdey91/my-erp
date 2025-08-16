import React, { useState, useEffect, useCallback } from 'react';
import { procedureAPI } from '../procedures/services/procedureAPI';
import TemplateItems from './TemplateItems';
import '../../shared/styles/unified-design.css';
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
    items: template?.items || [],
    totalTemplateAmount: template?.totalTemplateAmount || 0
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [filteredSurgicalProcedures, setFilteredSurgicalProcedures] = useState([]);

  // Fetch surgical procedures when category or payment method changes
  const fetchSurgicalProcedures = useCallback(async (categoryId, paymentMethodId) => {
    try {
      const response = await procedureAPI.getAll();
      
      if (response && response.success && response.data) {
        let procedures = response.data;
        
        // Filter by payment method if provided
        if (paymentMethodId) {
          procedures = procedures.filter(proc => 
            proc.paymentTypeId === paymentMethodId || 
            proc.paymentMethod === paymentMethodId
          );
        }
        
        // Filter by category if provided
        if (categoryId) {
          procedures = procedures.filter(proc => 
            proc.items && proc.items.some(item => 
              item.surgicalCategoryId === categoryId || 
              (item.surgicalCategoryId && item.surgicalCategoryId._id === categoryId)
            )
          );
        }
        
        setFilteredSurgicalProcedures(procedures);
      } else {
        setFilteredSurgicalProcedures([]);
      }
    } catch (error) {
      console.error('Error fetching surgical procedures:', error);
      setFilteredSurgicalProcedures([]);
    }
  }, []);

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
        totalTemplateAmount: 0
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
      <div className="template-form-header">
        <div className="template-form-title">
          {template ? 'Edit Template' : 'Add New Template'}
        </div>
        <div className="template-form-actions">
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
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? 'Saving...' : (template ? 'Update Template' : 'Create Template')}
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="unified-form">
        {/* Basic Information */}
        <div className="unified-form-section">
          <h3 className="unified-form-section-title">Template Information</h3>
          <div className="unified-form-grid">
            {/* Template Number (read-only for existing) */}
            {template && (
              <div className="unified-form-group">
                <label className="unified-form-label">Template Number</label>
                <input
                  type="text"
                  className="unified-form-input"
                  value={formData.templateNumber}
                  disabled
                />
              </div>
            )}

            {/* Description */}
            <div className="unified-form-group">
              <label className="unified-form-label">
                Description *
              </label>
              <input
                type="text"
                className={`unified-form-input ${errors.description ? 'unified-form-input-error' : ''}`}
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                placeholder="Enter template description"
                maxLength={200}
                disabled={loading}
              />
              {errors.description && (
                <span className="unified-form-error">{errors.description}</span>
              )}
            </div>

            {/* Payment Method */}
            <div className="unified-form-group">
              <label className="unified-form-label">
                Payment Method *
              </label>
              <select
                className={`unified-form-select ${errors.paymentMethod ? 'unified-form-input-error' : ''}`}
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
                <span className="unified-form-error">{errors.paymentMethod}</span>
              )}
            </div>

            {/* Surgical Procedure */}
            <div className="unified-form-group">
              <label className="unified-form-label">
                Surgical Procedure
              </label>
              <select
                className="unified-form-select"
                value={formData.surgicalProcedure}
                onChange={(e) => handleChange('surgicalProcedure', e.target.value)}
                disabled={loading || !formData.paymentMethod}
              >
                <option value="">Select Surgical Procedure</option>
                {filteredSurgicalProcedures.map(procedure => (
                  <option key={procedure._id} value={procedure._id}>
                    {procedure.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Discount Applicable */}
            <div className="unified-form-group">
              <label className="unified-form-label">
                Discount Applicable
              </label>
              <div className="unified-form-checkbox-group">
                <label className="unified-form-checkbox-label">
                  <input
                    type="checkbox"
                    className="unified-form-checkbox"
                    checked={formData.discountApplicable}
                    onChange={(e) => handleChange('discountApplicable', e.target.checked)}
                    disabled={loading}
                  />
                  <span className="unified-form-checkbox-text">
                    Enable discount columns in items
                  </span>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Surgical Categories and Limits */}
        {formData.surgicalCategories.length > 0 && (
          <div className="unified-form-section">
            <h3 className="unified-form-section-title">Surgical Categories & Limits</h3>
            <div className="unified-form-grid">
              {formData.surgicalCategories.map((category, index) => (
                <div key={category.id} className="unified-form-group">
                  <label className="unified-form-label">
                    {category.name} Limit
                  </label>
                  <div className="unified-form-input-group">
                    <input
                      type="number"
                      className="unified-form-input"
                      value={category.limit || ''}
                      onChange={(e) => handleChange(`categoryLimits.${index}.limit`, e.target.value)}
                      placeholder="0.00"
                      min="0"
                      step="0.01"
                      disabled={loading || !isCategoryLimitEditable(index)}
                      readOnly={!isCategoryLimitEditable(index)}
                    />
                    <span className="unified-form-input-addon">
                      {category.currency}
                    </span>
                  </div>
                  {!isCategoryLimitEditable(index) && (
                    <small className="unified-form-helper">
                      Limit is maintained in procedure master
                    </small>
                  )}
                </div>
              ))}

              {/* Total Limit - Always Read-only */}
              <div className="unified-form-group">
                <label className="unified-form-label">
                  Total Limit *
                </label>
                <div className="unified-form-input-group">
                  <input
                    type="number"
                    className={`unified-form-input ${errors.limit ? 'unified-form-input-error' : ''}`}
                    value={formData.limit?.amount || ''}
                    onChange={(e) => handleChange('limit.amount', e.target.value)}
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                    disabled={loading}
                    readOnly={formData.surgicalCategories.some(cat => cat.originalLimit > 0)}
                  />
                  <span className="unified-form-input-addon">
                    {formData.limit?.currency || 'INR'}
                  </span>
                </div>
                <small className="unified-form-helper">
                  Total limit is always read-only when surgical categories have defined limits
                </small>
                {errors.limit && (
                  <span className="unified-form-error">{errors.limit}</span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Items */}
        <TemplateItems
          items={formData.items}
          surgicalCategories={formData.surgicalCategories}
          discountApplicable={formData.discountApplicable}
          onChange={handleItemsChange}
          errors={errors.items}
          disabled={loading}
        />

        {/* Summary */}
        {formData.items.length > 0 && (
          <div className="template-summary">
            <h3 className="template-summary-title">Template Summary</h3>
            <div className="template-summary-row">
              <span className="template-summary-label">Number of Items:</span>
              <span className="template-summary-value">{formData.items.length}</span>
            </div>
            <div className="template-summary-row">
              <span className="template-summary-label">Total Amount:</span>
              <span className="template-summary-value">
                ₹{parseFloat(formData.totalTemplateAmount || 0).toLocaleString('en-IN', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                })}
              </span>
            </div>
          </div>
        )}
      </form>
    </div>
  );
};

export default TemplateForm;
