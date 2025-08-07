
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import dayjs from 'dayjs';
import './ExpenseTypeAssignments.css';

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
    validityFrom: '',
    validityTo: ''
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

  const handleEdit = assignment => {
    setEditingId(assignment._id);
    setForm({
      expenseType: assignment.expenseType?._id || '',
      value: assignment.value,
      valueType: assignment.valueType || 'amount',
      taxBasis: assignment.taxBasis || '',
      paymentType: assignment.paymentType?._id || '',
      category: assignment.category?._id || '',
      procedure: assignment.procedure?._id || '',
      validityFrom: assignment.validityFrom ? dayjs(assignment.validityFrom).format('YYYY-MM-DD') : '',
      validityTo: assignment.validityTo ? dayjs(assignment.validityTo).format('YYYY-MM-DD') : ''
    });
  };

  const handleCancel = () => {
    setEditingId(null);
    setForm({ expenseType: '', value: '', valueType: 'amount', taxBasis: '', paymentType: '', category: '', procedure: '', validityFrom: '', validityTo: '' });
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
      <div className="expense-type-assignments-content">
        <div className="expense-type-assignments-header">
          <h2>Expense Type Assignments - {hospital.shortName}</h2>
          <button 
            className="close-button"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        {error && <div className="error-message">{error}</div>}

        <div className="expense-type-assignments-actions">
          <button 
            className="add-button"
            onClick={() => setEditingId('new')}
          >
            Add Expense Type Assignment
          </button>
        </div>

        {editingId && (
          <div className="expense-type-assignment-form">
            <h3>{editingId === 'new' ? 'Add Expense Type Assignment' : 'Edit Expense Type Assignment'}</h3>
            <form onSubmit={handleSubmit}>
              <div className="form-row">
                <div className="form-group">
                  <label>Expense Type *</label>
                  <select name="expenseType" value={form.expenseType} onChange={handleChange} required>
                    <option value="">Select Expense Type</option>
                    {options.expenseTypes.map(et => (
                      <option key={et._id} value={et._id}>{et.name}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Payment Type (Optional)</label>
                  <select 
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

              <div className="form-row">
                <div className="form-group">
                  <label>Surgical Category (Optional)</label>
                  <select 
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

                <div className="form-group">
                  <label>Procedure (Optional)</label>
                  <select name="procedure" value={form.procedure} onChange={handleChange}>
                    <option value="">All Procedures</option>
                    {options.procedures.map(proc => (
                      <option key={proc._id} value={proc._id}>{proc.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Value Type *</label>
                  <select name="valueType" value={form.valueType} onChange={handleChange} required>
                    <option value="amount">Fixed Amount (₹)</option>
                    <option value="percentage">Percentage (%)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Value *</label>
                  <input 
                    type="number" 
                    step="0.01"
                    min="0"
                    max={form.valueType === 'percentage' ? '100' : undefined}
                    name="value" 
                    value={form.value} 
                    onChange={handleChange} 
                    placeholder={form.valueType === 'percentage' ? '0-100' : 'Amount in ₹'}
                    required 
                  />
                </div>
              </div>

              {form.valueType === 'percentage' && (
                <div className="form-row">
                  <div className="form-group">
                    <label>Tax Basis *</label>
                    <select name="taxBasis" value={form.taxBasis} onChange={handleChange} required>
                      <option value="">Select Tax Basis</option>
                      <option value="pre-gst">Pre-GST</option>
                      <option value="post-gst">Post-GST</option>
                    </select>
                  </div>

                  <div className="form-group">
                    {/* Empty div to maintain grid alignment */}
                  </div>
                </div>
              )}

              <div className="form-row">
                <div className="form-group">
                  <label>Valid From *</label>
                  <input type="date" name="validityFrom" value={form.validityFrom} onChange={handleChange} required />
                </div>

                <div className="form-group">
                  <label>Valid To *</label>
                  <input type="date" name="validityTo" value={form.validityTo} onChange={handleChange} required />
                </div>
              </div>

              <div className="form-buttons">
                <button type="submit" className="save-button" disabled={loading}>
                  {editingId === 'new' ? 'Save' : 'Update'} Assignment
                </button>
                <button type="button" onClick={handleCancel} className="cancel-button">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="expense-type-assignments-list">
          {assignments.length === 0 ? (
            <div className="no-data">
              No expense type assignments found for this hospital.
            </div>
          ) : (
            <div className="expense-type-assignments-table">
              <table>
                <thead>
                  <tr>
                    <th>Expense Type</th>
                    <th>Value</th>
                    <th>Payment Type</th>
                    <th>Category</th>
                    <th>Procedure</th>
                    <th>Validity</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {assignments.map(a => (
                    <tr key={a._id}>
                      <td>{a.expenseType?.name}</td>
                      <td>
                        {a.valueType === 'percentage' 
                          ? `${a.value}% (${a.taxBasis})`
                          : `₹${a.value}`
                        }
                      </td>
                      <td>{a.paymentType?.description || 'Any'}</td>
                      <td>{a.category?.description || 'Any'}</td>
                      <td>{a.procedure?.name || 'Any'}</td>
                      <td>{dayjs(a.validityFrom).format('MMM DD, YYYY')} - {dayjs(a.validityTo).format('MMM DD, YYYY')}</td>
                      <td>
                        <div className="action-buttons">
                          <button onClick={() => handleEdit(a)} className="edit-button">Edit</button>
                          <button onClick={() => handleDelete(a._id)} className="delete-button">Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ExpenseTypeAssignments;
