import React, { useState, useEffect, useCallback } from 'react';
import { creditNoteAPI } from '../services/creditNoteAPI';
import './CreditNotes.css';
import '../../../shared/styles/unified-design.css';

const CreditNotes = ({ hospital, currentUser, onClose }) => {
  const [creditNotes, setCreditNotes] = useState([]);
  const [paymentTypes, setPaymentTypes] = useState([]);
  const [categories, setCategories] = useState([]);
  const [procedures, setProcedures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Form states
  const [showForm, setShowForm] = useState(false);
  const [editingCreditNote, setEditingCreditNote] = useState(null);
  const [formData, setFormData] = useState({
    paymentType: '',
    procedure: '',
    amountType: 'percentage', // 'percentage' or 'amount'
    percentage: '',
    amount: '',
    splitCategoryWise: false,
    items: [], // For category-wise items
    validityFrom: '2025-01-01', // Default to first day of current year
    validityTo: '9999-12-31', // Default to "31-Dec-9999" (never expires)
    description: ''
  });

  const fetchCreditNotes = useCallback(async () => {
    try {
      setLoading(true);
      const data = await creditNoteAPI.getCreditNotesByHospital(hospital._id);
      setCreditNotes(data);
    } catch (err) {
      setError('Failed to fetch credit notes');
      console.error('Error fetching credit notes:', err);
    } finally {
      setLoading(false);
    }
  }, [hospital._id]);

  const fetchOptions = useCallback(async (paymentTypeFilter = '', categoryFilter = '') => {
    try {
      console.log('Fetching options for hospital:', hospital._id);
      console.log('Filters - Payment Type:', paymentTypeFilter || 'All', 'Category:', categoryFilter || 'All');
      const options = await creditNoteAPI.getOptions(hospital._id, paymentTypeFilter, categoryFilter);
      console.log('Options received:', options);
      setPaymentTypes(options.paymentTypes || []);
      setCategories(options.categories || []);
      setProcedures(options.procedures || []);
    } catch (err) {
      setError('Failed to fetch options: ' + (err.response?.data?.message || err.message));
      console.error('Error fetching options:', err);
    }
  }, [hospital._id]);

  useEffect(() => {
    if (hospital) {
      fetchCreditNotes();
      fetchOptions();
    }
  }, [hospital, fetchCreditNotes, fetchOptions]);

  // Fetch filtered procedures when payment type changes
  const handlePaymentTypeChange = (paymentTypeId) => {
    setFormData({ ...formData, paymentType: paymentTypeId, procedure: '' }); // Clear procedure when payment type changes
    fetchOptions(paymentTypeId, '');
  };

  // Handle amount type change (percentage vs amount)
  const handleAmountTypeChange = (newAmountType) => {
    setFormData({
      ...formData,
      amountType: newAmountType,
      percentage: newAmountType === 'percentage' ? formData.percentage : '',
      amount: newAmountType === 'amount' ? formData.amount : ''
    });
  };

  // Handle split category wise toggle
  const handleSplitCategoryWiseChange = (checked) => {
    if (checked) {
      // Initialize items with available categories
      const initialItems = categories.map(category => ({
        surgicalCategory: category._id,
        categoryName: category.description,
        amountType: formData.amountType,
        percentage: formData.amountType === 'percentage' ? '' : undefined,
        amount: formData.amountType === 'amount' ? '' : undefined
      }));

      setFormData({
        ...formData,
        splitCategoryWise: true,
        items: initialItems,
        percentage: '',
        amount: ''
      });
    } else {
      setFormData({
        ...formData,
        splitCategoryWise: false,
        items: []
      });
    }
  };

  // Handle item value change
  const handleItemValueChange = (index, field, value) => {
    const updatedItems = [...formData.items];
    updatedItems[index] = {
      ...updatedItems[index],
      [field]: value
    };
    setFormData({ ...formData, items: updatedItems });
  };

  // Handle item amount type change
  const handleItemAmountTypeChange = (index, newAmountType) => {
    const updatedItems = [...formData.items];
    updatedItems[index] = {
      ...updatedItems[index],
      amountType: newAmountType,
      percentage: newAmountType === 'percentage' ? updatedItems[index].percentage || '' : undefined,
      amount: newAmountType === 'amount' ? updatedItems[index].amount || '' : undefined
    };
    setFormData({ ...formData, items: updatedItems });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validate dates
    if (formData.validityFrom && formData.validityTo) {
      const fromDate = new Date(formData.validityFrom);
      const toDate = new Date(formData.validityTo);
      if (toDate <= fromDate) {
        setError('Validity to date must be after validity from date');
        return;
      }
    }

    try {
      const creditNoteData = {
        hospital: hospital._id,
        paymentType: formData.paymentType || undefined,
        procedure: formData.procedure || undefined,
        splitCategoryWise: formData.splitCategoryWise,
        validityFrom: formData.validityFrom,
        validityTo: formData.validityTo,
        description: formData.description,
        businessUnit: hospital.businessUnit?._id || hospital.businessUnit,
        createdBy: currentUser._id
      };

      // Add percentage or amount based on split mode
      if (formData.splitCategoryWise) {
        // Category-wise items
        creditNoteData.items = formData.items.map(item => ({
          surgicalCategory: item.surgicalCategory,
          percentage: item.amountType === 'percentage' ? parseFloat(item.percentage) : undefined,
          amount: item.amountType === 'amount' ? parseFloat(item.amount) : undefined
        })).filter(item => 
          (item.percentage !== undefined && item.percentage !== '') || 
          (item.amount !== undefined && item.amount !== '')
        );
      } else {
        // Header level percentage or amount
        if (formData.amountType === 'percentage') {
          creditNoteData.percentage = parseFloat(formData.percentage);
        } else {
          creditNoteData.amount = parseFloat(formData.amount);
        }
      }

      if (editingCreditNote) {
        const updateData = {
          validityFrom: creditNoteData.validityFrom,
          validityTo: creditNoteData.validityTo,
          description: creditNoteData.description,
          splitCategoryWise: creditNoteData.splitCategoryWise,
          updatedBy: currentUser._id
        };

        // Add percentage/amount or items based on split mode
        if (creditNoteData.splitCategoryWise) {
          updateData.items = creditNoteData.items;
        } else {
          if (creditNoteData.percentage !== undefined) {
            updateData.percentage = creditNoteData.percentage;
          }
          if (creditNoteData.amount !== undefined) {
            updateData.amount = creditNoteData.amount;
          }
        }

        await creditNoteAPI.updateCreditNote(editingCreditNote._id, updateData);
        setSuccess('Credit note updated successfully');
      } else {
        await creditNoteAPI.createCreditNote(creditNoteData);
        setSuccess('Credit note created successfully');
      }

      resetForm();
      fetchCreditNotes();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save credit note');
      console.error('Error saving credit note:', err);
    }
  };

  const handleEdit = (creditNote) => {
    setEditingCreditNote(creditNote);
    const paymentTypeId = creditNote.paymentType?._id || '';
    
    // Determine amount type and values
    const hasHeaderPercentage = creditNote.percentage !== undefined && creditNote.percentage !== null;
    const hasHeaderAmount = creditNote.amount !== undefined && creditNote.amount !== null;
    const amountType = hasHeaderPercentage ? 'percentage' : 'amount';
    
    setFormData({
      paymentType: paymentTypeId,
      procedure: creditNote.procedure?._id || '',
      amountType: amountType,
      percentage: hasHeaderPercentage ? creditNote.percentage.toString() : '',
      amount: hasHeaderAmount ? creditNote.amount.toString() : '',
      splitCategoryWise: creditNote.splitCategoryWise || false,
      items: creditNote.items ? creditNote.items.map(item => ({
        surgicalCategory: item.surgicalCategory._id || item.surgicalCategory,
        categoryName: item.surgicalCategory.description || 'Unknown Category',
        amountType: item.percentage !== undefined ? 'percentage' : 'amount',
        percentage: item.percentage !== undefined ? item.percentage.toString() : '',
        amount: item.amount !== undefined ? item.amount.toString() : ''
      })) : [],
      validityFrom: creditNote.validityFrom ? new Date(creditNote.validityFrom).toISOString().split('T')[0] : '',
      validityTo: creditNote.validityTo ? new Date(creditNote.validityTo).toISOString().split('T')[0] : '',
      description: creditNote.description || ''
    });
    
    // Fetch options with the current filters to populate procedures correctly
    fetchOptions(paymentTypeId, '');
    setShowForm(true);
  };

  const handleDelete = async (creditNote) => {
    if (window.confirm('Are you sure you want to delete this credit note?')) {
      try {
        setError('');
        await creditNoteAPI.deleteCreditNote(creditNote._id, currentUser._id);
        setSuccess('Credit note deleted successfully');
        fetchCreditNotes();
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to delete credit note');
        console.error('Error deleting credit note:', err);
      }
    }
  };

  const resetForm = () => {
    setFormData({
      paymentType: '',
      procedure: '',
      amountType: 'percentage',
      percentage: '',
      amount: '',
      splitCategoryWise: false,
      items: [],
      validityFrom: '2025-01-01', // Default to first day of current year
      validityTo: '9999-12-31', // Default to "31-Dec-9999" (never expires)
      description: ''
    });
    setEditingCreditNote(null);
    setShowForm(false);
    // Fetch all options without filters when form is reset
    fetchOptions('', '');
  };

  const getPaymentTypeName = (paymentType) => {
    return `${paymentType.code} - ${paymentType.description}`;
  };

  const getProcedureName = (procedure) => {
    return `${procedure.code} - ${procedure.name}`;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getApplicabilityText = (creditNote) => {
    const parts = [];
    if (creditNote.paymentType) parts.push(`Payment: ${creditNote.paymentType.code}`);
    if (creditNote.procedure) parts.push(`Procedure: ${creditNote.procedure.code}`);
    
    if (creditNote.splitCategoryWise && creditNote.items?.length > 0) {
      const categoryNames = creditNote.items.map(item => 
        item.surgicalCategory?.code || item.surgicalCategory
      ).join(', ');
      parts.push(`Categories: ${categoryNames}`);
    }
    
    if (parts.length === 0) return 'All procedures (Default)';
    return parts.join(', ');
  };

  if (loading) {
    return (
      <div className="unified-modal-overlay">
        <div className="unified-modal-container" style={{maxWidth: '1200px', width: '95%', maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden'}}>
          <div className="unified-modal-body" style={{flex: 1, overflow: 'auto', padding: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
            <div className="unified-loading-container">
              <div className="unified-loading-spinner"></div>
              <p>Loading credit notes...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="unified-modal-overlay">
      <div className="unified-modal-container" style={{maxWidth: '1200px', width: '95%', maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden'}}>
        {/* Header */}
        <div className="unified-modal-header">
          <div className="unified-modal-title">
            <h1>Credit Notes</h1>
            <p>Manage credit note assignments for {hospital.shortName}</p>
          </div>
          <button 
            className="unified-modal-close"
            onClick={onClose}
            aria-label="Close dialog"
          >
            ×
          </button>
        </div>

        {error && <div className="unified-alert unified-alert-danger" style={{margin: '0 1.5rem'}}>{error}</div>}
        {success && <div className="unified-alert unified-alert-success" style={{margin: '0 1.5rem'}}>{success}</div>}

        {/* Scrollable Content */}
        <div className="unified-modal-body" style={{flex: 1, overflow: 'auto', padding: '1.5rem'}}>
          {/* Action Button */}
          <div className="unified-modal-actions" style={{marginBottom: '1.5rem', borderTop: 'none', padding: 0}}>
            <button 
              className="unified-btn unified-btn-primary"
              onClick={() => setShowForm(true)}
            >
              Add Credit Note
            </button>
          </div>

        {showForm && (
          <div className="unified-content" style={{background: 'var(--white)', borderRadius: 'var(--border-radius)', padding: '2rem', marginBottom: '1.5rem', boxShadow: 'var(--shadow-sm)'}}>
            <div style={{borderBottom: '2px solid var(--gray-200)', paddingBottom: '1rem', marginBottom: '1.5rem'}}>
              <h2 style={{margin: 0, color: 'var(--primary-color)', fontSize: '1.25rem', fontWeight: '600'}}>
                {editingCreditNote ? 'Edit Credit Note' : 'Add Credit Note'}
              </h2>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="unified-form-grid">
                <div className="unified-form-field">
                  <label className="unified-form-label">Payment Type (Optional)</label>
                  <select
                    value={formData.paymentType}
                    onChange={(e) => handlePaymentTypeChange(e.target.value)}
                    disabled={editingCreditNote} // Can't change payment type when editing
                    className="unified-search-input"
                  >
                    <option value="">All Payment Types</option>
                    {paymentTypes.map(type => (
                      <option key={type._id} value={type._id}>
                        {getPaymentTypeName(type)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="unified-form-field">
                  <label className="unified-form-label">Procedure (Optional)</label>
                  <select
                    value={formData.procedure}
                    onChange={(e) => setFormData({ ...formData, procedure: e.target.value })}
                    disabled={editingCreditNote} // Can't change procedure when editing
                    className="unified-search-input"
                  >
                    <option value="">All Procedures</option>
                    {procedures.map(procedure => (
                      <option key={procedure._id} value={procedure._id}>
                        {getProcedureName(procedure)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Validity Dates Row */}
              <div className="unified-form-grid">
                <div className="unified-form-field">
                  <label className="unified-form-label">Valid From *</label>
                  <input
                    type="date"
                    value={formData.validityFrom}
                    onChange={(e) => setFormData({ ...formData, validityFrom: e.target.value })}
                    required
                    className="unified-search-input"
                  />
                </div>

                <div className="unified-form-field">
                  <label className="unified-form-label">Valid To *</label>
                  <input
                    type="date"
                    value={formData.validityTo}
                    onChange={(e) => setFormData({ ...formData, validityTo: e.target.value })}
                    required
                    className="unified-search-input"
                  />
                </div>
              </div>

              {/* Amount Type and Split Category Wise Section */}
              <div className="unified-form-grid">
                {/* Only show Amount Type when NOT using category-wise */}
                {!formData.splitCategoryWise && (
                  <div className="unified-form-field">
                    <label className="unified-form-label">Amount Type *</label>
                    <select
                      value={formData.amountType}
                      onChange={(e) => handleAmountTypeChange(e.target.value)}
                      className="unified-search-input"
                    >
                      <option value="percentage">Percentage (%)</option>
                      <option value="amount">Fixed Amount (₹)</option>
                    </select>
                  </div>
                )}

                <div className="unified-form-field" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '1.5rem' }}>
                  <input
                    type="checkbox"
                    id="splitCategoryWise"
                    checked={formData.splitCategoryWise}
                    onChange={(e) => handleSplitCategoryWiseChange(e.target.checked)}
                    style={{ width: 'auto' }}
                  />
                  <label htmlFor="splitCategoryWise" className="unified-form-label" style={{ margin: 0 }}>
                    Maintain values category wise
                  </label>
                </div>
              </div>

              {/* Header Level Amount Input (when not split category wise) */}
              {!formData.splitCategoryWise && (
                <div className="unified-form-grid">
                  {formData.amountType === 'percentage' ? (
                    <div className="unified-form-field">
                      <label className="unified-form-label">Percentage (%) *</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        value={formData.percentage}
                        onChange={(e) => setFormData({ ...formData, percentage: e.target.value })}
                        required
                        className="unified-search-input"
                        placeholder="e.g., 15.50"
                      />
                    </div>
                  ) : (
                    <div className="unified-form-field">
                      <label className="unified-form-label">Amount (₹) *</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.amount}
                        onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                        required
                        className="unified-search-input"
                        placeholder="e.g., 5000.00"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Category-wise Items (when split category wise is enabled) */}
              {formData.splitCategoryWise && (
                <div style={{ marginBottom: '1.5rem' }}>
                  <label className="unified-form-label" style={{ display: 'block', marginBottom: '1rem' }}>
                    Category-wise Values *
                  </label>
                  
                  {formData.items.length === 0 ? (
                    <div style={{ 
                      padding: '2rem', 
                      textAlign: 'center', 
                      border: '2px dashed var(--gray-300)', 
                      borderRadius: 'var(--border-radius)',
                      color: 'var(--gray-600)'
                    }}>
                      <p>Please select a hospital first to load categories, or no categories are available for this hospital.</p>
                    </div>
                  ) : (
                    <div style={{ 
                      border: '1px solid var(--gray-300)', 
                      borderRadius: 'var(--border-radius)', 
                      overflow: 'hidden' 
                    }}>
                      {formData.items.map((item, index) => (
                        <div 
                          key={index} 
                          style={{ 
                            display: 'grid', 
                            gridTemplateColumns: '2fr 1fr 2fr', 
                            gap: '1rem', 
                            padding: '1rem', 
                            borderBottom: index < formData.items.length - 1 ? '1px solid var(--gray-200)' : 'none',
                            alignItems: 'center',
                            backgroundColor: index % 2 === 0 ? 'var(--gray-50)' : 'white'
                          }}
                        >
                          <div>
                            <label style={{ fontSize: '0.875rem', fontWeight: '500', color: 'var(--gray-700)' }}>
                              {item.categoryName}
                            </label>
                          </div>
                          
                          <div>
                            <select
                              value={item.amountType}
                              onChange={(e) => handleItemAmountTypeChange(index, e.target.value)}
                              className="unified-search-input"
                              style={{ fontSize: '0.875rem' }}
                            >
                              <option value="percentage">% </option>
                              <option value="amount">₹</option>
                            </select>
                          </div>
                          
                          <div>
                            {item.amountType === 'percentage' ? (
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                max="100"
                                value={item.percentage || ''}
                                onChange={(e) => handleItemValueChange(index, 'percentage', e.target.value)}
                                className="unified-search-input"
                                placeholder="e.g., 15.50"
                                style={{ fontSize: '0.875rem' }}
                              />
                            ) : (
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={item.amount || ''}
                                onChange={(e) => handleItemValueChange(index, 'amount', e.target.value)}
                                className="unified-search-input"
                                placeholder="e.g., 5000.00"
                                style={{ fontSize: '0.875rem' }}
                              />
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="unified-form-grid">
                <div className="unified-form-field" style={{ gridColumn: '1 / -1' }}>
                  <label className="unified-form-label">Description</label>
                  <input
                    type="text"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    maxLength="200"
                    placeholder="Optional description"
                    className="unified-search-input"
                  />
                </div>
              </div>

              <div style={{display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '2rem'}}>
                <button type="button" onClick={resetForm} className="unified-btn unified-btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="unified-btn unified-btn-primary">
                  {editingCreditNote ? 'Update' : 'Save'} Credit Note
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="unified-content" style={{background: 'var(--white)', borderRadius: 'var(--border-radius)', padding: '1.5rem', boxShadow: 'var(--shadow-sm)'}}>
          {creditNotes.length === 0 ? (
            <div className="unified-empty">
              <h3>No Credit Notes</h3>
              <p>No credit notes found for this hospital.</p>
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="credit-notes-table" style={{display: 'block'}}>
                <table className="unified-table">
                  <thead>
                    <tr>
                      <th>Applicability</th>
                      <th>Value</th>
                      <th>Type</th>
                      <th>Valid From</th>
                      <th>Valid To</th>
                      <th>Description</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {creditNotes.map(creditNote => (
                      <tr key={creditNote._id}>
                        <td data-label="Applicability">{getApplicabilityText(creditNote)}</td>
                        <td data-label="Value">
                          {creditNote.splitCategoryWise ? (
                            <div>
                              {creditNote.items?.map((item, index) => (
                                <div key={index} style={{ fontSize: '0.875rem', marginBottom: '0.25rem' }}>
                                  <strong>{item.surgicalCategory?.description || 'Unknown'}:</strong>{' '}
                                  {item.percentage !== undefined ? `${item.percentage}%` : `₹${item.amount || 0}`}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <span>
                              {creditNote.percentage !== undefined 
                                ? `${creditNote.percentage}%` 
                                : `₹${creditNote.amount || 0}`}
                            </span>
                          )}
                        </td>
                        <td data-label="Type">
                          {creditNote.splitCategoryWise ? 'Category-wise' : 'Header Level'}
                        </td>
                        <td data-label="Valid From">{formatDate(creditNote.validityFrom)}</td>
                        <td data-label="Valid To">{formatDate(creditNote.validityTo)}</td>
                        <td data-label="Description">{creditNote.description || '-'}</td>
                        <td data-label="Actions">
                          <div className="unified-table-actions">
                            <button
                              onClick={() => handleEdit(creditNote)}
                              className="unified-table-action edit"
                              title="Edit credit note"
                            >
                              ✏️
                            </button>
                            <button
                              onClick={() => handleDelete(creditNote)}
                              className="unified-table-action delete"
                              title="Delete credit note"
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
              <div className="credit-notes-cards" style={{display: 'none'}}>
                {creditNotes.map(creditNote => (
                  <div key={creditNote._id} className="unified-mobile-card">
                    <div className="unified-card-header">
                      <div className="unified-card-title" style={{fontSize: '1rem'}}>
                        Credit Note
                      </div>
                      <div className="unified-card-badge badge-info" style={{fontSize: '1.25rem', fontWeight: 'bold'}}>
                        {creditNote.percentage}%
                      </div>
                    </div>
                    
                    <div className="unified-card-body" style={{padding: '1rem 1.5rem'}}>
                      <div style={{marginBottom: '0.75rem'}}>
                        <strong style={{fontSize: '0.85rem', color: 'var(--gray-600)'}}>Applies to:</strong>
                        <div style={{marginTop: '0.25rem', background: 'var(--gray-50)', padding: '0.5rem', borderRadius: 'var(--border-radius)', fontSize: '0.9rem'}}>
                          {getApplicabilityText(creditNote)}
                        </div>
                      </div>

                      <div style={{marginBottom: '0.75rem', fontSize: '0.9rem', color: 'var(--gray-600)'}}>
                        <strong>Valid:</strong> {formatDate(creditNote.validityFrom)} - {formatDate(creditNote.validityTo)}
                      </div>

                      {creditNote.description && (
                        <div style={{marginBottom: '0.75rem', fontSize: '0.9rem', fontStyle: 'italic', color: 'var(--gray-600)'}}>
                          <strong>Description:</strong> {creditNote.description}
                        </div>
                      )}

                      <div style={{display: 'flex', gap: '0.5rem', marginTop: '1rem'}}>
                        <button
                          onClick={() => handleEdit(creditNote)}
                          className="unified-btn unified-btn-secondary"
                          style={{flex: 1}}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(creditNote)}
                          className="unified-btn unified-btn-danger"
                          style={{flex: 1}}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
        </div>
      </div>
    </div>
  );
};

export default CreditNotes;
