import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { paymentTypeAPI } from './services/paymentTypeAPI';
import MobileCard from '../../shared/components/MobileCard';
import '../../shared/styles/unified-design.css';
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
    description: '',
    canBeExceeded: false
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

      setFormData({ code: '', description: '', canBeExceeded: false });
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
      description: paymentType.description,
      canBeExceeded: paymentType.canBeExceeded || false
    });
    setShowForm(true);
    
    // Scroll to form after state update
    setTimeout(() => {
      const formContainer = document.querySelector('.form-container');
      if (formContainer) {
        formContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
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
    setFormData({ code: '', description: '', canBeExceeded: false });
    setShowForm(false);
    setEditingPaymentType(null);
  };

  if (loading) {
    return <div className="loading">Loading payment types...</div>;
  }

  return (
    <div className="unified-container">
      {/* Header */}
      <div className="unified-header">
        <div className="unified-header-content">
          <div className="unified-header-text">
            <h1>Payment Types</h1>
            <p>Manage payment type categories for financial transactions.</p>
          </div>
          <button 
            className="unified-btn unified-btn-primary"
            onClick={() => setShowForm(true)}
          >
            Add Payment Type
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

            <div className="form-group">
              <label>
                <input
                  type="checkbox"
                  checked={formData.canBeExceeded}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    canBeExceeded: e.target.checked
                  })}
                />
                {' '}Can be exceeded
              </label>
              <small className="form-text">
                If checked, this payment type can exceed the normal limits when posting invoices
              </small>
            </div>

            <div className="form-actions">
              <button type="submit" className="unified-btn unified-btn-primary">
                {editingPaymentType ? 'Update Payment Type' : 'Create Payment Type'}
              </button>
              <button type="button" className="unified-btn unified-btn-secondary" onClick={handleCancel}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="unified-content">
        {paymentTypes.length === 0 ? (
          <div className="empty-state">
            <p>No payment types created yet. Create your first payment type to get started.</p>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="unified-table-responsive">
              <table className="unified-table">
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>Description</th>
                    <th>Can Be Exceeded</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paymentTypes.map((paymentType) => (
                    <tr key={paymentType._id}>
                      <td>
                        <span className="code-badge">{paymentType.code}</span>
                      </td>
                      <td>
                        <span className="name-text">{paymentType.description}</span>
                      </td>
                      <td>
                        <span className={`status-badge ${paymentType.canBeExceeded ? 'exceeded' : 'limited'}`}>
                          {paymentType.canBeExceeded ? 'Yes' : 'No'}
                        </span>
                      </td>
                      <td>
                        <span className={`status-badge ${paymentType.isActive ? 'active' : 'inactive'}`}>
                          {paymentType.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td>
                        <div className="unified-table-actions">
                          <button
                            className="unified-table-action edit"
                            onClick={() => handleEdit(paymentType)}
                            title="Edit Payment Type"
                            disabled={loading}
                          >
                            ✏️
                          </button>
                          <button
                            className="unified-table-action delete"
                            onClick={() => handleDelete(paymentType)}
                            title="Delete Payment Type"
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
              {paymentTypes.map((paymentType) => (
                <MobileCard
                  key={paymentType._id}
                  id={paymentType._id}
                  title={paymentType.description}
                  badge={paymentType.code}
                  fields={[
                    { 
                      label: 'Can Be Exceeded', 
                      value: paymentType.canBeExceeded ? 'Yes' : 'No' 
                    },
                    { 
                      label: 'Status', 
                      value: paymentType.isActive ? 'Active' : 'Inactive' 
                    }
                  ]}
                  actions={[
                    {
                      label: 'Edit',
                      icon: '✏️',
                      onClick: () => handleEdit(paymentType)
                    },
                    {
                      label: 'Delete',
                      icon: '🗑️',
                      variant: 'danger',
                      onClick: () => handleDelete(paymentType)
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

export default PaymentTypes;
