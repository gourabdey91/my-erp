import React, { useState, useEffect } from 'react';
import './MaterialMaster.css';
import { materialMasterAPI } from './services/materialMasterAPI';

const MaterialMaster = () => {
  const [materials, setMaterials] = useState([]);
  const [categories, setCategories] = useState([]);
  const [implantTypes, setImplantTypes] = useState([]);
  const [filteredImplantTypes, setFilteredImplantTypes] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [lengths, setLengths] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState(null);
  const [error, setError] = useState('');
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false
  });
  const [filters, setFilters] = useState({
    search: '',
    surgicalCategory: '',
    implantType: '',
    isActive: true
  });

  const [formData, setFormData] = useState({
    materialNumber: '',
    description: '',
    hsnCode: '',
    gstPercentage: '',
    currency: 'INR',
    mrp: '',
    institutionalPrice: '',
    distributionPrice: '',
    surgicalCategory: '',
    implantType: '',
    subCategory: '',
    lengthMm: '',
    unit: 'NOS'
  });

  useEffect(() => {
    fetchMaterials();
    fetchDropdownData();
  }, [pagination.page, pagination.limit]);

  useEffect(() => {
    // Reset to first page when filters change
    if (pagination.page !== 1) {
      setPagination(prev => ({ ...prev, page: 1 }));
    } else {
      fetchMaterials();
    }
  }, [filters]);

  const fetchMaterials = async () => {
    try {
      setLoading(true);
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        ...filters
      };
      
      const response = await materialMasterAPI.getAll(params);
      setMaterials(response.materials);
      setPagination(response.pagination);
      setError('');
    } catch (err) {
      setError('Failed to fetch materials');
      console.error('Error fetching materials:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchDropdownData = async () => {
    try {
      const response = await materialMasterAPI.getDropdownData();
      setCategories(response.categories);
      setImplantTypes(response.implantTypes);
    } catch (err) {
      console.error('Error fetching dropdown data:', err);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle Surgical Category change - first in the flow
  const handleSurgicalCategoryChange = async (e) => {
    const surgicalCategoryId = e.target.value;
    setFormData(prev => ({
      ...prev,
      surgicalCategory: surgicalCategoryId,
      implantType: '',
      subCategory: '',
      lengthMm: ''
    }));
    
    // Reset dependent dropdowns
    setFilteredImplantTypes([]);
    setSubcategories([]);
    setLengths([]);
    
    if (surgicalCategoryId) {
      try {
        const filteredTypes = await materialMasterAPI.getImplantTypesBySurgicalCategory(surgicalCategoryId);
        setFilteredImplantTypes(filteredTypes);
      } catch (err) {
        console.error('Error fetching filtered implant types:', err);
        setFilteredImplantTypes([]);
      }
    }
  };

  // Handle Implant Type change - second in the flow
  const handleImplantTypeChange = async (e) => {
    const implantTypeId = e.target.value;
    setFormData(prev => ({
      ...prev,
      implantType: implantTypeId,
      subCategory: '',
      lengthMm: ''
    }));
    
    // Reset dependent dropdowns
    setSubcategories([]);
    setLengths([]);
    
    if (implantTypeId && formData.surgicalCategory) {
      try {
        const filteredSubs = await materialMasterAPI.getFilteredSubcategories(formData.surgicalCategory, implantTypeId);
        setSubcategories(filteredSubs);
      } catch (err) {
        console.error('Error fetching filtered subcategories:', err);
        setSubcategories([]);
      }
    }
  };

  // Handle Sub Category change - third in the flow
  const handleSubcategoryChange = async (e) => {
    const subCategoryValue = e.target.value;
    setFormData(prev => ({
      ...prev,
      subCategory: subCategoryValue,
      lengthMm: ''
    }));
    
    // Reset lengths
    setLengths([]);
    
    if (subCategoryValue && formData.surgicalCategory && formData.implantType) {
      try {
        const filteredLengths = await materialMasterAPI.getFilteredLengths(
          formData.surgicalCategory, 
          formData.implantType, 
          subCategoryValue
        );
        setLengths(filteredLengths);
        
        // If only one length available, auto-select it
        if (filteredLengths.length === 1) {
          setFormData(prev => ({
            ...prev,
            lengthMm: filteredLengths[0]
          }));
        }
      } catch (err) {
        console.error('Error fetching filtered lengths:', err);
        setLengths([]);
      }
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (editingMaterial) {
        await materialMasterAPI.update(editingMaterial._id, formData);
      } else {
        await materialMasterAPI.create(formData);
      }
      
      await fetchMaterials();
      resetForm();
      setShowForm(false);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to save material');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = async (material) => {
    setEditingMaterial(material);
    setFormData({
      materialNumber: material.materialNumber,
      description: material.description,
      hsnCode: material.hsnCode,
      gstPercentage: material.gstPercentage,
      currency: material.currency,
      mrp: material.mrp,
      institutionalPrice: material.institutionalPrice,
      distributionPrice: material.distributionPrice,
      surgicalCategory: material.surgicalCategory._id,
      implantType: material.implantType._id,
      subCategory: material.subCategory,
      lengthMm: material.lengthMm,
      unit: material.unit || 'NOS'
    });
    
    // Fetch filtered data for editing
    try {
      // Get filtered implant types for the surgical category
      const filteredTypes = await materialMasterAPI.getImplantTypesBySurgicalCategory(material.surgicalCategory._id);
      setFilteredImplantTypes(filteredTypes);
      
      // Get filtered subcategories for the surgical category and implant type
      const filteredSubs = await materialMasterAPI.getFilteredSubcategories(material.surgicalCategory._id, material.implantType._id);
      setSubcategories(filteredSubs);
      
      // Get filtered lengths if subcategory exists
      if (material.subCategory) {
        const filteredLengths = await materialMasterAPI.getFilteredLengths(
          material.surgicalCategory._id, 
          material.implantType._id, 
          material.subCategory
        );
        setLengths(filteredLengths);
      }
    } catch (err) {
      console.error('Error fetching filtered data for editing:', err);
    }
    
    setShowForm(true);
    setError('');
  };

  const handleDelete = async (material) => {
    if (window.confirm(`Are you sure you want to delete material "${material.materialNumber}"?`)) {
      try {
        setLoading(true);
        await materialMasterAPI.delete(material._id);
        await fetchMaterials();
      } catch (err) {
        setError('Failed to delete material');
      } finally {
        setLoading(false);
      }
    }
  };

  const resetForm = () => {
    setFormData({
      materialNumber: '',
      description: '',
      hsnCode: '',
      gstPercentage: '',
      currency: 'INR',
      mrp: '',
      institutionalPrice: '',
      distributionPrice: '',
      surgicalCategory: '',
      implantType: '',
      subCategory: '',
      lengthMm: '',
      unit: 'NOS'
    });
    setEditingMaterial(null);
    setFilteredImplantTypes([]);
    setSubcategories([]);
    setLengths([]);
    setError('');
  };

  const handlePageChange = (newPage) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  };

  return (
    <div className="material-master-container">
      <div className="page-header">
        <h1>Material Master</h1>
        <button
          className="btn btn-primary"
          onClick={() => {
            resetForm();
            setShowForm(!showForm);
          }}
          disabled={loading}
        >
          {showForm ? 'Cancel' : 'Add Material'}
        </button>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {/* Filters */}
      <div className="filters-container">
        <div className="filters-row">
          <div className="filter-group">
            <input
              type="text"
              name="search"
              value={filters.search}
              onChange={handleFilterChange}
              placeholder="Search by material number or description..."
              className="search-input"
            />
          </div>
          <div className="filter-group">
            <select
              name="surgicalCategory"
              value={filters.surgicalCategory}
              onChange={handleFilterChange}
              className="filter-select"
            >
              <option value="">All Categories</option>
              {categories.map(category => (
                <option key={category._id} value={category._id}>
                  {category.code} - {category.description}
                </option>
              ))}
            </select>
          </div>
          <div className="filter-group">
            <select
              name="implantType"
              value={filters.implantType}
              onChange={handleFilterChange}
              className="filter-select"
            >
              <option value="">All Implant Types</option>
              {implantTypes.map(implantType => (
                <option key={implantType._id} value={implantType._id}>
                  {implantType.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {showForm && (
        <div className="form-container">
          <div className="form-header">
            <h2>{editingMaterial ? 'Edit Material' : 'Add New Material'}</h2>
          </div>
          <form onSubmit={handleSubmit} className="material-form">
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="materialNumber">Material Number *</label>
                <input
                  type="text"
                  id="materialNumber"
                  name="materialNumber"
                  value={formData.materialNumber}
                  onChange={handleInputChange}
                  maxLength="20"
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="description">Description *</label>
                <input
                  type="text"
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  maxLength="100"
                  required
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="hsnCode">HSN Code *</label>
                <input
                  type="text"
                  id="hsnCode"
                  name="hsnCode"
                  value={formData.hsnCode}
                  onChange={handleInputChange}
                  maxLength="15"
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="gstPercentage">GST % *</label>
                <input
                  type="number"
                  id="gstPercentage"
                  name="gstPercentage"
                  value={formData.gstPercentage}
                  onChange={handleInputChange}
                  min="0"
                  max="100"
                  step="0.01"
                  required
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="currency">Currency</label>
                <select
                  id="currency"
                  name="currency"
                  value={formData.currency}
                  onChange={handleInputChange}
                  required
                >
                  <option value="INR">INR</option>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="mrp">MRP *</label>
                <input
                  type="number"
                  id="mrp"
                  name="mrp"
                  value={formData.mrp}
                  onChange={handleInputChange}
                  min="0"
                  step="0.01"
                  required
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="institutionalPrice">Institutional Price *</label>
                <input
                  type="number"
                  id="institutionalPrice"
                  name="institutionalPrice"
                  value={formData.institutionalPrice}
                  onChange={handleInputChange}
                  min="0"
                  step="0.01"
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="distributionPrice">Distribution Price *</label>
                <input
                  type="number"
                  id="distributionPrice"
                  name="distributionPrice"
                  value={formData.distributionPrice}
                  onChange={handleInputChange}
                  min="0"
                  step="0.01"
                  required
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="surgicalCategory">Surgical Category *</label>
                <select
                  id="surgicalCategory"
                  name="surgicalCategory"
                  value={formData.surgicalCategory}
                  onChange={handleSurgicalCategoryChange}
                  required
                >
                  <option value="">Select Surgical Category</option>
                  {categories.map(category => (
                    <option key={category._id} value={category._id}>
                      {category.code} - {category.description}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="implantType">Implant Type *</label>
                <select
                  id="implantType"
                  name="implantType"
                  value={formData.implantType}
                  onChange={handleImplantTypeChange}
                  required
                  disabled={!formData.surgicalCategory}
                >
                  <option value="">Select Implant Type</option>
                  {filteredImplantTypes.map(implantType => (
                    <option key={implantType._id} value={implantType._id}>
                      {implantType.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="subCategory">Sub Category *</label>
                <select
                  id="subCategory"
                  name="subCategory"
                  value={formData.subCategory}
                  onChange={handleSubcategoryChange}
                  required
                  disabled={!formData.implantType}
                >
                  <option value="">Select Sub Category</option>
                  {subcategories.map((subcat, index) => (
                    <option key={index} value={subcat.subCategory}>
                      {subcat.subCategory}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="lengthMm">Length (mm)</label>
                <select
                  id="lengthMm"
                  name="lengthMm"
                  value={formData.lengthMm}
                  onChange={handleInputChange}
                  disabled={!formData.subCategory}
                >
                  <option value="">Select Length</option>
                  {lengths.map((length, index) => (
                    <option key={index} value={length}>
                      {length} mm
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="unit">Unit *</label>
                <select
                  id="unit"
                  name="unit"
                  value={formData.unit}
                  onChange={handleInputChange}
                  required
                >
                  <option value="NOS">NOS</option>
                  <option value="PCS">PCS</option>
                  <option value="SET">SET</option>
                  <option value="KIT">KIT</option>
                  <option value="BOX">BOX</option>
                  <option value="PAIR">PAIR</option>
                </select>
              </div>
            </div>

            <div className="form-actions">
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? 'Saving...' : (editingMaterial ? 'Update Material' : 'Add Material')}
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

      {/* Table Container */}
      <div className="data-table-container">
        {loading && !showForm ? (
          <div className="loading">Loading materials...</div>
        ) : materials.length === 0 ? (
          <div className="empty-state">
            <p>No materials found.</p>
            <p>Click "Add Material" to create your first material.</p>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Material Number</th>
                    <th>Description</th>
                    <th>HSN Code</th>
                    <th>GST %</th>
                    <th>MRP</th>
                    <th>Inst. Price</th>
                    <th>Dist. Price</th>
                    <th>Implant Type</th>
                    <th>Sub Category</th>
                    <th>Length</th>
                    <th>Unit</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {materials.map(material => (
                    <tr key={material._id}>
                      <td className="material-number-cell">
                        <strong>{material.materialNumber}</strong>
                      </td>
                      <td className="description-cell">
                        {material.description}
                      </td>
                      <td>{material.hsnCode}</td>
                      <td>{material.gstPercentage}%</td>
                      <td>{formatCurrency(material.mrp)}</td>
                      <td>{formatCurrency(material.institutionalPrice)}</td>
                      <td>{formatCurrency(material.distributionPrice)}</td>
                      <td>{material.implantType.name}</td>
                      <td>{material.subCategory}</td>
                      <td>{material.lengthMm}mm</td>
                      <td>{material.unit}</td>
                      <td>
                        <div className="action-buttons">
                          <button
                            className="btn btn-sm btn-outline-primary"
                            onClick={() => handleEdit(material)}
                            disabled={loading}
                          >
                            Edit
                          </button>
                          <button
                            className="btn btn-sm btn-outline-danger"
                            onClick={() => handleDelete(material)}
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
              {materials.map(material => (
                <div key={`mobile-${material._id}`} className="material-mobile-card">
                  <div className="mobile-card-header">
                    <h3 className="mobile-card-title">{material.materialNumber}</h3>
                    <span className="mobile-card-badge">{material.gstPercentage}% GST</span>
                  </div>
                  <div className="mobile-card-content">
                    <p><strong>Description:</strong> {material.description}</p>
                    <p><strong>HSN Code:</strong> {material.hsnCode}</p>
                    <div className="mobile-prices">
                      <span className="price-item">MRP: {formatCurrency(material.mrp)}</span>
                      <span className="price-item">Inst: {formatCurrency(material.institutionalPrice)}</span>
                      <span className="price-item">Dist: {formatCurrency(material.distributionPrice)}</span>
                    </div>
                    <p><strong>Implant:</strong> {material.implantType.name}</p>
                    <p><strong>Sub Category:</strong> {material.subCategory} ({material.lengthMm}mm)</p>
                    <p><strong>Unit:</strong> {material.unit}</p>
                  </div>
                  <div className="mobile-card-actions">
                    <button
                      className="btn btn-outline-primary"
                      onClick={() => handleEdit(material)}
                      disabled={loading}
                    >
                      Edit
                    </button>
                    <button
                      className="btn btn-outline-danger"
                      onClick={() => handleDelete(material)}
                      disabled={loading}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="pagination-container">
                <div className="pagination-info">
                  Showing {(pagination.page - 1) * pagination.limit + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} materials
                </div>
                <div className="pagination-controls">
                  <button
                    className="btn btn-outline-secondary btn-sm"
                    onClick={() => handlePageChange(pagination.page - 1)}
                    disabled={!pagination.hasPrev || loading}
                  >
                    Previous
                  </button>
                  <span className="pagination-current">
                    Page {pagination.page} of {pagination.totalPages}
                  </span>
                  <button
                    className="btn btn-outline-secondary btn-sm"
                    onClick={() => handlePageChange(pagination.page + 1)}
                    disabled={!pagination.hasNext || loading}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default MaterialMaster;
