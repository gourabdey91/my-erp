import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useBusinessUnit } from '../../contexts/BusinessUnitContext';
import { procedureAPI } from './services/procedureAPI';
import { paymentTypeAPI } from '../payment-types/services/paymentTypeAPI';
import { categoryAPI } from '../categories/services/categoryAPI';
import './Procedures.css';

const Procedures = () => {
  const { currentUser } = useAuth();
  const { currentBusinessUnit } = useBusinessUnit();
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

  const loadData = useCallback(async () => {
    if (!currentBusinessUnit?._id) return;
    
    try {
      setLoading(true);
      
      // Load all required data in parallel
      const [proceduresRes, paymentTypesRes, categoriesRes] = await Promise.all([
        procedureAPI.getAll(currentBusinessUnit._id),
        paymentTypeAPI.getAll(currentBusinessUnit._id),
        categoryAPI.getAll(currentBusinessUnit._id)
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
  }, [currentBusinessUnit]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const procedureData = {
        ...formData,
        amount: parseFloat(formData.amount),
        businessUnitId: currentBusinessUnit._id,
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
    return <div className="loading">Loading procedures and related data...</div>;
  }

  if (!currentBusinessUnit) {
    return <div className="loading">Loading business unit context...</div>;
  }

  return (
    <div className="procedures-container">
      <div className="page-header">
        <h1>Medical Procedures</h1>
        <button 
          className="btn btn-primary"
          onClick={() => setShowForm(true)}
          disabled={paymentTypes.length === 0 || categories.length === 0}
        >
          Add Procedure
        </button>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {(paymentTypes.length === 0 || categories.length === 0) && (
        <div className="alert alert-warning">
          <strong>Setup Required:</strong> You need to create payment types and categories before adding procedures.
        </div>
      )}

      {showForm && (
        <div className="form-container">
          <div className="form-header">
            <h2>{editingProcedure ? 'Edit Procedure' : 'Add New Procedure'}</h2>
          </div>
          <form onSubmit={handleSubmit} className="procedure-form">
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="code">Procedure Code *</label>
                <input
                  type="text"
                  id="code"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  required
                  maxLength="6"
                  pattern="[A-Z]{3}[0-9]{3}"
                  placeholder="CRA001, MAX001, etc."
                  disabled={editingProcedure} // Code cannot be changed when editing
                />
                <small>Format: 3 letters + 3 digits (e.g., CRA001)</small>
              </div>

              <div className="form-group">
                <label htmlFor="name">Procedure Name *</label>
                <input
                  type="text"
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  maxLength="30"
                  placeholder="Cranial Single Procedure"
                />
              </div>
            </div>

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
            </div>

            <div className="form-row">
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
                <label htmlFor="currency">Currency *</label>
                <select
                  id="currency"
                  value={formData.currency}
                  onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                  required
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

            <div className="form-actions">
              <button type="submit" className="btn btn-primary">
                {editingProcedure ? 'Update' : 'Create'}
              </button>
              <button type="button" className="btn btn-secondary" onClick={handleCancel}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="procedures-list">
        {procedures.length === 0 ? (
          <div className="empty-state">
            <p>No procedures found. Create your first procedure to get started.</p>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="table-container">
              <table className="procedures-table">
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
                  {procedures.map((procedure) => (
                    <tr key={procedure._id}>
                      <td className="code-cell">
                        <span className="procedure-code">{procedure.code}</span>
                      </td>
                      <td className="name-cell">
                        <span className="procedure-name">{procedure.name}</span>
                      </td>
                      <td className="category-cell">
                        <span className="category-code">{procedure.categoryId?.code}</span>
                        <span className="category-desc">{procedure.categoryId?.description}</span>
                      </td>
                      <td className="payment-type-cell">
                        <span className="payment-type-code">{procedure.paymentTypeId?.code}</span>
                        <span className="payment-type-desc">{procedure.paymentTypeId?.description}</span>
                      </td>
                      <td className="amount-cell">
                        {formatCurrency(procedure.amount, procedure.currency)}
                      </td>
                      <td className="status-cell">
                        <span className={`status-badge ${procedure.isActive ? 'active' : 'inactive'}`}>
                          {procedure.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="actions-cell">
                        <button
                          className="btn btn-sm btn-outline"
                          onClick={() => handleEdit(procedure)}
                        >
                          Edit
                        </button>
                        <button
                          className="btn btn-sm btn-danger"
                          onClick={() => handleDelete(procedure)}
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
            <div className="procedures-mobile-cards">
              {procedures.map((procedure) => (
                <div key={procedure._id} className="procedure-card">
                  <div className="procedure-card-header">
                    <div className="procedure-card-title">
                      <span className="procedure-code">{procedure.code}</span>
                      <span className="procedure-name">{procedure.name}</span>
                    </div>
                    <span className={`procedure-card-status ${procedure.isActive ? 'active' : 'inactive'}`}>
                      {procedure.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <div className="procedure-card-content">
                    <div className="procedure-card-row">
                      <span className="label">Code:</span>
                      <span className="value">{procedure.code}</span>
                    </div>
                    <div className="procedure-card-row">
                      <span className="label">Name:</span>
                      <span className="value">{procedure.name}</span>
                    </div>
                    <div className="procedure-card-row">
                      <span className="label">Category:</span>
                      <span className="value">{procedure.categoryId?.code} - {procedure.categoryId?.description}</span>
                    </div>
                    <div className="procedure-card-row">
                      <span className="label">Payment Type:</span>
                      <span className="value">{procedure.paymentTypeId?.code} - {procedure.paymentTypeId?.description}</span>
                    </div>
                    <div className="procedure-card-row">
                      <span className="label">Amount:</span>
                      <span className="value amount">{formatCurrency(procedure.amount, procedure.currency)}</span>
                    </div>
                  </div>
                  <div className="procedure-card-actions">
                    <button
                      className="btn btn-sm btn-outline"
                      onClick={() => handleEdit(procedure)}
                    >
                      Edit
                    </button>
                    <button
                      className="btn btn-sm btn-danger"
                      onClick={() => handleDelete(procedure)}
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

export default Procedures;
