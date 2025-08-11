
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import './ExpenseTypeAssignments.css';
import '../../../shared/styles/unified-design.css';

const API_BASE = process.env.REACT_APP_API_BASE || '/api';

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
      const res = await axios.get(`${API_BASE}/expense-type-assignments/hospital/${hospital._id}`);
      setAssignments(res.data);
    } catch (err) {
      setError('Failed to load assignments');
    } finally {
      setLoading(false);
    }
  };

  const fetchOptions = async (paymentTypeId = '', categoryId = '') => {
    try {
      const params = new URLSearchParams();
      if (paymentTypeId) params.append('paymentType', paymentTypeId);
      if (categoryId) params.append('category', categoryId);
      const queryString = params.toString();
      const url = `${API_BASE}/expense-type-assignments/options/${hospital._id}${queryString ? `?${queryString}` : ''}`;
      const res = await axios.get(url);
      setOptions(res.data);
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
        await axios.put(`${API_BASE}/expense-type-assignments/${editingId}`, { ...payload, updatedBy: currentUser?._id });
      } else {
        await axios.post(`${API_BASE}/expense-type-assignments`, payload);
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
      await axios.delete(`${API_BASE}/expense-type-assignments/${id}`, { data: { updatedBy: currentUser?._id } });
      fetchAssignments();
    } catch (err) {
      setError('Failed to delete assignment');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="expense-type-assignments-modal">
      <div className="expense-type-assignments-content unified-container" style={{padding: '2rem', background: 'var(--light-bg)'}}>
        {/* Header */}
        <div className="unified-header" style={{marginBottom: '1.5rem'}}>
          <div className="unified-header-content">
            <div className="unified-header-text">
              <h1 style={{fontSize: '1.5rem'}}>Expense Type Assignments</h1>
              <p>Manage expense type assignments and charges for {hospital.shortName}</p>
            </div>
            <button 
              className="unified-btn unified-btn-primary"
              onClick={() => setEditingId('new')}
            >
              Add Expense Type Assignment
            </button>
          </div>
          <button 
            className="close-button"
            onClick={onClose}
            style={{position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer'}}
          >
            ×
          </button>
        </div>

        {error && <div className="unified-alert unified-alert-danger">{error}</div>}

        {/* Add/Edit Form */}
        {editingId && (
          <div className="unified-card" style={{marginBottom: '1.5rem'}}>
            <div className="unified-card-header">
              <h3>{editingId === 'new' ? 'Add Expense Type Assignment' : 'Edit Expense Type Assignment'}</h3>
            </div>
            <div className="unified-card-body">
              <form onSubmit={handleSubmit} className="unified-form">
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: 'var(--gray-700)' }}>
                      Expense Type *
                    </label>
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

                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: 'var(--gray-700)' }}>
                      Payment Type (Optional)
                    </label>
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

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: 'var(--gray-700)' }}>
                      Surgical Category (Optional)
                    </label>
                    <select 
                      className="unified-search-input"
                      name="category" 
                      value={form.category} 
                      onChange={(e) => handleCategoryChange(e.target.value)}
                    >
                      <option value="">All Categories</option>
                      {options.categories.map(cat => (
                        <option key={cat._id} value={cat._id}>{cat.description}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: 'var(--gray-700)' }}>
                      Procedure (Optional)
                    </label>
                    <select 
                      className="unified-search-input"
                      name="procedure" 
                      value={form.procedure} 
                      onChange={handleChange}
                    >
                      <option value="">All Procedures</option>
                      {options.procedures.map(proc => (
                        <option key={proc._id} value={proc._id}>{proc.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: 'var(--gray-700)' }}>
                      Value Type *
                    </label>
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

                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: 'var(--gray-700)' }}>
                      Value *
                    </label>
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
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem', marginBottom: '2rem' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: 'var(--gray-700)' }}>
                        Tax Basis *
                      </label>
                      <select 
                        className="unified-search-input"
                        name="taxBasis" 
                        value={form.taxBasis} 
                        onChange={handleChange} 
                        required
                      >
                        <option value="">Select Tax Basis</option>
                        <option value="pre-gst">Pre-GST</option>
                        <option value="post-gst">Post-GST</option>
                      </select>
                    </div>
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: 'var(--gray-700)' }}>
                      Valid From *
                    </label>
                    <input 
                      type="date"
                      className="unified-search-input"
                      name="validityFrom" 
                      value={form.validityFrom} 
                      onChange={handleChange} 
                      min={`${new Date().getFullYear()}-01-01`}
                      required 
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: 'var(--gray-700)' }}>
                      Valid To *
                    </label>
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

                <div style={{ display: 'flex', gap: '1rem' }}>
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
          </div>
        )}

        {/* Assignments List */}
        <div className="unified-card">
          <div className="unified-card-header">
            <h3>Current Expense Type Assignments ({assignments.length})</h3>
          </div>
          <div className="unified-card-body">
            {assignments.length === 0 ? (
              <div className="unified-empty-state">
                <p>No expense type assignments found for this hospital.</p>
              </div>
            ) : (
              <>
                {/* Desktop Table */}
                <div className="unified-table-responsive d-none d-md-block">
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
                          <td>{assignment.expenseType?.name}</td>
                          <td>
                            {assignment.valueType === 'percentage' 
                              ? `${assignment.value}% (${assignment.taxBasis})`
                              : `₹${assignment.value}`
                            }
                          </td>
                          <td>{assignment.paymentType?.description || 'All'}</td>
                          <td>{assignment.category?.description || 'All'}</td>
                          <td>{assignment.procedure?.name || 'All'}</td>
                          <td>
                            {new Date(assignment.validityFrom).toLocaleDateString()} to{' '}
                            {new Date(assignment.validityTo).toLocaleDateString()}
                          </td>
                          <td>
                            <div className="unified-btn-group">
                              <button
                                onClick={() => setEditingId(assignment._id)}
                                className="unified-btn unified-btn-sm unified-btn-outline-primary"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDelete(assignment._id)}
                                className="unified-btn unified-btn-sm unified-btn-outline-danger"
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Cards */}
                <div className="d-block d-md-none">
                  {assignments.map(assignment => (
                    <div key={assignment._id} className="unified-card-mobile">
                      <div className="unified-card-mobile-header">
                        <h4>{assignment.expenseType?.name}</h4>
                        <span className="unified-badge unified-badge-primary">
                          {assignment.valueType === 'percentage' 
                            ? `${assignment.value}% (${assignment.taxBasis})`
                            : `₹${assignment.value}`
                          }
                        </span>
                      </div>
                      <div className="unified-card-mobile-body">
                        <div className="unified-card-mobile-item">
                          <strong>Payment Type:</strong> {assignment.paymentType?.description || 'All'}
                        </div>
                        <div className="unified-card-mobile-item">
                          <strong>Category:</strong> {assignment.category?.description || 'All'}
                        </div>
                        <div className="unified-card-mobile-item">
                          <strong>Procedure:</strong> {assignment.procedure?.name || 'All'}
                        </div>
                        <div className="unified-card-mobile-item">
                          <strong>Valid Period:</strong> {' '}
                          {new Date(assignment.validityFrom).toLocaleDateString()} to{' '}
                          {new Date(assignment.validityTo).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="unified-card-mobile-actions">
                        <button
                          onClick={() => setEditingId(assignment._id)}
                          className="unified-btn unified-btn-sm unified-btn-outline-primary"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(assignment._id)}
                          className="unified-btn unified-btn-sm unified-btn-outline-danger"
                        >
                          Delete
                        </button>
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
