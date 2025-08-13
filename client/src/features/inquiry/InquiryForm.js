import React, { useState, useEffect, useCallback } from 'react';
import { inquiryAPI } from '../../services/inquiryAPI';
import '../../shared/styles/unified-design.css';
import './Inquiry.css';

const InquiryForm = ({ inquiry, dropdownData, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    inquiryDate: new Date().toISOString().split('T')[0],
    patientName: '',
    patientUHID: '',
    hospital: '',
    surgicalCategory: '',
    paymentMethod: ''
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [filteredSurgicalCategories, setFilteredSurgicalCategories] = useState([]);

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
        paymentMethod: inquiry.paymentMethod?._id || inquiry.paymentMethod || ''
      };
      
      setFormData(newFormData);
      
      // Fetch surgical categories for the hospital
      if (newFormData.hospital) {
        fetchSurgicalCategories(newFormData.hospital);
      }
    } else {
      // New inquiry
      setFormData({
        inquiryDate: new Date().toISOString().split('T')[0],
        patientName: '',
        patientUHID: '',
        hospital: '',
        surgicalCategory: '',
        paymentMethod: ''
      });
      setFilteredSurgicalCategories([]);
    }
  }, [inquiry, fetchSurgicalCategories]);

  // Handle input changes - SIMPLE CASCADING LOGIC LIKE MATERIAL MASTER
  const handleChange = (field, value) => {
    if (field === 'hospital') {
      // Hospital changed - clear surgical category and fetch new categories
      setFormData(prev => ({
        ...prev,
        hospital: value,
        surgicalCategory: '' // Clear surgical category when hospital changes
      }));
      
      // Fetch new surgical categories
      if (value) {
        fetchSurgicalCategories(value);
      } else {
        setFilteredSurgicalCategories([]);
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
      await onSubmit(formData);
    } catch (error) {
      console.error('Error submitting inquiry:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="unified-overlay">
      <div className="unified-modal">
        <div className="unified-modal-header">
          <h2>{inquiry ? 'Edit Inquiry' : 'Add New Inquiry'}</h2>
          <button 
            className="unified-modal-close"
            onClick={onCancel}
            type="button"
          >
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit} className="unified-form">
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
                <span className="error-text">{errors.inquiryDate}</span>
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
                <span className="error-text">{errors.patientName}</span>
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
                <span className="error-text">{errors.patientUHID}</span>
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
                <span className="error-text">{errors.hospital}</span>
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
                <span className="error-text">{errors.surgicalCategory}</span>
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
                <span className="error-text">{errors.paymentMethod}</span>
              )}
            </div>
          </div>

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
  );
};

export default InquiryForm;
