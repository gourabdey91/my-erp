import React, { useState, useEffect, useMemo } from 'react';
import '../../shared/styles/unified-design.css';
import './ImplantTypes.css';
import { implantTypesAPI } from './services/implantTypesAPI';
import MobileCard from '../../shared/components/MobileCard';
import { scrollToTop } from '../../shared/utils/scrollUtils';

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
  
  // Filter state
  const [filters, setFilters] = useState({
    implantTypeName: '',
    surgicalCategoryId: '',
    implantTypeId: ''
  });
  const [showFilters, setShowFilters] = useState(false);

  // Fetch implant types and categories on component mount
  useEffect(() => {
    fetchImplantTypes();
    fetchCategories();
  }, []);

  // Get available implant types based on selected surgical category
  const availableImplantTypes = useMemo(() => {
    if (!filters.surgicalCategoryId) {
      return implantTypes; // Show all implant types if no surgical category is selected
    }
    
    return implantTypes.filter(implantType => 
      implantType.subcategories.some(sub => sub.surgicalCategory._id === filters.surgicalCategoryId)
    );
  }, [implantTypes, filters.surgicalCategoryId]);

  // Filtered implant types with filtered subcategories
  const filteredImplantTypes = useMemo(() => {
    return implantTypes
      .filter(implantType => {
        const matchesName = !filters.implantTypeName || 
          implantType.name.toLowerCase().includes(filters.implantTypeName.toLowerCase());
        
        const matchesSurgicalCategory = !filters.surgicalCategoryId ||
          implantType.subcategories.some(sub => sub.surgicalCategory._id === filters.surgicalCategoryId);
        
        const matchesImplantType = !filters.implantTypeId ||
          implantType._id === filters.implantTypeId;
        
        return matchesName && matchesSurgicalCategory && matchesImplantType;
      })
      .map(implantType => ({
        ...implantType,
        // Filter subcategories to only show those matching the selected surgical category
        subcategories: filters.surgicalCategoryId 
          ? implantType.subcategories.filter(sub => sub.surgicalCategory._id === filters.surgicalCategoryId)
          : implantType.subcategories
      }));
  }, [implantTypes, filters]);

  const handleFilterChange = (filterName, value) => {
    setFilters(prev => {
      const newFilters = {
        ...prev,
        [filterName]: value
      };
      
      // If surgical category changes, reset implant type filter
      if (filterName === 'surgicalCategoryId') {
        newFilters.implantTypeId = '';
      }
      
      return newFilters;
    });
  };

  const resetFilters = () => {
    setFilters({
      implantTypeName: '',
      surgicalCategoryId: '',
      implantTypeId: ''
    });
  };

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
    
    // Scroll to top
    scrollToTop();
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

  return (
    <div className="unified-container">
      {/* Header */}
      <div className="unified-header">
        <div className="unified-header-content">
          <div className="unified-header-text">
            <h1>Implant Types</h1>
            <p>Manage implant types and their subcategories for medical procedures.</p>
          </div>
          <button
            className="unified-btn unified-btn-primary"
            onClick={() => {
              resetForm();
              setShowForm(!showForm);
              if (!showForm) {
                scrollToTop();
              }
            }}
            disabled={loading}
          >
            {showForm ? 'Cancel' : 'Add Implant Type'}
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
            <label>Implant Type Name</label>
            <input
              type="text"
              placeholder="Search by implant type name..."
              value={filters.implantTypeName}
              onChange={(e) => handleFilterChange('implantTypeName', e.target.value)}
              className="unified-search-input"
            />
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
            <label>Implant Type</label>
            <select
              value={filters.implantTypeId}
              onChange={(e) => handleFilterChange('implantTypeId', e.target.value)}
              className="unified-filter-select"
              disabled={!filters.surgicalCategoryId}
              title={!filters.surgicalCategoryId ? 'Please select a surgical category first' : 'Filter by implant type'}
            >
              <option value="">
                {filters.surgicalCategoryId ? 'All Implant Types' : 'Select Surgical Category First'}
              </option>
              {availableImplantTypes.map(implantType => (
                <option key={implantType._id} value={implantType._id}>
                  {implantType.name}
                </option>
              ))}
            </select>
          </div>
          
          <div className="unified-filter-group">
            <button
              type="button"
              className="unified-btn unified-btn-secondary"
              onClick={() => setFilters({ implantTypeName: '', surgicalCategoryId: '', implantTypeId: '' })}
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <div className="form-section">
          <div className="section-header">
            <h2>✏️ {editingImplantType ? 'Edit Implant Type' : 'Add New Implant Type'}</h2>
          </div>
          <form onSubmit={handleSubmit} className="form-container">
            <div className="form-grid">
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
              <div className="section-header">
                <h3>📝 Subcategories</h3>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={addSubcategory}
                >
                  ➕ Add Subcategory
                </button>
              </div>

              <div className="subcategories-container">
                {formData.subcategories.map((subcat, index) => (
                  <div key={index} className="subcategory-card">
                    <div className="subcategory-grid">
                      <div className="form-group">
                        <label>Subcategory *</label>
                        <input
                          type="text"
                          value={subcat.subCategory}
                          onChange={(e) => updateSubcategory(index, 'subCategory', e.target.value)}
                          placeholder="e.g., 2 Hole, 3 Hole, 4 Hole"
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label>Length (mm) <span className="optional-field">(Optional)</span></label>
                        <input
                          type="number"
                          value={subcat.length}
                          onChange={(e) => updateSubcategory(index, 'length', e.target.value)}
                          placeholder="Length in mm"
                          min="0"
                          step="0.1"
                        />
                      </div>
                      <div className="form-group">
                        <label>Surgical Category *</label>
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
                    </div>
                    <button
                      type="button"
                      className="btn-danger remove-btn"
                      onClick={() => removeSubcategory(index)}
                      title="Remove Subcategory"
                    >
                      🗑️ Remove
                    </button>
                  </div>
                ))}

                {formData.subcategories.length === 0 && (
                  <div className="empty-state">
                    <p>No subcategories added yet. Click "Add Subcategory" to add one.</p>
                  </div>
                )}
              </div>
            </div>

            <div className="form-actions">
              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? '⏳ Saving...' : (editingImplantType ? '💾 Update Implant Type' : '✅ Add Implant Type')}
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  resetForm();
                  setShowForm(false);
                }}
              >
                ✖ Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Content Section */}
      {!showForm && (
        <div className="unified-content">
          {filteredImplantTypes.length === 0 ? (
            <div className="empty-state">
              {implantTypes.length === 0 ? (
                <p>No implant types created yet. Create your first implant type to get started.</p>
              ) : (
                <p>No implant types match your current filters.</p>
              )}
            </div>
          ) : (
            <>
            {/* Desktop Table View */}
            <div className="unified-table-responsive">
              <table className="unified-table">
                <thead>
                  <tr>
                    <th>Implant Type</th>
                    <th>Subcategories</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredImplantTypes.map(implantType => (
                    <tr key={implantType._id}>
                      <td>
                        <span className="name-text">{implantType.name}</span>
                      </td>
                      <td>
                        <div className="subcategories-display">
                          {implantType.subcategories.length > 0 ? (
                            <div className="subcategories-list">
                              {implantType.subcategories.map((subcat, index) => (
                                <div key={index} className="subcategory-item">
                                  <span className="subcategory-name">{subcat.subCategory}</span>
                                  <span className="subcategory-details">
                                    <span className="length-badge">
                                      {subcat.length ? `${subcat.length}mm` : 'N/A'}
                                    </span>
                                    <span className="category-badge">
                                      {subcat.surgicalCategory.code}
                                    </span>
                                  </span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <span className="text-muted">No subcategories</span>
                          )}
                        </div>
                      </td>
                      <td>
                        <div className="unified-table-actions">
                          <button
                            className="unified-table-action edit"
                            onClick={() => handleEdit(implantType)}
                            title="Edit Implant Type"
                            disabled={loading}
                          >
                            ✏️
                          </button>
                          <button
                            className="unified-table-action delete"
                            onClick={() => handleDelete(implantType)}
                            title="Delete Implant Type"
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

            {/* Mobile Card View */}
            <div className="unified-mobile-cards">
              {filteredImplantTypes.map(implantType => (
                <MobileCard
                  key={implantType._id}
                  id={implantType._id}
                  title={implantType.name}
                  badge={`${implantType.subcategories.length} subcategories`}
                  sections={[
                    {
                      title: 'Subcategories',
                      items: implantType.subcategories.length > 0 
                        ? implantType.subcategories.map((subcat, index) => ({
                            label: subcat.subCategory,
                            value: `${subcat.length ? `${subcat.length}mm` : 'N/A'} - ${subcat.surgicalCategory.code}`
                          }))
                        : [{ label: 'No subcategories', value: '' }]
                    }
                  ]}
                  actions={[
                    {
                      label: 'Edit',
                      icon: '✏️',
                      onClick: () => handleEdit(implantType)
                    },
                    {
                      label: 'Delete',
                      icon: '🗑️',
                      variant: 'danger',
                      onClick: () => handleDelete(implantType)
                    }
                  ]}
                />
              ))}
            </div>
          </>
        )}
      </div>
      )}
    </div>
  );
};

export default ImplantTypes;
