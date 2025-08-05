import React, { useState, useEffect } from 'react';
import { userAPI } from '../services/userAPI';
import { businessUnitAPI } from '../../business-units/services/businessUnitAPI';
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
    <div className="user-form-overlay">
      <div className="user-form-container">
        <div className="user-form-header">
          <h2>{isEdit ? 'Edit User' : 'Create New User'}</h2>
          <button className="close-btn" onClick={onCancel}>×</button>
        </div>

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="user-form">
          <div className="form-section">
            <h3>Personal Information</h3>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="firstName">First Name *</label>
                <input
                  type="text"
                  id="firstName"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleInputChange}
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
                  required
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="email">Email *</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="phone">Phone</label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="password">
                  Password {!isEdit && '*'}
                  {isEdit && <small>(leave blank to keep current)</small>}
                </label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  required={!isEdit}
                  minLength="6"
                  placeholder={isEdit ? "Enter new password" : ""}
                />
              </div>
              <div className="form-group">
                <label htmlFor="confirmPassword">
                  Confirm Password {!isEdit && '*'}
                </label>
                <input
                  type="password"
                  id="confirmPassword"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  required={!isEdit || formData.password}
                  minLength="6"
                  placeholder={isEdit ? "Confirm new password" : ""}
                />
              </div>
            </div>
          </div>

          <div className="form-section">
            <h3>Role & Status</h3>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="role">Role</label>
                <select
                  id="role"
                  name="role"
                  value={formData.role}
                  onChange={handleInputChange}
                >
                  <option value="user">User</option>
                  <option value="staff">Staff</option>
                  <option value="manager">Manager</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="status">Status</label>
                <select
                  id="status"
                  name="status"
                  value={formData.status}
                  onChange={handleInputChange}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>
          </div>

          <div className="form-section">
            <h3>Business Unit Access</h3>
            <div className="form-group">
              <label>Available Business Units</label>
              <div className="checkbox-group">
                {availableBusinessUnits.map((bu) => (
                  <div key={bu._id} className="checkbox-item">
                    <input
                      type="checkbox"
                      id={`bu-${bu._id}`}
                      checked={formData.businessUnits.includes(bu._id)}
                      onChange={(e) => handleBusinessUnitChange(bu._id, e.target.checked)}
                    />
                    <label htmlFor={`bu-${bu._id}`} className="checkbox-label">
                      <span className="bu-code">{bu.code}</span>
                      <span className="bu-name">{bu.name}</span>
                    </label>
                  </div>
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
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? 'Saving...' : (isEdit ? 'Update User' : 'Create User')}
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onCancel}
              disabled={loading}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UserForm;
