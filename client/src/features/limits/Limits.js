import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useBusinessUnit } from '../../contexts/BusinessUnitContext';
import { limitAPI } from './services/limitAPI';
import { paymentTypeAPI } from '../payment-types/services/paymentTypeAPI';
import { categoryAPI } from '../categories/services/categoryAPI';
import './Limits.css';

const Limits = () => {
  const { currentUser } = useAuth();
  const { currentBusinessUnit } = useBusinessUnit();
  const [limits, setLimits] = useState([]);
  const [paymentTypes, setPaymentTypes] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingLimit, setEditingLimit] = useState(null);
  const [formData, setFormData] = useState({
    paymentTypeId: '',
    categoryId: '',
    amount: '',
    currency: 'USD',
    description: ''
  });

  const loadData = useCallback(async () => {
    if (!currentBusinessUnit?._id) return;
    
    try {
      setLoading(true);
      
      // Load all required data in parallel
      const [limitsRes, paymentTypesRes, categoriesRes] = await Promise.all([
        limitAPI.getAll(currentBusinessUnit._id),
        paymentTypeAPI.getAll(currentBusinessUnit._id),
        categoryAPI.getAll(currentBusinessUnit._id)
      ]);

      if (limitsRes.success) setLimits(limitsRes.data);
      if (paymentTypesRes.success) setPaymentTypes(paymentTypesRes.data);
      if (categoriesRes.success) setCategories(categoriesRes.data);
      
    } catch (err) {
      setError('Failed to load data');
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  }, [currentBusinessUnit]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const limitData = {
        ...formData,
        amount: parseFloat(formData.amount),
        businessUnitId: currentBusinessUnit._id,
        createdBy: currentUser.id,
        updatedBy: currentUser.id
      };

      if (editingLimit) {
        await limitAPI.update(editingLimit._id, {
          ...limitData,
          createdBy: editingLimit.createdBy
        });
      } else {
        await limitAPI.create(limitData);
      }

      setFormData({
        paymentTypeId: '',
        categoryId: '',
        amount: '',
        currency: 'USD',
        description: ''
      });
      setShowForm(false);
      setEditingLimit(null);
      loadData();
    } catch (err) {
      setError(editingLimit ? 'Failed to update limit' : 'Failed to create limit');
      console.error('Error saving limit:', err);
    }
  };

  const handleEdit = (limit) => {
    setEditingLimit(limit);
    setFormData({
      paymentTypeId: limit.paymentTypeId._id,
      categoryId: limit.categoryId._id,
      amount: limit.amount.toString(),
      currency: limit.currency,
      description: limit.description || ''
    });
    setShowForm(true);
  };

  const handleDelete = async (limit) => {
    const categoryCode = limit.categoryId?.code || 'Unknown';
    const paymentTypeCode = limit.paymentTypeId?.code || 'Unknown';
    
    if (window.confirm(`Are you sure you want to delete the limit for "${categoryCode}" - "${paymentTypeCode}"?`)) {
      try {
        await limitAPI.delete(limit._id, currentUser.id);
        loadData();
      } catch (err) {
        setError('Failed to delete limit');
        console.error('Error deleting limit:', err);
      }
    }
  };

  const handleCancel = () => {
    setFormData({
      paymentTypeId: '',
      categoryId: '',
      amount: '',
      currency: 'USD',
      description: ''
    });
    setShowForm(false);
    setEditingLimit(null);
  };

  const formatCurrency = (amount, currency) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD'
    }).format(amount);
  };

  if (loading) {
    return <div className="loading">Loading limits and related data...</div>;
  }

  if (!currentBusinessUnit) {
    return <div className="loading">Loading business unit context...</div>;
  }

  return (
    <div className="limits-container">
      <div className="page-header">
        <h1>Payment Limits</h1>
        <button 
          className="btn btn-primary"
          onClick={() => setShowForm(true)}
          disabled={paymentTypes.length === 0 || categories.length === 0}
        >
          Add Limit
        </button>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {(paymentTypes.length === 0 || categories.length === 0) && (
        <div className="alert alert-warning">
          <strong>Setup Required:</strong> You need to create payment types and categories before adding limits.
        </div>
      )}

      {showForm && (
        <div className="form-container">
          <div className="form-header">
            <h2>{editingLimit ? 'Edit Payment Limit' : 'Add New Payment Limit'}</h2>
          </div>
          <form onSubmit={handleSubmit} className="limit-form">
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="categoryId">Category *</label>
                <select
                  id="categoryId"
                  value={formData.categoryId}
                  onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                  required
                >
                  <option value="">Select Category</option>
                  {categories.map((category) => (
                    <option key={category._id} value={category._id}>
                      {category.code} - {category.description}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="paymentTypeId">Payment Type *</label>
                <select
                  id="paymentTypeId"
                  value={formData.paymentTypeId}
                  onChange={(e) => setFormData({ ...formData, paymentTypeId: e.target.value })}
                  required
                >
                  <option value="">Select Payment Type</option>
                  {paymentTypes.map((paymentType) => (
                    <option key={paymentType._id} value={paymentType._id}>
                      {paymentType.code} - {paymentType.description}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="currency">Currency *</label>
                <select
                  id="currency"
                  value={formData.currency}
                  onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                  required
                >
                  <option value="USD">USD - US Dollar</option>
                  <option value="EUR">EUR - Euro</option>
                  <option value="GBP">GBP - British Pound</option>
                  <option value="INR">INR - Indian Rupee</option>
                  <option value="AUD">AUD - Australian Dollar</option>
                  <option value="CAD">CAD - Canadian Dollar</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="amount">Amount *</label>
              <input
                type="number"
                id="amount"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                required
                min="0"
                step="0.01"
                placeholder="Enter amount"
              />
            </div>

            <div className="form-group">
              <label htmlFor="description">Description</label>
              <textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Optional description or notes"
                rows="3"
              />
            </div>

            <div className="form-actions">
              <button type="submit" className="btn btn-primary">
                {editingLimit ? 'Update' : 'Create'}
              </button>
              <button type="button" className="btn btn-secondary" onClick={handleCancel}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="limits-list">
        {limits.length === 0 ? (
          <div className="empty-state">
            <p>No payment limits found. Create your first limit to get started.</p>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="table-container">
              <table className="limits-table">
                <thead>
                  <tr>
                    <th>Category</th>
                    <th>Payment Type</th>
                    <th>Amount</th>
                    <th>Description</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {limits.map((limit) => (
                    <tr key={limit._id}>
                      <td className="category-cell">
                        <span className="category-code">{limit.categoryId?.code}</span>
                        <span className="category-desc">{limit.categoryId?.description}</span>
                      </td>
                      <td className="payment-type-cell">
                        <span className="payment-type-code">{limit.paymentTypeId?.code}</span>
                        <span className="payment-type-desc">{limit.paymentTypeId?.description}</span>
                      </td>
                      <td className="amount-cell">
                        {formatCurrency(limit.amount, limit.currency)}
                      </td>
                      <td className="description-cell">
                        {limit.description || '-'}
                      </td>
                      <td className="status-cell">
                        <span className={`status-badge ${limit.isActive ? 'active' : 'inactive'}`}>
                          {limit.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="actions-cell">
                        <button
                          className="btn btn-sm btn-outline"
                          onClick={() => handleEdit(limit)}
                        >
                          Edit
                        </button>
                        <button
                          className="btn btn-sm btn-danger"
                          onClick={() => handleDelete(limit)}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="limits-mobile-cards">
              {limits.map((limit) => (
                <div key={limit._id} className="limit-card">
                  <div className="limit-card-header">
                    <div className="limit-card-title">
                      <span className="category-code">{limit.categoryId?.code}</span>
                      <span className="payment-type-code">{limit.paymentTypeId?.code}</span>
                    </div>
                    <span className={`limit-card-status ${limit.isActive ? 'active' : 'inactive'}`}>
                      {limit.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <div className="limit-card-content">
                    <div className="limit-card-row">
                      <span className="label">Category:</span>
                      <span className="value">{limit.categoryId?.code} - {limit.categoryId?.description}</span>
                    </div>
                    <div className="limit-card-row">
                      <span className="label">Payment Type:</span>
                      <span className="value">{limit.paymentTypeId?.description}</span>
                    </div>
                    <div className="limit-card-row">
                      <span className="label">Amount:</span>
                      <span className="value amount">{formatCurrency(limit.amount, limit.currency)}</span>
                    </div>
                    {limit.description && (
                      <div className="limit-card-row">
                        <span className="label">Description:</span>
                        <span className="value">{limit.description}</span>
                      </div>
                    )}
                  </div>
                  <div className="limit-card-actions">
                    <button
                      className="btn btn-sm btn-outline"
                      onClick={() => handleEdit(limit)}
                    >
                      Edit
                    </button>
                    <button
                      className="btn btn-sm btn-danger"
                      onClick={() => handleDelete(limit)}
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

export default Limits;
