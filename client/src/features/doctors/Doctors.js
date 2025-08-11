import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { doctorAPI } from './services/doctorAPI';
import { useAuth } from '../../contexts/AuthContext';
import './Doctors.css';
import '../../shared/styles/unified-design.css';
import MobileCard from '../../shared/components/MobileCard';
import { scrollToTop } from '../../shared/utils/scrollUtils';

const Doctors = () => {
  const [doctors, setDoctors] = useState([]);
  const [categories, setCategories] = useState([]);
  const [hospitals, setHospitals] = useState([]);
  const [consultingDoctors, setConsultingDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingDoctor, setEditingDoctor] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    surgicalCategories: [],
    phoneNumber: '',
    email: '',
    consultingDoctor: ''
  });

  // Filter state
  const [filters, setFilters] = useState({
    doctorName: '',
    surgicalCategoryId: '',
    hospitalId: ''
  });

  const { currentUser } = useAuth();

  const fetchDoctors = useCallback(async (hospitalFilter = '') => {
    try {
      setLoading(true);
      const response = hospitalFilter && hospitalFilter !== 'all' 
        ? await doctorAPI.getByHospital(hospitalFilter)
        : await doctorAPI.getAll();
      setDoctors(response);
      setError('');
    } catch (err) {
      console.error('Error fetching doctors:', err);
      setError('Failed to fetch doctors');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchCategories = useCallback(async () => {
    try {
      const response = await doctorAPI.getCategories();
      setCategories(response);
    } catch (err) {
      console.error('Error fetching categories:', err);
      setError('Failed to fetch surgical categories');
    }
  }, []);

  const fetchHospitals = useCallback(async () => {
    try {
      const response = await doctorAPI.getHospitals();
      setHospitals(response);
    } catch (err) {
      console.error('Error fetching hospitals:', err);
      setError('Failed to fetch hospitals');
    }
  }, []);

  const fetchConsultingDoctors = useCallback(async () => {
    try {
      const response = await doctorAPI.getDropdownDoctors();
      setConsultingDoctors(response);
    } catch (err) {
      console.error('Error fetching consulting doctors:', err);
    }
  }, []);

  useEffect(() => {
    fetchDoctors();
    fetchCategories();
    fetchHospitals();
    fetchConsultingDoctors();
  }, [fetchDoctors, fetchCategories, fetchHospitals, fetchConsultingDoctors]);

  // Filtered doctors
  const filteredDoctors = useMemo(() => {
    return doctors.filter(doctor => {
      const matchesName = !filters.doctorName || 
        doctor.name.toLowerCase().includes(filters.doctorName.toLowerCase());
      
      const matchesSurgicalCategory = !filters.surgicalCategoryId ||
        doctor.surgicalCategories.some(cat => cat._id === filters.surgicalCategoryId);
      
      const matchesHospital = !filters.hospitalId ||
        (doctor.assignedHospitals && doctor.assignedHospitals.some(hospital => 
          hospital._id === filters.hospitalId
        ));
      
      return matchesName && matchesSurgicalCategory && matchesHospital;
    });
  }, [doctors, filters]);

  const handleFilterChange = (filterName, value) => {
    setFilters(prev => ({
      ...prev,
      [filterName]: value
    }));
    
    // If hospital filter changes, refresh doctors data
    if (filterName === 'hospitalId') {
      fetchDoctors(value);
    }
  };

  const resetFilters = () => {
    setFilters({
      doctorName: '',
      surgicalCategoryId: '',
      hospitalId: ''
    });
    fetchDoctors(); // Reset to all doctors
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      setError('Doctor name is required');
      return;
    }

    if (formData.name.length < 2 || formData.name.length > 50) {
      setError('Name must be between 2 and 50 characters');
      return;
    }

    if (!formData.surgicalCategories || formData.surgicalCategories.length === 0) {
      setError('At least one surgical category must be selected');
      return;
    }

    // Validate phone number only if provided
    if (formData.phoneNumber && formData.phoneNumber.trim() && !/^\+?[\d\s\-()]{10,15}$/.test(formData.phoneNumber)) {
      setError('Please enter a valid phone number');
      return;
    }

    // Validate email only if provided
    if (formData.email && formData.email.trim() && !/^[\w.-]+@[\w.-]+\.\w+$/.test(formData.email)) {
      setError('Please enter a valid email address');
      return;
    }

    try {
      setLoading(true);
      const doctorData = {
        name: formData.name.trim(),
        surgicalCategories: formData.surgicalCategories,
        createdBy: currentUser._id,
        updatedBy: currentUser._id
      };

      // Only include phoneNumber and email if they have values
      if (formData.phoneNumber && formData.phoneNumber.trim()) {
        doctorData.phoneNumber = formData.phoneNumber.trim();
      }
      
      if (formData.email && formData.email.trim()) {
        doctorData.email = formData.email.trim();
      }

      // Only include consultingDoctor if selected
      if (formData.consultingDoctor) {
        doctorData.consultingDoctor = formData.consultingDoctor;
      }

      if (editingDoctor) {
        await doctorAPI.update(editingDoctor._id, doctorData);
      } else {
        await doctorAPI.create(doctorData);
      }

      setShowForm(false);
      setEditingDoctor(null);
      setFormData({ name: '', surgicalCategories: [], phoneNumber: '', email: '', consultingDoctor: '' });
      setError('');
      await fetchDoctors();
    } catch (err) {
      console.error('Error saving doctor:', err);
      setError(err.message || 'Failed to save doctor');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (doctor) => {
    setEditingDoctor(doctor);
    setFormData({
      name: doctor.name,
      surgicalCategories: doctor.surgicalCategories.map(cat => cat._id),
      phoneNumber: doctor.phoneNumber || '',
      email: doctor.email || '',
      consultingDoctor: doctor.consultingDoctor?._id || ''
    });
    setShowForm(true);
    setError('');
    
    // Scroll to top
    scrollToTop();
  };

  const handleDelete = async (doctor) => {
    if (window.confirm(`Are you sure you want to delete Dr. ${doctor.name}?`)) {
      try {
        setLoading(true);
        await doctorAPI.delete(doctor._id, currentUser._id);
        await fetchDoctors();
        setError('');
      } catch (err) {
        console.error('Error deleting doctor:', err);
        setError('Failed to delete doctor');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleCategoryChange = (categoryId, isChecked) => {
    if (isChecked) {
      setFormData(prev => ({
        ...prev,
        surgicalCategories: [...prev.surgicalCategories, categoryId]
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        surgicalCategories: prev.surgicalCategories.filter(id => id !== categoryId)
      }));
    }
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingDoctor(null);
    setFormData({ name: '', surgicalCategories: [], phoneNumber: '', email: '', consultingDoctor: '' });
    setError('');
  };

  if (loading && doctors.length === 0) {
    return <div className="loading-state">⏳ Loading doctors...</div>;
  }

  return (
    <div className="unified-container">
      {/* Header */}
      <div className="unified-header">
        <div className="unified-header-content">
          <div className="unified-header-text">
            <h1>Doctor Details</h1>
            <p>Manage doctor profiles, surgical categories, and contact information. Assign doctors to specific surgical categories and maintain their professional details.</p>
          </div>
          <button 
            className="unified-btn unified-btn-primary"
            onClick={() => {
              setShowForm(true);
              scrollToTop();
            }}
            disabled={loading}
          >
            Add Doctor
          </button>
        </div>
      </div>

      {error && (
        <div className="unified-content">
          <div style={{ padding: '1rem', background: '#fee', border: '1px solid #fcc', borderRadius: '8px', color: '#c33' }}>
            {error}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="unified-filters">
        <div className="unified-filters-row">
          <div className="unified-filter-group">
            <label>Doctor Name</label>
            <input
              type="text"
              placeholder="Search by doctor name..."
              value={filters.doctorName}
              onChange={(e) => handleFilterChange('doctorName', e.target.value)}
              className="unified-search-input"
            />
          </div>
          
          <div className="unified-filter-group">
            <label>Hospital</label>
            <select
              value={filters.hospitalId}
              onChange={(e) => handleFilterChange('hospitalId', e.target.value)}
              className="unified-filter-select"
            >
              <option value="">All Hospitals</option>
              {hospitals.map(hospital => (
                <option key={hospital._id} value={hospital._id}>
                  {hospital.shortName || hospital.legalName} ({hospital.hospitalId})
                </option>
              ))}
            </select>
          </div>
          
          <div className="unified-filter-group">
            <label>Surgical Category</label>
            <select
              value={filters.surgicalCategoryId}
              onChange={(e) => handleFilterChange('surgicalCategoryId', e.target.value)}
              className="unified-filter-select"
            >
              <option value="">All Categories</option>
              {categories.map(category => (
                <option key={category._id} value={category._id}>
                  {category.code} - {category.description}
                </option>
              ))}
            </select>
          </div>
          
          <div className="unified-filter-group">
            <button
              type="button"
              className="unified-btn unified-btn-secondary"
              onClick={resetFilters}
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <div className="unified-content">
          <div style={{ borderBottom: '2px solid var(--gray-200)', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
            <h2 style={{ margin: 0, color: 'var(--primary-color)', fontSize: '1.5rem', fontWeight: '600' }}>
              {editingDoctor ? 'Edit Doctor' : 'Add New Doctor'}
            </h2>
          </div>
          <form onSubmit={handleSubmit}>
            <div className="unified-form-grid">
              <div className="unified-form-field">
                <label className="unified-form-label">Doctor Name * (2-50 chars)</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  required
                  maxLength="50"
                  placeholder="Enter doctor's full name"
                  className="unified-search-input"
                />
              </div>

              <div className="unified-form-field">
                <label className="unified-form-label">
                  Email Address <span style={{ color: 'var(--gray-500)', fontWeight: '400' }}>(Optional)</span>
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="doctor@example.com"
                  className="unified-search-input"
                />
              </div>

              <div className="unified-form-field">
                <label className="unified-form-label">
                  Phone Number <span style={{ color: 'var(--gray-500)', fontWeight: '400' }}>(Optional)</span>
                </label>
                <input
                  type="tel"
                  value={formData.phoneNumber}
                  onChange={(e) => setFormData(prev => ({ ...prev, phoneNumber: e.target.value }))}
                  placeholder="+1 (555) 123-4567"
                  className="unified-search-input"
                />
              </div>

              <div className="unified-form-field">
                <label className="unified-form-label">
                  Consulting Doctor <span style={{ color: 'var(--gray-500)', fontWeight: '400' }}>(Optional)</span>
                </label>
                <select
                  value={formData.consultingDoctor}
                  onChange={(e) => setFormData(prev => ({ ...prev, consultingDoctor: e.target.value }))}
                  className="unified-search-input"
                >
                  <option value="">Select Consulting Doctor</option>
                  {consultingDoctors.map(doctor => (
                    <option key={doctor._id} value={doctor._id}>
                      {doctor.name} {doctor.email && `(${doctor.email})`}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ marginBottom: '2rem' }}>
              <label className="unified-form-label">Surgical Categories * (Select at least one)</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '0.5rem', marginTop: '0.5rem' }}>
                {categories.map(category => (
                  <label key={category._id} className="unified-checkbox-label">
                    <input
                      type="checkbox"
                      checked={formData.surgicalCategories.includes(category._id)}
                      onChange={(e) => handleCategoryChange(category._id, e.target.checked)}
                      className="unified-checkbox"
                    />
                    {category.description} ({category.code})
                  </label>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem' }}>
              <button type="submit" className="unified-btn unified-btn-primary" disabled={loading}>
                {loading ? 'Saving...' : (editingDoctor ? 'Update Doctor' : 'Add Doctor')}
              </button>
              <button type="button" className="unified-btn unified-btn-secondary" onClick={resetForm}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Content */}
      <div className="unified-content">
        {filteredDoctors.length === 0 ? (
          <div className="unified-empty">
            <h3>No doctors found</h3>
            <p>
              {doctors.length === 0 
                ? "Create your first doctor profile to get started." 
                : "Try adjusting your search criteria."}
            </p>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="unified-table-responsive">
              <table className="unified-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Assigned Hospitals</th>
                    <th>Surgical Categories</th>
                    <th>Contact</th>
                    <th>Consulting Doctor</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDoctors.map(doctor => (
                    <tr key={doctor._id}>
                      <td>
                        <span className="name-text">Dr. {doctor.name}</span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                          {doctor.assignedHospitals && doctor.assignedHospitals.length > 0 ? (
                            doctor.assignedHospitals.map(hospital => (
                              <span key={hospital._id} style={{ 
                                padding: '0.125rem 0.5rem', 
                                borderRadius: '1rem', 
                                fontSize: '0.75rem',
                                background: 'var(--primary-light)',
                                color: 'var(--primary-color)',
                                fontWeight: '500'
                              }}>
                                {hospital.shortName || hospital.legalName} ({hospital.hospitalId})
                              </span>
                            ))
                          ) : (
                            <span style={{ color: 'var(--gray-500)', fontStyle: 'italic' }}>
                              No hospital assignments
                            </span>
                          )}
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                          {doctor.surgicalCategories.map(cat => (
                            <span key={cat._id} style={{ 
                              padding: '0.125rem 0.5rem', 
                              borderRadius: '1rem', 
                              fontSize: '0.75rem',
                              background: 'var(--gray-100)',
                              color: 'var(--gray-700)',
                              fontWeight: '500'
                            }}>
                              {cat.code}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td>
                        <div>
                          {doctor.phoneNumber && <div>📱 {doctor.phoneNumber}</div>}
                          {doctor.email && <div>✉️ {doctor.email}</div>}
                          {!doctor.phoneNumber && !doctor.email && <span style={{ color: 'var(--gray-500)' }}>No contact info</span>}
                        </div>
                      </td>
                      <td>
                        {doctor.consultingDoctor ? doctor.consultingDoctor.name : '-'}
                      </td>
                      <td>
                        <div className="unified-table-actions">
                          <button
                            className="unified-table-action edit"
                            onClick={() => handleEdit(doctor)}
                            title="Edit Doctor"
                            disabled={loading}
                          >
                            ✏️
                          </button>
                          <button
                            className="unified-table-action delete"
                            onClick={() => handleDelete(doctor)}
                            title="Delete Doctor"
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
              {filteredDoctors.map(doctor => (
                <MobileCard
                  key={doctor._id}
                  id={doctor._id}
                  title={`Dr. ${doctor.name}`}
                  badge={doctor.doctorId}
                  fields={[
                    { label: 'Phone', value: doctor.phoneNumber || 'Not provided' },
                    { label: 'Email', value: doctor.email || 'Not provided' },
                    { label: 'Consulting Doctor', value: doctor.consultingDoctor?.name || 'None assigned' }
                  ]}
                  sections={[
                    {
                      title: 'Assigned Hospitals',
                      items: doctor.assignedHospitals && doctor.assignedHospitals.length > 0
                        ? doctor.assignedHospitals.map(hospital => ({
                            label: hospital.hospitalId,
                            value: hospital.shortName || hospital.legalName
                          }))
                        : [{ label: 'No assignments', value: 'Not assigned to any hospital' }]
                    },
                    {
                      title: 'Surgical Categories',
                      items: doctor.surgicalCategories.map(cat => ({
                        label: cat.code,
                        value: cat.description
                      }))
                    }
                  ]}
                  actions={[
                    {
                      label: 'Edit',
                      icon: '✏️',
                      onClick: () => handleEdit(doctor)
                    },
                    {
                      label: 'Delete',
                      icon: '🗑️',
                      variant: 'danger',
                      onClick: () => handleDelete(doctor)
                    }
                  ]}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Doctors;
