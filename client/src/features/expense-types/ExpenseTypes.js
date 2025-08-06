import React, { useState, useEffect, useCallback } from 'react';
import { expenseTypeAPI } from './services/expenseTypeAPI';
import { useBusinessUnit } from '../../contexts/BusinessUnitContext';
import { useAuth } from '../../contexts/AuthContext';
import './ExpenseTypes.css';

const ExpenseTypes = () => {
  const [expenseTypes, setExpenseTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingExpenseType, setEditingExpenseType] = useState(null);
  const [formData, setFormData] = useState({
    code: '',
    name: ''
  });

  const { currentBusinessUnit } = useBusinessUnit();
  const { currentUser } = useAuth();

  const fetchExpenseTypes = useCallback(async () => {
    try {
      setLoading(true);
      const response = await expenseTypeAPI.getAll(currentBusinessUnit._id);
      setExpenseTypes(response);
      setError('');
    } catch (err) {
      console.error('Error fetching expense types:', err);
      setError('Failed to fetch expense types');
    } finally {
      setLoading(false);
    }
  }, [currentBusinessUnit]);

  useEffect(() => {
    if (currentBusinessUnit?._id) {
      fetchExpenseTypes();
    }
  }, [currentBusinessUnit, fetchExpenseTypes]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.code.trim()) {
      setError('Expense type code is required');
      return;
    }

    if (!formData.name.trim()) {
      setError('Expense type name is required');
      return;
    }

    if (formData.code.length < 3 || formData.code.length > 10) {
      setError('Code must be between 3 and 10 characters');
      return;
    }

    if (formData.name.length < 2 || formData.name.length > 100) {
      setError('Name must be between 2 and 100 characters');
      return;
    }

    try {
      setLoading(true);
      const expenseTypeData = {
        code: formData.code.trim(),
        name: formData.name.trim(),
        businessUnit: currentBusinessUnit._id,
        createdBy: currentUser._id,
        updatedBy: currentUser._id
      };

      if (editingExpenseType) {
        await expenseTypeAPI.update(editingExpenseType._id, expenseTypeData);
      } else {
        await expenseTypeAPI.create(expenseTypeData);
      }

      setShowForm(false);
      setEditingExpenseType(null);
      setFormData({ code: '', name: '' });
      setError('');
      await fetchExpenseTypes();
    } catch (err) {
      console.error('Error saving expense type:', err);
      setError(err.message || 'Failed to save expense type');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (expenseType) => {
    setEditingExpenseType(expenseType);
    setFormData({
      code: expenseType.code,
      name: expenseType.name
    });
    setShowForm(true);
    setError('');
  };

  const handleDelete = async (expenseType) => {
    if (window.confirm(`Are you sure you want to delete "${expenseType.name}"?`)) {
      try {
        setLoading(true);
        await expenseTypeAPI.delete(expenseType._id, currentUser._id);
        await fetchExpenseTypes();
        setError('');
      } catch (err) {
        console.error('Error deleting expense type:', err);
        setError('Failed to delete expense type');
      } finally {
        setLoading(false);
      }
    }
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingExpenseType(null);
    setFormData({ code: '', name: '' });
    setError('');
  };

  if (!currentBusinessUnit) {
    return (
      <div className="expense-types-container">
        <div className="no-business-unit">
          <p>Please select a business unit to manage expense types.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="expense-types-container">
      <div className="page-header">
        <h1>Expense Types</h1>
        <button 
          className="btn btn-primary"
          onClick={() => setShowForm(true)}
          disabled={loading}
        >
          Add Expense Type
        </button>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {showForm && (
        <div className="form-container">
          <div className="form-header">
            <h2>{editingExpenseType ? 'Edit Expense Type' : 'Add New Expense Type'}</h2>
          </div>
          <form onSubmit={handleSubmit} className="expense-type-form">
            <div className="form-group">
              <label htmlFor="code">Expense Type Code * (3-10 chars)</label>
              <input
                type="text"
                id="code"
                value={formData.code}
                onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                required
                maxLength="10"
                placeholder="Enter expense type code"
                style={{ textTransform: 'uppercase' }}
              />
            </div>

            <div className="form-group">
              <label htmlFor="name">Expense Type Name * (2-100 chars)</label>
              <input
                type="text"
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                required
                maxLength="100"
                placeholder="Enter expense type name"
              />
            </div>

            <div className="form-actions">
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? 'Saving...' : (editingExpenseType ? 'Update Expense Type' : 'Add Expense Type')}
              </button>
              <button type="button" className="btn btn-secondary" onClick={resetForm}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="data-table-container">
        {loading && !showForm ? (
          <div className="loading">Loading expense types...</div>
        ) : expenseTypes.length === 0 ? (
          <div className="empty-state">
            <p>No expense types found.</p>
            <p>Click "Add Expense Type" to create your first expense type.</p>
          </div>
        ) : (
          <>
            {/* Desktop/Tablet Table View */}
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>Name</th>
                    <th>Created</th>
                    <th>Updated</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {expenseTypes.map(expenseType => (
                    <tr key={expenseType._id}>
                      <td className="code-cell">{expenseType.code}</td>
                      <td>{expenseType.name}</td>
                      <td>{new Date(expenseType.createdAt).toLocaleDateString()}</td>
                      <td>
                        {expenseType.updatedAt !== expenseType.createdAt 
                          ? new Date(expenseType.updatedAt).toLocaleDateString()
                          : '-'
                        }
                      </td>
                      <td>
                        <div className="action-buttons">
                          <button 
                            className="btn btn-sm btn-outline-primary"
                            onClick={() => handleEdit(expenseType)}
                            disabled={loading}
                          >
                            Edit
                          </button>
                          <button 
                            className="btn btn-sm btn-outline-danger"
                            onClick={() => handleDelete(expenseType)}
                            disabled={loading}
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
            
            {/* Mobile Card View */}
            <div className="mobile-card-view">
              {expenseTypes.map(expenseType => (
                <div key={`mobile-${expenseType._id}`} className="expense-type-mobile-card">
                  <div className="mobile-card-header">
                    <h3 className="mobile-card-title">{expenseType.name}</h3>
                    <span className="mobile-card-code">{expenseType.code}</span>
                  </div>
                  <div className="mobile-card-actions">
                    <button 
                      className="btn btn-outline-primary"
                      onClick={() => handleEdit(expenseType)}
                      disabled={loading}
                    >
                      Edit
                    </button>
                    <button 
                      className="btn btn-outline-danger"
                      onClick={() => handleDelete(expenseType)}
                      disabled={loading}
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
  );
};

export default ExpenseTypes;
