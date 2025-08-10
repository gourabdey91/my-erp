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
    <div className="unified-content">
      <div style={{ borderBottom: '2px solid var(--gray-200)', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
        <h2 style={{ margin: 0, color: 'var(--primary-color)', fontSize: '1.5rem', fontWeight: '600' }}>
          {isEdit ? 'Edit User' : 'Add New User'}
        </h2>
      </div>

      {error && (
        <div style={{ padding: '1rem', background: '#fee', border: '1px solid #fcc', borderRadius: '8px', color: '#c33', marginBottom: '1rem' }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* Personal Information */}
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ borderBottom: '1px solid var(--gray-200)', paddingBottom: '0.5rem', marginBottom: '1rem' }}>
            <h3 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '1.2rem', fontWeight: '600' }}>👤 Personal Information</h3>
          </div>
        
          <div className="unified-form-grid">
            <div className="unified-form-field">
              <label className="unified-form-label">First Name *</label>
              <input
                type="text"
                name="firstName"
                value={formData.firstName}
                onChange={handleInputChange}
                placeholder="Enter first name"
                className="unified-search-input"
                required
              />
            </div>
          
            <div className="unified-form-field">
              <label className="unified-form-label">Last Name *</label>
              <input
                type="text"
                name="lastName"
                value={formData.lastName}
                onChange={handleInputChange}
                placeholder="Enter last name"
                className="unified-search-input"
                required
              />
            </div>
          
            <div className="unified-form-field">
              <label className="unified-form-label">Email *</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="Enter email address"
                className="unified-search-input"
                required
              />
            </div>
          
            <div className="unified-form-field">
              <label className="unified-form-label">
                Phone <span style={{ color: 'var(--gray-500)', fontWeight: 'normal' }}>(Optional)</span>
              </label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                placeholder="Enter phone number"
                className="unified-search-input"
              />
            </div>
          </div>
        </div>

        {/* Authentication */}
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ borderBottom: '1px solid var(--gray-200)', paddingBottom: '0.5rem', marginBottom: '1rem' }}>
            <h3 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '1.2rem', fontWeight: '600' }}>🔐 Authentication</h3>
          </div>
        
          <div className="unified-form-grid">
            <div className="unified-form-field">
              <label className="unified-form-label">
                Password {!isEdit ? '*' : <span style={{ color: 'var(--gray-500)', fontWeight: 'normal' }}>(Leave blank to keep current)</span>}
              </label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                required={!isEdit}
                minLength="6"
                placeholder={isEdit ? "Enter new password" : "Enter password (min 6 chars)"}
                className="unified-search-input"
              />
            </div>
          
            <div className="unified-form-field">
              <label className="unified-form-label">
                Confirm Password {!isEdit ? '*' : <span style={{ color: 'var(--gray-500)', fontWeight: 'normal' }}>(If changing password)</span>}
              </label>
              <input
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                required={!isEdit || formData.password}
                minLength="6"
                placeholder={isEdit ? "Confirm new password" : "Confirm password"}
                className="unified-search-input"
              />
            </div>
          </div>
        </div>

        {/* Role & Status */}
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ borderBottom: '1px solid var(--gray-200)', paddingBottom: '0.5rem', marginBottom: '1rem' }}>
            <h3 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '1.2rem', fontWeight: '600' }}>⚙️ Role & Status</h3>
          </div>
        
          <div className="unified-form-grid">
            <div className="unified-form-field">
              <label className="unified-form-label">Role *</label>
              <select
                name="role"
                value={formData.role}
                onChange={handleInputChange}
                className="unified-search-input"
                required
              >
                <option value="user">User</option>
                <option value="staff">Staff</option>
                <option value="manager">Manager</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          
            <div className="unified-form-field">
              <label className="unified-form-label">Status *</label>
              <select
                name="status"
                value={formData.status}
                onChange={handleInputChange}
                className="unified-search-input"
                required
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
        </div>

          <div style={{ marginBottom: '2rem' }}>
            <div style={{ borderBottom: '1px solid var(--gray-200)', paddingBottom: '0.5rem', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '1.2rem', fontWeight: '600' }}>🏢 Business Unit Access</h3>
            </div>
            
            <div className="unified-form-field">
              <label className="unified-form-label">Available Business Units</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.5rem' }}>
                {availableBusinessUnits.map(bu => (
                  <div key={bu._id} style={{ display: 'flex', alignItems: 'center', padding: '0.75rem', border: '1px solid var(--gray-300)', borderRadius: '6px', backgroundColor: formData.businessUnits.includes(bu._id) ? 'var(--blue-50)' : 'white', transition: 'all 0.2s ease' }}>
                    <input
                      type="checkbox"
                      checked={formData.businessUnits.includes(bu._id)}
                      onChange={(e) => handleBusinessUnitChange(bu._id, e.target.checked)}
                      style={{ width: '16px', height: '16px', cursor: 'pointer', marginRight: '0.75rem' }}
                    />
                    <label style={{ cursor: 'pointer', flex: 1, display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                      <span style={{ fontFamily: 'Courier New, monospace', backgroundColor: 'var(--blue-100)', color: 'var(--blue-700)', padding: '2px 6px', borderRadius: '3px', fontWeight: '600', fontSize: '12px' }}>
                        {bu.code}
                      </span>
                      <span style={{ color: 'var(--text-primary)', fontWeight: '500' }}>
                        {bu.name}
                      </span>
                    </label>
                  </div>
                ))}
              </div>
            </div>
            
            {formData.businessUnits.length > 0 && (
              <div className="unified-form-field" style={{ marginTop: '1rem' }}>
                <label className="unified-form-label">Default Business Unit</label>
                <select
                  name="defaultBusinessUnit"
                  value={formData.defaultBusinessUnit}
                  onChange={handleDefaultBusinessUnitChange}
                  className="unified-search-input"
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

          <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
            <button type="submit" className="unified-btn unified-btn-primary" disabled={loading}>
              {loading ? 'Saving...' : (isEdit ? 'Update User' : 'Create User')}
            </button>
            <button
              type="button"
              className="unified-btn unified-btn-secondary"
              onClick={onCancel}
              disabled={loading}
            >
              Cancel
            </button>
          </div>
        </form>
    </div>
  );
};

export default UserForm;
