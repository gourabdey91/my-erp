import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { procedureAPI } from './services/procedureAPI';
import { paymentTypeAPI } from '../payment-types/services/paymentTypeAPI';
import { categoryAPI } from '../categories/services/categoryAPI';
import { FaPlus } from 'react-icons/fa';
import MobileCard from '../../shared/components/MobileCard';
import { scrollToTop } from '../../shared/utils/scrollUtils';
import '../../shared/styles/unified-design.css';
import './Procedures.css';

const Procedures = () => {
  const { currentUser } = useAuth();
  const [procedures, setProcedures] = useState([]);
  const [paymentTypes, setPaymentTypes] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingProcedure, setEditingProcedure] = useState(null);
  
  // Filter states
  const [filters, setFilters] = useState({
    category: '',
    paymentType: '',
    status: ''
  });

  const [filteredProcedures, setFilteredProcedures] = useState([]);
  
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    categoryId: '',
    paymentTypeId: '',
    amount: '',
    currency: 'INR'
  });

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Load all required data in parallel
      const [proceduresRes, paymentTypesRes, categoriesRes] = await Promise.all([
        procedureAPI.getAll(),
        paymentTypeAPI.getAll(),
        categoryAPI.getAll()
      ]);

      if (proceduresRes.success) setProcedures(proceduresRes.data);
      if (paymentTypesRes.success) setPaymentTypes(paymentTypesRes.data);
      if (categoriesRes.success) setCategories(categoriesRes.data);
      
    } catch (err) {
      setError('Failed to load data');
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Filter procedures when filters change
  useEffect(() => {
    let filtered = procedures;

    if (filters.category) {
      filtered = filtered.filter(procedure => procedure.categoryId?._id === filters.category);
    }

    if (filters.paymentType) {
      filtered = filtered.filter(procedure => procedure.paymentTypeId?._id === filters.paymentType);
    }

    if (filters.status) {
      if (filters.status === 'active') {
        filtered = filtered.filter(procedure => procedure.isActive);
      } else if (filters.status === 'inactive') {
        filtered = filtered.filter(procedure => !procedure.isActive);
      }
    }

    setFilteredProcedures(filtered);
  }, [procedures, filters]);

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const clearFilters = () => {
    setFilters({
      category: '',
      paymentType: '',
      status: ''
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const procedureData = {
        ...formData,
        amount: parseFloat(formData.amount),
        createdBy: currentUser.id,
        updatedBy: currentUser.id
      };

      if (editingProcedure) {
        await procedureAPI.update(editingProcedure._id, {
          ...procedureData,
          createdBy: editingProcedure.createdBy
        });
      } else {
        await procedureAPI.create(procedureData);
      }

      setFormData({
        code: '',
        name: '',
        categoryId: '',
        paymentTypeId: '',
        amount: '',
        currency: 'INR'
      });
      setShowForm(false);
      setEditingProcedure(null);
      loadData();
    } catch (err) {
      setError(editingProcedure ? 'Failed to update procedure' : 'Failed to create procedure');
      console.error('Error saving procedure:', err);
    }
  };

  const handleEdit = (procedure) => {
    setEditingProcedure(procedure);
    setFormData({
      code: procedure.code,
      name: procedure.name,
      categoryId: procedure.categoryId._id,
      paymentTypeId: procedure.paymentTypeId._id,
      amount: procedure.amount.toString(),
      currency: procedure.currency
    });
    setShowForm(true);
    scrollToTop();
  };

  const handleDelete = async (procedure) => {
    if (window.confirm(`Are you sure you want to delete procedure "${procedure.code} - ${procedure.name}"?`)) {
      try {
        await procedureAPI.delete(procedure._id, currentUser._id);
        loadData();
      } catch (err) {
        setError('Failed to delete procedure');
        console.error('Error deleting procedure:', err);
      }
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingProcedure(null);
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      code: '',
      name: '',
      categoryId: '',
      paymentTypeId: '',
      amount: '',
      currency: 'INR'
    });
    setShowForm(false);
    setEditingProcedure(null);
    setError('');
  };

  const formatCurrency = (amount, currency = 'INR') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'INR'
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="unified-container">
        <div className="unified-loading">Loading medical procedures...</div>
      </div>
    );
  }

  return (
    <div className="unified-container">
      {/* Header Section */}
      <div className="unified-header">
        <div className="unified-header-content">
          <div className="unified-header-text">
            <h1>Medical Procedures</h1>
            <p>Manage medical procedures and their associated payment types.</p>
          </div>
          <div className="header-actions">
            {!showForm && (
              <button
                type="button"
                className="unified-btn unified-btn-primary"
                onClick={() => setShowForm(true)}
                disabled={paymentTypes.length === 0 || categories.length === 0}
              >
                <FaPlus />
                Add Procedure
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Filters Section */}
      <div className="unified-filters">
        <div className="unified-filters-row">
          <div className="unified-filter-group">
            <label>Category</label>
            <select
              value={filters.category}
              onChange={(e) => handleFilterChange('category', e.target.value)}
              className="unified-filter-select"
            >
              <option value="">All Categories</option>
              {categories.map((category) => (
                <option key={category._id} value={category._id}>
                  {category.code} - {category.description}
                </option>
              ))}
            </select>
          </div>
          
          <div className="unified-filter-group">
            <label>Payment Type</label>
            <select
              value={filters.paymentType}
              onChange={(e) => handleFilterChange('paymentType', e.target.value)}
              className="unified-filter-select"
            >
              <option value="">All Payment Types</option>
              {paymentTypes.map((paymentType) => (
                <option key={paymentType._id} value={paymentType._id}>
                  {paymentType.code} - {paymentType.description}
                </option>
              ))}
            </select>
          </div>
          
          <div className="unified-filter-group">
            <label>Status</label>
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="unified-filter-select"
            >
              <option value="">All</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          
          <div className="unified-filter-group">
            <button
              type="button"
              className="unified-btn unified-btn-secondary"
              onClick={clearFilters}
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="unified-content">
          <div style={{ padding: '1rem', background: '#fee', border: '1px solid #fcc', borderRadius: '8px', color: '#c33' }}>
            {error}
          </div>
        </div>
      )}

      {/* Warning for setup requirements */}
      {(paymentTypes.length === 0 || categories.length === 0) && (
        <div className="unified-content">
          <div style={{ padding: '1rem', background: '#fff3cd', border: '1px solid #ffeaa7', borderRadius: '8px', color: '#856404' }}>
            <strong>Setup Required:</strong> You need to create payment types and categories before adding procedures.
          </div>
        </div>
      )}

      {/* Form Section */}
      {showForm && (
        <div className="unified-content">
          <div style={{ borderBottom: '2px solid var(--gray-200)', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
            <h2 style={{ margin: 0, color: 'var(--primary-color)', fontSize: '1.5rem', fontWeight: '600' }}>
              {editingProcedure ? 'Edit Procedure' : 'Add New Procedure'}
            </h2>
          </div>
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: 'var(--gray-700)' }}>
                  Procedure Code * (6 chars)
                </label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  required
                  maxLength="6"
                  pattern="[A-Z]{3}[0-9]{3}"
                  placeholder="CRA001, MAX001, etc."
                  disabled={editingProcedure}
                  className="unified-search-input"
                  style={{ textTransform: 'uppercase' }}
                />
                <small style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>Format: 3 letters + 3 digits (e.g., CRA001)</small>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: 'var(--gray-700)' }}>
                  Procedure Name * (max 30 chars)
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  maxLength="30"
                  placeholder="Cranial Single Procedure"
                  className="unified-search-input"
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: 'var(--gray-700)' }}>
                  Category *
                </label>
                <select
                  value={formData.categoryId}
                  onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                  required
                  className="unified-search-input"
                >
                  <option value="">Select Category</option>
                  {categories.map((category) => (
                    <option key={category._id} value={category._id}>
                      {category.code} - {category.description}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: 'var(--gray-700)' }}>
                  Payment Type *
                </label>
                <select
                  value={formData.paymentTypeId}
                  onChange={(e) => setFormData({ ...formData, paymentTypeId: e.target.value })}
                  required
                  className="unified-search-input"
                >
                  <option value="">Select Payment Type</option>
                  {paymentTypes.map((paymentType) => (
                    <option key={paymentType._id} value={paymentType._id}>
                      {paymentType.code} - {paymentType.description}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: 'var(--gray-700)' }}>
                  Amount *
                </label>
                <input
                  type="number"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  required
                  min="0"
                  step="0.01"
                  placeholder="Enter amount"
                  className="unified-search-input"
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: 'var(--gray-700)' }}>
                  Currency *
                </label>
                <select
                  value={formData.currency}
                  onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                  required
                  className="unified-search-input"
                >
                  <option value="INR">INR - Indian Rupee</option>
                  <option value="USD">USD - US Dollar</option>
                  <option value="EUR">EUR - Euro</option>
                  <option value="GBP">GBP - British Pound</option>
                  <option value="AUD">AUD - Australian Dollar</option>
                  <option value="CAD">CAD - Canadian Dollar</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem' }}>
              <button type="submit" className="unified-btn unified-btn-primary" disabled={loading}>
                {loading ? 'Saving...' : (editingProcedure ? 'Update Procedure' : 'Add Procedure')}
              </button>
              <button type="button" className="unified-btn unified-btn-secondary" onClick={handleCancel}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Content Section */}
      {!showForm && (
        <div className="unified-content">
          {filteredProcedures.length === 0 ? (
            <div className="empty-state">
              {procedures.length === 0 ? (
                <p>No procedures created yet. Create your first procedure to get started.</p>
              ) : (
                <p>No procedures match your current filters.</p>
              )}
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="unified-table-responsive">
                <table className="unified-table">
                  <thead>
                    <tr>
                      <th>Code</th>
                      <th>Name</th>
                      <th>Category</th>
                      <th>Payment Type</th>
                      <th>Amount</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProcedures.map((procedure) => (
                      <tr key={procedure._id}>
                        <td>
                          <span className="code-badge">{procedure.code}</span>
                        </td>
                        <td>
                          <span className="name-text">{procedure.name}</span>
                        </td>
                        <td>{procedure.categoryId?.code} - {procedure.categoryId?.description}</td>
                        <td>{procedure.paymentTypeId?.code} - {procedure.paymentTypeId?.description}</td>
                        <td>
                          <span className="amount-text">
                            {formatCurrency(procedure.amount, procedure.currency)}
                          </span>
                        </td>
                        <td>
                          <span className={`status-badge ${procedure.isActive ? 'active' : 'inactive'}`}>
                            {procedure.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td>
                          <div className="unified-table-actions">
                            <button
                              className="unified-table-action edit"
                              onClick={() => handleEdit(procedure)}
                              title="Edit Procedure"
                              disabled={loading}
                            >
                              ✏️
                            </button>
                            <button
                              className="unified-table-action delete"
                              onClick={() => handleDelete(procedure)}
                              title="Delete Procedure"
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

              {/* Mobile Card View */}
              <div className="unified-mobile-cards">
                {filteredProcedures.map((procedure) => (
                  <MobileCard
                    key={procedure._id}
                    id={procedure._id}
                    title={procedure.name}
                    badge={procedure.code}
                    fields={[
                      { 
                        label: 'Amount', 
                        value: formatCurrency(procedure.amount, procedure.currency) 
                      },
                      { 
                        label: 'Status', 
                        value: procedure.isActive ? 'Active' : 'Inactive' 
                      }
                    ]}
                    sections={[
                      {
                        title: 'Details',
                        items: [
                          {
                            label: 'Category',
                            value: `${procedure.categoryId?.code} - ${procedure.categoryId?.description}`
                          },
                          {
                            label: 'Payment Type',
                            value: `${procedure.paymentTypeId?.code} - ${procedure.paymentTypeId?.description}`
                          }
                        ]
                      }
                    ]}
                    actions={[
                      {
                        label: 'Edit',
                        icon: '✏️',
                        onClick: () => handleEdit(procedure)
                      },
                      {
                        label: 'Delete',
                        icon: '🗑️',
                        variant: 'danger',
                        onClick: () => handleDelete(procedure)
                      }
                    ]}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Scroll to Top Button */}
      <button 
        className="scroll-to-top-btn"
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          backgroundColor: 'var(--primary-color)',
          color: 'white',
          border: 'none',
          borderRadius: '50%',
          width: '50px',
          height: '50px',
          cursor: 'pointer',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        ↑
      </button>
    </div>
  );
};

export default Procedures;
