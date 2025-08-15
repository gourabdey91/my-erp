import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { hospitalAPI } from './services/hospitalAPI';
import CreditNotes from './components/CreditNotes';
import DoctorAssignments from './components/DoctorAssignments';
import ExpenseTypeAssignments from './components/ExpenseTypeAssignments';
import MaterialAssignments from './components/MaterialAssignments';
import './Hospitals.css';
import '../../shared/styles/unified-design.css';
import MobileCard from '../../shared/components/MobileCard';
import { scrollToTop } from '../../shared/utils/scrollUtils';

const Hospitals = () => {
  const { currentUser } = useAuth();
  
  const [hospitals, setHospitals] = useState([]);
  const [surgicalCategories, setSurgicalCategories] = useState([]);
  const [businessUnits, setBusinessUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Form states
  const [showForm, setShowForm] = useState(false);
  const [editingHospital, setEditingHospital] = useState(null);
  const [showCreditNotes, setShowCreditNotes] = useState(false);
  const [showDoctorAssignments, setShowDoctorAssignments] = useState(false);
  const [showExpenseTypeAssignments, setShowExpenseTypeAssignments] = useState(false);
  const [showMaterialAssignments, setShowMaterialAssignments] = useState(false);
  const [selectedHospital, setSelectedHospital] = useState(null);
  
  const [formData, setFormData] = useState({
    shortName: '',
    legalName: '',
    address: '',
    gstNumber: '',
    stateCode: '',
    surgicalCategories: [],
    paymentTerms: 30,
    defaultPricing: false,
    discountAllowed: false,
    customerIsHospital: true,
    businessUnit: '',
    useAllMaterial: false
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
    fetchBusinessUnits();
  }, []);

  // Fetch business units
  const fetchBusinessUnits = async () => {
    try {
      const response = await hospitalAPI.getBusinessUnits();
      setBusinessUnits(response || []);
    } catch (err) {
      console.error('Error fetching business units:', err);
      setBusinessUnits([]);
    }
  };

  // Auto-dismiss success messages
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(''), 5000);
      return () => clearTimeout(timer);
    }
  }, [success]);

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
      defaultPricing: false,
      discountAllowed: false,
      customerIsHospital: true,
      businessUnit: '',
      useAllMaterial: false
    });
    setEditingHospital(null);
    setShowForm(false);
    setError('');
    setSuccess('');
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
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
        paymentTerms: formData.paymentTerms,
        defaultPricing: formData.defaultPricing,
        discountAllowed: formData.discountAllowed,
        customerIsHospital: formData.customerIsHospital,
        surgicalCategories: formData.surgicalCategories,
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
        setSuccess('Customer updated successfully');
      } else {
        console.log('Creating new customer');
        const result = await hospitalAPI.createHospital(hospitalData);
        console.log('Create customer result:', result);
        setSuccess('Customer created successfully');
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
      defaultPricing: hospital.defaultPricing || false,
      discountAllowed: hospital.discountAllowed || false,
      customerIsHospital: hospital.customerIsHospital !== false,
      businessUnit: hospital.businessUnit._id || hospital.businessUnit,
      useAllMaterial: hospital.useAllMaterial || false
    });
    setEditingHospital(hospital);
    setShowForm(true);
    setError('');
    setSuccess('');
    
    // Scroll to top
    scrollToTop();
  };

  const handleDelete = async (hospital) => {
    if (!currentUser || !currentUser._id) {
      setError('User authentication required. Please log in again.');
      return;
    }

    if (window.confirm(`Are you sure you want to delete ${hospital.shortName}?`)) {
      try {
        await hospitalAPI.deleteHospital(hospital._id, currentUser._id);
        setSuccess('Customer deleted successfully');
        await fetchAllHospitals();
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to delete customer');
        console.error('Error deleting customer:', err);
      }
    }
  };

  const handleCreditNotes = (hospital) => {
    setSelectedHospital(hospital);
    setShowCreditNotes(true);
  };

  const handleCloseCreditNotes = () => {
    setShowCreditNotes(false);
    setSelectedHospital(null);
  };

  const handleDoctorAssignments = (hospital) => {
    setSelectedHospital(hospital);
    setShowDoctorAssignments(true);
  };

  const handleCloseDoctorAssignments = () => {
    setShowDoctorAssignments(false);
    setSelectedHospital(null);
  };

  const handleExpenseTypeAssignments = (hospital) => {
    setSelectedHospital(hospital);
    setShowExpenseTypeAssignments(true);
  };

  const handleCloseExpenseTypeAssignments = () => {
    setShowExpenseTypeAssignments(false);
    setSelectedHospital(null);
  };

  const handleMaterialAssignments = (hospital) => {
    setSelectedHospital(hospital);
    setShowMaterialAssignments(true);
  };

  const handleCloseMaterialAssignments = () => {
    setShowMaterialAssignments(false);
    setSelectedHospital(null);
  };

  const handleMaterialAssignmentUpdate = (updatedHospital) => {
    // Update the hospital in the list
    setHospitals(prevHospitals => 
      prevHospitals.map(h => 
        h._id === updatedHospital._id ? updatedHospital : h
      )
    );
    setSelectedHospital(updatedHospital);
  };

  if (loading) {
    return <div className="loading-state">⏳ Loading hospitals...</div>;
  }

  if (!currentUser) {
    return <div className="loading">Please log in to access Customer Details.</div>;
  }

  return (
    <div className="unified-container">
      {/* Header */}
      <div className="unified-header">
        <div className="unified-header-content">
          <div className="unified-header-text">
            <h1>Customer Details</h1>
            <p>Manage customer information including hospitals, addresses, GST details, and business relationships. Configure surgical categories and business settings for each customer.</p>
          </div>
          <button 
            className="unified-btn unified-btn-primary"
            onClick={() => {
              resetForm();
              setShowForm(true);
              scrollToTop();
            }}
            disabled={loading}
          >
            Add Customer
          </button>
        </div>
      </div>

      {/* Status Messages */}
      {error && (
        <div className="unified-content">
          <div style={{ padding: '1rem', background: '#fee', border: '1px solid #fcc', borderRadius: '8px', color: '#c33', marginBottom: '1rem' }}>
            {error}
          </div>
        </div>
      )}
      {success && (
        <div className="unified-content">
          <div style={{ padding: '1rem', background: '#efe', border: '1px solid #cfc', borderRadius: '8px', color: '#363', marginBottom: '1rem' }}>
            {success}
          </div>
        </div>
      )}

      {/* Form Section */}
      {showForm && (
        <div className="unified-content">
          <div style={{ borderBottom: '2px solid var(--gray-200)', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
            <h2 style={{ margin: 0, color: 'var(--primary-color)', fontSize: '1.5rem', fontWeight: '600' }}>
              {editingHospital ? 'Edit Customer Details' : 'Add New Customer'}
            </h2>
          </div>
          <form onSubmit={handleSubmit}>
            <div className="unified-form-grid">
              <div className="unified-form-field">
                <label className="unified-form-label">
                  Short Name * (2-50 chars)
                </label>
                <input
                  type="text"
                  name="shortName"
                  value={formData.shortName}
                  onChange={handleInputChange}
                  placeholder="Enter short name"
                  required
                  maxLength="50"
                  className="unified-search-input"
                />
              </div>
              
              <div className="unified-form-field">
                <label className="unified-form-label">
                  Legal Name * (2-100 chars)
                </label>
                <input
                  type="text"
                  name="legalName"
                  value={formData.legalName}
                  onChange={handleInputChange}
                  placeholder="Enter legal name"
                  required
                  maxLength="100"
                  className="unified-search-input"
                />
              </div>

              <div className="unified-form-field">
                <label className="unified-form-label">
                  Business Unit *
                </label>
                <select
                  name="businessUnit"
                  value={formData.businessUnit}
                  onChange={handleInputChange}
                  required
                  className="unified-search-input"
                >
                  <option value="">Select Business Unit</option>
                  {businessUnits.map(unit => (
                    <option key={unit._id} value={unit._id}>
                      {unit.name} ({unit.code})
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="unified-form-field">
                <label className="unified-form-label">
                  Address * (Max 200 chars)
                </label>
                <textarea
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  placeholder="Enter complete address"
                  required
                  maxLength="200"
                  rows="3"
                  className="unified-search-input"
                />
              </div>

              <div className="unified-form-field">
                <label className="unified-form-label">
                  GST Number *
                </label>
                <input
                  type="text"
                  name="gstNumber"
                  value={formData.gstNumber}
                  onChange={handleInputChange}
                  placeholder="Enter GST number (15 digits)"
                  required
                  maxLength="15"
                  className="unified-search-input"
                  style={{ textTransform: 'uppercase' }}
                />
              </div>

              <div className="unified-form-field">
                <label className="unified-form-label">
                  State Code *
                </label>
                <input
                  type="text"
                  name="stateCode"
                  value={formData.stateCode}
                  onChange={handleInputChange}
                  placeholder="Enter 2-digit state code"
                  required
                  maxLength="2"
                  className="unified-search-input"
                />
              </div>

              <div className="unified-form-field">
                <label className="unified-form-label">
                  Payment Terms (Days) *
                </label>
                <input
                  type="number"
                  name="paymentTerms"
                  value={formData.paymentTerms}
                  onChange={handleInputChange}
                  placeholder="Enter payment terms in days"
                  required
                  min="1"
                  max="365"
                  className="unified-search-input"
                />
              </div>
            </div>

            <div className="unified-checkbox-container">
              <label className="unified-checkbox-label">
                <input
                  type="checkbox"
                  name="defaultPricing"
                  checked={formData.defaultPricing}
                  onChange={handleInputChange}
                  className="unified-checkbox"
                />
                Default Pricing
              </label>
              <div className="unified-help-text">
                Apply default pricing structure for this customer
              </div>
            </div>

            <div className="unified-checkbox-container">
              <label className="unified-checkbox-label">
                <input
                  type="checkbox"
                  name="discountAllowed"
                  checked={formData.discountAllowed}
                  onChange={handleInputChange}
                  className="unified-checkbox"
                />
                Discount Allowed
              </label>
              <div className="unified-help-text">
                Allow discounts to be applied for this customer
              </div>
            </div>

            <div className="unified-checkbox-container">
              <label className="unified-checkbox-label">
                <input
                  type="checkbox"
                  name="customerIsHospital"
                  checked={formData.customerIsHospital}
                  onChange={handleInputChange}
                  className="unified-checkbox"
                />
                Customer is Hospital
              </label>
              <div className="unified-help-text">
                Indicates that this customer is a hospital entity
              </div>
            </div>

            <div className="unified-checkbox-container">
              <label className="unified-checkbox-label">
                <input
                  type="checkbox"
                  name="useAllMaterial"
                  checked={formData.useAllMaterial}
                  onChange={handleInputChange}
                  className="unified-checkbox"
                />
                Use All Material
              </label>
              <div className="unified-help-text">
                Allow access to all materials regardless of surgical categories
              </div>
            </div>

            <div className="unified-form-field" style={{ marginBottom: '2rem' }}>
              <label className="unified-form-label">
                Surgical Categories *
              </label>
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
                gap: '0.75rem',
                background: '#f8f9fa',
                border: '1px solid #ced4da',
                borderRadius: '6px',
                padding: '1rem',
                marginTop: '0.75rem'
              }}>
                {surgicalCategories.map(category => (
                  <label key={category._id} className="unified-checkbox-label">
                    <input
                      type="checkbox"
                      checked={formData.surgicalCategories.includes(category._id)}
                      onChange={() => handleCategoryChange(category._id)}
                      className="unified-checkbox"
                    />
                    {category.description}
                  </label>
                ))}
              </div>
              {surgicalCategories.length === 0 && (
                <div className="unified-help-text" style={{ color: '#dc3545', marginTop: '0.5rem' }}>
                  No surgical categories available. Please create categories first.
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '1rem' }}>
              <button type="submit" className="unified-btn unified-btn-primary" disabled={loading}>
                {loading ? 'Saving...' : (editingHospital ? 'Update Customer' : 'Add Customer')}
              </button>
              <button
                type="button"
                className="unified-btn unified-btn-secondary"
                onClick={() => {
                  resetForm();
                  setShowForm(false);
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Content Section */}
      <div className="unified-content">
        {hospitals.length === 0 ? (
          <div className="unified-empty">
            <h3>No customers found</h3>
            <p>Create your first customer to get started.</p>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="unified-table-responsive">
              <table className="unified-table">
                <thead>
                  <tr>
                    <th>Short Name</th>
                    <th>Legal Name</th>
                    <th>Business Unit</th>
                    <th>GST Number</th>
                    <th>State</th>
                    <th>Payment Terms</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {hospitals.map((hospital) => (
                    <tr key={hospital._id}>
                      <td style={{ fontWeight: '600', color: 'var(--primary-color)' }}>
                        {hospital.shortName}
                        <div style={{ fontSize: '0.75rem', color: '#6c757d' }}>
                          ID: {hospital.hospitalId}
                        </div>
                      </td>
                      <td>{hospital.legalName}</td>
                      <td>{hospital.businessUnit?.name || 'N/A'}</td>
                      <td style={{ fontFamily: 'monospace', fontSize: '0.9rem' }}>
                        {hospital.gstNumber}
                      </td>
                      <td>{hospital.stateCode}</td>
                      <td>{hospital.paymentTerms} days</td>
                      <td>
                        <span style={{ 
                          padding: '0.25rem 0.5rem', 
                          borderRadius: '1rem', 
                          fontSize: '0.75rem',
                          background: hospital.customerIsHospital ? '#d4edda' : '#fff3cd',
                          color: hospital.customerIsHospital ? '#155724' : '#856404'
                        }}>
                          {hospital.customerIsHospital ? 'Hospital' : 'Customer'}
                        </span>
                      </td>
                      <td>
                        <div className="unified-table-actions">
                          <button
                            className="unified-table-action edit"
                            onClick={() => handleEdit(hospital)}
                            title="Edit Customer"
                            disabled={loading}
                          >
                            ✏️
                          </button>
                          <button
                            className="unified-table-action view"
                            onClick={() => handleCreditNotes(hospital)}
                            title="Credit Notes"
                            disabled={loading}
                          >
                            💳
                          </button>
                          <button
                            className="unified-table-action view"
                            onClick={() => handleDoctorAssignments(hospital)}
                            title="Doctor Assignments"
                            disabled={loading}
                          >
                            👨‍⚕️
                          </button>
                          <button
                            className="unified-table-action view"
                            onClick={() => handleExpenseTypeAssignments(hospital)}
                            title="Expense Assignments"
                            disabled={loading}
                          >
                            💰
                          </button>
                          <button
                            className="unified-table-action view"
                            onClick={() => handleMaterialAssignments(hospital)}
                            title="Material Assignments"
                            disabled={loading}
                          >
                            📦
                          </button>
                          <button
                            className="unified-table-action delete"
                            onClick={() => handleDelete(hospital)}
                            title="Delete Customer"
                            disabled={loading}
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

            {/* Mobile Cards */}
            <div className="unified-mobile-cards">
              {hospitals.map((hospital) => (
                <MobileCard
                  key={hospital._id}
                  id={hospital._id}
                  title={hospital.shortName}
                  subtitle={hospital.legalName}
                  badge={{
                    text: hospital.customerIsHospital ? 'Hospital' : 'Customer',
                    type: hospital.customerIsHospital ? 'success' : 'warning'
                  }}
                  fields={[
                    { label: 'Business Unit', value: hospital.businessUnit?.name || 'N/A' },
                    { label: 'GST Number', value: hospital.gstNumber },
                    { label: 'State Code', value: hospital.stateCode },
                    { label: 'Payment Terms', value: `${hospital.paymentTerms} days` }
                  ]}
                  sections={[
                    {
                      title: 'Address',
                      items: [
                        { label: 'Address', value: hospital.address }
                      ]
                    },
                    {
                      title: 'Surgical Categories',
                      items: [
                        { 
                          label: 'Categories', 
                          value: hospital.surgicalCategories.length > 0 
                            ? hospital.surgicalCategories.map(cat => cat.description).join(', ')
                            : 'None assigned'
                        }
                      ]
                    },
                    {
                      title: 'Settings',
                      items: [
                        { label: 'Default Pricing', value: hospital.defaultPricing ? 'Yes' : 'No' },
                        { label: 'Discount Allowed', value: hospital.discountAllowed ? 'Yes' : 'No' }
                      ]
                    }
                  ]}
                  actions={[
                    {
                      label: 'Edit',
                      onClick: () => handleEdit(hospital),
                      variant: 'primary',
                      disabled: loading
                    },
                    {
                      label: 'Credit Notes',
                      onClick: () => handleCreditNotes(hospital),
                      variant: 'secondary',
                      disabled: loading
                    },
                    {
                      label: 'Doctors',
                      onClick: () => handleDoctorAssignments(hospital),
                      variant: 'secondary',
                      disabled: loading
                    },
                    {
                      label: 'Expenses',
                      onClick: () => handleExpenseTypeAssignments(hospital),
                      variant: 'secondary',
                      disabled: loading
                    },
                    {
                      label: 'Materials',
                      onClick: () => handleMaterialAssignments(hospital),
                      variant: 'secondary',
                      disabled: loading
                    },
                    {
                      label: 'Delete',
                      onClick: () => handleDelete(hospital),
                      variant: 'danger',
                      disabled: loading
                    }
                  ]}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Credit Notes Modal */}
      {showCreditNotes && selectedHospital && (
        <CreditNotes
          hospital={selectedHospital}
          currentUser={currentUser}
          onClose={handleCloseCreditNotes}
        />
      )}

      {/* Doctor Assignments Modal */}
      {showDoctorAssignments && selectedHospital && (
        <DoctorAssignments
          hospital={selectedHospital}
          currentUser={currentUser}
          onClose={handleCloseDoctorAssignments}
        />
      )}

      {/* Expense Type Assignments Modal */}
      {showExpenseTypeAssignments && selectedHospital && (
        <ExpenseTypeAssignments
          hospital={selectedHospital}
          currentUser={currentUser}
          onClose={handleCloseExpenseTypeAssignments}
        />
      )}

      {/* Material Assignments Modal */}
      {showMaterialAssignments && selectedHospital && (
        <MaterialAssignments
          hospital={selectedHospital}
          isOpen={showMaterialAssignments}
          onClose={handleCloseMaterialAssignments}
          onUpdate={handleMaterialAssignmentUpdate}
        />
      )}
    </div>
  );
};

export default Hospitals;
