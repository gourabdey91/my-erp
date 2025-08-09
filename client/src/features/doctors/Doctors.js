import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { doctorAPI } from './services/doctorAPI';
import { useAuth } from '../../contexts/AuthContext';
import './Doctors.css';
import '../../shared/styles/unified-design.css';
import MobileCard from '../../shared/components/MobileCard';
import { useDropdownMenu } from '../../shared/hooks/useDropdownMenu';
import { scrollToTop } from '../../shared/utils/scrollUtils';

const Doctors = () => {
  const [doctors, setDoctors] = useState([]);
  const [categories, setCategories] = useState([]);
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
    surgicalCategoryId: ''
  });
  const [showFilters, setShowFilters] = useState(false);

  // Dropdown menu hook
  const { openMenuId, toggleMenu, closeMenu } = useDropdownMenu();

  const { currentUser } = useAuth();

  const fetchDoctors = useCallback(async () => {
    try {
      setLoading(true);
      const response = await doctorAPI.getAll();
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
    fetchConsultingDoctors();
  }, [fetchDoctors, fetchCategories, fetchConsultingDoctors]);

  // Filtered doctors
  const filteredDoctors = useMemo(() => {
    return doctors.filter(doctor => {
      const matchesName = !filters.doctorName || 
        doctor.name.toLowerCase().includes(filters.doctorName.toLowerCase());
      
      const matchesSurgicalCategory = !filters.surgicalCategoryId ||
        doctor.surgicalCategories.some(cat => cat._id === filters.surgicalCategoryId);
      
      return matchesName && matchesSurgicalCategory;
    });
  }, [doctors, filters]);

  const handleFilterChange = (filterName, value) => {
    setFilters(prev => ({
      ...prev,
      [filterName]: value
    }));
  };

  const resetFilters = () => {
    setFilters({
      doctorName: '',
      surgicalCategoryId: ''
    });
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
    closeMenu();
    
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
    closeMenu();
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

  const getCategoryNames = (doctorCategories) => {
    return doctorCategories.map(cat => cat.description).join(', ');
  };

  if (loading && doctors.length === 0) {
    return <div className="loading-state">⏳ Loading doctors...</div>;
  }

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div className="page-title-section">
          <h1 className="page-title">👨‍⚕️ Doctor Details</h1>
          <p className="page-description">Manage doctor profiles and surgical categories</p>
        </div>
        <div className="page-actions">
          <button 
            className="btn-primary"
            onClick={() => {
              setShowForm(true);
              scrollToTop();
            }}
            disabled={loading}
          >
            {showForm ? '✖ Cancel' : '➕ Add Doctor'}
          </button>
        </div>
      </div>

      {error && <div className="alert-error">{error}</div>}

      {/* Filters */}
      <div className="filters-section">
        <div className="filters-header" onClick={() => setShowFilters(!showFilters)}>
          <h3>🔍 Filters</h3>
          <span className={`filter-toggle ${showFilters ? 'open' : ''}`}>▼</span>
        </div>
        {showFilters && (
          <div className="filters-content">
            <div className="filters-grid">
              <div className="filter-group">
                <label>Doctor Name</label>
                <input
                  type="text"
                  placeholder="Search by doctor name..."
                  value={filters.doctorName}
                  onChange={(e) => handleFilterChange('doctorName', e.target.value)}
                />
              </div>
              
              <div className="filter-group">
                <label>Surgical Category</label>
                <select
                  value={filters.surgicalCategoryId}
                  onChange={(e) => handleFilterChange('surgicalCategoryId', e.target.value)}
                >
                  <option value="">All Categories</option>
                  {categories.map(category => (
                    <option key={category._id} value={category._id}>
                      {category.code} - {category.description}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            
            <div className="filters-actions">
              <button className="btn-secondary" onClick={resetFilters}>
                🔄 Reset Filters
              </button>
              <span className="filter-results">
                {filteredDoctors.length} of {doctors.length} doctors
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Form */}
      {showForm && (
        <div className="form-section">
          <div className="section-header">
            <h2>✏️ {editingDoctor ? 'Edit Doctor' : 'Add New Doctor'}</h2>
          </div>
          <form onSubmit={handleSubmit} className="form-container">
            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="name">Doctor Name * (2-50 chars)</label>
                <input
                  type="text"
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  required
                  maxLength="50"
                  placeholder="Enter doctor's full name"
                />
              </div>

              <div className="form-group">
                <label htmlFor="email">Email Address <span className="optional-field">(Optional)</span></label>
                <input
                  type="email"
                  id="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="doctor@example.com"
                />
              </div>

              <div className="form-group">
                <label htmlFor="phoneNumber">Phone Number <span className="optional-field">(Optional)</span></label>
                <input
                  type="tel"
                  id="phoneNumber"
                  value={formData.phoneNumber}
                  onChange={(e) => setFormData(prev => ({ ...prev, phoneNumber: e.target.value }))}
                  placeholder="+1 (555) 123-4567"
                />
              </div>

              <div className="form-group">
                <label htmlFor="consultingDoctor">Consulting Doctor <span className="optional-field">(Optional)</span></label>
                <select
                  id="consultingDoctor"
                  value={formData.consultingDoctor}
                  onChange={(e) => setFormData(prev => ({ ...prev, consultingDoctor: e.target.value }))}
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

            <div className="form-group">
              <label>Surgical Categories * (Select at least one)</label>
              <div className="checkbox-grid">
                {categories.map(category => (
                  <label key={category._id} className="checkbox-item">
                    <input
                      type="checkbox"
                      checked={formData.surgicalCategories.includes(category._id)}
                      onChange={(e) => handleCategoryChange(category._id, e.target.checked)}
                    />
                    <span className="checkbox-label">
                      {category.description} ({category.code})
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div className="form-actions">
              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? '⏳ Saving...' : (editingDoctor ? '💾 Update Doctor' : '✅ Add Doctor')}
              </button>
              <button type="button" className="btn-secondary" onClick={resetForm}>
                ✖ Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Data Section */}
      <div className="data-section">
        <div className="section-header">
          <h2>📊 Doctors ({filteredDoctors.length})</h2>
        </div>

        {loading && !showForm ? (
          <div className="loading-state">⏳ Loading doctors...</div>
        ) : filteredDoctors.length === 0 ? (
          <div className="empty-state">
            {doctors.length === 0 ? (
              <>
                <p>No doctors found.</p>
                <p>Click "Add Doctor" to create your first doctor profile.</p>
              </>
            ) : (
              <>
                <p>No doctors match the current filters.</p>
                <button className="btn-secondary" onClick={resetFilters}>
                  🔄 Reset Filters
                </button>
              </>
            )}
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="table-container desktop-only">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Doctor ID</th>
                    <th>Name</th>
                    <th>Surgical Categories</th>
                    <th>Contact</th>
                    <th className="actions-column">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDoctors.map(doctor => (
                    <tr key={doctor._id}>
                      <td className="doctor-id-cell">
                        <div className="cell-content">
                          <code>{doctor.doctorId}</code>
                        </div>
                      </td>
                      <td className="doctor-name-cell">
                        <div className="cell-content">
                          <strong>Dr. {doctor.name}</strong>
                        </div>
                      </td>
                      <td className="categories-cell">
                        <div className="category-tags">
                          {doctor.surgicalCategories.map(cat => (
                            <span key={cat._id} className="category-tag">
                              {cat.code}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="contact-cell">
                        <div className="contact-info">
                          {doctor.phoneNumber && <div>📱 {doctor.phoneNumber}</div>}
                          {doctor.email && <div>✉️ {doctor.email}</div>}
                          {!doctor.phoneNumber && !doctor.email && <span className="no-data">No contact info</span>}
                        </div>
                      </td>
                      <td className="actions-cell">
                        <div className="action-buttons">
                          <button 
                            className="btn-outline-primary btn-sm"
                            onClick={() => handleEdit(doctor)}
                            disabled={loading}
                          >
                            ✏️ Edit
                          </button>
                          <button 
                            className="btn-outline-danger btn-sm"
                            onClick={() => handleDelete(doctor)}
                            disabled={loading}
                          >
                            🗑️ Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {/* Mobile Card View */}
            <div className="mobile-only">
              {filteredDoctors.map(doctor => (
                <MobileCard
                  key={doctor._id}
                  id={doctor._id}
                  openMenuId={openMenuId}
                  onToggleMenu={toggleMenu}
                  onEdit={() => handleEdit(doctor)}
                  onDelete={() => handleDelete(doctor)}
                  loading={loading}
                >
                  <div className="card-content">
                    <div className="card-header">
                      <h3 className="card-title">Dr. {doctor.name}</h3>
                      <span className="card-id">{doctor.doctorId}</span>
                    </div>
                    
                    <div className="card-body">
                      <div className="info-section">
                        <div className="info-row">
                          <span className="info-label">🩺 Categories:</span>
                          <span className="info-value">
                            <div className="category-tags-mobile">
                              {doctor.surgicalCategories.map(cat => (
                                <span key={cat._id} className="category-tag">
                                  {cat.code}
                                </span>
                              ))}
                            </div>
                          </span>
                        </div>
                        
                        <div className="info-row">
                          <span className="info-label">📱 Phone:</span>
                          <span className="info-value">{doctor.phoneNumber || 'Not provided'}</span>
                        </div>
                        
                        <div className="info-row">
                          <span className="info-label">✉️ Email:</span>
                          <span className="info-value">{doctor.email || 'Not provided'}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </MobileCard>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Doctors;
