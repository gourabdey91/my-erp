import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { companyDetailsAPI } from './services/companyDetailsAPI';
import './CompanyDetails.css';

const CompanyDetails = () => {
  const [formData, setFormData] = useState({
    companyName: '',
    legalName: '',
    address: {
      street: '',
      city: '',
      state: '',
      pincode: '',
      country: 'India'
    },
    contact: {
      email: '',
      mobile1: '',
      mobile2: '',
      landline: ''
    },
    compliance: {
      gstNumber: '',
      stateCode: '',
      dlNumber: '',
      panNumber: '',
      cinNumber: ''
    }
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [companyId, setCompanyId] = useState(null);

  const { currentUser } = useAuth();

  useEffect(() => {
    fetchCompanyDetails();
  }, []);

  const fetchCompanyDetails = async () => {
    try {
      setLoading(true);
      const response = await companyDetailsAPI.get();
      if (response.success) {
        setFormData(response.data);
        setCompanyId(response.data._id);
      }
    } catch (err) {
      // If no company details exist, that's fine - we'll create new ones
      if (err.status !== 404) {
        setError('Failed to fetch company details');
        console.error(err);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    if (name.includes('.')) {
      const [section, field] = name.split('.');
      setFormData(prev => ({
        ...prev,
        [section]: {
          ...prev[section],
          [field]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
    
    setError('');
    setSuccess('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    // Validate user is available
    if (!currentUser || !currentUser._id) {
      setError('User session invalid. Please log in again.');
      setSaving(false);
      return;
    }

    try {
      console.log('Submitting company details:', formData);
      console.log('User ID:', currentUser._id);
      
      const dataToSave = {
        ...formData,
        ...(companyId ? { updatedBy: currentUser._id } : { createdBy: currentUser._id })
      };

      console.log('Data to save:', dataToSave);

      const response = companyId 
        ? await companyDetailsAPI.update(companyId, dataToSave)
        : await companyDetailsAPI.save(dataToSave);

      if (response.success) {
        setSuccess('Company details saved successfully');
        if (!companyId) {
          setCompanyId(response.data._id);
        }
      } else {
        setError(response.message || 'Failed to save company details');
      }
    } catch (err) {
      console.error('Error saving company details:', err);
      setError(err.message || 'Failed to save company details');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="company-details-container">
        <div className="loading-spinner">Loading company details...</div>
      </div>
    );
  }

  return (
    <div className="company-details-container">
      <div className="form-header">
        <h1>Company Details</h1>
        <p>Manage your company information and compliance details</p>
      </div>

      {error && (
        <div className="error-message">
          {error}
          <button onClick={() => setError('')} className="close-btn">×</button>
        </div>
      )}

      {success && (
        <div className="success-message">
          {success}
          <button onClick={() => setSuccess('')} className="close-btn">×</button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="company-form">
        {/* Basic Company Information */}
        <div className="form-section">
          <h2 className="section-title">Basic Information</h2>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="companyName" className="form-label">
                Company Name <span className="required">*</span>
              </label>
              <input
                type="text"
                id="companyName"
                name="companyName"
                value={formData.companyName}
                onChange={handleInputChange}
                className="form-input"
                placeholder="Enter company name"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="legalName" className="form-label">
                Legal Name <span className="required">*</span>
              </label>
              <input
                type="text"
                id="legalName"
                name="legalName"
                value={formData.legalName}
                onChange={handleInputChange}
                className="form-input"
                placeholder="Enter legal company name"
                required
              />
            </div>
          </div>
        </div>

        {/* Address Information */}
        <div className="form-section">
          <h2 className="section-title">Address Information</h2>
          <div className="form-group">
            <label htmlFor="address.street" className="form-label">
              Street Address <span className="required">*</span>
            </label>
            <textarea
              id="address.street"
              name="address.street"
              value={formData.address.street}
              onChange={handleInputChange}
              className="form-textarea"
              placeholder="Enter street address"
              rows="2"
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="address.city" className="form-label">
                City <span className="required">*</span>
              </label>
              <input
                type="text"
                id="address.city"
                name="address.city"
                value={formData.address.city}
                onChange={handleInputChange}
                className="form-input"
                placeholder="Enter city"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="address.state" className="form-label">
                State <span className="required">*</span>
              </label>
              <input
                type="text"
                id="address.state"
                name="address.state"
                value={formData.address.state}
                onChange={handleInputChange}
                className="form-input"
                placeholder="Enter state"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="address.pincode" className="form-label">
                Pincode <span className="required">*</span>
              </label>
              <input
                type="text"
                id="address.pincode"
                name="address.pincode"
                value={formData.address.pincode}
                onChange={handleInputChange}
                className="form-input"
                placeholder="Enter pincode"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="address.country" className="form-label">
                Country <span className="required">*</span>
              </label>
              <input
                type="text"
                id="address.country"
                name="address.country"
                value={formData.address.country}
                onChange={handleInputChange}
                className="form-input"
                placeholder="Enter country"
                required
              />
            </div>
          </div>
        </div>

        {/* Contact Information */}
        <div className="form-section">
          <h2 className="section-title">Contact Information</h2>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="contact.email" className="form-label">
                Email Address <span className="required">*</span>
              </label>
              <input
                type="email"
                id="contact.email"
                name="contact.email"
                value={formData.contact.email}
                onChange={handleInputChange}
                className="form-input"
                placeholder="Enter email address"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="contact.mobile1" className="form-label">
                Mobile Number 1 <span className="required">*</span>
              </label>
              <input
                type="tel"
                id="contact.mobile1"
                name="contact.mobile1"
                value={formData.contact.mobile1}
                onChange={handleInputChange}
                className="form-input"
                placeholder="Enter primary mobile number"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="contact.mobile2" className="form-label">
                Mobile Number 2
              </label>
              <input
                type="tel"
                id="contact.mobile2"
                name="contact.mobile2"
                value={formData.contact.mobile2}
                onChange={handleInputChange}
                className="form-input"
                placeholder="Enter secondary mobile number"
              />
            </div>

            <div className="form-group">
              <label htmlFor="contact.landline" className="form-label">
                Landline Number
              </label>
              <input
                type="tel"
                id="contact.landline"
                name="contact.landline"
                value={formData.contact.landline}
                onChange={handleInputChange}
                className="form-input"
                placeholder="Enter landline number"
              />
            </div>
          </div>
        </div>

        {/* Legal & Compliance Information */}
        <div className="form-section">
          <h2 className="section-title">Legal & Compliance Information</h2>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="compliance.gstNumber" className="form-label">
                GST Number <span className="required">*</span>
              </label>
              <input
                type="text"
                id="compliance.gstNumber"
                name="compliance.gstNumber"
                value={formData.compliance.gstNumber}
                onChange={handleInputChange}
                className="form-input"
                placeholder="Enter GST number"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="compliance.stateCode" className="form-label">
                State Code <span className="required">*</span>
              </label>
              <input
                type="text"
                id="compliance.stateCode"
                name="compliance.stateCode"
                value={formData.compliance.stateCode}
                onChange={handleInputChange}
                className="form-input"
                placeholder="Enter state code for GST"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="compliance.dlNumber" className="form-label">
                Drug License Number <span className="required">*</span>
              </label>
              <input
                type="text"
                id="compliance.dlNumber"
                name="compliance.dlNumber"
                value={formData.compliance.dlNumber}
                onChange={handleInputChange}
                className="form-input"
                placeholder="Enter drug license number"
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="compliance.panNumber" className="form-label">
                PAN Number
              </label>
              <input
                type="text"
                id="compliance.panNumber"
                name="compliance.panNumber"
                value={formData.compliance.panNumber}
                onChange={handleInputChange}
                className="form-input"
                placeholder="Enter PAN number"
              />
            </div>

            <div className="form-group">
              <label htmlFor="compliance.cinNumber" className="form-label">
                CIN Number
              </label>
              <input
                type="text"
                id="compliance.cinNumber"
                name="compliance.cinNumber"
                value={formData.compliance.cinNumber}
                onChange={handleInputChange}
                className="form-input"
                placeholder="Enter CIN number"
              />
            </div>
          </div>
        </div>

        <div className="form-actions">
          <button
            type="submit"
            className="btn-primary"
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save Company Details'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CompanyDetails;
