import React, { useState, useEffect } from 'react';
import TransactionForm from '../../shared/components/transaction/TransactionForm';
import FormField from '../../shared/components/transaction/FormField';
import ItemManagement from './ItemManagement';
import '../../shared/styles/unified-design.css';

const InquiryForm = ({ inquiry, dropdownData, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    hospital: '',
    inquiryDate: '',
    patientName: '',
    patientUHID: '',
    surgicalCategory: '',
    paymentMethod: '',
    surgicalProcedure: '',
    surgeon: '',
    consultingDoctor: '',
    notes: '',
    status: 'Pending',
    items: []
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  // Initialize form data when inquiry changes
  useEffect(() => {
    if (inquiry) {
      setFormData({
        hospital: inquiry.hospital?._id || inquiry.hospital || '',
        inquiryDate: inquiry.inquiryDate ? new Date(inquiry.inquiryDate).toISOString().split('T')[0] : '',
        patientName: inquiry.patientName || '',
        patientUHID: inquiry.patientUHID || '',
        surgicalCategory: inquiry.surgicalCategory?._id || inquiry.surgicalCategory || '',
        paymentMethod: inquiry.paymentMethod?._id || inquiry.paymentMethod || '',
        surgicalProcedure: inquiry.surgicalProcedure?._id || inquiry.surgicalProcedure || '',
        surgeon: inquiry.surgeon?._id || inquiry.surgeon || '',
        consultingDoctor: inquiry.consultingDoctor?._id || inquiry.consultingDoctor || '',
        notes: inquiry.notes || '',
        status: inquiry.status || 'Pending',
        items: inquiry.items || []
      });
    } else {
      // Reset form for new inquiry
      setFormData({
        hospital: '',
        inquiryDate: new Date().toISOString().split('T')[0], // Today's date
        patientName: '',
        patientUHID: '',
        surgicalCategory: '',
        paymentMethod: '',
        surgicalProcedure: '',
        surgeon: '',
        consultingDoctor: '',
        notes: '',
        status: 'Pending',
        items: []
      });
    }
    setErrors({});
  }, [inquiry]);

  const validateForm = () => {
    const newErrors = {};

    if (!formData.hospital) {
      newErrors.hospital = 'Hospital is required';
    }
    if (!formData.patientName.trim()) {
      newErrors.patientName = 'Patient name is required';
    }
    if (!formData.patientUHID.trim()) {
      newErrors.patientUHID = 'Patient UHID is required';
    }
    if (!formData.inquiryDate) {
      newErrors.inquiryDate = 'Inquiry date is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const handleItemsChange = (items) => {
    setFormData(prev => ({
      ...prev,
      items
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);
      await onSubmit(formData);
    } catch (error) {
      console.error('Form submission error:', error);
      alert('Error saving inquiry. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <TransactionForm
      title={inquiry ? 'Edit Inquiry' : 'New Inquiry'}
      onSubmit={handleSubmit}
      onCancel={onCancel}
      submitLabel={inquiry ? 'Update' : 'Create'}
      isLoading={loading}
    >
      {/* Basic Information Section */}
      <div className="inquiry-form-section">
        <h3 className="inquiry-section-title">Basic Information</h3>
        <div className="inquiry-form-grid">
          {/* Hospital Selection - Full Width */}
          <FormField
            label="Hospital"
            required
            error={errors.hospital}
            className="inquiry-field-full"
          >
            <select
              className="unified-form-control"
              value={formData.hospital}
              onChange={(e) => handleChange('hospital', e.target.value)}
              disabled={loading}
            >
              <option value="">Select Hospital</option>
              {dropdownData.hospitals?.map(hospital => (
                <option key={hospital._id} value={hospital._id}>
                  {hospital.name} {hospital.shortName && `(${hospital.shortName})`}
                </option>
              ))}
            </select>
          </FormField>

          {/* Inquiry Date */}
          <FormField
            label="Inquiry Date"
            required
            error={errors.inquiryDate}
            className="inquiry-field-half"
          >
            <input
              type="date"
              className="unified-form-control"
              value={formData.inquiryDate}
              onChange={(e) => handleChange('inquiryDate', e.target.value)}
              disabled={loading}
            />
          </FormField>

          {/* Status */}
          <FormField
            label="Status"
            error={errors.status}
            className="inquiry-field-half"
          >
            <select
              className="unified-form-control"
              value={formData.status}
              onChange={(e) => handleChange('status', e.target.value)}
              disabled={loading}
            >
              <option value="Pending">Pending</option>
              <option value="In Progress">In Progress</option>
              <option value="Scheduled">Scheduled</option>
              <option value="Completed">Completed</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </FormField>
        </div>
      </div>

      {/* Patient Information Section */}
      <div className="inquiry-form-section">
        <h3 className="inquiry-section-title">Patient Information</h3>
        <div className="inquiry-form-grid">
          {/* Patient Name */}
          <FormField
            label="Patient Name"
            required
            error={errors.patientName}
            className="inquiry-field-half"
          >
            <input
              type="text"
              className="unified-form-control"
              value={formData.patientName}
              onChange={(e) => handleChange('patientName', e.target.value)}
              placeholder="Enter patient full name"
              disabled={loading}
            />
          </FormField>

          {/* Patient UHID */}
          <FormField
            label="Patient UHID"
            required
            error={errors.patientUHID}
            className="inquiry-field-half"
          >
            <input
              type="text"
              className="unified-form-control"
              value={formData.patientUHID}
              onChange={(e) => handleChange('patientUHID', e.target.value)}
              placeholder="Enter unique patient ID"
              disabled={loading}
            />
          </FormField>
        </div>
      </div>

      {/* Medical Information Section */}
      <div className="inquiry-form-section">
        <h3 className="inquiry-section-title">Medical Information</h3>
        <div className="inquiry-form-grid">
          {/* Surgical Category */}
          <FormField
            label="Surgical Category"
            error={errors.surgicalCategory}
            className="inquiry-field-half"
          >
            <select
              className="unified-form-control"
              value={formData.surgicalCategory}
              onChange={(e) => handleChange('surgicalCategory', e.target.value)}
              disabled={loading}
            >
              <option value="">Select Category</option>
              {dropdownData.surgicalCategories?.map(category => (
                <option key={category._id} value={category._id}>
                  {category.description}
                </option>
              ))}
            </select>
          </FormField>

          {/* Surgical Procedure */}
          <FormField
            label="Surgical Procedure"
            error={errors.surgicalProcedure}
            className="inquiry-field-half"
          >
            <select
              className="unified-form-control"
              value={formData.surgicalProcedure}
              onChange={(e) => handleChange('surgicalProcedure', e.target.value)}
              disabled={loading}
            >
              <option value="">Select Procedure</option>
              {dropdownData.procedures?.map(procedure => (
                <option key={procedure._id} value={procedure._id}>
                  {procedure.name}
                </option>
              ))}
            </select>
          </FormField>

          {/* Surgeon */}
          <FormField
            label="Surgeon"
            error={errors.surgeon}
            className="inquiry-field-half"
          >
            <select
              className="unified-form-control"
              value={formData.surgeon}
              onChange={(e) => handleChange('surgeon', e.target.value)}
              disabled={loading}
            >
              <option value="">Select Surgeon</option>
              {dropdownData.doctors?.map(doctor => (
                <option key={doctor._id} value={doctor._id}>
                  {doctor.name} {doctor.specialization && `(${doctor.specialization})`}
                </option>
              ))}
            </select>
          </FormField>

          {/* Consulting Doctor */}
          <FormField
            label="Consulting Doctor"
            error={errors.consultingDoctor}
            className="inquiry-field-half"
          >
            <select
              className="unified-form-control"
              value={formData.consultingDoctor}
              onChange={(e) => handleChange('consultingDoctor', e.target.value)}
              disabled={loading}
            >
              <option value="">Select Consulting Doctor</option>
              {dropdownData.doctors?.map(doctor => (
                <option key={doctor._id} value={doctor._id}>
                  {doctor.name} {doctor.specialization && `(${doctor.specialization})`}
                </option>
              ))}
            </select>
          </FormField>
        </div>
      </div>

      {/* Payment Information Section */}
      <div className="inquiry-form-section">
        <h3 className="inquiry-section-title">Payment Information</h3>
        <div className="inquiry-form-grid">
          {/* Payment Method */}
          <FormField
            label="Payment Method"
            error={errors.paymentMethod}
            className="inquiry-field-half"
          >
            <select
              className="unified-form-control"
              value={formData.paymentMethod}
              onChange={(e) => handleChange('paymentMethod', e.target.value)}
              disabled={loading}
            >
              <option value="">Select Payment Method</option>
              {dropdownData.paymentMethods?.map(method => (
                <option key={method._id} value={method._id}>
                  {method.description}
                </option>
              ))}
            </select>
          </FormField>
        </div>
      </div>

      {/* Additional Information Section */}
      <div className="inquiry-form-section">
        <h3 className="inquiry-section-title">Additional Information</h3>
        <div className="inquiry-form-grid">
          {/* Notes */}
          <FormField
            label="Notes & Comments"
            error={errors.notes}
            className="inquiry-field-full"
          >
            <textarea
              className="unified-form-control"
              value={formData.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              placeholder="Enter any additional notes, special instructions, or comments..."
              rows={4}
              disabled={loading}
            />
          </FormField>
        </div>
      </div>

      {/* Items Section */}
      <div className="inquiry-form-section">
        <h3 className="inquiry-section-title">Items & Materials</h3>
        <ItemManagement
          items={formData.items}
          onItemsChange={handleItemsChange}
          dropdownData={dropdownData}
          disabled={loading}
        />
      </div>
    </TransactionForm>
  );
};

export default InquiryForm;
