import React, { useState, useEffect } from 'react';
import TransactionForm from '../../../shared/components/transaction/TransactionForm';
import FormField from '../../../shared/components/transaction/FormField';
import '../../../shared/styles/unified-design.css';

const InquiryForm = ({ 
  inquiry = null, 
  dropdownData = {}, 
  onSubmit, 
  onCancel, 
  loading = false 
}) => {
  const [formData, setFormData] = useState({
    inquiryNumber: '',
    inquiryDate: new Date().toISOString().split('T')[0],
    hospital: '',
    status: 'Pending',
    patientName: '',
    patientUHID: '',
    surgeon: '',
    consultingDoctor: '',
    surgicalCategory: '',
    paymentMethod: '',
    surgicalProcedure: '',
    notes: ''
  });

  const [errors, setErrors] = useState({});
  const [filteredProcedures, setFilteredProcedures] = useState([]);
  const [consultingDoctors, setConsultingDoctors] = useState([]);

  // Initialize form data when editing
  useEffect(() => {
    if (inquiry) {
      setFormData({
        inquiryNumber: inquiry.inquiryNumber || '',
        inquiryDate: inquiry.inquiryDate ? new Date(inquiry.inquiryDate).toISOString().split('T')[0] : '',
        hospital: inquiry.hospital?._id || '',
        status: inquiry.status || 'Pending',
        patientName: inquiry.patientName || '',
        patientUHID: inquiry.patientUHID || '',
        surgeon: inquiry.surgeon?._id || '',
        consultingDoctor: inquiry.consultingDoctor?._id || '',
        surgicalCategory: inquiry.surgicalCategory?._id || '',
        paymentMethod: inquiry.paymentMethod?._id || '',
        surgicalProcedure: inquiry.surgicalProcedure?._id || '',
        notes: inquiry.notes || ''
      });
    }
  }, [inquiry]);

  // Filter procedures when surgical category changes
  useEffect(() => {
    if (formData.surgicalCategory && dropdownData.procedures) {
      const filtered = dropdownData.procedures.filter(procedure => 
        procedure.surgicalCategory === formData.surgicalCategory
      );
      setFilteredProcedures(filtered);
    } else {
      setFilteredProcedures([]);
    }
    
    // Reset procedure selection if category changes
    if (formData.surgicalProcedure) {
      const selectedProcedure = dropdownData.procedures?.find(
        p => p._id === formData.surgicalProcedure
      );
      if (selectedProcedure && selectedProcedure.surgicalCategory !== formData.surgicalCategory) {
        setFormData(prev => ({ ...prev, surgicalProcedure: '' }));
      }
    }
  }, [formData.surgicalCategory, dropdownData.procedures, formData.surgicalProcedure]);

  // Update consulting doctors when surgeon changes or doctors data is available
  useEffect(() => {
    const availableConsultingDoctors = [];
    
    // Add selected surgeon to consulting doctor options
    if (formData.surgeon && dropdownData.doctors) {
      const selectedSurgeon = dropdownData.doctors.find(d => d._id === formData.surgeon);
      if (selectedSurgeon) {
        availableConsultingDoctors.push(selectedSurgeon);
      }
    }
    
    // Add doctors who have consulting doctor assignments
    if (dropdownData.doctors) {
      const consultingDoctorsFromMaster = dropdownData.doctors.filter(doctor => 
        doctor.consultingDoctor !== null && doctor.consultingDoctor !== undefined
      );
      
      // Merge without duplicates
      consultingDoctorsFromMaster.forEach(doctor => {
        if (!availableConsultingDoctors.find(d => d._id === doctor._id)) {
          availableConsultingDoctors.push(doctor);
        }
      });
    }
    
    setConsultingDoctors(availableConsultingDoctors);
  }, [formData.surgeon, dropdownData.doctors]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.hospital) newErrors.hospital = 'Hospital is required';
    if (!formData.inquiryDate) newErrors.inquiryDate = 'Inquiry date is required';
    if (!formData.patientName.trim()) newErrors.patientName = 'Patient name is required';
    if (!formData.patientUHID.trim()) newErrors.patientUHID = 'Patient UHID is required';
    
    // Validate patient name length
    if (formData.patientName.length > 80) {
      newErrors.patientName = 'Patient name cannot exceed 80 characters';
    }
    
    // Validate patient UHID length
    if (formData.patientUHID.length > 50) {
      newErrors.patientUHID = 'Patient UHID cannot exceed 50 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (validateForm()) {
      onSubmit(formData);
    }
  };

  return (
    <div className="unified-modal-overlay">
      <div className="unified-modal-container" style={{maxWidth: '900px', maxHeight: '90vh', overflow: 'auto'}}>
        <div className="unified-modal-header">
          <div className="unified-modal-title">
            <h1>{inquiry ? 'Edit Inquiry' : 'Create New Inquiry'}</h1>
            <p>{inquiry ? `Editing inquiry for ${inquiry.patientName}` : 'Add a new patient inquiry'}</p>
          </div>
          <button 
            className="unified-modal-close"
            onClick={onCancel}
          >
            ×
          </button>
        </div>
        
        <div className="unified-modal-body">
          <TransactionForm
            onSubmit={handleSubmit}
            onCancel={onCancel}
            submitLabel={inquiry ? 'Update Inquiry' : 'Create Inquiry'}
            isLoading={loading}
          >
            {/* Group 1: Inquiry Details */}
            <div className="form-section">
              <h3 className="form-section-title">Inquiry Details</h3>
              <div className="form-grid">
                <FormField label="Inquiry Number" error={errors.inquiryNumber}>
                  <input
                    type="text"
                    name="inquiryNumber"
                    value={formData.inquiryNumber || 'Auto-generated after saving'}
                    onChange={handleChange}
                    className="unified-search-input"
                    placeholder="Auto-generated after saving"
                    readOnly
                    style={{ backgroundColor: 'var(--gray-100)', cursor: 'not-allowed' }}
                  />
                  <small style={{color: 'var(--gray-600)', fontSize: '0.8rem'}}>
                    Inquiry number will be generated automatically when the inquiry is saved
                  </small>
                </FormField>

                <FormField label="Inquiry Date" required error={errors.inquiryDate}>
                  <input
                    type="date"
                    name="inquiryDate"
                    value={formData.inquiryDate}
                    onChange={handleChange}
                    className="unified-search-input"
                    required
                  />
                </FormField>

                <FormField label="Hospital" required error={errors.hospital}>
                  <select
                    name="hospital"
                    value={formData.hospital}
                    onChange={handleChange}
                    className="unified-search-input"
                    required
                  >
                    <option value="">Select Hospital</option>
                    {(dropdownData.hospitals || []).map(hospital => (
                      <option key={hospital._id} value={hospital._id}>
                        {hospital.shortName || hospital.name}
                      </option>
                    ))}
                  </select>
                </FormField>

                <FormField label="Status" error={errors.status}>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleChange}
                    className="unified-search-input"
                  >
                    <option value="Pending">Pending</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Completed">Completed</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </FormField>
              </div>
            </div>

            {/* Group 2: Patient Information */}
            <div className="form-section">
              <h3 className="form-section-title">Patient Information</h3>
              <div className="form-grid">
                <FormField label="Patient Name" required error={errors.patientName}>
                  <input
                    type="text"
                    name="patientName"
                    value={formData.patientName}
                    onChange={handleChange}
                    className="unified-search-input"
                    placeholder="Enter patient full name"
                    maxLength={80}
                    required
                  />
                  <small style={{color: 'var(--gray-600)', fontSize: '0.8rem'}}>
                    {formData.patientName.length}/80 characters
                  </small>
                </FormField>

                <FormField label="Patient UHID" required error={errors.patientUHID}>
                  <input
                    type="text"
                    name="patientUHID"
                    value={formData.patientUHID}
                    onChange={handleChange}
                    className="unified-search-input"
                    placeholder="Enter patient UHID"
                    maxLength={50}
                    required
                  />
                  <small style={{color: 'var(--gray-600)', fontSize: '0.8rem'}}>
                    {formData.patientUHID.length}/50 characters
                  </small>
                </FormField>
              </div>
            </div>

            {/* Group 3: Surgical Information */}
            <div className="form-section">
              <h3 className="form-section-title">Surgical Information</h3>
              <div className="form-grid">
                <FormField label="Surgical Category" error={errors.surgicalCategory}>
                  <select
                    name="surgicalCategory"
                    value={formData.surgicalCategory}
                    onChange={handleChange}
                    className="unified-search-input"
                  >
                    <option value="">Select Surgical Category</option>
                    {(dropdownData.surgicalCategories || []).map(category => (
                      <option key={category._id} value={category._id}>
                        {category.description}
                      </option>
                    ))}
                  </select>
                </FormField>

                <FormField label="Payment Method" error={errors.paymentMethod}>
                  <select
                    name="paymentMethod"
                    value={formData.paymentMethod}
                    onChange={handleChange}
                    className="unified-search-input"
                  >
                    <option value="">Select Payment Method</option>
                    {(dropdownData.paymentMethods || []).map(method => (
                      <option key={method._id} value={method._id}>
                        {method.description}
                      </option>
                    ))}
                  </select>
                </FormField>

                <FormField label="Surgical Procedure" error={errors.surgicalProcedure}>
                  <select
                    name="surgicalProcedure"
                    value={formData.surgicalProcedure}
                    onChange={handleChange}
                    className="unified-search-input"
                    disabled={!formData.surgicalCategory}
                  >
                    <option value="">
                      {formData.surgicalCategory ? 'Select Surgical Procedure' : 'Select Category First'}
                    </option>
                    {filteredProcedures.map(procedure => (
                      <option key={procedure._id} value={procedure._id}>
                        {procedure.name}
                      </option>
                    ))}
                  </select>
                </FormField>
              </div>
            </div>

            {/* Group 4: Doctor Information */}
            <div className="form-section">
              <h3 className="form-section-title">Doctor Information</h3>
              <div className="form-grid">
                <FormField label="Surgeon" error={errors.surgeon}>
                  <select
                    name="surgeon"
                    value={formData.surgeon}
                    onChange={handleChange}
                    className="unified-search-input"
                  >
                    <option value="">Select Surgeon</option>
                    {(dropdownData.doctors || []).map(doctor => (
                      <option key={doctor._id} value={doctor._id}>
                        {doctor.name}
                      </option>
                    ))}
                  </select>
                </FormField>

                <FormField label="Consulting Doctor" error={errors.consultingDoctor}>
                  <select
                    name="consultingDoctor"
                    value={formData.consultingDoctor}
                    onChange={handleChange}
                    className="unified-search-input"
                  >
                    <option value="">Select Consulting Doctor</option>
                    {consultingDoctors.map(doctor => (
                      <option key={doctor._id} value={doctor._id}>
                        {doctor.name}
                        {doctor._id === formData.surgeon ? ' (Selected Surgeon)' : ''}
                      </option>
                    ))}
                  </select>
                </FormField>
              </div>
            </div>

            {/* Group 5: Comments */}
            <div className="form-section">
              <h3 className="form-section-title">Comments</h3>
              <div className="form-grid" style={{ gridTemplateColumns: '1fr' }}>
                <FormField label="Comments" error={errors.notes}>
                  <textarea
                    name="notes"
                    value={formData.notes}
                    onChange={handleChange}
                    className="unified-search-input"
                    placeholder="Enter any additional comments or notes..."
                    rows="4"
                    maxLength={500}
                    style={{ resize: 'vertical', minHeight: '100px' }}
                  />
                  <small style={{color: 'var(--gray-600)', fontSize: '0.8rem'}}>
                    {formData.notes.length}/500 characters
                  </small>
                </FormField>
              </div>
            </div>
          </TransactionForm>
        </div>
      </div>
    </div>
  );
};

export default InquiryForm;
