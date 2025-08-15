import React, { useEffect, useState } from 'react';
import { expenseTypeAssignmentAPI } from '../services/expenseTypeAssignmentAPI';
import './ExpenseTypeAssignments.css';
import '../../../shared/styles/unified-design.css';

function ExpenseTypeAssignments({ hospital, currentUser, onClose }) {
  const [assignments, setAssignments] = useState([]);
  const [options, setOptions] = useState({ expenseTypes: [], paymentTypes: [], categories: [], procedures: [] });
  const [form, setForm] = useState({
    expenseType: '',
    value: '',
    valueType: 'amount',
    taxBasis: '',
    paymentType: '',
    category: '',
    procedure: '',
    validityFrom: `${new Date().getFullYear()}-01-01`,
    validityTo: '9999-12-31'
  });
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (hospital?._id) {
      fetchAssignments();
      fetchOptions();
    }
    // eslint-disable-next-line
  }, [hospital?._id]);

  const fetchAssignments = async () => {
    setLoading(true);
    try {
      const data = await expenseTypeAssignmentAPI.getAssignmentsByHospital(hospital._id);
      setAssignments(data);
    } catch (err) {
      setError('Failed to load assignments');
    } finally {
      setLoading(false);
    }
  };

  const fetchOptions = async (paymentTypeId = '', categoryId = '') => {
    try {
      const data = await expenseTypeAssignmentAPI.getOptions(hospital._id, paymentTypeId, categoryId);
      setOptions(data);
    } catch (err) {
      setError('Failed to load options');
    }
  };

  const handleChange = e => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // Fetch filtered procedures when payment type or category changes
  const handlePaymentTypeChange = (paymentTypeId) => {
    setForm({ ...form, paymentType: paymentTypeId, procedure: '' }); // Clear procedure when payment type changes
    fetchOptions(paymentTypeId, form.category);
  };

  const handleCategoryChange = (categoryId) => {
    setForm({ ...form, category: categoryId, procedure: '' }); // Clear procedure when category changes
    fetchOptions(form.paymentType, categoryId);
  };

  // Handle procedure selection and auto-populate surgical categories
  const handleProcedureChange = (e) => {
    const procedureId = e.target.value;
    setForm({ ...form, procedure: procedureId });
    
    if (procedureId) {
      // Find the selected procedure
      const selectedProcedure = options.procedures.find(proc => proc._id === procedureId);
      if (selectedProcedure && selectedProcedure.items && selectedProcedure.items.length > 0) {
        // Auto-populate the first surgical category for filtering purposes
        const firstCategoryId = selectedProcedure.items[0].surgicalCategoryId._id || selectedProcedure.items[0].surgicalCategoryId;
        setForm(prev => ({
          ...prev,
          procedure: procedureId,
          category: firstCategoryId
        }));
      }
    } else {
      // Clear surgical category when procedure is cleared
      setForm(prev => ({
        ...prev,
        procedure: '',
        category: ''
      }));
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setForm({ 
      expenseType: '', 
      value: '', 
      valueType: 'amount', 
      taxBasis: '', 
      paymentType: '', 
      category: '', 
      procedure: '', 
      validityFrom: `${new Date().getFullYear()}-01-01`, 
      validityTo: '9999-12-31' 
    });
    setError('');
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      if (!form.expenseType || !form.value || !form.valueType || !form.validityFrom || !form.validityTo) {
        setError('Expense type, value, value type, and validity dates are required');
        setLoading(false);
        return;
      }
      
      // Validate taxBasis is required for percentage type
      if (form.valueType === 'percentage' && !form.taxBasis) {
        setError('Tax basis (pre-GST or post-GST) is required for percentage values');
        setLoading(false);
        return;
      }
      
      const payload = {
        hospital: hospital._id,
        expenseType: form.expenseType,
        value: form.value,
        valueType: form.valueType,
        taxBasis: form.valueType === 'percentage' ? form.taxBasis : undefined,
        paymentType: form.paymentType || undefined,
        category: form.category || undefined,
        procedure: form.procedure || undefined,
        validityFrom: form.validityFrom,
        validityTo: form.validityTo,
        createdBy: currentUser?._id,
        updatedBy: currentUser?._id
      };
      if (editingId && editingId !== 'new') {
        await expenseTypeAssignmentAPI.updateAssignment(editingId, { ...payload, updatedBy: currentUser?._id });
      } else {
        await expenseTypeAssignmentAPI.createAssignment(payload);
      }
      fetchAssignments();
      handleCancel();
    } catch (err) {
      console.error('Error saving assignment:', err);
      setError(err.response?.data?.message || err.message || 'Failed to save assignment');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async id => {
    if (!window.confirm('Delete this assignment?')) return;
    setLoading(true);
    try {
      await expenseTypeAssignmentAPI.deleteAssignment(id, currentUser?._id);
      fetchAssignments();
    } catch (err) {
      setError('Failed to delete assignment');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="unified-modal-overlay">
      <div className="unified-modal-container" style={{maxWidth: '1200px', width: '95%', maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden'}}>
        {/* Header */}
        <div className="unified-modal-header">
          <div className="unified-modal-title">
            <h1>Expense Type Assignments</h1>
            <p>Manage expense type assignments and charges for {hospital.shortName}</p>
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

        {/* Scrollable Content */}
        <div className="unified-modal-body" style={{flex: 1, overflow: 'auto', padding: '1.5rem'}}>
          {/* Action Button */}
          <div className="unified-modal-actions" style={{marginBottom: '1.5rem', borderTop: 'none', padding: 0}}>
            <button 
              className="unified-btn unified-btn-primary"
              onClick={() => setEditingId('new')}
            >
              Add Expense Type Assignment
            </button>
          </div>

          {/* Add/Edit Form */}
          {editingId && (
            <div className="unified-content" style={{background: 'var(--white)', borderRadius: 'var(--border-radius)', padding: '2rem', marginBottom: '1.5rem', boxShadow: 'var(--shadow-sm)'}}>
              <div style={{borderBottom: '2px solid var(--gray-200)', paddingBottom: '1rem', marginBottom: '1.5rem'}}>
                <h2 style={{margin: 0, color: 'var(--primary-color)', fontSize: '1.25rem', fontWeight: '600'}}>
                  {editingId === 'new' ? 'Add Expense Type Assignment' : 'Edit Expense Type Assignment'}
                </h2>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="unified-form-grid">
                  <div className="unified-form-field">
                    <label className="unified-form-label">Expense Type *</label>
                    <select 
                      className="unified-search-input"
                      name="expenseType" 
                      value={form.expenseType} 
                      onChange={handleChange} 
                      required
                    >
                      <option value="">Select Expense Type</option>
                      {options.expenseTypes.map(et => (
                        <option key={et._id} value={et._id}>{et.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="unified-form-field">
                    <label className="unified-form-label">Payment Type (Optional)</label>
                    <select 
                      className="unified-search-input"
                      name="paymentType" 
                      value={form.paymentType} 
                      onChange={(e) => handlePaymentTypeChange(e.target.value)}
                    >
                      <option value="">All Payment Types</option>
                      {options.paymentTypes.map(pt => (
                        <option key={pt._id} value={pt._id}>{pt.description}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Validity Dates Row - Moved to top */}
                <div className="unified-form-grid">
                  <div className="unified-form-field">
                    <label className="unified-form-label">Valid From *</label>
                    <input 
                      type="date"
                      className="unified-search-input"
                      name="validityFrom" 
                      value={form.validityFrom} 
                      onChange={handleChange} 
                      required 
                    />
                  </div>

                  <div className="unified-form-field">
                    <label className="unified-form-label">Valid To *</label>
                    <input 
                      type="date"
                      className="unified-search-input"
                      name="validityTo" 
                      value={form.validityTo} 
                      onChange={handleChange} 
                      min={form.validityFrom || `${new Date().getFullYear()}-01-01`}
                      required 
                    />
                  </div>
                </div>

                <div className="unified-form-grid">
                  <div className="unified-form-field" style={{gridColumn: 'span 2'}}>
                    <label className="unified-form-label">Procedure (Optional)</label>
                    <select 
                      className="unified-search-input"
                      name="procedure" 
                      value={form.procedure} 
                      onChange={handleProcedureChange}
                    >
                      <option value="">All Procedures</option>
                      {options.procedures.map(proc => (
                        <option key={proc._id} value={proc._id}>{proc.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="unified-form-grid">
                  <div className="unified-form-field">
                    <label className="unified-form-label">Value Type *</label>
                    <select 
                      className="unified-search-input"
                      name="valueType" 
                      value={form.valueType} 
                      onChange={handleChange} 
                      required
                    >
                      <option value="amount">Fixed Amount (₹)</option>
                      <option value="percentage">Percentage (%)</option>
                    </select>
                  </div>

                  <div className="unified-form-field">
                    <label className="unified-form-label">Value *</label>
                    <input 
                      type="number"
                      step="0.01"
                      min="0"
                      max={form.valueType === 'percentage' ? '100' : undefined}
                      className="unified-search-input"
                      name="value" 
                      value={form.value} 
                      onChange={handleChange} 
                      placeholder={form.valueType === 'percentage' ? 'Enter percentage (0-100)' : 'Enter amount in ₹'}
                      required 
                    />
                  </div>
                </div>

                {form.valueType === 'percentage' && (
                  <div className="unified-form-grid">
                    <div className="unified-form-field">
                      <label className="unified-form-label">Tax Basis *</label>
                      <select 
                        className="unified-search-input"
                        name="taxBasis" 
                        value={form.taxBasis} 
                        onChange={handleChange} 
                        required
                      >
                        <option value="">Select Tax Basis</option>
                        <option value="pre-gst">Pre-GST Amount</option>
                        <option value="post-gst">Post-GST Amount</option>
                      </select>
                    </div>
                  </div>
                )}

                <div className="unified-form-actions">
                  <button 
                    type="submit" 
                    className="unified-btn unified-btn-primary"
                    disabled={loading}
                  >
                    {loading ? 'Saving...' : (editingId === 'new' ? 'Save' : 'Update')} Assignment
                  </button>
                  <button 
                    type="button" 
                    className="unified-btn unified-btn-secondary"
                    onClick={handleCancel}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Assignments List */}
          <div className="unified-content" style={{background: 'var(--white)', borderRadius: 'var(--border-radius)', padding: '1.5rem', boxShadow: 'var(--shadow-sm)'}}>
            {assignments.length === 0 ? (
              <div className="unified-empty">
                <h3>No Expense Type Assignments</h3>
                <p>No expense type assignments found for this hospital.</p>
              </div>
            ) : (
              <>
                {/* Desktop Table View */}
                <div className="unified-table-responsive">
                  <table className="unified-table">
                    <thead>
                      <tr>
                        <th>Expense Type</th>
                        <th>Value</th>
                        <th>Payment Type</th>
                        <th>Category</th>
                        <th>Procedure</th>
                        <th>Valid Period</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {assignments.map(assignment => (
                        <tr key={assignment._id}>
                          <td data-label="Expense Type">{assignment.expenseType?.name}</td>
                          <td data-label="Value">
                            {assignment.valueType === 'percentage' 
                              ? `${assignment.value}% (${assignment.taxBasis})`
                              : `₹${assignment.value}`
                            }
                          </td>
                          <td data-label="Payment Type">{assignment.paymentType?.description || 'All'}</td>
                          <td data-label="Category">{assignment.category?.description || 'All'}</td>
                          <td data-label="Procedure">{assignment.procedure?.name || 'All'}</td>
                          <td data-label="Valid Period">
                            {new Date(assignment.validityFrom).toLocaleDateString()} to{' '}
                            {new Date(assignment.validityTo).toLocaleDateString()}
                          </td>
                          <td data-label="Actions">
                            <div className="unified-table-actions">
                              <button
                                onClick={() => setEditingId(assignment._id)}
                                className="unified-table-action edit"
                                title="Edit assignment"
                              >
                                ✏️
                              </button>
                              <button
                                onClick={() => handleDelete(assignment._id)}
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
                <div className="unified-mobile-cards">
                  {assignments.map(assignment => (
                    <div key={assignment._id} className="unified-mobile-card">
                      <div className="unified-card-header">
                        <div className="unified-card-title">
                          {assignment.expenseType?.name}
                        </div>
                        <div className="unified-card-badge">
                          {assignment.valueType === 'percentage' 
                            ? `${assignment.value}% (${assignment.taxBasis})`
                            : `₹${assignment.value}`
                          }
                        </div>
                      </div>

                      <div className="unified-card-content">
                        <div style={{marginBottom: '0.75rem', fontSize: '0.9rem', color: 'var(--gray-600)'}}>
                          <strong style={{fontSize: '0.85rem', color: 'var(--gray-600)'}}>Applies to:</strong>
                          <div style={{marginTop: '0.25rem', background: 'var(--gray-50)', padding: '0.5rem', borderRadius: 'var(--border-radius)', fontSize: '0.9rem'}}>
                            Payment: {assignment.paymentType?.description || 'All'}<br/>
                            Category: {assignment.category?.description || 'All'}<br/>
                            Procedure: {assignment.procedure?.name || 'All'}
                          </div>
                        </div>

                        <div style={{marginBottom: '0.75rem', fontSize: '0.9rem', color: 'var(--gray-600)'}}>
                          <strong>Valid:</strong> {new Date(assignment.validityFrom).toLocaleDateString()} - {new Date(assignment.validityTo).toLocaleDateString()}
                        </div>

                        <div style={{display: 'flex', gap: '0.5rem', marginTop: '1rem'}}>
                          <button
                            onClick={() => setEditingId(assignment._id)}
                            className="unified-btn unified-btn-secondary"
                            style={{flex: 1}}
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(assignment._id)}
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
}

export default ExpenseTypeAssignments;
