import React, { useState, useEffect } from 'react';
import { numberRangeAPI } from '../services/numberRangeAPI';
import '../styles/NumberRangeForm.css';

const DOCUMENT_TYPES = ['Inquiry', 'SalesOrder', 'Billing', 'CreditNote', 'PurchaseOrder', 'Invoice'];

const DEFAULT_CONFIGS = {
  'Inquiry': { prefix: 'EST', paddingLength: 8, startingNumber: 0 },
  'SalesOrder': { prefix: 'CS', paddingLength: 8, startingNumber: 10000000 },
  'Billing': { prefix: 'CINV', paddingLength: 6, startingNumber: 100000 },
  'CreditNote': { prefix: 'CN', paddingLength: 7, startingNumber: 1000000 },
  'PurchaseOrder': { prefix: 'PO', paddingLength: 8, startingNumber: 5000000 },
  'Invoice': { prefix: 'INV', paddingLength: 8, startingNumber: 1000000 }
};

const NumberRangeForm = ({ range, businessUnitId, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    documentType: '',
    prefix: '',
    currentNumber: 0,
    paddingLength: 8,
    description: ''
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [previewNumber, setPreviewNumber] = useState('');

  useEffect(() => {
    if (range) {
      setFormData({
        documentType: range.documentType,
        prefix: range.prefix,
        currentNumber: range.currentNumber,
        paddingLength: range.paddingLength,
        description: range.description
      });
      updatePreview(range.prefix, range.paddingLength, range.currentNumber + 1);
    }
  }, [range]);

  const updatePreview = (prefix, padding, number) => {
    const paddedNum = number.toString().padStart(padding, '0');
    setPreviewNumber(`${prefix}${paddedNum}`);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    let newValue = value;

    if (name === 'currentNumber' || name === 'paddingLength') {
      newValue = parseInt(value) || 0;
    }

    setFormData(prev => ({
      ...prev,
      [name]: newValue
    }));

    // Update preview
    const newFormData = { ...formData, [name]: newValue };
    updatePreview(
      newFormData.prefix,
      newFormData.paddingLength,
      newFormData.currentNumber + 1
    );

    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleDocumentTypeChange = (e) => {
    const docType = e.target.value;
    const config = DEFAULT_CONFIGS[docType] || {};

    setFormData(prev => ({
      ...prev,
      documentType: docType,
      prefix: config.prefix || '',
      paddingLength: config.paddingLength || 8,
      currentNumber: range ? prev.currentNumber : config.startingNumber || 0
    }));

    updatePreview(
      config.prefix || '',
      config.paddingLength || 8,
      (range ? formData.currentNumber : config.startingNumber || 0) + 1
    );
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.documentType) {
      newErrors.documentType = 'Document type is required';
    }

    if (!formData.prefix) {
      newErrors.prefix = 'Prefix is required';
    }

    if (!/^[A-Z0-9]+$/.test(formData.prefix)) {
      newErrors.prefix = 'Prefix must contain only uppercase letters and numbers';
    }

    if (formData.paddingLength < 1 || formData.paddingLength > 20) {
      newErrors.paddingLength = 'Padding length must be between 1 and 20';
    }

    if (formData.currentNumber < 0) {
      newErrors.currentNumber = 'Current number cannot be negative';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      let response;

      if (range) {
        // Update existing range - only allow changing current number and description
        response = await numberRangeAPI.update(range._id, {
          currentNumber: formData.currentNumber,
          description: formData.description
        });
      } else {
        // Create new range
        response = await numberRangeAPI.create({
          businessUnit: businessUnitId,
          documentType: formData.documentType,
          prefix: formData.prefix.toUpperCase(),
          currentNumber: formData.currentNumber,
          paddingLength: formData.paddingLength,
          description: formData.description
        });
      }

      if (response.success) {
        onSave();
      } else {
        setErrors({ submit: response.message || 'Failed to save number range' });
      }
    } catch (error) {
      setErrors({ submit: error.message || 'Error saving number range' });
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="number-range-form">
      <div className="form-header">
        <h3>{range ? 'Edit Number Range' : 'Create Number Range'}</h3>
      </div>

      <form onSubmit={handleSubmit} className="form">
        {errors.submit && <div className="error-message">{errors.submit}</div>}

        <div className="form-section">
          <div className="form-group">
            <label htmlFor="documentType">Document Type *</label>
            <select
              id="documentType"
              name="documentType"
              value={formData.documentType}
              onChange={handleDocumentTypeChange}
              disabled={!!range}
              required
            >
              <option value="">Select Document Type</option>
              {DOCUMENT_TYPES.map(type => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
            {errors.documentType && <span className="error">{errors.documentType}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="prefix">Prefix *</label>
            <input
              type="text"
              id="prefix"
              name="prefix"
              value={formData.prefix}
              onChange={handleInputChange}
              placeholder="e.g., EST, CS, CINV"
              disabled={!!range}
              required
              maxLength={10}
            />
            {errors.prefix && <span className="error">{errors.prefix}</span>}
            <small>Max 10 characters, uppercase letters and numbers only</small>
          </div>

          <div className="form-group">
            <label htmlFor="paddingLength">Padding Length *</label>
            <input
              type="number"
              id="paddingLength"
              name="paddingLength"
              value={formData.paddingLength}
              onChange={handleInputChange}
              min="1"
              max="20"
              disabled={!!range}
              required
            />
            {errors.paddingLength && <span className="error">{errors.paddingLength}</span>}
            <small>Number of digits to pad (e.g., 8 → 00000001)</small>
          </div>
        </div>

        <div className="form-section">
          <div className="form-group">
            <label htmlFor="currentNumber">
              {range ? 'Set Current Number' : 'Starting Number'} *
            </label>
            <input
              type="number"
              id="currentNumber"
              name="currentNumber"
              value={formData.currentNumber}
              onChange={handleInputChange}
              min="0"
              required
            />
            {errors.currentNumber && <span className="error">{errors.currentNumber}</span>}
            <small>
              {range 
                ? 'Set this to match your offline records. Next will be incremented by 1.'
                : 'Starting number for new sequences'
              }
            </small>
          </div>

          <div className="form-group">
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder="e.g., Auto-created range for Inquiry"
              rows="3"
            />
            <small>Optional notes about this range</small>
          </div>
        </div>

        <div className="preview-section">
          <h4>Number Preview</h4>
          <div className="preview-box">
            <p className="preview-label">Next Number:</p>
            <p className="preview-number">{previewNumber}</p>
            <p className="preview-hint">
              Current: {formData.currentNumber} → Next: {formData.currentNumber + 1}
            </p>
          </div>
        </div>

        <div className="form-actions">
          <button 
            type="button" 
            className="btn-cancel" 
            onClick={onCancel}
            disabled={loading}
          >
            Cancel
          </button>
          <button 
            type="submit" 
            className="btn-save" 
            disabled={loading}
          >
            {loading ? 'Saving...' : (range ? 'Update Range' : 'Create Range')}
          </button>
        </div>
      </form>

      {range && (
        <div className="edit-info">
          <h4>ℹ️ Editing Mode</h4>
          <p>When editing, you can only change the <strong>current number</strong> and <strong>description</strong>.</p>
          <p>This allows you to sync with offline records while keeping the format consistent.</p>
        </div>
      )}
    </div>
  );
};

export default NumberRangeForm;
