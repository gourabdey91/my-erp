
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import dayjs from 'dayjs';
import './ExpenseTypeAssignments.css';

const API_BASE = process.env.REACT_APP_API_BASE || '/api';

function ExpenseTypeAssignments({ hospitalId, user, canEdit }) {
  const [assignments, setAssignments] = useState([]);
  const [options, setOptions] = useState({ expenseTypes: [], paymentTypes: [], categories: [], procedures: [] });
  const [form, setForm] = useState({
    expenseType: '',
    value: '',
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
    if (hospitalId) {
      fetchAssignments();
      fetchOptions();
    }
    // eslint-disable-next-line
  }, [hospitalId]);

  const fetchAssignments = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/expense-type-assignments/hospital/${hospitalId}`);
      setAssignments(res.data);
    } catch (err) {
      setError('Failed to load assignments');
    } finally {
      setLoading(false);
    }
  };

  const fetchOptions = async () => {
    try {
      const res = await axios.get(`${API_BASE}/expense-type-assignments/options/${hospitalId}`);
      setOptions(res.data);
    } catch (err) {
      setError('Failed to load options');
    }
  };

  const handleChange = e => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleEdit = assignment => {
    setEditingId(assignment._id);
    setForm({
      expenseType: assignment.expenseType?._id || '',
      value: assignment.value,
      paymentType: assignment.paymentType?._id || '',
      category: assignment.category?._id || '',
      procedure: assignment.procedure?._id || '',
      validityFrom: assignment.validityFrom ? dayjs(assignment.validityFrom).format('YYYY-MM-DD') : '',
      validityTo: assignment.validityTo ? dayjs(assignment.validityTo).format('YYYY-MM-DD') : ''
    });
  };

  const handleCancel = () => {
    setEditingId(null);
    setForm({ expenseType: '', value: '', paymentType: '', category: '', procedure: '', validityFrom: '', validityTo: '' });
    setError('');
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      if (!form.expenseType || !form.value || !form.validityFrom || !form.validityTo) {
        setError('Expense type, value, and validity dates are required');
        setLoading(false);
        return;
      }
      const payload = {
        hospital: hospitalId,
        expenseType: form.expenseType,
        value: form.value,
        paymentType: form.paymentType || undefined,
        category: form.category || undefined,
        procedure: form.procedure || undefined,
        validityFrom: form.validityFrom,
        validityTo: form.validityTo,
        createdBy: user?._id,
        updatedBy: user?._id
      };
      if (editingId) {
        await axios.put(`${API_BASE}/expense-type-assignments/${editingId}`, { ...payload, updatedBy: user?._id });
      } else {
        await axios.post(`${API_BASE}/expense-type-assignments`, payload);
      }
      fetchAssignments();
      handleCancel();
    } catch (err) {
      setError('Failed to save assignment');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async id => {
    if (!window.confirm('Delete this assignment?')) return;
    setLoading(true);
    try {
      await axios.delete(`${API_BASE}/expense-type-assignments/${id}`, { data: { updatedBy: user?._id } });
      fetchAssignments();
    } catch (err) {
      setError('Failed to delete assignment');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="expense-type-assignments">
      <h3>Expense Type Assignments</h3>
      {error && <div className="error">{error}</div>}
      <table className="assignments-table">
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
              <td>{a.value}</td>
              <td>{a.paymentType?.description || '-'}</td>
              <td>{a.category?.description || '-'}</td>
              <td>{a.procedure?.name || '-'}</td>
              <td>{dayjs(a.validityFrom).format('DD/MM/YYYY')} - {dayjs(a.validityTo).format('DD/MM/YYYY')}</td>
              <td>
                {canEdit && <>
                  <button onClick={() => handleEdit(a)}>Edit</button>
                  <button onClick={() => handleDelete(a._id)}>Delete</button>
                </>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {canEdit && (
        <form className="assignment-form" onSubmit={handleSubmit}>
          <h4>{editingId ? 'Edit Assignment' : 'Add Assignment'}</h4>
          <div>
            <label>Expense Type</label>
            <select name="expenseType" value={form.expenseType} onChange={handleChange} required>
              <option value="">Select</option>
              {options.expenseTypes.map(et => (
                <option key={et._id} value={et._id}>{et.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label>Value</label>
            <input type="number" name="value" value={form.value} onChange={handleChange} min="0" required />
          </div>
          <div>
            <label>Payment Type</label>
            <select name="paymentType" value={form.paymentType} onChange={handleChange}>
              <option value="">Any</option>
              {options.paymentTypes.map(pt => (
                <option key={pt._id} value={pt._id}>{pt.description}</option>
              ))}
            </select>
          </div>
          <div>
            <label>Category</label>
            <select name="category" value={form.category} onChange={handleChange}>
              <option value="">Any</option>
              {options.categories.map(cat => (
                <option key={cat._id} value={cat._id}>{cat.description}</option>
              ))}
            </select>
          </div>
          <div>
            <label>Procedure</label>
            <select name="procedure" value={form.procedure} onChange={handleChange}>
              <option value="">Any</option>
              {options.procedures.map(proc => (
                <option key={proc._id} value={proc._id}>{proc.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label>Validity From</label>
            <input type="date" name="validityFrom" value={form.validityFrom} onChange={handleChange} required />
          </div>
          <div>
            <label>Validity To</label>
            <input type="date" name="validityTo" value={form.validityTo} onChange={handleChange} required />
          </div>
          <div>
            <button type="submit" disabled={loading}>{editingId ? 'Update' : 'Add'}</button>
            {editingId && <button type="button" onClick={handleCancel}>Cancel</button>}
          </div>
        </form>
      )}
    </div>
  );
}

export default ExpenseTypeAssignments;
