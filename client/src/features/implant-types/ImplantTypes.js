import React, { useState, useEffect } from 'react';
import './ImplantTypes.css';
import { implantTypesAPI } from './services/implantTypesAPI';

const ImplantTypes = () => {
  const [implantTypes, setImplantTypes] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingImplantType, setEditingImplantType] = useState(null);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    subcategories: []
  });

  // Fetch implant types and categories on component mount
  useEffect(() => {
    fetchImplantTypes();
    fetchCategories();
  }, []);

  const fetchImplantTypes = async () => {
    try {
      setLoading(true);
      const response = await implantTypesAPI.getAll();
      setImplantTypes(response);
      setError('');
    } catch (err) {
      setError('Failed to fetch implant types');
      console.error('Error fetching implant types:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await implantTypesAPI.getCategories();
      setCategories(response);
    } catch (err) {
      console.error('Error fetching categories:', err);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const addSubcategory = () => {
    setFormData(prev => ({
      ...prev,
      subcategories: [
        ...prev.subcategories,
        { subCategory: '', length: '', surgicalCategory: '' }
      ]
    }));
  };

  const updateSubcategory = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      subcategories: prev.subcategories.map((subcat, i) => 
        i === index ? { ...subcat, [field]: value } : subcat
      )
    }));
  };

  const removeSubcategory = (index) => {
    setFormData(prev => ({
      ...prev,
      subcategories: prev.subcategories.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Clean up the data before sending - convert empty length strings to null
      const cleanedFormData = {
        ...formData,
        subcategories: formData.subcategories.map(subcat => ({
          ...subcat,
          length: subcat.length === '' || subcat.length === undefined ? null : parseFloat(subcat.length)
        }))
      };

      if (editingImplantType) {
        await implantTypesAPI.update(editingImplantType._id, cleanedFormData);
      } else {
        await implantTypesAPI.create(cleanedFormData);
      }
      
      await fetchImplantTypes();
      resetForm();
      setShowForm(false);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save implant type');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (implantType) => {
    setEditingImplantType(implantType);
    setFormData({
      name: implantType.name,
      subcategories: implantType.subcategories.map(subcat => ({
        subCategory: subcat.subCategory,
        length: subcat.length,
        surgicalCategory: subcat.surgicalCategory._id
      }))
    });
    setShowForm(true);
    setError('');
  };

  const handleDelete = async (implantType) => {
    if (window.confirm(`Are you sure you want to delete "${implantType.name}"?`)) {
      try {
        setLoading(true);
        await implantTypesAPI.delete(implantType._id);
        await fetchImplantTypes();
      } catch (err) {
        setError('Failed to delete implant type');
      } finally {
        setLoading(false);
      }
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      subcategories: []
    });
    setEditingImplantType(null);
    setError('');
  };

  const getCategoryName = (categoryId) => {
    const category = categories.find(cat => cat._id === categoryId);
    return category ? `${category.code} - ${category.description}` : 'Unknown';
  };

  return (
    <div className="implant-types-container">
      <div className="page-header">
        <h1>Implant Types</h1>
        <button
          className="btn btn-primary"
          onClick={() => {
            resetForm();
            setShowForm(!showForm);
          }}
          disabled={loading}
        >
          {showForm ? 'Cancel' : 'Add Implant Type'}
        </button>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {showForm && (
        <div className="form-container">
          <div className="form-header">
            <h2>{editingImplantType ? 'Edit Implant Type' : 'Add New Implant Type'}</h2>
          </div>
          <form onSubmit={handleSubmit} className="implant-type-form">
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="name">Implant Type Name *</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="e.g., Plates, Screws, Borehole Mesh, Orbital Plates"
                  required
                />
              </div>
            </div>

            <div className="subcategories-section">
              <div className="subcategories-header">
                <h3>Subcategories</h3>
                <button
                  type="button"
                  className="btn btn-outline-primary btn-sm"
                  onClick={addSubcategory}
                >
                  Add Subcategory
                </button>
              </div>

              {formData.subcategories.map((subcat, index) => (
                <div key={index} className="subcategory-row">
                  <div className="subcategory-form-group">
                    <label>Subcategory</label>
                    <input
                      type="text"
                      value={subcat.subCategory}
                      onChange={(e) => updateSubcategory(index, 'subCategory', e.target.value)}
                      placeholder="e.g., 2 Hole, 3 Hole, 4 Hole"
                      required
                    />
                  </div>
                  <div className="subcategory-form-group">
                    <label>Length (mm) <span className="optional-field">(Optional)</span></label>
                    <input
                      type="number"
                      value={subcat.length}
                      onChange={(e) => updateSubcategory(index, 'length', e.target.value)}
                      placeholder="Length in mm (optional)"
                      min="0"
                      step="0.1"
                    />
                  </div>
                  <div className="subcategory-form-group">
                    <label>Surgical Category</label>
                    <select
                      value={subcat.surgicalCategory}
                      onChange={(e) => updateSubcategory(index, 'surgicalCategory', e.target.value)}
                      required
                    >
                      <option value="">Select Category</option>
                      {categories.map(category => (
                        <option key={category._id} value={category._id}>
                          {category.code} - {category.description}
                        </option>
                      ))}
                    </select>
                  </div>
                  <button
                    type="button"
                    className="btn btn-outline-danger btn-sm remove-subcategory-btn"
                    onClick={() => removeSubcategory(index)}
                  >
                    Remove
                  </button>
                </div>
              ))}

              {formData.subcategories.length === 0 && (
                <div className="no-subcategories">
                  <p>No subcategories added yet. Click "Add Subcategory" to add one.</p>
                </div>
              )}
            </div>

            <div className="form-actions">
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? 'Saving...' : (editingImplantType ? 'Update Implant Type' : 'Add Implant Type')}
              </button>
              <button
                type="button"
                className="btn btn-secondary"
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

      <div className="data-table-container">
        {loading && !showForm ? (
          <div className="loading">Loading implant types...</div>
        ) : implantTypes.length === 0 ? (
          <div className="empty-state">
            <p>No implant types found.</p>
            <p>Click "Add Implant Type" to create your first implant type.</p>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Implant Type</th>
                    <th>Subcategories</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {implantTypes.map(implantType => (
                    <tr key={implantType._id}>
                      <td className="implant-name-cell">
                        <strong>{implantType.name}</strong>
                      </td>
                      <td className="subcategories-cell">
                        {implantType.subcategories.length > 0 ? (
                          <div className="subcategories-list">
                            {implantType.subcategories.map((subcat, index) => (
                              <div key={index} className="subcategory-item">
                                <span className="subcategory-name">{subcat.subCategory}</span>
                                <span className="subcategory-details">
                                  {subcat.length ? `${subcat.length}mm` : 'N/A'} - {subcat.surgicalCategory.code}
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="no-subcategories-text">No subcategories</span>
                        )}
                      </td>
                      <td>
                        <div className="action-buttons">
                          <button
                            className="btn btn-sm btn-outline-primary"
                            onClick={() => handleEdit(implantType)}
                            disabled={loading}
                          >
                            Edit
                          </button>
                          <button
                            className="btn btn-sm btn-outline-danger"
                            onClick={() => handleDelete(implantType)}
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
              {implantTypes.map(implantType => (
                <div key={`mobile-${implantType._id}`} className="implant-type-mobile-card">
                  <div className="mobile-card-header">
                    <h3 className="mobile-card-title">{implantType.name}</h3>
                  </div>
                  <div className="mobile-card-content">
                    <div className="mobile-card-info">
                      <p><strong>Subcategories:</strong></p>
                      {implantType.subcategories.length > 0 ? (
                        <div className="mobile-subcategories-list">
                          {implantType.subcategories.map((subcat, index) => (
                            <div key={index} className="mobile-subcategory-item">
                              <span className="mobile-subcategory-name">{subcat.subCategory}</span>
                              <span className="mobile-subcategory-details">
                                {subcat.length ? `${subcat.length}mm` : 'N/A'} - {subcat.surgicalCategory.code}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="mobile-no-subcategories">No subcategories</span>
                      )}
                    </div>
                  </div>
                  <div className="mobile-card-actions">
                    <button
                      className="btn btn-outline-primary"
                      onClick={() => handleEdit(implantType)}
                      disabled={loading}
                    >
                      Edit
                    </button>
                    <button
                      className="btn btn-outline-danger"
                      onClick={() => handleDelete(implantType)}
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

export default ImplantTypes;
