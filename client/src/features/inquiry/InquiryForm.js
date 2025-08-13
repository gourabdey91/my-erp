import React, { useState, useEffect, useCallback } from 'react';
import { inquiryAPI } from '../../services/inquiryAPI';
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

  // Initialize form data when inquiry changes
  useEffect(() => {
    if (inquiry) {
      setFormData({
        inquiryDate: inquiry.inquiryDate ? new Date(inquiry.inquiryDate).toISOString().split('T')[0] : '',
        patientName: inquiry.patientName || '',
        patientUHID: inquiry.patientUHID || '',
        hospital: inquiry.hospital?._id || inquiry.hospital || '',
        surgicalCategory: inquiry.surgicalCategory?._id || inquiry.surgicalCategory || '',
        paymentMethod: inquiry.paymentMethod?._id || inquiry.paymentMethod || ''
      });
    } else {
      setFormData({
        inquiryDate: new Date().toISOString().split('T')[0],
        patientName: '',
        patientUHID: '',
        hospital: '',
        surgicalCategory: '',
        paymentMethod: ''
      });
    }
  }, [inquiry]);

  // Fetch surgical categories when hospital changes
  const fetchSurgicalCategories = useCallback(async (hospitalId) => {
    if (!hospitalId) {
      setFilteredSurgicalCategories([]);
      return;
    }

    try {
      const response = await inquiryAPI.getSurgicalCategoriesByHospital(hospitalId);
      if (response.success) {
        setFilteredSurgicalCategories(response.data);
      }
    } catch (error) {
      console.error('Error fetching surgical categories:', error);
      setFilteredSurgicalCategories([]);
    }
  }, []);

  // Handle hospital change
  useEffect(() => {
    if (formData.hospital) {
      fetchSurgicalCategories(formData.hospital);
      // Clear surgical category when hospital changes
      if (!inquiry) { // Only clear if not editing an existing inquiry
        setFormData(prev => ({
          ...prev,
          surgicalCategory: ''
        }));
      }
    } else {
      setFilteredSurgicalCategories([]);
      setFormData(prev => ({
        ...prev,
        surgicalCategory: ''
      }));
    }
  }, [formData.hospital, fetchSurgicalCategories, inquiry]);

  // Handle input changes
  const handleChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

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

    try {
      setLoading(true);
      await onSubmit(formData);
    } catch (error) {
      console.error('Error submitting form:', error);
      alert('Error saving inquiry. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="inquiry-container">
      <div className="inquiry-form-container">
        <div className="inquiry-form-header">
          <h2 className="inquiry-form-title">
            {inquiry ? 'Edit Inquiry' : 'New Inquiry'}
          </h2>
        </div>

        <div className="inquiry-form-content">
          <form onSubmit={handleSubmit}>
            <div className="inquiry-form-grid">
              {/* Inquiry Date */}
              <div className="inquiry-form-field">
                <label className="inquiry-form-label required">
                  Inquiry Date
                </label>
                <input
                  type="date"
                  className="inquiry-form-input"
                  value={formData.inquiryDate}
                  onChange={(e) => handleChange('inquiryDate', e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                />
                {errors.inquiryDate && (
                  <span className="inquiry-form-error">{errors.inquiryDate}</span>
                )}
              </div>

              {/* Patient Name */}
              <div className="inquiry-form-field">
                <label className="inquiry-form-label required">
                  Patient Name
                </label>
                <input
                  type="text"
                  className="inquiry-form-input"
                  value={formData.patientName}
                  onChange={(e) => handleChange('patientName', e.target.value)}
                  placeholder="Enter patient name"
                  maxLength={80}
                />
                {errors.patientName && (
                  <span className="inquiry-form-error">{errors.patientName}</span>
                )}
              </div>

              {/* Patient UHID */}
              <div className="inquiry-form-field">
                <label className="inquiry-form-label required">
                  Patient UHID
                </label>
                <input
                  type="text"
                  className="inquiry-form-input"
                  value={formData.patientUHID}
                  onChange={(e) => handleChange('patientUHID', e.target.value)}
                  placeholder="Enter patient UHID"
                  maxLength={50}
                />
                {errors.patientUHID && (
                  <span className="inquiry-form-error">{errors.patientUHID}</span>
                )}
              </div>

              {/* Hospital */}
              <div className="inquiry-form-field">
                <label className="inquiry-form-label required">
                  Hospital
                </label>
                <select
                  className="inquiry-form-select"
                  value={formData.hospital}
                  onChange={(e) => handleChange('hospital', e.target.value)}
                >
                  <option value="">Select Hospital</option>
                  {dropdownData.hospitals?.map(hospital => (
                    <option key={hospital._id} value={hospital._id}>
                      {hospital.name}
                    </option>
                  ))}
                </select>
                {errors.hospital && (
                  <span className="inquiry-form-error">{errors.hospital}</span>
                )}
              </div>

              {/* Surgical Category */}
              <div className="inquiry-form-field">
                <label className="inquiry-form-label required">
                  Surgical Category
                </label>
                <select
                  className="inquiry-form-select"
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
                  <span className="inquiry-form-error">{errors.surgicalCategory}</span>
                )}
              </div>

              {/* Payment Method */}
              <div className="inquiry-form-field">
                <label className="inquiry-form-label required">
                  Payment Method
                </label>
                <select
                  className="inquiry-form-select"
                  value={formData.paymentMethod}
                  onChange={(e) => handleChange('paymentMethod', e.target.value)}
                >
                  <option value="">Select Payment Method</option>
                  {dropdownData.paymentMethods?.map(method => (
                    <option key={method._id} value={method._id}>
                      {method.name}
                    </option>
                  ))}
                </select>
                {errors.paymentMethod && (
                  <span className="inquiry-form-error">{errors.paymentMethod}</span>
                )}
              </div>
            </div>

            <div className="inquiry-form-actions">
              <button
                type="button"
                className="btn-secondary"
                onClick={onCancel}
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn-primary"
                disabled={loading}
              >
                {loading ? 'Saving...' : (inquiry ? 'Update Inquiry' : 'Create Inquiry')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default InquiryForm;
