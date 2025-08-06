import React, { useState, useEffect } from 'react';
import { creditNoteAPI } from '../services/creditNoteAPI';
import './CreditNotes.css';

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
    surgicalCategory: '',
    procedure: '',
    percentage: '',
    validityFrom: '',
    validityTo: '',
    description: ''
  });

  useEffect(() => {
    if (hospital) {
      fetchCreditNotes();
      fetchOptions();
    }
  }, [hospital]);

  const fetchCreditNotes = async () => {
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
  };

  const fetchOptions = async () => {
    try {
      console.log('Fetching options for hospital:', hospital._id);
      const options = await creditNoteAPI.getOptions(hospital._id);
      console.log('Options received:', options);
      setPaymentTypes(options.paymentTypes || []);
      setCategories(options.categories || []);
      setProcedures(options.procedures || []);
    } catch (err) {
      setError('Failed to fetch options: ' + (err.response?.data?.message || err.message));
      console.error('Error fetching options:', err);
    }
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
        surgicalCategory: formData.surgicalCategory || undefined,
        procedure: formData.procedure || undefined,
        percentage: parseFloat(formData.percentage),
        validityFrom: formData.validityFrom,
        validityTo: formData.validityTo,
        description: formData.description,
        businessUnit: hospital.businessUnit?._id || hospital.businessUnit,
        createdBy: currentUser._id
      };

      if (editingCreditNote) {
        await creditNoteAPI.updateCreditNote(editingCreditNote._id, {
          percentage: creditNoteData.percentage,
          validityFrom: creditNoteData.validityFrom,
          validityTo: creditNoteData.validityTo,
          description: creditNoteData.description,
          updatedBy: currentUser._id
        });
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
    setFormData({
      paymentType: creditNote.paymentType?._id || '',
      surgicalCategory: creditNote.surgicalCategory?._id || '',
      procedure: creditNote.procedure?._id || '',
      percentage: creditNote.percentage.toString(),
      validityFrom: creditNote.validityFrom ? new Date(creditNote.validityFrom).toISOString().split('T')[0] : '',
      validityTo: creditNote.validityTo ? new Date(creditNote.validityTo).toISOString().split('T')[0] : '',
      description: creditNote.description || ''
    });
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
      surgicalCategory: '',
      procedure: '',
      percentage: '',
      validityFrom: '',
      validityTo: '',
      description: ''
    });
    setEditingCreditNote(null);
    setShowForm(false);
  };

  const getPaymentTypeName = (paymentType) => {
    return `${paymentType.code} - ${paymentType.description}`;
  };

  const getCategoryName = (category) => {
    return `${category.code} - ${category.description}`;
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
    if (creditNote.surgicalCategory) parts.push(`Category: ${creditNote.surgicalCategory.code}`);
    if (creditNote.procedure) parts.push(`Procedure: ${creditNote.procedure.code}`);
    
    if (parts.length === 0) return 'All procedures (Default)';
    return parts.join(', ');
  };

  if (loading) {
    return (
      <div className="credit-notes-modal">
        <div className="credit-notes-content">
          <div className="loading">Loading credit notes...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="credit-notes-modal">
      <div className="credit-notes-content">
        <div className="credit-notes-header">
          <h2>Credit Notes - {hospital.shortName}</h2>
          <button 
            className="close-button"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}

        <div className="credit-notes-actions">
          <button 
            className="add-button"
            onClick={() => setShowForm(true)}
          >
            Add Credit Note
          </button>
        </div>

        {showForm && (
          <div className="credit-note-form">
            <h3>{editingCreditNote ? 'Edit Credit Note' : 'Add Credit Note'}</h3>
            <form onSubmit={handleSubmit}>
              <div className="form-row">
                <div className="form-group">
                  <label>Payment Type (Optional)</label>
                  <select
                    value={formData.paymentType}
                    onChange={(e) => setFormData({ ...formData, paymentType: e.target.value })}
                    disabled={editingCreditNote} // Can't change payment type when editing
                  >
                    <option value="">All Payment Types</option>
                    {paymentTypes.map(type => (
                      <option key={type._id} value={type._id}>
                        {getPaymentTypeName(type)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Surgical Category (Optional)</label>
                  <select
                    value={formData.surgicalCategory}
                    onChange={(e) => setFormData({ ...formData, surgicalCategory: e.target.value })}
                    disabled={editingCreditNote} // Can't change category when editing
                  >
                    <option value="">All Categories</option>
                    {categories.map(category => (
                      <option key={category._id} value={category._id}>
                        {getCategoryName(category)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Procedure (Optional)</label>
                  <select
                    value={formData.procedure}
                    onChange={(e) => setFormData({ ...formData, procedure: e.target.value })}
                    disabled={editingCreditNote} // Can't change procedure when editing
                  >
                    <option value="">All Procedures</option>
                    {procedures.map(procedure => (
                      <option key={procedure._id} value={procedure._id}>
                        {getProcedureName(procedure)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Percentage (%) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={formData.percentage}
                    onChange={(e) => setFormData({ ...formData, percentage: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Valid From *</label>
                  <input
                    type="date"
                    value={formData.validityFrom}
                    onChange={(e) => setFormData({ ...formData, validityFrom: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Valid To *</label>
                  <input
                    type="date"
                    value={formData.validityTo}
                    onChange={(e) => setFormData({ ...formData, validityTo: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label>Description</label>
                  <input
                    type="text"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    maxLength="200"
                    placeholder="Optional description"
                  />
                </div>
              </div>

              <div className="form-buttons">
                <button type="submit" className="save-button">
                  {editingCreditNote ? 'Update' : 'Save'} Credit Note
                </button>
                <button type="button" onClick={resetForm} className="cancel-button">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="credit-notes-list">
          {creditNotes.length === 0 ? (
            <div className="no-data">
              No credit notes found for this hospital.
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="credit-notes-table">
                <table>
                  <thead>
                    <tr>
                      <th>Applicability</th>
                      <th>Percentage</th>
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
                        <td data-label="Percentage">{creditNote.percentage}%</td>
                        <td data-label="Valid From">{formatDate(creditNote.validityFrom)}</td>
                        <td data-label="Valid To">{formatDate(creditNote.validityTo)}</td>
                        <td data-label="Description">{creditNote.description || '-'}</td>
                        <td data-label="Actions">
                          <div className="action-buttons">
                            <button
                              onClick={() => handleEdit(creditNote)}
                              className="edit-button"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDelete(creditNote)}
                              className="delete-button"
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
              <div className="credit-notes-cards">
                {creditNotes.map(creditNote => (
                  <div key={creditNote._id} className="credit-note-card">
                    <div className="credit-note-card-header">
                      <div className="credit-note-percentage">
                        {creditNote.percentage}%
                      </div>
                      <div className="credit-note-validity">
                        <div>{formatDate(creditNote.validityFrom)}</div>
                        <div>to</div>
                        <div>{formatDate(creditNote.validityTo)}</div>
                      </div>
                    </div>
                    
                    <div className="credit-note-applicability">
                      <div className="credit-note-applicability-label">Applies to:</div>
                      <div className="credit-note-applicability-value">
                        {getApplicabilityText(creditNote)}
                      </div>
                    </div>

                    {creditNote.description && (
                      <div className="credit-note-description">
                        <div className="credit-note-description-label">Description:</div>
                        <div className="credit-note-description-value">
                          {creditNote.description}
                        </div>
                      </div>
                    )}

                    <div className="credit-note-actions">
                      <button
                        onClick={() => handleEdit(creditNote)}
                        className="edit-button"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(creditNote)}
                        className="delete-button"
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
    </div>
  );
};

export default CreditNotes;
