import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { paymentTypeAPI } from './services/paymentTypeAPI';
import './PaymentTypes.css';

const PaymentTypes = () => {
  const { currentUser } = useAuth();
  const [paymentTypes, setPaymentTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingPaymentType, setEditingPaymentType] = useState(null);
  const [formData, setFormData] = useState({
    code: '',
    description: ''
  });

  const loadPaymentTypes = useCallback(async () => {
    try {
      setLoading(true);
      const response = await paymentTypeAPI.getAll();
      if (response.success) {
        setPaymentTypes(response.data);
      } else {
        setError(response.message || 'Failed to load payment types');
      }
    } catch (err) {
      setError('Failed to load payment types');
      console.error('Error loading payment types:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPaymentTypes();
  }, [loadPaymentTypes]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const paymentTypeData = {
        ...formData,
        createdBy: currentUser.id,
        updatedBy: currentUser.id
      };

      if (editingPaymentType) {
        await paymentTypeAPI.update(editingPaymentType._id, {
          ...paymentTypeData,
          createdBy: editingPaymentType.createdBy
        });
      } else {
        await paymentTypeAPI.create(paymentTypeData);
      }

      setFormData({ code: '', description: '' });
      setShowForm(false);
      setEditingPaymentType(null);
      loadPaymentTypes();
    } catch (err) {
      setError(editingPaymentType ? 'Failed to update payment type' : 'Failed to create payment type');
      console.error('Error saving payment type:', err);
    }
  };

  const handleEdit = (paymentType) => {
    setEditingPaymentType(paymentType);
    setFormData({
      code: paymentType.code,
      description: paymentType.description
    });
    setShowForm(true);
  };

  const handleDelete = async (paymentType) => {
    if (window.confirm(`Are you sure you want to delete payment type "${paymentType.code}"?`)) {
      try {
        await paymentTypeAPI.delete(paymentType._id, currentUser.id);
        loadPaymentTypes();
      } catch (err) {
        setError('Failed to delete payment type');
        console.error('Error deleting payment type:', err);
      }
    }
  };

  const handleCancel = () => {
    setFormData({ code: '', description: '' });
    setShowForm(false);
    setEditingPaymentType(null);
  };

  if (loading) {
    return <div className="loading">Loading payment types...</div>;
  }

  return (
    <div className="payment-types-container">
      <div className="page-header">
        <h1>Payment Types</h1>
        <button 
          className="btn btn-primary"
          onClick={() => setShowForm(true)}
        >
          Add Payment Type
        </button>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {showForm && (
        <div className="form-container">
          <div className="form-header">
            <h2>{editingPaymentType ? 'Edit Payment Type' : 'Add New Payment Type'}</h2>
          </div>
          <form onSubmit={handleSubmit} className="payment-type-form">
            <div className="form-group">
              <label htmlFor="code">Payment Type Code * (Max 6 chars)</label>
              <input
                type="text"
                id="code"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                required
                maxLength="6"
                placeholder="Enter payment type code"
                style={{ textTransform: 'uppercase' }}
              />
            </div>

            <div className="form-group">
              <label htmlFor="description">Description *</label>
              <input
                type="text"
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                required
                maxLength="100"
                placeholder="Enter payment type description"
              />
            </div>

            <div className="form-actions">
              <button type="submit" className="btn btn-primary">
                {editingPaymentType ? 'Update' : 'Create'}
              </button>
              <button type="button" className="btn btn-secondary" onClick={handleCancel}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="payment-types-list">
        {paymentTypes.length === 0 ? (
          <div className="empty-state">
            <p>No payment types found. Create your first payment type to get started.</p>
          </div>
        ) : (
          <div className="payment-types-grid">
            {paymentTypes.map((paymentType) => (
              <div key={paymentType._id} className="payment-type-card">
                <div className="payment-type-header">
                  <h3>{paymentType.description}</h3>
                  <span className="payment-type-code">Code: {paymentType.code}</span>
                </div>
                <div className="payment-type-details">
                  <div className="status-section">
                    <span className={`status-badge ${paymentType.isActive ? 'active' : 'inactive'}`}>
                      {paymentType.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
                <div className="payment-type-actions">
                  <button
                    className="edit-button"
                    onClick={() => handleEdit(paymentType)}
                  >
                    Edit
                  </button>
                  <button
                    className="delete-button"
                    onClick={() => handleDelete(paymentType)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PaymentTypes;
