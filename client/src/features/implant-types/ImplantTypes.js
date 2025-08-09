import React, { useState, useEffect, useMemo } from 'react';
import './ImplantTypes.css';
import '../../shared/styles/unified-design.css';
import { implantTypesAPI } from './services/implantTypesAPI';
import MobileCard from '../../shared/components/MobileCard';
import { useDropdownMenu } from '../../shared/hooks/useDropdownMenu';
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
    surgicalCategoryId: ''
  });
  const [showFilters, setShowFilters] = useState(false);
  
  // Dropdown menu hook
  const { openMenuId, toggleMenu, closeMenu } = useDropdownMenu();

  // Fetch implant types and categories on component mount
  useEffect(() => {
    fetchImplantTypes();
    fetchCategories();
  }, []);

  // Filtered implant types
  const filteredImplantTypes = useMemo(() => {
    return implantTypes.filter(implantType => {
      const matchesName = !filters.implantTypeName || 
        implantType.name.toLowerCase().includes(filters.implantTypeName.toLowerCase());
      
      const matchesSurgicalCategory = !filters.surgicalCategoryId ||
        implantType.subcategories.some(sub => sub.surgicalCategory._id === filters.surgicalCategoryId);
      
      return matchesName && matchesSurgicalCategory;
    });
  }, [implantTypes, filters]);

  const handleFilterChange = (filterName, value) => {
    setFilters(prev => ({
      ...prev,
      [filterName]: value
    }));
  };

  const resetFilters = () => {
    setFilters({
      implantTypeName: '',
      surgicalCategoryId: ''
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
    closeMenu();
    
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
    closeMenu();
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
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div className="page-title-section">
          <h1 className="page-title">🔧 Implant Types</h1>
          <p className="page-description">Manage implant types and their subcategories</p>
        </div>
        <div className="page-actions">
          <button
            className="btn-primary"
            onClick={() => {
              resetForm();
              setShowForm(!showForm);
              if (!showForm) {
                scrollToTop();
              }
            }}
            disabled={loading}
          >
            {showForm ? '✖ Cancel' : '➕ Add Implant Type'}
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
                <label>Implant Type Name</label>
                <input
                  type="text"
                  placeholder="Search by implant type name..."
                  value={filters.implantTypeName}
                  onChange={(e) => handleFilterChange('implantTypeName', e.target.value)}
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
                {filteredImplantTypes.length} of {implantTypes.length} implant types
              </span>
            </div>
          </div>
        )}
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

      {/* Data Section */}
      <div className="data-section">
        <div className="section-header">
          <h2>📊 Implant Types ({filteredImplantTypes.length})</h2>
        </div>

        {loading && !showForm ? (
          <div className="loading-state">⏳ Loading implant types...</div>
        ) : filteredImplantTypes.length === 0 ? (
          <div className="empty-state">
            {implantTypes.length === 0 ? (
              <>
                <p>No implant types found.</p>
                <p>Click "Add Implant Type" to create your first implant type.</p>
              </>
            ) : (
              <>
                <p>No implant types match the current filters.</p>
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
                    <th>Implant Type</th>
                    <th>Subcategories</th>
                    <th className="actions-column">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredImplantTypes.map(implantType => (
                    <tr key={implantType._id}>
                      <td className="implant-name-cell">
                        <div className="cell-content">
                          <strong>{implantType.name}</strong>
                        </div>
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
                          <span className="no-data">No subcategories</span>
                        )}
                      </td>
                      <td className="actions-cell">
                        <div className="action-buttons">
                          <button
                            className="btn-outline-primary btn-sm"
                            onClick={() => handleEdit(implantType)}
                            disabled={loading}
                          >
                            ✏️ Edit
                          </button>
                          <button
                            className="btn-outline-danger btn-sm"
                            onClick={() => handleDelete(implantType)}
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
              {filteredImplantTypes.map(implantType => (
                <MobileCard
                  key={implantType._id}
                  id={implantType._id}
                  openMenuId={openMenuId}
                  onToggleMenu={toggleMenu}
                  onEdit={() => handleEdit(implantType)}
                  onDelete={() => handleDelete(implantType)}
                  loading={loading}
                >
                  <div className="card-content">
                    <div className="card-header">
                      <h3 className="card-title">{implantType.name}</h3>
                    </div>
                    
                    <div className="card-body">
                      <div className="info-section">
                        <div className="info-row">
                          <span className="info-label">📝 Subcategories:</span>
                          <span className="info-value">
                            {implantType.subcategories.length > 0 ? (
                              <div className="subcategories-mobile-list">
                                {implantType.subcategories.map((subcat, index) => (
                                  <div key={index} className="subcategory-mobile-item">
                                    <strong>{subcat.subCategory}</strong>
                                    <span className="subcategory-mobile-details">
                                      {subcat.length ? `${subcat.length}mm` : 'N/A'} - {subcat.surgicalCategory.code}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <span className="no-data">No subcategories</span>
                            )}
                          </span>
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

export default ImplantTypes;
