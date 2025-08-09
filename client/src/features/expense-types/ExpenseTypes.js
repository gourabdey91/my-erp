import React, { useState, useEffect, useCallback } from 'react';
import { expenseTypeAPI } from './services/expenseTypeAPI';
import { useAuth } from '../../contexts/AuthContext';
import MobileCard from '../../shared/components/MobileCard';
import { scrollToTop } from '../../shared/utils/scrollUtils';
import '../../shared/styles/unified-design.css';
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

  // Filter states
  const [filters, setFilters] = useState({
    search: ''
  });

  const [filteredExpenseTypes, setFilteredExpenseTypes] = useState([]);

  const { currentUser } = useAuth();

  const fetchExpenseTypes = useCallback(async () => {
    try {
      setLoading(true);
      const response = await expenseTypeAPI.getAll();
      setExpenseTypes(response);
      setError('');
    } catch (err) {
      console.error('Error fetching expense types:', err);
      setError('Failed to fetch expense types');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchExpenseTypes();
  }, [fetchExpenseTypes]);

  // Filter expense types when filters change
  useEffect(() => {
    let filtered = expenseTypes;

    if (filters.search) {
      filtered = filtered.filter(expenseType => 
        expenseType.name.toLowerCase().includes(filters.search.toLowerCase()) ||
        expenseType.code.toLowerCase().includes(filters.search.toLowerCase())
      );
    }

    setFilteredExpenseTypes(filtered);
  }, [expenseTypes, filters]);

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
    scrollToTop();
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
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

  if (loading) {
    return (
      <div className="unified-container">
        <div className="unified-loading">Loading expense types...</div>
      </div>
    );
  }

  return (
    <div className="unified-container">
      {/* Header */}
      <div className="unified-header">
        <div className="unified-header-content">
          <div className="unified-header-text">
            <h1>Expense Types</h1>
            <p>Manage expense type categories for your organization. Define different expense types that can be assigned to hospitals for expense tracking and reporting.</p>
          </div>
          <button 
            className="unified-btn unified-btn-primary"
            onClick={() => setShowForm(true)}
            disabled={loading}
          >
            Add Expense Type
          </button>
        </div>
      </div>

      {error && (
        <div className="unified-content">
          <div style={{ padding: '1rem', background: '#fee', border: '1px solid #fcc', borderRadius: '8px', color: '#c33' }}>
            {error}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="unified-filters">
        <div className="unified-filters-row">
          <div className="unified-filter-group">
            <label>Search Expense Types</label>
            <input
              type="text"
              name="search"
              value={filters.search}
              onChange={handleFilterChange}
              placeholder="Search by expense type name or code..."
              className="unified-search-input"
            />
          </div>
        </div>
      </div>

      {showForm && (
        <div className="unified-content">
          <div style={{ borderBottom: '2px solid var(--gray-200)', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
            <h2 style={{ margin: 0, color: 'var(--primary-color)', fontSize: '1.5rem', fontWeight: '600' }}>
              {editingExpenseType ? 'Edit Expense Type' : 'Add New Expense Type'}
            </h2>
          </div>
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '2rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: 'var(--gray-700)' }}>
                  Expense Type Code * (3-10 chars)
                </label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                  required
                  maxLength="10"
                  placeholder="Enter expense type code"
                  className="unified-search-input"
                  style={{ textTransform: 'uppercase' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: 'var(--gray-700)' }}>
                  Expense Type Name * (2-100 chars)
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  required
                  maxLength="100"
                  placeholder="Enter expense type name"
                  className="unified-search-input"
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem' }}>
              <button type="submit" className="unified-btn unified-btn-primary" disabled={loading}>
                {loading ? 'Saving...' : (editingExpenseType ? 'Update Expense Type' : 'Add Expense Type')}
              </button>
              <button type="button" className="unified-btn unified-btn-secondary" onClick={resetForm}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Content */}
      <div className="unified-content">
        {filteredExpenseTypes.length === 0 ? (
          <div className="unified-empty">
            <h3>No expense types found</h3>
            <p>
              {expenseTypes.length === 0 
                ? "Create your first expense type to get started." 
                : "Try adjusting your search criteria."}
            </p>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="unified-table-responsive">
              <table className="unified-table">
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>Name</th>
                    <th>Created</th>
                    <th>Last Updated</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredExpenseTypes.map((expenseType) => (
                    <tr key={expenseType._id}>
                      <td style={{ fontWeight: '600', color: 'var(--primary-color)' }}>{expenseType.code}</td>
                      <td>{expenseType.name}</td>
                      <td>{new Date(expenseType.createdAt).toLocaleDateString()}</td>
                      <td>
                        {expenseType.updatedAt !== expenseType.createdAt 
                          ? new Date(expenseType.updatedAt).toLocaleDateString()
                          : '-'
                        }
                      </td>
                      <td>
                        <span style={{ 
                          padding: '0.25rem 0.5rem', 
                          borderRadius: '1rem', 
                          fontSize: '0.75rem',
                          background: '#d4edda',
                          color: '#155724'
                        }}>
                          Active
                        </span>
                      </td>
                      <td>
                        <div className="unified-table-actions">
                          <button
                            className="unified-table-action edit"
                            onClick={() => handleEdit(expenseType)}
                            title="Edit Expense Type"
                            disabled={loading}
                          >
                            ✏️
                          </button>
                          <button
                            className="unified-table-action delete"
                            onClick={() => handleDelete(expenseType)}
                            title="Delete Expense Type"
                            disabled={loading}
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

            {/* Mobile Cards */}
            <div className="unified-mobile-cards">
              {filteredExpenseTypes.map((expenseType) => (
                <MobileCard
                  key={expenseType._id}
                  id={expenseType._id}
                  title={expenseType.name}
                  badge={expenseType.code}
                  fields={[
                    { label: 'Status', value: 'Active' }
                  ]}
                  sections={[
                    {
                      title: 'Details',
                      items: [
                        { label: 'Created', value: new Date(expenseType.createdAt).toLocaleDateString() },
                        { 
                          label: 'Updated', 
                          value: expenseType.updatedAt !== expenseType.createdAt 
                            ? new Date(expenseType.updatedAt).toLocaleDateString()
                            : 'Not modified'
                        }
                      ]
                    }
                  ]}
                  actions={[
                    {
                      label: 'Edit',
                      icon: '✏️',
                      onClick: () => handleEdit(expenseType)
                    },
                    {
                      label: 'Delete',
                      icon: '🗑️',
                      variant: 'danger',
                      onClick: () => handleDelete(expenseType)
                    }
                  ]}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ExpenseTypes;
