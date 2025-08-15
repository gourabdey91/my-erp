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
    paymentTypeId: '',
    description: '',
    // Flag for individual category limit application
    limitAppliedByIndividualCategory: false,
    // Items array for multiple surgical categories with limits
    items: [
      {
        surgicalCategoryId: '',
        limit: '',
        currency: 'INR'
      }
    ]
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
      filtered = filtered.filter(procedure => 
        procedure.items && procedure.items.some(item => 
          item.surgicalCategoryId?._id === filters.category
        )
      );
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
      // Process items to ensure proper data types (limit is now optional)
      const processedItems = formData.items.map(item => {
        const processedItem = {
          surgicalCategoryId: item.surgicalCategoryId,
          currency: item.currency
        };
        
        // Only include limit if it's provided and valid
        if (item.limit && item.limit.trim() !== '') {
          const limitValue = parseFloat(item.limit);
          if (!isNaN(limitValue) && limitValue >= 0) {
            processedItem.limit = limitValue;
          }
        }
        
        return processedItem;
      }).filter(item => item.surgicalCategoryId); // Filter out items without surgical category

      const procedureData = {
        code: formData.code,
        name: formData.name,
        description: formData.description,
        paymentTypeId: formData.paymentTypeId,
        limitAppliedByIndividualCategory: formData.limitAppliedByIndividualCategory,
        items: processedItems,
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
        description: '',
        limitAppliedByIndividualCategory: false,
        items: [
          {
            surgicalCategoryId: '',
            limit: '',
            currency: 'INR'
          }
        ]
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
      description: procedure.description || '',
      paymentTypeId: procedure.paymentTypeId._id,
      limitAppliedByIndividualCategory: procedure.limitAppliedByIndividualCategory || false,
      // Convert procedure items to form items, or create default item if none exist
      items: procedure.items && procedure.items.length > 0 
        ? procedure.items.map(item => ({
            surgicalCategoryId: item.surgicalCategoryId._id || item.surgicalCategoryId,
            limit: item.limit ? item.limit.toString() : '',
            currency: item.currency
          }))
        : [{
            surgicalCategoryId: '',
            limit: '',
            currency: 'INR'
          }]
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
      paymentTypeId: '',
      description: '',
      limitAppliedByIndividualCategory: false,
      items: [
        {
          surgicalCategoryId: '',
          limit: '',
          currency: 'INR'
        }
      ]
    });
    setShowForm(false);
    setEditingProcedure(null);
    setError('');
  };

  // Function to add a new item line
  const addItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, {
        surgicalCategoryId: '',
        limit: '',
        currency: 'INR'
      }]
    }));
  };

  // Function to remove an item line
  const removeItem = (index) => {
    if (formData.items.length > 1) {
      setFormData(prev => ({
        ...prev,
        items: prev.items.filter((_, i) => i !== index)
      }));
    }
  };

  // Function to update an item field
  const updateItem = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map((item, i) => 
        i === index ? { ...item, [field]: value } : item
      )
    }));
  };

  // Function to calculate total limit from all items
  const calculateTotalLimit = () => {
    return formData.items.reduce((total, item) => {
      return total + (parseFloat(item.limit) || 0);
    }, 0);
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

            {/* Limit Configuration */}
            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.5rem',
                padding: '1rem',
                backgroundColor: 'var(--gray-50)',
                borderRadius: '0.5rem',
                border: '1px solid var(--gray-200)'
              }}>
                <input
                  type="checkbox"
                  id="limitAppliedByIndividualCategory"
                  checked={formData.limitAppliedByIndividualCategory}
                  onChange={(e) => setFormData({ ...formData, limitAppliedByIndividualCategory: e.target.checked })}
                  style={{ width: '16px', height: '16px' }}
                />
                <label 
                  htmlFor="limitAppliedByIndividualCategory"
                  style={{ 
                    fontWeight: '500', 
                    color: 'var(--gray-700)',
                    cursor: 'pointer',
                    userSelect: 'none'
                  }}
                >
                  Apply limits at individual category level
                </label>
              </div>
              <div style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: 'var(--gray-600)' }}>
                When enabled, limits will be applied separately for each surgical category instead of a combined total.
              </div>
            </div>

            {/* Surgical Categories Line Items */}
            <div style={{ marginBottom: '2rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <label style={{ fontWeight: '500', color: 'var(--gray-700)', fontSize: '1.1rem' }}>
                  Surgical Categories *
                </label>
                <button
                  type="button"
                  onClick={addItem}
                  className="unified-btn unified-btn-primary"
                  style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}
                >
                  + Add Category
                </button>
              </div>

              {formData.items.map((item, index) => (
                <div key={index} style={{ 
                  border: '1px solid var(--gray-300)', 
                  borderRadius: '0.5rem', 
                  padding: '1rem', 
                  marginBottom: '1rem',
                  backgroundColor: 'var(--gray-50)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h4 style={{ margin: 0, color: 'var(--gray-700)' }}>Category {index + 1}</h4>
                    {formData.items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeItem(index)}
                        className="unified-btn unified-btn-danger"
                        style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem' }}
                      >
                        Remove
                      </button>
                    )}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: 'var(--gray-700)' }}>
                        Surgical Category *
                      </label>
                      <select
                        value={item.surgicalCategoryId}
                        onChange={(e) => updateItem(index, 'surgicalCategoryId', e.target.value)}
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
                        Limit (Optional)
                      </label>
                      <input
                        type="number"
                        value={item.limit}
                        onChange={(e) => updateItem(index, 'limit', e.target.value)}
                        min="0"
                        step="0.01"
                        placeholder="Enter limit (optional)"
                        className="unified-search-input"
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: 'var(--gray-700)' }}>
                        Currency *
                      </label>
                      <select
                        value={item.currency}
                        onChange={(e) => updateItem(index, 'currency', e.target.value)}
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
                </div>
              ))}

              {/* Total Limit Display */}
              <div style={{ 
                marginTop: '1rem', 
                padding: '1rem', 
                backgroundColor: 'var(--primary-50)', 
                borderRadius: '0.5rem',
                border: '1px solid var(--primary-200)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: '600', color: 'var(--primary-700)' }}>Total Limit:</span>
                  <span style={{ fontWeight: '700', color: 'var(--primary-800)', fontSize: '1.1rem' }}>
                    ₹{calculateTotalLimit().toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
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
                      <th>Categories</th>
                      <th>Payment Type</th>
                      <th>Total Limit</th>
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
                        <td>
                          <div style={{ maxWidth: '200px' }}>
                            {procedure.items && procedure.items.length > 0 ? (
                              procedure.items.map((item, index) => (
                                <div key={index} style={{ 
                                  fontSize: '0.85rem', 
                                  marginBottom: index < procedure.items.length - 1 ? '0.25rem' : '0',
                                  color: 'var(--gray-600)'
                                }}>
                                  {item.surgicalCategoryId?.code} - {item.surgicalCategoryId?.description}
                                  {item.limit && (
                                    <span style={{ color: 'var(--primary-600)', fontWeight: '500', marginLeft: '0.5rem' }}>
                                      ({formatCurrency(item.limit, item.currency)})
                                    </span>
                                  )}
                                </div>
                              ))
                            ) : (
                              <span style={{ color: 'var(--gray-400)', fontStyle: 'italic' }}>No categories</span>
                            )}
                            {procedure.limitAppliedByIndividualCategory && (
                              <div style={{ 
                                fontSize: '0.75rem', 
                                color: 'var(--info-600)', 
                                fontStyle: 'italic',
                                marginTop: '0.25rem'
                              }}>
                                Individual category limits
                              </div>
                            )}
                          </div>
                        </td>
                        <td>{procedure.paymentTypeId?.code} - {procedure.paymentTypeId?.description}</td>
                        <td>
                          <span className="amount-text" style={{ fontWeight: '600', color: 'var(--primary-700)' }}>
                            {formatCurrency(procedure.totalLimit || 0, 'INR')}
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
                        label: 'Total Limit', 
                        value: formatCurrency(procedure.totalLimit || 0, 'INR') 
                      },
                      { 
                        label: 'Status', 
                        value: procedure.isActive ? 'Active' : 'Inactive' 
                      }
                    ]}
                    sections={[
                      {
                        title: 'Categories',
                        items: procedure.items && procedure.items.length > 0 ? 
                          procedure.items.map((item, index) => ({
                            label: `Category ${index + 1}`,
                            value: `${item.surgicalCategoryId?.code} - ${item.surgicalCategoryId?.description}${item.limit ? ` (${formatCurrency(item.limit, item.currency)})` : ''}`
                          })) : 
                          [{ label: 'Categories', value: 'No categories assigned' }]
                      },
                      {
                        title: 'Details',
                        items: [
                          {
                            label: 'Payment Type',
                            value: `${procedure.paymentTypeId?.code} - ${procedure.paymentTypeId?.description}`
                          },
                          ...(procedure.limitAppliedByIndividualCategory ? [{
                            label: 'Limit Application',
                            value: 'Individual category limits'
                          }] : [])
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
