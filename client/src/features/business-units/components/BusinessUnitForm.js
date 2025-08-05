import React, { useState, useEffect } from 'react';
import './BusinessUnitForm.css';

const BusinessUnitForm = ({ businessUnit, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    partners: [],
    isActive: true
  });
  const [partnerInput, setPartnerInput] = useState('');
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (businessUnit) {
      setFormData({
        name: businessUnit.name || '',
        code: businessUnit.code || '',
        partners: businessUnit.partners || [],
        isActive: businessUnit.isActive !== undefined ? businessUnit.isActive : true
      });
    }
  }, [businessUnit]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleAddPartner = () => {
    if (partnerInput.trim() && !formData.partners.includes(partnerInput.trim())) {
      setFormData(prev => ({
        ...prev,
        partners: [...prev.partners, partnerInput.trim()]
      }));
      setPartnerInput('');
    }
  };

  const handleRemovePartner = (partnerToRemove) => {
    setFormData(prev => ({
      ...prev,
      partners: prev.partners.filter(partner => partner !== partnerToRemove)
    }));
  };

  const handlePartnerKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddPartner();
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Business unit name is required';
    }

    if (!formData.code.trim()) {
      newErrors.code = 'Business unit code is required';
    } else if (formData.code.length < 2) {
      newErrors.code = 'Code must be at least 2 characters long';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validateForm()) {
      onSubmit(formData);
    }
  };

  return (
    <div className="business-unit-form-container">
      <div className="form-header">
        <h2>{businessUnit ? 'Edit Business Unit' : 'Create New Business Unit'}</h2>
      </div>

      <form onSubmit={handleSubmit} className="business-unit-form">
        <div className="form-group">
          <label htmlFor="name">Business Unit Name *</label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleInputChange}
            className={errors.name ? 'error' : ''}
            placeholder="Enter business unit name"
          />
          {errors.name && <span className="error-text">{errors.name}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="code">Business Unit Code *</label>
          <input
            type="text"
            id="code"
            name="code"
            value={formData.code}
            onChange={handleInputChange}
            className={errors.code ? 'error' : ''}
            placeholder="Enter business unit code (e.g., BU001)"
            style={{ textTransform: 'uppercase' }}
          />
          {errors.code && <span className="error-text">{errors.code}</span>}
        </div>

        <div className="form-group">
          <label>Partners</label>
          <div className="partner-input-group">
            <input
              type="text"
              value={partnerInput}
              onChange={(e) => setPartnerInput(e.target.value)}
              onKeyPress={handlePartnerKeyPress}
              placeholder="Enter partner name and press Enter"
            />
            <button 
              type="button" 
              onClick={handleAddPartner}
              className="btn btn-secondary"
            >
              Add
            </button>
          </div>
          {formData.partners.length > 0 && (
            <div className="partners-list">
              {formData.partners.map((partner, index) => (
                <div key={index} className="partner-item">
                  <span>{partner}</span>
                  <button
                    type="button"
                    onClick={() => handleRemovePartner(partner)}
                    className="btn btn-small btn-danger"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="form-group">
          <label className="checkbox-label">
            <input
              type="checkbox"
              name="isActive"
              checked={formData.isActive}
              onChange={handleInputChange}
            />
            Active
          </label>
        </div>

        <div className="form-actions">
          <button type="button" onClick={onCancel} className="btn btn-secondary">
            Cancel
          </button>
          <button type="submit" className="btn btn-primary">
            {businessUnit ? 'Update Business Unit' : 'Create Business Unit'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default BusinessUnitForm;
