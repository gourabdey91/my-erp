import React, { useState, useEffect, useCallback } from 'react';
import { inquiryAPI } from '../../services/inquiryAPI';
import InquiryItems from './InquiryItems';
import '../../shared/styles/unified-design.css';
import './Inquiry.css';

const InquiryForm = ({ inquiry, dropdownData, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    inquiryDate: new Date().toISOString().split('T')[0],
    patientName: '',
    patientUHID: '',
    hospital: '',
    surgicalCategory: '',
    surgicalProcedure: '',
    paymentMethod: '',
    limit: {
      amount: '',
      currency: 'INR'
    },
    items: [],
    totalInquiryAmount: 0
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

  // Initialize form data when inquiry changes
  useEffect(() => {
    if (inquiry) {
      // Set form data
      const newFormData = {
        inquiryDate: inquiry.inquiryDate ? new Date(inquiry.inquiryDate).toISOString().split('T')[0] : '',
        patientName: inquiry.patientName || '',
        patientUHID: inquiry.patientUHID || '',
        hospital: inquiry.hospital?._id || inquiry.hospital || '',
        surgicalCategory: inquiry.surgicalCategory?._id || inquiry.surgicalCategory || '',
        surgicalProcedure: inquiry.surgicalProcedure?._id || inquiry.surgicalProcedure || '',
        paymentMethod: inquiry.paymentMethod?._id || inquiry.paymentMethod || '',
        limit: {
          amount: inquiry.limit?.amount || '',
          currency: inquiry.limit?.currency || 'INR'
        },
        items: inquiry.items || [],
        totalInquiryAmount: inquiry.totalInquiryAmount || 0
      };
      
      setFormData(newFormData);
      
      // Fetch surgical categories for the hospital
      if (newFormData.hospital) {
        fetchSurgicalCategories(newFormData.hospital);
        
        // If both category and payment method are available, fetch procedures
        if (newFormData.surgicalCategory || newFormData.paymentMethod) {
          fetchSurgicalProcedures(newFormData.hospital, newFormData.surgicalCategory, newFormData.paymentMethod);
        }
      }
    } else {
      // New inquiry
      setFormData({
        inquiryDate: new Date().toISOString().split('T')[0],
        patientName: '',
        patientUHID: '',
        hospital: '',
        surgicalCategory: '',
        surgicalProcedure: '',
        paymentMethod: '',
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
      // Hospital changed - clear surgical category, procedure, and fetch new categories
      setFormData(prev => ({
        ...prev,
        hospital: value,
        surgicalCategory: '', // Clear surgical category when hospital changes
        surgicalProcedure: ''   // Clear surgical procedure when hospital changes
      }));
      
      // Fetch new surgical categories
      if (value) {
        fetchSurgicalCategories(value);
        setFilteredSurgicalProcedures([]); // Clear procedures when hospital changes
      } else {
        setFilteredSurgicalCategories([]);
        setFilteredSurgicalProcedures([]);
      }
    } else if (field === 'surgicalCategory') {
      // Category changed - clear procedure and fetch new procedures
      setFormData(prev => ({
        ...prev,
        surgicalCategory: value,
        surgicalProcedure: '' // Clear surgical procedure when category changes
      }));
      
      // Fetch new procedures based on category and current payment method
      if (formData.hospital && (value || formData.paymentMethod)) {
        fetchSurgicalProcedures(formData.hospital, value, formData.paymentMethod);
      } else {
        setFilteredSurgicalProcedures([]);
      }
    } else if (field === 'paymentMethod') {
      // Payment method changed - clear procedure and fetch new procedures
      setFormData(prev => ({
        ...prev,
        paymentMethod: value,
        surgicalProcedure: '' // Clear surgical procedure when payment method changes
      }));
      
      // Fetch new procedures based on current category and payment method
      if (formData.hospital && (formData.surgicalCategory || value)) {
        fetchSurgicalProcedures(formData.hospital, formData.surgicalCategory, value);
      } else {
        setFilteredSurgicalProcedures([]);
      }
    } else if (field === 'surgicalProcedure') {
      // Surgical procedure changed - update limit from selected procedure
      const selectedProcedure = filteredSurgicalProcedures.find(proc => proc._id === value);
      
      setFormData(prev => ({
        ...prev,
        surgicalProcedure: value,
        limit: selectedProcedure ? {
          amount: selectedProcedure.amount,
          currency: selectedProcedure.currency
        } : {
          amount: '',
          currency: 'INR'
        }
      }));
    } else if (field === 'limit.amount') {
      // Only allow manual edit of limit if no procedure is selected
      if (!formData.surgicalProcedure) {
        setFormData(prev => ({
          ...prev,
          limit: {
            ...prev.limit,
            amount: value
          }
        }));
      }
    } else if (field === 'limit.currency') {
      // Only allow manual edit of limit currency if no procedure is selected
      if (!formData.surgicalProcedure) {
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
    if (!formData.surgicalCategory) {
      newErrors.surgicalCategory = 'Surgical category is required';
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

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      // Clean up form data - convert empty strings to null for ObjectId fields
      const cleanedFormData = {
        ...formData,
        hospital: formData.hospital || null,
        surgicalCategory: formData.surgicalCategory || null,
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
            <h1>{inquiry ? 'Edit Inquiry' : 'Add New Inquiry'}</h1>
            <p>
              {inquiry 
                ? 'Update inquiry information and patient details with hospital-specific surgical categories.'
                : 'Create a new inquiry with patient information and hospital-specific surgical categories.'
              }
            </p>
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
                  <label className="unified-form-label">Inquiry Date *</label>
                  <input
                    type="date"
                    className="unified-search-input"
                    value={formData.inquiryDate}
                    onChange={(e) => handleChange('inquiryDate', e.target.value)}
                  />
                  {errors.inquiryDate && (
                    <span className="unified-error-text">{errors.inquiryDate}</span>
                  )}
                </div>

                <div className="unified-form-field">
                  <label className="unified-form-label">Hospital *</label>
                  <select
                    className="unified-search-input"
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
                  <label className="unified-form-label">Patient Name *</label>
                  <input
                    type="text"
                    className="unified-search-input"
                    placeholder="Enter patient name"
                    value={formData.patientName}
                    onChange={(e) => handleChange('patientName', e.target.value)}
                  />
                  {errors.patientName && (
                    <span className="unified-error-text">{errors.patientName}</span>
                  )}
                </div>

                <div className="unified-form-field">
                  <label className="unified-form-label">Patient UHID *</label>
                  <input
                    type="text"
                    className="unified-search-input"
                    placeholder="Enter patient UHID"
                    value={formData.patientUHID}
                    onChange={(e) => handleChange('patientUHID', e.target.value)}
                  />
                  {errors.patientUHID && (
                    <span className="unified-error-text">{errors.patientUHID}</span>
                  )}
                </div>

                <div className="unified-form-field">
                  <label className="unified-form-label">Surgical Category *</label>
                  <select
                    className="unified-search-input"
                    value={formData.surgicalCategory}
                    onChange={(e) => handleChange('surgicalCategory', e.target.value)}
                    disabled={!formData.hospital}
                  >
                    <option value="">
                      {!formData.hospital ? 'Select Hospital First' : 'Select Surgical Category'}
                    </option>
                    {filteredSurgicalCategories.map(category => (
                      <option key={category._id} value={category._id}>
                        {category.description}
                      </option>
                    ))}
                  </select>
                  {errors.surgicalCategory && (
                    <span className="unified-error-text">{errors.surgicalCategory}</span>
                  )}
                </div>

                <div className="unified-form-field">
                  <label className="unified-form-label">Payment Method *</label>
                  <select
                    className="unified-search-input"
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
                    className="unified-search-input"
                    value={formData.surgicalProcedure}
                    onChange={(e) => handleChange('surgicalProcedure', e.target.value)}
                    disabled={!formData.hospital}
                  >
                    <option value="">
                      {!formData.hospital ? 'Select Hospital First' : 
                       (!formData.surgicalCategory && !formData.paymentMethod) ? 'Select Category or Payment Method' : 
                       'Select Procedure (Optional)'}
                    </option>
                    {filteredSurgicalProcedures.map(procedure => (
                      <option key={procedure._id} value={procedure._id}>
                        {procedure.code} - {procedure.name} ({procedure.amount} {procedure.currency})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="unified-form-field">
                  <label className="unified-form-label">Limit Amount *</label>
                  <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <input
                      type="number"
                      className="unified-search-input"
                      placeholder="Enter limit amount"
                      value={formData.limit.amount}
                      onChange={(e) => handleChange('limit.amount', e.target.value)}
                      disabled={!!formData.surgicalProcedure}
                      min="0"
                      step="0.01"
                      style={{ flex: '2' }}
                    />
                    <select
                      className="unified-search-input"
                      value={formData.limit.currency}
                      onChange={(e) => handleChange('limit.currency', e.target.value)}
                      disabled={!!formData.surgicalProcedure}
                      style={{ flex: '1' }}
                    >
                      <option value="INR">INR</option>
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                      <option value="GBP">GBP</option>
                      <option value="AUD">AUD</option>
                      <option value="CAD">CAD</option>
                    </select>
                  </div>
                  {formData.surgicalProcedure && (
                    <small style={{ color: 'var(--gray-500)', fontSize: '0.875rem', marginTop: '0.25rem', display: 'block' }}>
                      Limit is automatically set from selected procedure
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
