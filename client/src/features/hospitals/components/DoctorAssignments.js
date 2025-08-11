import React, { useState, useEffect, useCallback } from 'react';
import { doctorAssignmentAPI } from '../services/doctorAssignmentAPI';
import './DoctorAssignments.css';
import '../../../shared/styles/unified-design.css';

const DoctorAssignments = ({ hospital, currentUser, onClose }) => {
  const [doctorAssignments, setDoctorAssignments] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [paymentTypes, setPaymentTypes] = useState([]);
  const [categories, setCategories] = useState([]);
  const [procedures, setProcedures] = useState([]);
  const [expenseTypes, setExpenseTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Form states
  const [showForm, setShowForm] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState(null);
  const [formData, setFormData] = useState({
    doctor: '',
    expenseType: '',
    paymentType: '',
    surgicalCategory: '',
    procedure: '',
    chargeType: '',
    chargeValue: '',
    validityFrom: '',
    validityTo: '',
    description: ''
  });

  const fetchDoctorAssignments = useCallback(async () => {
    try {
      setLoading(true);
      const data = await doctorAssignmentAPI.getDoctorAssignmentsByHospital(hospital._id);
      setDoctorAssignments(data);
    } catch (err) {
      setError('Failed to fetch doctor assignments');
      console.error('Error fetching doctor assignments:', err);
    } finally {
      setLoading(false);
    }
  }, [hospital._id]);

  const fetchOptions = useCallback(async (paymentTypeFilter = '', categoryFilter = '') => {
    try {
      console.log('Fetching doctor assignment options for hospital:', hospital._id);
      console.log('Filters - Payment Type:', paymentTypeFilter || 'All', 'Category:', categoryFilter || 'All');
      const options = await doctorAssignmentAPI.getOptions(hospital._id, paymentTypeFilter, categoryFilter);
      console.log('Options received:', options);
      setDoctors(options.doctors || []);
      setPaymentTypes(options.paymentTypes || []);
      setCategories(options.categories || []);
      setProcedures(options.procedures || []);
      setExpenseTypes(options.expenseTypes || []);
    } catch (err) {
      setError('Failed to fetch options: ' + (err.response?.data?.message || err.message));
      console.error('Error fetching options:', err);
    }
  }, [hospital._id]);

  useEffect(() => {
    if (hospital) {
      fetchDoctorAssignments();
      fetchOptions();
    }
  }, [hospital, fetchDoctorAssignments, fetchOptions]);

  // Fetch filtered procedures when payment type or category changes
  const handlePaymentTypeChange = (paymentTypeId) => {
    setFormData({ ...formData, paymentType: paymentTypeId, procedure: '' }); // Clear procedure when payment type changes
    fetchOptions(paymentTypeId, formData.surgicalCategory);
  };

  const handleCategoryChange = (categoryId) => {
    setFormData({ ...formData, surgicalCategory: categoryId, procedure: '' }); // Clear procedure when category changes
    fetchOptions(formData.paymentType, categoryId);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validate dates
    if (formData.validityFrom && formData.validityTo) {
      const fromDate = new Date(formData.validityFrom);
      const toDate = new Date(formData.validityTo);
      if (toDate <= fromDate) {
        setError('Validity to date must be after validity from date');
        return;
      }
    }

    // Validate charge value if charge type is provided
    if (formData.chargeType && formData.chargeValue) {
      const chargeValue = parseFloat(formData.chargeValue);
      if (formData.chargeType === 'percentage' && (chargeValue < 0 || chargeValue > 100)) {
        setError('Percentage must be between 0 and 100');
        return;
      }
      if (chargeValue < 0) {
        setError('Charge value cannot be negative');
        return;
      }
    }

    try {
      const assignmentData = {
        hospital: hospital._id,
        doctor: formData.doctor,
        expenseType: formData.expenseType,
        paymentType: formData.paymentType || undefined,
        surgicalCategory: formData.surgicalCategory || undefined,
        procedure: formData.procedure || undefined,
        chargeType: formData.chargeType || undefined,
        chargeValue: formData.chargeValue ? parseFloat(formData.chargeValue) : undefined,
        validityFrom: formData.validityFrom,
        validityTo: formData.validityTo,
        description: formData.description,
        businessUnit: hospital.businessUnit?._id || hospital.businessUnit,
        createdBy: currentUser._id
      };

      if (editingAssignment) {
        await doctorAssignmentAPI.updateDoctorAssignment(editingAssignment._id, {
          chargeType: assignmentData.chargeType,
          chargeValue: assignmentData.chargeValue,
          validityFrom: assignmentData.validityFrom,
          validityTo: assignmentData.validityTo,
          description: assignmentData.description,
          updatedBy: currentUser._id
        });
        setSuccess('Doctor assignment updated successfully');
      } else {
        await doctorAssignmentAPI.createDoctorAssignment(assignmentData);
        setSuccess('Doctor assignment created successfully');
      }

      resetForm();
      fetchDoctorAssignments();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save doctor assignment');
      console.error('Error saving doctor assignment:', err);
    }
  };

  const handleEdit = (assignment) => {
    setEditingAssignment(assignment);
    const paymentTypeId = assignment.paymentType?._id || '';
    const categoryId = assignment.surgicalCategory?._id || '';
    
    setFormData({
      doctor: assignment.doctor?._id || '',
      expenseType: assignment.expenseType?._id || '',
      paymentType: paymentTypeId,
      surgicalCategory: categoryId,
      procedure: assignment.procedure?._id || '',
      chargeType: assignment.chargeType || '',
      chargeValue: assignment.chargeValue ? assignment.chargeValue.toString() : '',
      validityFrom: assignment.validityFrom ? new Date(assignment.validityFrom).toISOString().split('T')[0] : '',
      validityTo: assignment.validityTo ? new Date(assignment.validityTo).toISOString().split('T')[0] : '',
      description: assignment.description || ''
    });
    
    // Fetch options with the current filters to populate procedures correctly
    fetchOptions(paymentTypeId, categoryId);
    setShowForm(true);
  };

  const handleDelete = async (assignment) => {
    if (window.confirm('Are you sure you want to delete this doctor assignment?')) {
      try {
        setError('');
        await doctorAssignmentAPI.deleteDoctorAssignment(assignment._id, currentUser._id);
        setSuccess('Doctor assignment deleted successfully');
        fetchDoctorAssignments();
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to delete doctor assignment');
        console.error('Error deleting doctor assignment:', err);
      }
    }
  };

  const resetForm = () => {
    // Set default dates: Jan 1 of current year to Dec 31, 2025
    const currentYear = new Date().getFullYear();
    const defaultFromDate = `${currentYear}-01-01`;
    const defaultToDate = '2025-12-31';
    
    setFormData({
      doctor: '',
      expenseType: expenseTypes.length > 0 ? expenseTypes[0]._id : '', // Auto-select Clinical Charges if available
      paymentType: '',
      surgicalCategory: '',
      procedure: '',
      chargeType: '',
      chargeValue: '',
      validityFrom: defaultFromDate,
      validityTo: defaultToDate,
      description: ''
    });
    setEditingAssignment(null);
    setShowForm(false);
    // Fetch all options without filters when form is reset
    fetchOptions('', '');
  };

  const getDoctorName = (doctor) => {
    return `Dr. ${doctor.name}`;
  };

  const getPaymentTypeName = (paymentType) => {
    return `${paymentType.code} - ${paymentType.description}`;
  };

  const getCategoryName = (category) => {
    return `${category.code} - ${category.description}`;
  };

  const getProcedureName = (procedure) => {
    return `${procedure.code} - ${procedure.name}`;
  };

  const getExpenseTypeName = (expenseType) => {
    return `${expenseType.code} - ${expenseType.name}`;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getApplicabilityText = (assignment) => {
    const parts = [];
    if (assignment.paymentType) parts.push(`Payment: ${assignment.paymentType.code}`);
    if (assignment.surgicalCategory) parts.push(`Category: ${assignment.surgicalCategory.code}`);
    if (assignment.procedure) parts.push(`Procedure: ${assignment.procedure.code}`);
    
    if (parts.length === 0) return 'All procedures (Default)';
    return parts.join(', ');
  };

  const getChargeDisplay = (assignment) => {
    if (!assignment.chargeType || !assignment.chargeValue) return 'Not specified';
    
    if (assignment.chargeType === 'percentage') {
      return `${assignment.chargeValue}%`;
    } else {
      return `₹${assignment.chargeValue}`;
    }
  };

  if (loading) {
    return (
      <div className="unified-modal-overlay">
        <div className="unified-modal-container" style={{maxWidth: '1200px', width: '95%', maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden'}}>
          <div className="unified-modal-body" style={{flex: 1, overflow: 'auto', padding: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
            <div className="unified-loading-container">
              <div className="unified-loading-spinner"></div>
              <p>Loading doctor assignments...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="unified-modal-overlay">
      <div className="unified-modal-container" style={{maxWidth: '1200px', width: '95%', maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden'}}>
        {/* Header */}
        <div className="unified-modal-header">
          <div className="unified-modal-title">
            <h1>Doctor Assignments</h1>
            <p>Manage doctor assignments and charges for {hospital.shortName}</p>
          </div>
          <button 
            className="unified-modal-close"
            onClick={onClose}
            aria-label="Close dialog"
          >
            ×
          </button>
        </div>

        {error && <div className="unified-alert unified-alert-danger" style={{margin: '0 1.5rem'}}>{error}</div>}
        {success && <div className="unified-alert unified-alert-success" style={{margin: '0 1.5rem'}}>{success}</div>}

        {/* Scrollable Content */}
        <div className="unified-modal-body" style={{flex: 1, overflow: 'auto', padding: '1.5rem'}}>
          {/* Action Button */}
          <div className="unified-modal-actions" style={{marginBottom: '1.5rem', borderTop: 'none', padding: 0}}>
            <button 
              className="unified-btn unified-btn-primary"
              onClick={() => {
                resetForm();
                setShowForm(true);
              }}
            >
              Add Doctor Assignment
            </button>
          </div>

        {showForm && (
          <div className="unified-content" style={{background: 'var(--white)', borderRadius: 'var(--border-radius)', padding: '2rem', marginBottom: '1.5rem', boxShadow: 'var(--shadow-sm)'}}>
            <div style={{borderBottom: '2px solid var(--gray-200)', paddingBottom: '1rem', marginBottom: '1.5rem'}}>
              <h2 style={{margin: 0, color: 'var(--primary-color)', fontSize: '1.25rem', fontWeight: '600'}}>
                {editingAssignment ? 'Edit Doctor Assignment' : 'Add Doctor Assignment'}
              </h2>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="unified-form-grid">
                <div className="unified-form-field">
                  <label className="unified-form-label">Doctor *</label>
                  <select
                    value={formData.doctor}
                    onChange={(e) => setFormData({ ...formData, doctor: e.target.value })}
                    disabled={editingAssignment} // Can't change doctor when editing
                    required
                    className="unified-search-input"
                  >
                    <option value="">Select Doctor</option>
                    {doctors.map(doctor => (
                      <option key={doctor._id} value={doctor._id}>
                        {getDoctorName(doctor)} - {doctor.specialization}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="unified-form-field">
                  <label className="unified-form-label">Expense Type *</label>
                  <select
                    value={formData.expenseType}
                    onChange={(e) => setFormData({ ...formData, expenseType: e.target.value })}
                    disabled={true} // Hardcoded to Clinical Charges
                    required
                    className="unified-search-input"
                  >
                    {expenseTypes.length > 0 ? (
                      expenseTypes.map(type => (
                        <option key={type._id} value={type._id}>
                          {getExpenseTypeName(type)}
                        </option>
                      ))
                    ) : (
                      <option value="">Clinical Charges (Create expense type first)</option>
                    )}
                  </select>
                </div>
              </div>

              <div className="unified-form-grid">
                <div className="unified-form-field">
                  <label className="unified-form-label">Payment Type (Optional)</label>
                  <select
                    value={formData.paymentType}
                    onChange={(e) => handlePaymentTypeChange(e.target.value)}
                    disabled={editingAssignment} // Can't change payment type when editing
                    className="unified-search-input"
                  >
                    <option value="">All Payment Types</option>
                    {paymentTypes.map(type => (
                      <option key={type._id} value={type._id}>
                        {getPaymentTypeName(type)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="unified-form-field">
                  <label className="unified-form-label">Surgical Category (Optional)</label>
                  <select
                    value={formData.surgicalCategory}
                    onChange={(e) => handleCategoryChange(e.target.value)}
                    disabled={editingAssignment} // Can't change category when editing
                    className="unified-search-input"
                  >
                    <option value="">All Categories</option>
                    {categories.map(category => (
                      <option key={category._id} value={category._id}>
                        {getCategoryName(category)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="unified-form-grid">
                <div className="unified-form-field">
                  <label className="unified-form-label">Procedure (Optional)</label>
                  <select
                    value={formData.procedure}
                    onChange={(e) => setFormData({ ...formData, procedure: e.target.value })}
                    disabled={editingAssignment} // Can't change procedure when editing
                    className="unified-search-input"
                  >
                    <option value="">All Procedures</option>
                    {procedures.map(procedure => (
                      <option key={procedure._id} value={procedure._id}>
                        {getProcedureName(procedure)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="unified-form-field">
                  <label className="unified-form-label">Charge Type (Optional)</label>
                  <select
                    value={formData.chargeType}
                    onChange={(e) => setFormData({ ...formData, chargeType: e.target.value })}
                    className="unified-search-input"
                  >
                    <option value="">Not specified</option>
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Fixed Amount (₹)</option>
                  </select>
                </div>
              </div>

              <div className="unified-form-grid">
                <div className="unified-form-field">
                  <label className="unified-form-label">Charge Value (Optional)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max={formData.chargeType === 'percentage' ? '100' : undefined}
                    value={formData.chargeValue}
                    onChange={(e) => setFormData({ ...formData, chargeValue: e.target.value })}
                    placeholder={formData.chargeType === 'percentage' ? '0-100' : 'Amount in ₹'}
                    className="unified-search-input"
                  />
                </div>

                <div className="unified-form-field">
                  <label className="unified-form-label">Valid From *</label>
                  <input
                    type="date"
                    value={formData.validityFrom}
                    onChange={(e) => setFormData({ ...formData, validityFrom: e.target.value })}
                    required
                    className="unified-search-input"
                  />
                </div>
              </div>

              <div className="unified-form-grid">
                <div className="unified-form-field">
                  <label className="unified-form-label">Valid To *</label>
                  <input
                    type="date"
                    value={formData.validityTo}
                    onChange={(e) => setFormData({ ...formData, validityTo: e.target.value })}
                    required
                    className="unified-search-input"
                  />
                </div>

                <div className="unified-form-field">
                  <label className="unified-form-label">Description</label>
                  <input
                    type="text"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    maxLength="200"
                    placeholder="Optional description"
                    className="unified-search-input"
                  />
                </div>
              </div>

              <div style={{display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '2rem'}}>
                <button type="button" onClick={resetForm} className="unified-btn unified-btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="unified-btn unified-btn-primary">
                  {editingAssignment ? 'Update' : 'Save'} Assignment
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="unified-content" style={{background: 'var(--white)', borderRadius: 'var(--border-radius)', padding: '1.5rem', boxShadow: 'var(--shadow-sm)'}}>
          {doctorAssignments.length === 0 ? (
            <div className="unified-empty">
              <h3>No Doctor Assignments</h3>
              <p>No doctor assignments found for this hospital.</p>
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="doctor-assignments-table" style={{display: 'block'}}>
                <table className="unified-table">
                  <thead>
                    <tr>
                      <th>Doctor</th>
                      <th>Applicability</th>
                      <th>Clinical Charges</th>
                      <th>Valid From</th>
                      <th>Valid To</th>
                      <th>Description</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {doctorAssignments.map(assignment => (
                      <tr key={assignment._id}>
                        <td data-label="Doctor">{getDoctorName(assignment.doctor)}</td>
                        <td data-label="Applicability">{getApplicabilityText(assignment)}</td>
                        <td data-label="Clinical Charges">{getChargeDisplay(assignment)}</td>
                        <td data-label="Valid From">{formatDate(assignment.validityFrom)}</td>
                        <td data-label="Valid To">{formatDate(assignment.validityTo)}</td>
                        <td data-label="Description">{assignment.description || '-'}</td>
                        <td data-label="Actions">
                          <div className="unified-table-actions">
                            <button
                              onClick={() => handleEdit(assignment)}
                              className="unified-table-action edit"
                              title="Edit assignment"
                            >
                              ✏️
                            </button>
                            <button
                              onClick={() => handleDelete(assignment)}
                              className="unified-table-action delete"
                              title="Delete assignment"
                            >
                              🗑️
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View */}
              <div className="doctor-assignments-cards" style={{display: 'none'}}>
                {doctorAssignments.map(assignment => (
                  <div key={assignment._id} className="unified-mobile-card">
                    <div className="unified-card-header">
                      <div className="unified-card-title">
                        {getDoctorName(assignment.doctor)}
                      </div>
                      <div className="unified-card-badge">
                        {getChargeDisplay(assignment)}
                      </div>
                    </div>
                    
                    <div className="unified-card-body" style={{padding: '1rem 1.5rem'}}>
                      <div style={{marginBottom: '0.75rem'}}>
                        <strong style={{fontSize: '0.85rem', color: 'var(--gray-600)'}}>Applies to:</strong>
                        <div style={{marginTop: '0.25rem', background: 'var(--gray-50)', padding: '0.5rem', borderRadius: 'var(--border-radius)', fontSize: '0.9rem'}}>
                          {getApplicabilityText(assignment)}
                        </div>
                      </div>

                      <div style={{marginBottom: '0.75rem', fontSize: '0.9rem', color: 'var(--gray-600)'}}>
                        <strong>Valid:</strong> {formatDate(assignment.validityFrom)} - {formatDate(assignment.validityTo)}
                      </div>

                      {assignment.description && (
                        <div style={{marginBottom: '0.75rem', fontSize: '0.9rem', fontStyle: 'italic', color: 'var(--gray-600)'}}>
                          <strong>Description:</strong> {assignment.description}
                        </div>
                      )}

                      <div style={{display: 'flex', gap: '0.5rem', marginTop: '1rem'}}>
                        <button
                          onClick={() => handleEdit(assignment)}
                          className="unified-btn unified-btn-secondary"
                          style={{flex: 1}}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(assignment)}
                          className="unified-btn unified-btn-danger"
                          style={{flex: 1}}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
        </div>
      </div>
    </div>
  );
};

export default DoctorAssignments;
