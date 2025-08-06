import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { hospitalAPI } from './services/hospitalAPI';
import './Hospitals.css';

const Hospitals = () => {
  const { currentUser } = useAuth();
  
  const [hospitals, setHospitals] = useState([]);
  const [surgicalCategories, setSurgicalCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Form states
  const [showForm, setShowForm] = useState(false);
  const [editingHospital, setEditingHospital] = useState(null);
  const [formData, setFormData] = useState({
    shortName: '',
    legalName: '',
    address: '',
    gstNumber: '',
    stateCode: '',
    surgicalCategories: [],
    paymentTerms: 30,
    businessUnit: ''
  });

  const paymentTermsOptions = [
    { value: 15, label: '15 Days' },
    { value: 30, label: '30 Days' },
    { value: 45, label: '45 Days' },
    { value: 60, label: '60 Days' },
    { value: 90, label: '90 Days' }
  ];

  useEffect(() => {
    fetchAllHospitals();
    fetchAllSurgicalCategories();
  }, []);

  const fetchAllHospitals = async () => {
    try {
      setLoading(true);
      const data = await hospitalAPI.getAllHospitals();
      setHospitals(data);
    } catch (err) {
      setError('Failed to fetch hospitals');
      console.error('Error fetching hospitals:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllSurgicalCategories = async () => {
    try {
      console.log('Fetching all surgical categories');
      const data = await hospitalAPI.getAllSurgicalCategories();
      console.log('Surgical categories received:', data);
      setSurgicalCategories(data);
    } catch (err) {
      console.error('Error fetching surgical categories:', err);
      setSurgicalCategories([]);
    }
  };

  const resetForm = () => {
    setFormData({
      shortName: '',
      legalName: '',
      address: '',
      gstNumber: '',
      stateCode: '',
      surgicalCategories: [],
      paymentTerms: 30,
      businessUnit: ''
    });
    setEditingHospital(null);
    setShowForm(false);
    setError('');
    setSuccess('');
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleCategoryChange = (categoryId) => {
    setFormData(prev => ({
      ...prev,
      surgicalCategories: prev.surgicalCategories.includes(categoryId)
        ? prev.surgicalCategories.filter(id => id !== categoryId)
        : [...prev.surgicalCategories, categoryId]
    }));
  };

  const validateForm = () => {
    if (!formData.shortName?.trim()) return 'Short name is required';
    if (!formData.legalName?.trim()) return 'Legal name is required';
    if (!formData.address?.trim()) return 'Address is required';
    if (!formData.gstNumber?.trim()) return 'GST number is required';
    if (!formData.stateCode?.trim()) return 'State code is required';
    if (!formData.businessUnit) return 'Business unit is required';
    if (formData.surgicalCategories.length === 0) return 'At least one surgical category must be selected';
    
    if (formData.shortName.length < 2 || formData.shortName.length > 50) {
      return 'Short name must be between 2 and 50 characters';
    }
    if (formData.legalName.length < 2 || formData.legalName.length > 100) {
      return 'Legal name must be between 2 and 100 characters';
    }
    if (formData.address.length > 200) {
      return 'Address cannot exceed 200 characters';
    }
    
    // Basic GST number validation
    const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}[Z]{1}[0-9A-Z]{1}$/;
    if (!gstRegex.test(formData.gstNumber.toUpperCase())) {
      return 'Please enter a valid GST number';
    }
    
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    console.log('Form submitted with data:', formData);
    console.log('User object:', currentUser);
    
    if (!currentUser || !currentUser._id) {
      setError('User authentication required. Please log in again.');
      return;
    }
    
    const validationError = validateForm();
    if (validationError) {
      console.log('Validation error:', validationError);
      setError(validationError);
      return;
    }

    try {
      setError('');
      setSuccess('');
      
      const hospitalData = {
        ...formData,
        shortName: formData.shortName.trim(),
        legalName: formData.legalName.trim(),
        address: formData.address.trim(),
        gstNumber: formData.gstNumber.toUpperCase().trim(),
        stateCode: formData.stateCode.trim(),
        businessUnit: formData.businessUnit,
        createdBy: currentUser._id,
        updatedBy: currentUser._id
      };

      console.log('Sending hospital data to API:', hospitalData);

      if (editingHospital) {
        console.log('Updating hospital:', editingHospital._id);
        await hospitalAPI.updateHospital(editingHospital._id, {
          ...hospitalData,
          updatedBy: currentUser._id
        });
        setSuccess('Hospital updated successfully');
      } else {
        console.log('Creating new hospital');
        const result = await hospitalAPI.createHospital(hospitalData);
        console.log('Create hospital result:', result);
        setSuccess('Hospital created successfully');
      }
      
      await fetchAllHospitals();
      resetForm();
    } catch (err) {
      console.error('Error saving hospital:', err);
      setError(err.response?.data?.message || err.message || 'An error occurred');
    }
  };

  const handleEdit = (hospital) => {
    setFormData({
      shortName: hospital.shortName,
      legalName: hospital.legalName,
      address: hospital.address,
      gstNumber: hospital.gstNumber,
      stateCode: hospital.stateCode,
      surgicalCategories: hospital.surgicalCategories.map(cat => cat._id),
      paymentTerms: hospital.paymentTerms,
      businessUnit: hospital.businessUnit._id || hospital.businessUnit
    });
    setEditingHospital(hospital);
    setShowForm(true);
    setError('');
    setSuccess('');
  };

  const handleDelete = async (hospital) => {
    if (!currentUser || !currentUser._id) {
      setError('User authentication required. Please log in again.');
      return;
    }

    if (window.confirm(`Are you sure you want to delete ${hospital.shortName}?`)) {
      try {
        await hospitalAPI.deleteHospital(hospital._id, currentUser._id);
        setSuccess('Hospital deleted successfully');
        await fetchAllHospitals();
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to delete hospital');
        console.error('Error deleting hospital:', err);
      }
    }
  };

  if (loading) {
    return <div className="loading">Loading hospitals...</div>;
  }

  if (!currentUser) {
    return <div className="loading">Please log in to access Hospital Details.</div>;
  }

  return (
    <div className="hospitals-container">
      <div className="hospitals-header">
        <h2>Hospital Details</h2>
        <button 
          className="add-button"
          onClick={() => setShowForm(true)}
        >
          + Add Hospital
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      {showForm && (
        <div className="form-overlay">
          <div className="form-container">
            <div className="form-header">
              <h3>{editingHospital ? 'Edit Hospital' : 'Add New Hospital'}</h3>
              <button className="close-button" onClick={resetForm}>×</button>
            </div>
            
            <form onSubmit={handleSubmit} className="hospital-form">
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="shortName">Short Name *</label>
                  <input
                    type="text"
                    id="shortName"
                    name="shortName"
                    value={formData.shortName}
                    onChange={handleInputChange}
                    placeholder="Enter short name"
                    maxLength="50"
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="legalName">Legal Name *</label>
                  <input
                    type="text"
                    id="legalName"
                    name="legalName"
                    value={formData.legalName}
                    onChange={handleInputChange}
                    placeholder="Enter legal name"
                    maxLength="100"
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="address">Address *</label>
                <textarea
                  id="address"
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  placeholder="Enter complete address"
                  maxLength="200"
                  rows="3"
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="gstNumber">GST Number *</label>
                  <input
                    type="text"
                    id="gstNumber"
                    name="gstNumber"
                    value={formData.gstNumber}
                    onChange={handleInputChange}
                    placeholder="Enter GST number"
                    maxLength="15"
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="stateCode">State Code *</label>
                  <input
                    type="text"
                    id="stateCode"
                    name="stateCode"
                    value={formData.stateCode}
                    onChange={handleInputChange}
                    placeholder="Enter state code"
                    maxLength="3"
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="businessUnit">Business Unit *</label>
                  <select
                    id="businessUnit"
                    name="businessUnit"
                    value={formData.businessUnit}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="">Select Business Unit</option>
                    {currentUser?.businessUnits?.map(bu => (
                      <option key={bu._id} value={bu._id}>
                        {bu.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label htmlFor="paymentTerms">Payment Terms *</label>
                  <select
                    id="paymentTerms"
                    name="paymentTerms"
                    value={formData.paymentTerms}
                    onChange={handleInputChange}
                    required
                  >
                    {paymentTermsOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Surgical Categories *</label>
                <div className="debug-info" style={{fontSize: '0.75rem', color: '#666', marginBottom: '0.5rem'}}>
                  Categories loaded: {surgicalCategories.length}
                </div>
                <div className="categories-grid">
                  {surgicalCategories.map(category => (
                    <label key={category._id} className="category-checkbox">
                      <input
                        type="checkbox"
                        checked={formData.surgicalCategories.includes(category._id)}
                        onChange={() => handleCategoryChange(category._id)}
                      />
                      <span>{category.description}</span>
                    </label>
                  ))}
                </div>
                {surgicalCategories.length === 0 && (
                  <p className="no-categories">No surgical categories available. Please create categories first.</p>
                )}
              </div>

              <div className="form-actions">
                <button type="button" onClick={resetForm} className="cancel-button">
                  Cancel
                </button>
                <button type="submit" className="submit-button">
                  {editingHospital ? 'Update Hospital' : 'Create Hospital'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="hospitals-list">
        {hospitals.length === 0 ? (
          <div className="empty-state">
            <p>No hospitals found. Click "Add Hospital" to create your first hospital.</p>
          </div>
        ) : (
          <div className="hospitals-grid">
            {hospitals.map(hospital => (
              <div key={hospital._id} className="hospital-card">
                <div className="hospital-header">
                  <h3>{hospital.shortName}</h3>
                  <span className="hospital-id">ID: {hospital.hospitalId}</span>
                </div>
                <div className="hospital-details">
                  <p><strong>Legal Name:</strong> {hospital.legalName}</p>
                  <p><strong>Business Unit:</strong> {hospital.businessUnit?.name || 'N/A'}</p>
                  <p><strong>Address:</strong> {hospital.address}</p>
                  <p><strong>GST Number:</strong> {hospital.gstNumber}</p>
                  <p><strong>State Code:</strong> {hospital.stateCode}</p>
                  <p><strong>Payment Terms:</strong> {hospital.paymentTerms} days</p>
                  <div className="categories">
                    <strong>Surgical Categories:</strong>
                    <div className="category-tags">
                      {hospital.surgicalCategories.map(category => (
                        <span key={category._id} className="category-tag">
                          {category.description}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="hospital-actions">
                  <button 
                    className="edit-button"
                    onClick={() => handleEdit(hospital)}
                  >
                    Edit
                  </button>
                  <button 
                    className="delete-button"
                    onClick={() => handleDelete(hospital)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Hospitals;
