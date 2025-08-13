import React, { useState, useEffect } from 'react';
import { inquiryAPI } from '../../services/inquiryAPI';
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

  // Cascading dropdown state
  const [cascadingData, setCascadingData] = useState({
    surgicalCategories: [],
    procedures: [],
    surgeons: [],
    consultingDoctors: []
  });
  const [cascadingLoading, setCascadingLoading] = useState({
    surgicalCategories: false,
    procedures: false,
    surgeons: false,
    consultingDoctors: false
  });

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

  // Fetch cascading dropdown data
  const fetchCascadingData = async (type, filters = {}) => {
    try {
      setCascadingLoading(prev => ({ ...prev, [type]: true }));
      const response = await inquiryAPI.getCascadingData(type, filters);
      setCascadingData(prev => ({ ...prev, [type]: response.data || [] }));
    } catch (error) {
      console.error(`Error fetching ${type} data:`, error);
      setCascadingData(prev => ({ ...prev, [type]: [] }));
    } finally {
      setCascadingLoading(prev => ({ ...prev, [type]: false }));
    }
  };

  // Update cascading dropdowns when hospital, payment method, or surgeon changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const { hospital, surgicalCategory } = formData;
    
    // Fetch surgical categories filtered by selected hospital
    if (hospital) {
      fetchCascadingData('surgical-categories', { hospitalId: hospital });
    } else {
      setCascadingData(prev => ({ ...prev, surgicalCategories: [] }));
      setFormData(prev => ({ ...prev, surgicalCategory: '', surgicalProcedure: '' }));
    }
    
    // Fetch procedures filtered by selected surgical category
    if (surgicalCategory) {
      fetchCascadingData('procedures', { surgicalCategoryId: surgicalCategory });
    } else {
      setCascadingData(prev => ({ ...prev, procedures: [] }));
      setFormData(prev => ({ ...prev, surgicalProcedure: '' }));
    }

    // Fetch surgeons filtered by hospital and surgical category
    if (hospital) {
      const surgeonFilters = { hospitalId: hospital };
      if (surgicalCategory) {
        surgeonFilters.surgicalCategoryId = surgicalCategory;
      }
      fetchCascadingData('surgeons', surgeonFilters);
    } else {
      setCascadingData(prev => ({ ...prev, surgeons: [] }));
      setFormData(prev => ({ ...prev, surgeon: '', consultingDoctor: '' }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.hospital, formData.surgicalCategory, fetchCascadingData, setCascadingData, setFormData]);

  // Update consulting doctors when surgeon changes
  useEffect(() => {
    const { surgeon } = formData;
    const availableConsultingDoctors = [];
    
    if (surgeon && dropdownData.doctors) {
      // Add selected surgeon to consulting doctor options
      const selectedSurgeon = dropdownData.doctors.find(d => d._id === surgeon);
      if (selectedSurgeon) {
        availableConsultingDoctors.push(selectedSurgeon);
        
        // Auto-select the surgeon as consulting doctor by default
        if (formData.consultingDoctor !== surgeon) {
          setFormData(prev => ({ ...prev, consultingDoctor: surgeon }));
        }
      }
      
      // Add doctors who have consulting doctor assignments to the selected surgeon
      const assignedConsultingDoctors = dropdownData.doctors.filter(doctor => 
        doctor.consultingDoctor === surgeon || 
        (doctor.consultingDoctors && doctor.consultingDoctors.includes(surgeon))
      );
      
      // Merge without duplicates
      assignedConsultingDoctors.forEach(doctor => {
        if (!availableConsultingDoctors.find(d => d._id === doctor._id)) {
          availableConsultingDoctors.push(doctor);
        }
      });
    }
    
    setCascadingData(prev => ({ ...prev, consultingDoctors: availableConsultingDoctors }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.surgeon, dropdownData.doctors, formData.consultingDoctor, setCascadingData]);

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
    setFormData(prev => {
      const newData = { ...prev, [field]: value };
      
      // Clear dependent fields when parent changes
      if (field === 'hospital') {
        newData.surgicalCategory = '';
        newData.surgicalProcedure = '';
        newData.surgeon = '';
        newData.consultingDoctor = '';
      } else if (field === 'paymentMethod') {
        newData.surgicalProcedure = '';
      } else if (field === 'surgeon') {
        // Consulting doctor will be auto-set in useEffect
      }
      
      return newData;
    });
    
    // Clear errors when user starts changing values
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
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
      {/* Basic Information */}
      <div className="inquiry-form-section">
        <h3 className="inquiry-section-title">Basic Information</h3>
        <div className="inquiry-form-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
          {/* Inquiry Date */}
          <FormField
            label="Inquiry Date"
            required
            error={errors.inquiryDate}
            className="inquiry-field-responsive"
          >
            <input
              type="date"
              className="unified-form-control"
              value={formData.inquiryDate}
              onChange={(e) => handleChange('inquiryDate', e.target.value)}
              disabled={loading}
            />
          </FormField>

          {/* Hospital Selection */}
          <FormField
            label="Hospital"
            required
            error={errors.hospital}
            className="inquiry-field-responsive"
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
        </div>
      </div>

      {/* Patient Information */}
      <div className="inquiry-form-section">
        <h3 className="inquiry-section-title">Patient Information</h3>
        <div className="inquiry-form-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
          {/* Patient Name */}
          <FormField
            label="Patient Name"
            required
            error={errors.patientName}
            className="inquiry-field-responsive"
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
            className="inquiry-field-responsive"
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

      {/* Medical & Payment Information */}
      <div className="inquiry-form-section">
        <h3 className="inquiry-section-title">Medical & Payment Information</h3>
        <div className="inquiry-form-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
          {/* Surgical Category */}
          <FormField
            label="Surgical Category"
            error={errors.surgicalCategory}
            className="inquiry-field-responsive"
          >
            <select
              className="unified-form-control"
              value={formData.surgicalCategory}
              onChange={(e) => handleChange('surgicalCategory', e.target.value)}
              disabled={loading || cascadingLoading.surgicalCategories || !formData.hospital}
            >
              <option value="">
                {!formData.hospital 
                  ? "Select Hospital First" 
                  : cascadingLoading.surgicalCategories 
                    ? "Loading..." 
                    : "Select Category"
                }
              </option>
              {cascadingData.surgicalCategories?.map(category => (
                <option key={category._id} value={category._id}>
                  {category.description}
                </option>
              ))}
            </select>
          </FormField>

          {/* Payment Method */}
          <FormField
            label="Payment Method"
            error={errors.paymentMethod}
            className="inquiry-field-responsive"
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

          {/* Surgical Procedure */}
          <FormField
            label="Surgical Procedure"
            error={errors.surgicalProcedure}
            className="inquiry-field-responsive"
          >
            <select
              className="unified-form-control"
              value={formData.surgicalProcedure}
              onChange={(e) => handleChange('surgicalProcedure', e.target.value)}
              disabled={loading || cascadingLoading.procedures || !formData.surgicalCategory}
            >
              <option value="">
                {!formData.surgicalCategory 
                  ? "Select Surgical Category First" 
                  : cascadingLoading.procedures 
                    ? "Loading..." 
                    : "Select Procedure"
                }
              </option>
              {cascadingData.procedures?.map(procedure => (
                <option key={procedure._id} value={procedure._id}>
                  {procedure.name}
                </option>
              ))}
            </select>
          </FormField>
        </div>
      </div>

      {/* Doctor Information */}
      <div className="inquiry-form-section">
        <h3 className="inquiry-section-title">Doctor Information</h3>
        <div className="inquiry-form-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
          {/* Surgeon */}
          <FormField
            label="Surgeon"
            error={errors.surgeon}
            className="inquiry-field-responsive"
          >
            <select
              className="unified-form-control"
              value={formData.surgeon}
              onChange={(e) => handleChange('surgeon', e.target.value)}
              disabled={loading || cascadingLoading.surgeons || !formData.hospital}
            >
              <option value="">
                {!formData.hospital 
                  ? "Select Hospital First" 
                  : cascadingLoading.surgeons 
                    ? "Loading..." 
                    : "Select Surgeon"
                }
              </option>
              {cascadingData.surgeons?.map(doctor => (
                <option key={doctor._id} value={doctor._id}>
                  {doctor.name} {doctor.surgicalCategories?.length > 0 && `(${doctor.surgicalCategories.map(cat => cat.description).join(', ')})`}
                </option>
              ))}
            </select>
          </FormField>

          {/* Consulting Doctor */}
          <FormField
            label="Consulting Doctor"
            error={errors.consultingDoctor}
            className="inquiry-field-responsive"
          >
            <select
              className="unified-form-control"
              value={formData.consultingDoctor}
              onChange={(e) => handleChange('consultingDoctor', e.target.value)}
              disabled={loading || !formData.surgeon}
            >
              <option value="">
                {!formData.surgeon 
                  ? "Select Surgeon First" 
                  : "Select Consulting Doctor"
                }
              </option>
              {cascadingData.consultingDoctors?.map(doctor => (
                <option key={doctor._id} value={doctor._id}>
                  {doctor.name}
                  {doctor._id === formData.surgeon ? ' (Selected Surgeon)' : ''}
                  {doctor.surgicalCategories?.length > 0 && ` (${doctor.surgicalCategories.map(cat => cat.description).join(', ')})`}
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
