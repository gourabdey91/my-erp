import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { procedureAPI } from './services/procedureAPI';
import { paymentTypeAPI } from '../payment-types/services/paymentTypeAPI';
import { categoryAPI } from '../categories/services/categoryAPI';
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
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    categoryId: '',
    paymentTypeId: '',
    amount: '',
    currency: 'INR'
  });

  // Filter states
  const [filters, setFilters] = useState({
    search: '',
    categoryId: '',
    paymentTypeId: ''
  });

  const [filteredProcedures, setFilteredProcedures] = useState([]);

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

    if (filters.search) {
      filtered = filtered.filter(procedure => 
        procedure.name.toLowerCase().includes(filters.search.toLowerCase()) ||
        procedure.code.toLowerCase().includes(filters.search.toLowerCase())
      );
    }

    if (filters.categoryId) {
      filtered = filtered.filter(procedure => procedure.categoryId._id === filters.categoryId);
    }

    if (filters.paymentTypeId) {
      filtered = filtered.filter(procedure => procedure.paymentTypeId._id === filters.paymentTypeId);
    }

    setFilteredProcedures(filtered);
  }, [procedures, filters]);

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

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const formatCurrency = (amount, currency = 'INR') => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: currency
    }).format(amount);
  };

  const handleDelete = async (procedure) => {
    if (window.confirm(`Are you sure you want to delete procedure "${procedure.code} - ${procedure.name}"?`)) {
      try {
        await procedureAPI.delete(procedure._id, currentUser.id);
        loadData();
      } catch (err) {
        setError('Failed to delete procedure');
        console.error('Error deleting procedure:', err);
      }
    }
  };

  const handleCancel = () => {
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
  };

  const handleDelete = async (procedure) => {
    if (window.confirm(`Are you sure you want to delete procedure "${procedure.code} - ${procedure.name}"?`)) {
      try {
        await procedureAPI.delete(procedure._id, currentUser.id);
        loadData();
      } catch (err) {
        setError('Failed to delete procedure');
        console.error('Error deleting procedure:', err);
      }
    }
  };

  const handleCancel = () => {
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
  };

  const formatCurrency = (amount, currency) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD'
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
      {/* Header */}
      <div className="unified-header">
        <div className="unified-header-content">
          <div className="unified-header-text">
            <h1>Medical Procedures</h1>
            <p>Manage medical procedures with their categories, payment types, and pricing. Configure procedures that will be used across your healthcare operations.</p>
          </div>
          <button 
            className="unified-btn unified-btn-primary"
            onClick={() => setShowForm(true)}
            disabled={paymentTypes.length === 0 || categories.length === 0}
          >
            Add Procedure
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

      {(paymentTypes.length === 0 || categories.length === 0) && (
        <div className="unified-content">
          <div style={{ padding: '1rem', background: '#fff3cd', border: '1px solid #ffeaa7', borderRadius: '8px', color: '#856404' }}>
            <strong>Setup Required:</strong> You need to create payment types and categories before adding procedures.
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="unified-filters">
        <div className="unified-filters-row">
          <div className="unified-filter-group">
            <label>Search Procedures</label>
            <input
              type="text"
              name="search"
              value={filters.search}
              onChange={handleFilterChange}
              placeholder="Search by procedure name or code..."
              className="unified-search-input"
            />
          </div>
          <div className="unified-filter-group">
            <label>Category</label>
            <select
              name="categoryId"
              value={filters.categoryId}
              onChange={handleFilterChange}
              className="unified-filter-select"
            >
              <option value="">All Categories</option>
              {categories.map(category => (
                <option key={category._id} value={category._id}>
                  {category.code} - {category.description}
                </option>
              ))}
            </select>
          </div>
          <div className="unified-filter-group">
            <label>Payment Type</label>
            <select
              name="paymentTypeId"
              value={filters.paymentTypeId}
              onChange={handleFilterChange}
              className="unified-filter-select"
            >
              <option value="">All Payment Types</option>
              {paymentTypes.map(paymentType => (
                <option key={paymentType._id} value={paymentType._id}>
                  {paymentType.code} - {paymentType.description}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {showForm && (
        <div className="unified-content">
          <div style={{ borderBottom: '2px solid var(--gray-200)', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
            <h2 style={{ margin: 0, color: 'var(--primary-color)', fontSize: '1.5rem', fontWeight: '600' }}>
              {editingProcedure ? 'Edit Procedure' : 'Add New Procedure'}
            </h2>
          </div>
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: 'var(--gray-700)' }}>
                  Procedure Code *
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
                  style={{ marginBottom: '0.25rem' }}
                />
                <small style={{ color: 'var(--gray-600)', fontSize: '0.8rem' }}>Format: 3 letters + 3 digits (e.g., CRA001)</small>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: 'var(--gray-700)' }}>
                  Procedure Name *
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

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: 'var(--gray-700)' }}>
                  Category *
                </label>
                <select
                  value={formData.categoryId}
                  onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                  required
                  className="unified-filter-select"
                  style={{ width: '100%' }}
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
                  className="unified-filter-select"
                  style={{ width: '100%' }}
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

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '2rem' }}>
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
                  className="unified-filter-select"
                  style={{ width: '100%' }}
                >
                  <option value="INR">INR - Indian Rupee</option>
                  <option value="USD">USD - US Dollar</option>
                  <option value="EUR">EUR - Euro</option>
                  <option value="GBP">GBP - British Pound</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem' }}>
              <button type="submit" className="unified-btn unified-btn-primary">
                {editingProcedure ? 'Update' : 'Create'}
              </button>
              <button type="button" className="unified-btn unified-btn-secondary" onClick={handleCancel}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Content */}
      <div className="unified-content">
        {filteredProcedures.length === 0 ? (
          <div className="unified-empty">
            <h3>No procedures found</h3>
            <p>
              {procedures.length === 0 
                ? "Create your first procedure to get started." 
                : "Try adjusting your filter criteria."}
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
                      <td style={{ fontWeight: '600', color: 'var(--primary-color)' }}>{procedure.code}</td>
                      <td>{procedure.name}</td>
                      <td>{procedure.categoryId?.code} - {procedure.categoryId?.description}</td>
                      <td>{procedure.paymentTypeId?.code} - {procedure.paymentTypeId?.description}</td>
                      <td style={{ fontWeight: '600' }}>{formatCurrency(procedure.amount, procedure.currency)}</td>
                      <td>
                        <span style={{ 
                          padding: '0.25rem 0.5rem', 
                          borderRadius: '1rem', 
                          fontSize: '0.75rem',
                          background: procedure.isActive ? '#d4edda' : '#f8d7da',
                          color: procedure.isActive ? '#155724' : '#721c24'
                        }}>
                          {procedure.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td>
                        <div className="unified-table-actions">
                          <button
                            className="unified-table-action edit"
                            onClick={() => handleEdit(procedure)}
                            title="Edit Procedure"
                          >
                            ✏️
                          </button>
                          <button
                            className="unified-table-action delete"
                            onClick={() => handleDelete(procedure)}
                            title="Delete Procedure"
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
              {filteredProcedures.map((procedure) => (
                <MobileCard
                  key={procedure._id}
                  id={procedure._id}
                  title={procedure.name}
                  badge={procedure.code}
                  fields={[
                    { label: 'Category', value: `${procedure.categoryId?.code} - ${procedure.categoryId?.description}` },
                    { label: 'Payment Type', value: `${procedure.paymentTypeId?.code} - ${procedure.paymentTypeId?.description}` },
                    { label: 'Status', value: procedure.isActive ? 'Active' : 'Inactive' }
                  ]}
                  sections={[
                    {
                      title: 'Pricing',
                      items: [
                        { label: 'Amount', value: formatCurrency(procedure.amount, procedure.currency) },
                        { label: 'Currency', value: procedure.currency }
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
    </div>
  );
};

export default Procedures;
