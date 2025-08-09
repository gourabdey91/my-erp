import React, { useState, useEffect } from 'react';
import { userAPI } from '../services/userAPI';
import { businessUnitAPI } from '../../business-units/services/businessUnitAPI';
import '../../../shared/styles/unified-design.css';
import './UserForm.css';

const UserForm = ({ user, onSave, onCancel, isEdit = false }) => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    role: 'user',
    status: 'active',
    businessUnits: [],
    defaultBusinessUnit: ''
  });
  const [availableBusinessUnits, setAvailableBusinessUnits] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Fetch available business units
    const fetchBusinessUnits = async () => {
      try {
        const businessUnits = await businessUnitAPI.getAll();
        setAvailableBusinessUnits(businessUnits);
      } catch (err) {
        console.error('Error fetching business units:', err);
      }
    };

    fetchBusinessUnits();
  }, []);

  useEffect(() => {
    if (isEdit && user) {
      // Handle business units - they might be populated objects or just IDs
      const businessUnits = user.businessUnits || [];
      const businessUnitIds = businessUnits.map(bu => 
        typeof bu === 'string' ? bu : bu._id
      );
      
      // Handle default business unit - might be populated object or just ID
      const defaultBU = user.defaultBusinessUnit;
      const defaultBusinessUnitId = defaultBU ? 
        (typeof defaultBU === 'string' ? defaultBU : defaultBU._id) : '';

      setFormData({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
        password: '',
        confirmPassword: '',
        phone: user.phone || '',
        role: user.role || 'user',
        status: user.status || 'active',
        businessUnits: businessUnitIds,
        defaultBusinessUnit: defaultBusinessUnitId
      });
    }
  }, [user, isEdit]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleBusinessUnitChange = (businessUnitId, isChecked) => {
    setFormData(prev => {
      let newBusinessUnits;
      if (isChecked) {
        newBusinessUnits = [...prev.businessUnits, businessUnitId];
      } else {
        newBusinessUnits = prev.businessUnits.filter(id => id !== businessUnitId);
        // If removing the default BU, clear the default
        if (prev.defaultBusinessUnit === businessUnitId) {
          return {
            ...prev,
            businessUnits: newBusinessUnits,
            defaultBusinessUnit: ''
          };
        }
      }
      return {
        ...prev,
        businessUnits: newBusinessUnits
      };
    });
  };

  const handleDefaultBusinessUnitChange = (e) => {
    const { value } = e.target;
    setFormData(prev => ({
      ...prev,
      defaultBusinessUnit: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Password validation
    if (!isEdit && !formData.password) {
      setError('Password is required for new users');
      setLoading(false);
      return;
    }

    if (formData.password && formData.password.length < 6) {
      setError('Password must be at least 6 characters long');
      setLoading(false);
      return;
    }

    if (formData.password && formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    try {
      // Prepare data for submission (exclude confirmPassword)
      const submitData = { ...formData };
      delete submitData.confirmPassword;
      
      // If editing and no password provided, don't send password field
      if (isEdit && !formData.password) {
        delete submitData.password;
      }

      console.log('Submitting data:', { ...submitData, password: submitData.password ? '[HIDDEN]' : 'MISSING' });

      let response;
      if (isEdit) {
        response = await userAPI.updateUser(user._id, submitData);
      } else {
        response = await userAPI.createUser(submitData);
      }

      if (response.data.success) {
        onSave(response.data.data);
      } else {
        setError(response.data.message || 'An error occurred');
      }
    } catch (err) {
      setError(
        err.response?.data?.message || 
        `Failed to ${isEdit ? 'update' : 'create'} user`
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="form-section">
      <div className="section-header">
        <h2>✏️ {isEdit ? 'Edit User' : 'Add New User'}</h2>
      </div>

      {error && (
        <div style={{ padding: '1rem', background: '#fee', border: '1px solid #fcc', borderRadius: '8px', color: '#c33', marginBottom: '1rem' }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="form-container">
        {/* Personal Information */}
        <div className="form-section-header">
          <h3>👤 Personal Information</h3>
        </div>
        
        <div className="form-grid">
          <div className="form-group">
            <label htmlFor="firstName">First Name *</label>
            <input
              type="text"
              id="firstName"
              name="firstName"
              value={formData.firstName}
              onChange={handleInputChange}
              placeholder="Enter first name"
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="lastName">Last Name *</label>
            <input
              type="text"
              id="lastName"
              name="lastName"
              value={formData.lastName}
              onChange={handleInputChange}
              placeholder="Enter last name"
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="email">Email *</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              placeholder="Enter email address"
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="phone">Phone <span className="optional-field">(Optional)</span></label>
            <input
              type="tel"
              id="phone"
              name="phone"
              value={formData.phone}
              onChange={handleInputChange}
              placeholder="Enter phone number"
            />
          </div>
        </div>

        {/* Authentication */}
        <div className="form-section-header">
          <h3>🔐 Authentication</h3>
        </div>
        
        <div className="form-grid">
          <div className="form-group">
            <label htmlFor="password">
              Password {!isEdit ? '*' : <span className="optional-field">(Leave blank to keep current)</span>}
            </label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              required={!isEdit}
              minLength="6"
              placeholder={isEdit ? "Enter new password" : "Enter password (min 6 chars)"}
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="confirmPassword">
              Confirm Password {!isEdit ? '*' : <span className="optional-field">(If changing password)</span>}
            </label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleInputChange}
              required={!isEdit || formData.password}
              minLength="6"
              placeholder={isEdit ? "Confirm new password" : "Confirm password"}
            />
          </div>
        </div>

        {/* Role & Status */}
        <div className="form-section-header">
          <h3>⚙️ Role & Status</h3>
        </div>
        
        <div className="form-grid">
          <div className="form-group">
            <label htmlFor="role">Role *</label>
            <select
              id="role"
              name="role"
              value={formData.role}
              onChange={handleInputChange}
              required
            >
              <option value="user">User</option>
              <option value="staff">Staff</option>
              <option value="manager">Manager</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          
          <div className="form-group">
            <label htmlFor="status">Status *</label>
            <select
              id="status"
              name="status"
              value={formData.status}
              onChange={handleInputChange}
              required
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>

          <div className="form-section">
            <h3>Business Unit Access</h3>
            <div className="form-group">
              <label>Available Business Units</label>
              <div className="checkbox-group">
                {availableBusinessUnits.map(bu => (
                  <label key={bu._id} className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={formData.businessUnits.includes(bu._id)}
                      onChange={(e) => handleBusinessUnitChange(bu._id, e.target.checked)}
                    />
                    <span className="checkmark"></span>
                    {bu.code} - {bu.name}
                  </label>
                ))}
              </div>
            </div>
            
            {formData.businessUnits.length > 0 && (
              <div className="form-group">
                <label htmlFor="defaultBusinessUnit">Default Business Unit</label>
                <select
                  id="defaultBusinessUnit"
                  name="defaultBusinessUnit"
                  value={formData.defaultBusinessUnit}
                  onChange={handleDefaultBusinessUnitChange}
                >
                  <option value="">Select default business unit</option>
                  {availableBusinessUnits
                    .filter(bu => formData.businessUnits.includes(bu._id))
                    .map((bu) => (
                      <option key={bu._id} value={bu._id}>
                        {bu.code} - {bu.name}
                      </option>
                    ))}
                </select>
              </div>
            )}
          </div>

          <div className="form-actions">
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? '⏳ Saving...' : (isEdit ? '💾 Update User' : '✅ Create User')}
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={onCancel}
              disabled={loading}
            >
              ✖ Cancel
            </button>
          </div>
        </form>
    </div>
  );
};

export default UserForm;
