import React, { useState, useEffect, useCallback } from 'react';
import { doctorAPI } from './services/doctorAPI';
import { useBusinessUnit } from '../../contexts/BusinessUnitContext';
import { useAuth } from '../../contexts/AuthContext';
import './Doctors.css';

const Doctors = () => {
  const [doctors, setDoctors] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingDoctor, setEditingDoctor] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    surgicalCategories: [],
    phoneNumber: '',
    email: ''
  });

  const { currentBusinessUnit } = useBusinessUnit();
  const { currentUser } = useAuth();

  const fetchDoctors = useCallback(async () => {
    try {
      setLoading(true);
      const response = await doctorAPI.getAll(currentBusinessUnit._id);
      setDoctors(response);
      setError('');
    } catch (err) {
      console.error('Error fetching doctors:', err);
      setError('Failed to fetch doctors');
    } finally {
      setLoading(false);
    }
  }, [currentBusinessUnit]);

  const fetchCategories = useCallback(async () => {
    try {
      const response = await doctorAPI.getCategories(currentBusinessUnit._id);
      setCategories(response);
    } catch (err) {
      console.error('Error fetching categories:', err);
      setError('Failed to fetch surgical categories');
    }
  }, [currentBusinessUnit]);

  useEffect(() => {
    if (currentBusinessUnit?._id) {
      fetchDoctors();
      fetchCategories();
    }
  }, [currentBusinessUnit, fetchDoctors, fetchCategories]);

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
    if (formData.phoneNumber && formData.phoneNumber.trim() && !/^\+?[\d\s\-\(\)]{10,15}$/.test(formData.phoneNumber)) {
      setError('Please enter a valid phone number');
      return;
    }

    // Validate email only if provided
    if (formData.email && formData.email.trim() && !/^[\w\.-]+@[\w\.-]+\.\w+$/.test(formData.email)) {
      setError('Please enter a valid email address');
      return;
    }

    try {
      setLoading(true);
      const doctorData = {
        name: formData.name.trim(),
        surgicalCategories: formData.surgicalCategories,
        businessUnit: currentBusinessUnit._id,
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

      if (editingDoctor) {
        await doctorAPI.update(editingDoctor._id, doctorData);
      } else {
        await doctorAPI.create(doctorData);
      }

      setShowForm(false);
      setEditingDoctor(null);
      setFormData({ name: '', surgicalCategories: [], phoneNumber: '', email: '' });
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
      email: doctor.email || ''
    });
    setShowForm(true);
    setError('');
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
    setFormData({ name: '', surgicalCategories: [], phoneNumber: '', email: '' });
    setError('');
  };

  const getCategoryNames = (doctorCategories) => {
    return doctorCategories.map(cat => cat.description).join(', ');
  };

  if (!currentBusinessUnit) {
    return (
      <div className="doctors-container">
        <div className="no-business-unit">
          <p>Please select a business unit to manage doctors.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="doctors-container">
      <div className="page-header">
        <h1>Doctor Management</h1>
        <button 
          className="btn btn-primary"
          onClick={() => setShowForm(true)}
          disabled={loading}
        >
          Add Doctor
        </button>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {showForm && (
        <div className="form-container">
          <div className="form-header">
            <h2>{editingDoctor ? 'Edit Doctor' : 'Add New Doctor'}</h2>
          </div>
          <form onSubmit={handleSubmit} className="doctor-form">
            <div className="form-row">
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
                <label htmlFor="email">Email Address (Optional)</label>
                <input
                  type="email"
                  id="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="doctor@example.com"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="phoneNumber">Phone Number (Optional)</label>
                <input
                  type="tel"
                  id="phoneNumber"
                  value={formData.phoneNumber}
                  onChange={(e) => setFormData(prev => ({ ...prev, phoneNumber: e.target.value }))}
                  placeholder="+1 (555) 123-4567"
                />
              </div>
            </div>

            <div className="form-group">
              <label>Surgical Categories * (Select at least one)</label>
              <div className="checkbox-group">
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
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? 'Saving...' : (editingDoctor ? 'Update Doctor' : 'Add Doctor')}
              </button>
              <button type="button" className="btn btn-secondary" onClick={resetForm}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="data-table-container">
        {loading && !showForm ? (
          <div className="loading">Loading doctors...</div>
        ) : doctors.length === 0 ? (
          <div className="empty-state">
            <p>No doctors found.</p>
            <p>Click "Add Doctor" to create your first doctor profile.</p>
          </div>
        ) : (
          <>
            {/* Desktop/Tablet Table View */}
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Doctor ID</th>
                    <th>Name</th>
                    <th>Surgical Categories</th>
                    <th>Phone</th>
                    <th>Email</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {doctors.map(doctor => (
                    <tr key={doctor._id}>
                      <td className="doctor-id-cell">{doctor.doctorId}</td>
                      <td className="doctor-name-cell">Dr. {doctor.name}</td>
                      <td className="categories-cell">
                        <div className="category-tags">
                          {doctor.surgicalCategories.map(cat => (
                            <span key={cat._id} className="category-tag">
                              {cat.code}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td>{doctor.phoneNumber}</td>
                      <td>{doctor.email}</td>
                      <td>
                        <div className="action-buttons">
                          <button 
                            className="btn btn-sm btn-outline-primary"
                            onClick={() => handleEdit(doctor)}
                            disabled={loading}
                          >
                            Edit
                          </button>
                          <button 
                            className="btn btn-sm btn-outline-danger"
                            onClick={() => handleDelete(doctor)}
                            disabled={loading}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {/* Mobile Card View */}
            <div className="mobile-card-view">
              {doctors.map(doctor => (
                <div key={`mobile-${doctor._id}`} className="doctor-mobile-card">
                  <div className="mobile-card-header">
                    <h3 className="mobile-card-title">Dr. {doctor.name}</h3>
                    <span className="mobile-card-id">{doctor.doctorId}</span>
                  </div>
                  <div className="mobile-card-content">
                    <div className="mobile-card-info">
                      <p><strong>Categories:</strong> {getCategoryNames(doctor.surgicalCategories)}</p>
                      <p><strong>Phone:</strong> {doctor.phoneNumber}</p>
                      <p><strong>Email:</strong> {doctor.email}</p>
                    </div>
                  </div>
                  <div className="mobile-card-actions">
                    <button 
                      className="btn btn-outline-primary"
                      onClick={() => handleEdit(doctor)}
                      disabled={loading}
                    >
                      Edit
                    </button>
                    <button 
                      className="btn btn-outline-danger"
                      onClick={() => handleDelete(doctor)}
                      disabled={loading}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Doctors;
