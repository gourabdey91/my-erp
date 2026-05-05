import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useBusinessUnit } from '../../contexts/BusinessUnitContext';
import { companyDetailsAPI } from './services/companyDetailsAPI';
import '../../shared/styles/unified-design.css';
import './CompanyDetails.css';

const CompanyDetails = () => {
  const [formData, setFormData] = useState({
    companyCode: '',
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
  const [companies, setCompanies] = useState([]);
  const [selectedCompanyCode, setSelectedCompanyCode] = useState('');
  const [isNewCompany, setIsNewCompany] = useState(false);

  const { currentUser } = useAuth();
  const { currentBusinessUnit } = useBusinessUnit();

  useEffect(() => {
    fetchAllCompanies();
  }, []);

  const fetchAllCompanies = async () => {
    try {
      setLoading(true);
      const response = await companyDetailsAPI.getAll();
      if (response.success) {
        setCompanies(response.data);
        // If companies exist, select the first one
        if (response.data.length > 0) {
          selectCompany(response.data[0]);
        } else {
          setIsNewCompany(true);
        }
      }
    } catch (err) {
      console.error('Error fetching companies:', err);
      setIsNewCompany(true);
    } finally {
      setLoading(false);
    }
  };

  const selectCompany = (company) => {
    setFormData(company);
    setCompanyId(company._id);
    setSelectedCompanyCode(company.companyCode);
    setIsNewCompany(false);
    setError('');
    setSuccess('');
  };

  const handleNewCompany = () => {
    setFormData({
      companyCode: '',
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
    setCompanyId(null);
    setSelectedCompanyCode('');
    setIsNewCompany(true);
    setError('');
    setSuccess('');
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

    // Validate business unit is available
    if (!currentBusinessUnit || !currentBusinessUnit._id) {
      setError('Business unit not found. Please select a business unit before saving.');
      setSaving(false);
      return;
    }

    // Validate company code
    if (!formData.companyCode) {
      setError('Company Code is required');
      setSaving(false);
      return;
    }

    try {
      console.log('Submitting company details:', formData);
      console.log('User ID:', currentUser._id);
      console.log('Business Unit ID:', currentBusinessUnit._id);
      
      const dataToSave = {
        ...formData,
        businessUnit: currentBusinessUnit._id,
        ...(companyId ? { updatedBy: currentUser._id } : { createdBy: currentUser._id })
      };

      console.log('Data to save:', dataToSave);

      const response = companyId 
        ? await companyDetailsAPI.update(companyId, dataToSave)
        : await companyDetailsAPI.save(dataToSave);

      if (response.success) {
        setSuccess('Company saved successfully');
        if (!companyId) {
          // New company created, update the list
          setCompanyId(response.data._id);
          setCompanies([...companies, response.data]);
          setIsNewCompany(false);
        } else {
          // Update existing company in list
          const updatedCompanies = companies.map(c => 
            c._id === response.data._id ? response.data : c
          );
          setCompanies(updatedCompanies);
        }
      } else {
        setError(response.message || 'Failed to save company');
      }
    } catch (err) {
      console.error('Error saving company:', err);
      setError(err.message || 'Failed to save company');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!companyId) {
      setError('Cannot delete a new company');
      return;
    }

    const confirmDelete = window.confirm(
      `Are you sure you want to delete company code ${formData.companyCode}? This action cannot be undone.`
    );

    if (!confirmDelete) {
      return;
    }

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const response = await companyDetailsAPI.delete(companyId, currentUser._id);

      if (response.success) {
        setSuccess('Company deleted successfully');
        
        // Remove from list
        const updatedCompanies = companies.filter(c => c._id !== companyId);
        setCompanies(updatedCompanies);
        
        // Reset form to first company or new company mode
        if (updatedCompanies.length > 0) {
          selectCompany(updatedCompanies[0]);
        } else {
          handleNewCompany();
        }
      } else {
        setError(response.message || 'Failed to delete company');
      }
    } catch (err) {
      console.error('Error deleting company:', err);
      setError(err.message || 'Failed to delete company');
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
    <div className="unified-container">
      {/* Header */}
      <div className="unified-header">
        <div className="unified-header-content">
          <div className="unified-header-text">
            <h1>Company Master</h1>
            <p>Manage multiple company codes and their information</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="unified-content">
          <div style={{ padding: '1rem', background: '#fee', border: '1px solid #fcc', borderRadius: '8px', color: '#c33' }}>
            {error}
            <button onClick={() => setError('')} style={{ float: 'right', background: 'none', border: 'none', fontSize: '1.2em', cursor: 'pointer' }}>×</button>
          </div>
        </div>
      )}

      {success && (
        <div className="unified-content">
          <div style={{ padding: '1rem', background: '#efe', border: '1px solid #cfc', borderRadius: '8px', color: '#3c3' }}>
            {success}
            <button onClick={() => setSuccess('')} style={{ float: 'right', background: 'none', border: 'none', fontSize: '1.2em', cursor: 'pointer' }}>×</button>
          </div>
        </div>
      )}

      {/* Company Selection */}
      <div className="unified-content">
        <div style={{ marginBottom: '2rem' }}>
          <h2 style={{ marginBottom: '1rem' }}>Select or Create Company</h2>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            {companies.length > 0 && (
              <select 
                value={selectedCompanyCode}
                onChange={(e) => {
                  const selected = companies.find(c => c.companyCode === e.target.value);
                  if (selected) selectCompany(selected);
                }}
                className="form-input"
                style={{ flex: 1, minWidth: '200px' }}
              >
                <option value="">-- Select a Company --</option>
                {companies.map(company => (
                  <option key={company._id} value={company.companyCode}>
                    {company.companyCode} - {company.companyName}
                  </option>
                ))}
              </select>
            )}
            <button
              type="button"
              onClick={handleNewCompany}
              className="unified-btn unified-btn-secondary"
              style={{ whiteSpace: 'nowrap' }}
            >
              + New Company
            </button>
          </div>
          {isNewCompany && companies.length > 0 && (
            <p style={{ color: '#666', marginTop: '0.5rem', fontSize: '0.9rem' }}>
              Creating a new company...
            </p>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="company-form">
        {/* Basic Company Information */}
        <div className="form-section">
          <h2 className="section-title">Basic Information</h2>
          
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="companyCode" className="form-label">
                Company Code <span className="required">*</span>
              </label>
              <input
                type="text"
                id="companyCode"
                name="companyCode"
                value={formData.companyCode}
                onChange={handleInputChange}
                className="form-input"
                placeholder="Enter unique company code (e.g., CC001)"
                required
                disabled={!isNewCompany && companyId}
                maxLength="20"
              />
              <small style={{ color: '#666', marginTop: '0.25rem' }}>
                {!isNewCompany && companyId ? 'Company code cannot be changed' : 'Unique identifier for this company'}
              </small>
            </div>

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
          </div>

          <div className="form-row">
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
            className="unified-btn unified-btn-primary"
            disabled={saving}
          >
            {saving ? 'Saving...' : isNewCompany ? 'Create Company' : 'Save Changes'}
          </button>
          {!isNewCompany && (
            <>
              <button
                type="button"
                onClick={handleNewCompany}
                className="unified-btn unified-btn-secondary"
              >
                Add New Company
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="unified-btn unified-btn-danger"
                disabled={saving}
                style={{ marginLeft: 'auto' }}
              >
                {saving ? 'Deleting...' : 'Delete Company'}
              </button>
            </>
          )}
        </div>
      </form>
    </div>
  );
};

export default CompanyDetails;
