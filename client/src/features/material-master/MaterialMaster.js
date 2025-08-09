import React, { useState, useEffect } from 'react';
import './MaterialMaster.css';
import '../../shared/styles/unified-design.css';
import MobileCard from '../../shared/components/MobileCard';
import { materialMasterAPI } from './services/materialMasterAPI';
import { scrollToTop } from '../../shared/utils/scrollUtils';

const MaterialMaster = () => {
  const [materials, setMaterials] = useState([]);
  const [categories, setCategories] = useState([]);
  const [businessUnits, setBusinessUnits] = useState([]);
  const [filteredImplantTypes, setFilteredImplantTypes] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [lengths, setLengths] = useState([]);
  // Filter-specific state
  const [filterImplantTypes, setFilterImplantTypes] = useState([]);
  const [filterSubcategories, setFilterSubcategories] = useState([]);
  const [filterLengths, setFilterLengths] = useState([]);
  const [loading, setLoading] = useState(true);
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
    businessUnitId: '',
    surgicalCategory: '',
    implantType: '',
    subCategory: '',
    lengthMm: '',
    isActive: true
  });

  const [formData, setFormData] = useState({
    businessUnitId: '',
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
      setBusinessUnits(response.businessUnits);
      // We no longer need to store all implantTypes since we fetch them dynamically
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

  // Handle surgical category filter change
  const handleFilterSurgicalCategoryChange = async (e) => {
    const surgicalCategoryId = e.target.value;
    setFilters(prev => ({
      ...prev,
      surgicalCategory: surgicalCategoryId,
      implantType: '',
      subCategory: '',
      lengthMm: ''
    }));
    
    // Reset dependent filter dropdowns
    setFilterImplantTypes([]);
    setFilterSubcategories([]);
    setFilterLengths([]);
    
    if (surgicalCategoryId) {
      try {
        const filteredTypes = await materialMasterAPI.getImplantTypesBySurgicalCategory(surgicalCategoryId);
        setFilterImplantTypes(filteredTypes);
      } catch (err) {
        console.error('Error fetching filtered implant types for filter:', err);
        setFilterImplantTypes([]);
      }
    }
  };

  // Handle implant type filter change
  const handleFilterImplantTypeChange = async (e) => {
    const implantTypeId = e.target.value;
    setFilters(prev => ({
      ...prev,
      implantType: implantTypeId,
      subCategory: '',
      lengthMm: ''
    }));
    
    // Reset dependent filter dropdowns
    setFilterSubcategories([]);
    setFilterLengths([]);
    
    if (implantTypeId && filters.surgicalCategory) {
      try {
        const filteredSubs = await materialMasterAPI.getFilteredSubcategories(filters.surgicalCategory, implantTypeId);
        setFilterSubcategories(filteredSubs);
      } catch (err) {
        console.error('Error fetching filtered subcategories for filter:', err);
        setFilterSubcategories([]);
      }
    }
  };

  // Handle subcategory filter change
  const handleFilterSubcategoryChange = async (e) => {
    const subCategoryValue = e.target.value;
    setFilters(prev => ({
      ...prev,
      subCategory: subCategoryValue,
      lengthMm: ''
    }));
    
    // Reset dependent filter dropdowns
    setFilterLengths([]);
    
    if (subCategoryValue && filters.surgicalCategory && filters.implantType) {
      try {
        const filteredLengths = await materialMasterAPI.getFilteredLengths(
          filters.surgicalCategory, 
          filters.implantType, 
          subCategoryValue
        );
        setFilterLengths(filteredLengths);
      } catch (err) {
        console.error('Error fetching filtered lengths for filter:', err);
        setFilterLengths([]);
      }
    }
  };

  const resetFilters = () => {
    setFilters({
      search: '',
      businessUnitId: '',
      surgicalCategory: '',
      implantType: '',
      subCategory: '',
      lengthMm: '',
      isActive: true
    });
    // Reset dependent filter dropdowns
    setFilterImplantTypes([]);
    setFilterSubcategories([]);
    setFilterLengths([]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Prepare form data, ensuring empty values are sent as null for optional fields
      const submitData = {
        ...formData,
        // Convert empty string length to null
        lengthMm: formData.lengthMm === '' || formData.lengthMm === null || formData.lengthMm === undefined ? null : parseFloat(formData.lengthMm),
        // Ensure other optional fields are properly handled
        implantType: formData.implantType || null,
        subCategory: formData.subCategory || null
      };

      if (editingMaterial) {
        await materialMasterAPI.update(editingMaterial._id, submitData);
      } else {
        await materialMasterAPI.create(submitData);
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
      businessUnitId: material.businessUnitId?._id || '',
      materialNumber: material.materialNumber,
      description: material.description,
      hsnCode: material.hsnCode,
      gstPercentage: material.gstPercentage,
      currency: material.currency,
      mrp: material.mrp,
      institutionalPrice: material.institutionalPrice,
      distributionPrice: material.distributionPrice,
      surgicalCategory: material.surgicalCategory._id,
      implantType: material.implantType?._id || '',
      subCategory: material.subCategory || '',
      lengthMm: material.lengthMm || '', // Ensure empty string for null/undefined values
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

  if (loading && materials.length === 0) {
    return (
      <div className="unified-container">
        <div className="unified-loading">Loading materials...</div>
      </div>
    );
  }

  return (
    <div className="unified-container">
      {/* Header */}
      <div className="unified-header">
        <div className="unified-header-content">
          <div className="unified-header-text">
            <h1>Material Master</h1>
            <p>Manage material inventory, pricing, and specifications. Configure HSN codes, GST rates, and maintain product information for surgical implants and medical devices.</p>
          </div>
          <button
            className="unified-btn unified-btn-primary"
            onClick={() => {
              if (!showForm) {
                resetForm();
                setShowForm(true);
                scrollToTop();
              } else {
                resetForm();
                setShowForm(false);
              }
            }}
            disabled={loading}
          >
            {showForm ? 'Cancel' : 'Add Material'}
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
            <label>Search Materials</label>
            <input
              type="text"
              name="search"
              value={filters.search}
              onChange={handleFilterChange}
              placeholder="Search by material number or description..."
              className="unified-search-input"
            />
          </div>
          <div className="unified-filter-group">
            <label>Business Unit</label>
            <select
              name="businessUnitId"
              value={filters.businessUnitId}
              onChange={handleFilterChange}
              className="unified-filter-select"
            >
              <option value="">All Business Units</option>
              {businessUnits.map(unit => (
                <option key={unit._id} value={unit._id}>
                  {unit.code} - {unit.name}
                </option>
              ))}
            </select>
          </div>
          <div className="unified-filter-group">
            <label>Surgical Category</label>
            <select
              name="surgicalCategory"
              value={filters.surgicalCategory}
              onChange={handleFilterSurgicalCategoryChange}
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
        </div>
        <div className="unified-filters-row">
          <div className="unified-filter-group">
            <label>Implant Type</label>
            <select
              name="implantType"
              value={filters.implantType}
              onChange={handleFilterImplantTypeChange}
              className="unified-filter-select"
              disabled={!filters.surgicalCategory}
            >
              <option value="">All Implant Types</option>
              {filterImplantTypes.map(implantType => (
                <option key={implantType._id} value={implantType._id}>
                  {implantType.name}
                </option>
              ))}
            </select>
          </div>
          <div className="unified-filter-group">
            <label>Sub Category</label>
            <select
              name="subCategory"
              value={filters.subCategory}
              onChange={handleFilterSubcategoryChange}
              className="unified-filter-select"
              disabled={!filters.implantType}
            >
              <option value="">All Sub Categories</option>
              {filterSubcategories.map((subcat, index) => (
                <option key={index} value={subcat.subCategory}>
                  {subcat.subCategory}
                </option>
              ))}
            </select>
          </div>
          <div className="unified-filter-group">
            <label>Length</label>
            <select
              name="lengthMm"
              value={filters.lengthMm}
              onChange={handleFilterChange}
              className="unified-filter-select"
              disabled={!filters.subCategory}
            >
              <option value="">All Lengths</option>
              {filterLengths.map((length, index) => (
                <option key={index} value={length}>
                  {length} mm
                </option>
              ))}
            </select>
          </div>
          <div className="unified-filter-group">
            <label>Status</label>
            <select
              name="isActive"
              value={filters.isActive}
              onChange={handleFilterChange}
              className="unified-filter-select"
            >
              <option value={true}>Active</option>
              <option value={false}>Inactive</option>
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

      {/* Form Section */}
      {showForm && (
        <div className="unified-content">
          <div style={{ borderBottom: '2px solid var(--gray-200)', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
            <h2 style={{ margin: 0, color: 'var(--primary-color)', fontSize: '1.5rem', fontWeight: '600' }}>
              {editingMaterial ? 'Edit Material' : 'Add New Material'}
            </h2>
          </div>
          <form onSubmit={handleSubmit}>
            <div className="unified-form-grid">
              <div className="unified-form-field">
                <label className="unified-form-label">
                  Business Unit *
                </label>
                <select
                  name="businessUnitId"
                  value={formData.businessUnitId}
                  onChange={handleInputChange}
                  required
                  className="unified-search-input"
                >
                  <option value="">Select Business Unit</option>
                  {businessUnits.map(unit => (
                    <option key={unit._id} value={unit._id}>
                      {unit.code} - {unit.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="unified-form-field">
                <label className="unified-form-label">
                  Material Number *
                </label>
                <input
                  type="text"
                  name="materialNumber"
                  value={formData.materialNumber}
                  onChange={handleInputChange}
                  placeholder="Enter material number"
                  maxLength="20"
                  required
                  className="unified-search-input"
                />
              </div>

              <div className="unified-form-field">
                <label className="unified-form-label">
                  Description *
                </label>
                <input
                  type="text"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Enter material description"
                  maxLength="100"
                  required
                  className="unified-search-input"
                />
              </div>

              <div className="unified-form-field">
                <label className="unified-form-label">
                  HSN Code *
                </label>
                <input
                  type="text"
                  name="hsnCode"
                  value={formData.hsnCode}
                  onChange={handleInputChange}
                  placeholder="Enter HSN code"
                  maxLength="15"
                  required
                  className="unified-search-input"
                />
              </div>

              <div className="unified-form-field">
                <label className="unified-form-label">
                  GST Percentage *
                </label>
                <input
                  type="number"
                  name="gstPercentage"
                  value={formData.gstPercentage}
                  onChange={handleInputChange}
                  placeholder="Enter GST percentage"
                  min="0"
                  max="100"
                  step="0.01"
                  required
                  className="unified-search-input"
                />
              </div>

              <div className="unified-form-field">
                <label className="unified-form-label">
                  Currency *
                </label>
                <select
                  name="currency"
                  value={formData.currency}
                  onChange={handleInputChange}
                  required
                  className="unified-search-input"
                >
                  <option value="INR">INR</option>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                </select>
              </div>

              <div className="unified-form-field">
                <label className="unified-form-label">
                  MRP *
                </label>
                <input
                  type="number"
                  name="mrp"
                  value={formData.mrp}
                  onChange={handleInputChange}
                  placeholder="Enter MRP"
                  min="0"
                  step="0.01"
                  required
                  className="unified-search-input"
                />
              </div>

              <div className="unified-form-field">
                <label className="unified-form-label">
                  Institutional Price *
                </label>
                <input
                  type="number"
                  name="institutionalPrice"
                  value={formData.institutionalPrice}
                  onChange={handleInputChange}
                  placeholder="Enter institutional price"
                  min="0"
                  step="0.01"
                  required
                  className="unified-search-input"
                />
              </div>

              <div className="unified-form-field">
                <label className="unified-form-label">
                  Distribution Price *
                </label>
                <input
                  type="number"
                  name="distributionPrice"
                  value={formData.distributionPrice}
                  onChange={handleInputChange}
                  placeholder="Enter distribution price"
                  min="0"
                  step="0.01"
                  required
                  className="unified-search-input"
                />
              </div>

              <div className="unified-form-field">
                <label className="unified-form-label">
                  Surgical Category *
                </label>
                <select
                  name="surgicalCategory"
                  value={formData.surgicalCategory}
                  onChange={handleSurgicalCategoryChange}
                  required
                  className="unified-search-input"
                >
                  <option value="">Select Surgical Category</option>
                  {categories.map(category => (
                    <option key={category._id} value={category._id}>
                      {category.code} - {category.description}
                    </option>
                  ))}
                </select>
              </div>

              <div className="unified-form-field">
                <label className="unified-form-label">
                  Implant Type *
                </label>
                <select
                  name="implantType"
                  value={formData.implantType}
                  onChange={handleImplantTypeChange}
                  required
                  disabled={!formData.surgicalCategory}
                  className="unified-search-input"
                >
                  <option value="">Select Implant Type</option>
                  {filteredImplantTypes.map(implantType => (
                    <option key={implantType._id} value={implantType._id}>
                      {implantType.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="unified-form-field">
                <label className="unified-form-label">
                  Sub Category {formData.implantType ? '*' : ''}
                </label>
                <select
                  name="subCategory"
                  value={formData.subCategory}
                  onChange={handleSubcategoryChange}
                  required={!!formData.implantType}
                  disabled={!formData.implantType}
                  className="unified-search-input"
                >
                  <option value="">Select Sub Category</option>
                  {subcategories.map((subcat, index) => (
                    <option key={index} value={subcat.subCategory}>
                      {subcat.subCategory}
                    </option>
                  ))}
                </select>
              </div>

              <div className="unified-form-field">
                <label className="unified-form-label">
                  Length (mm) <span className="optional-text">(Optional)</span>
                </label>
                {lengths.length > 0 ? (
                  <select
                    name="lengthMm"
                    value={formData.lengthMm}
                    onChange={handleInputChange}
                    className="unified-search-input"
                  >
                    <option value="">Select Length (Optional)</option>
                    {lengths.map((length, index) => (
                      <option key={index} value={length}>
                        {length} mm
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="number"
                    name="lengthMm"
                    value={formData.lengthMm}
                    onChange={handleInputChange}
                    placeholder="Enter length in mm (optional)"
                    min="0"
                    step="0.1"
                    className="unified-search-input"
                  />
                )}
              </div>

              <div className="unified-form-field">
                <label className="unified-form-label">
                  Unit *
                </label>
                <select
                  name="unit"
                  value={formData.unit}
                  onChange={handleInputChange}
                  required
                  className="unified-search-input"
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

            <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
              <button type="submit" className="unified-btn unified-btn-primary" disabled={loading}>
                {loading ? 'Saving...' : (editingMaterial ? 'Update Material' : 'Add Material')}
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

      {/* Content */}
      <div className="unified-content">
        {loading && !showForm ? (
          <div className="unified-loading">Loading materials...</div>
        ) : materials.length === 0 ? (
          <div className="unified-empty">
            <h3>No materials found</h3>
            <p>
              {materials.length === 0 
                ? "Create your first material to get started." 
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
                    <th>Business Unit</th>
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
                      <td>{material.businessUnitId?.code || '-'}</td>
                      <td style={{ fontWeight: '600', color: 'var(--primary-color)' }}>{material.materialNumber}</td>
                      <td>{material.description}</td>
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
                        <div className="unified-table-actions">
                          <button
                            className="unified-table-action edit"
                            onClick={() => handleEdit(material)}
                            title="Edit Material"
                            disabled={loading}
                          >
                            ✏️
                          </button>
                          <button
                            className="unified-table-action delete"
                            onClick={() => handleDelete(material)}
                            title="Delete Material"
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
              {materials.map(material => (
                <MobileCard
                  key={`mobile-${material._id}`}
                  id={material._id}
                  title={material.materialNumber}
                  subtitle={material.description}
                  badge={`${material.gstPercentage}% GST`}
                  fields={[
                    { label: 'Business Unit', value: material.businessUnit?.name || 'N/A' },
                    { label: 'HSN Code', value: material.hsnCode }
                  ]}
                  sections={[
                    {
                      title: 'Pricing',
                      items: [
                        { label: 'MRP', value: `${material.currency} ${material.mrp}` },
                        { label: 'Institutional Price', value: `${material.currency} ${material.institutionalPrice}` },
                        { label: 'Distribution Price', value: `${material.currency} ${material.distributionPrice}` }
                      ]
                    },
                    {
                      title: 'Specifications',
                      items: [
                        { label: 'Implant Type', value: material.implantType?.name || 'N/A' },
                        { label: 'Sub Category', value: material.subCategory || 'N/A' },
                        { label: 'Length', value: material.lengthMm ? `${material.lengthMm} mm` : 'N/A' },
                        { label: 'Unit', value: material.unit }
                      ]
                    }
                  ]}
                  actions={[
                    {
                      label: 'Edit',
                      icon: '✏️',
                      onClick: () => handleEdit(material),
                      disabled: loading
                    },
                    {
                      label: 'Delete',
                      icon: '🗑️',
                      variant: 'danger',
                      onClick: () => handleDelete(material),
                      disabled: loading
                    }
                  ]}
                />
              ))}
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="unified-pagination">
                <div className="unified-pagination-info">
                  Showing {(pagination.page - 1) * pagination.limit + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} materials
                </div>
                <div className="unified-pagination-controls">
                  <button
                    className="unified-btn unified-btn-secondary unified-btn-sm"
                    onClick={() => handlePageChange(pagination.page - 1)}
                    disabled={!pagination.hasPrev || loading}
                  >
                    Previous
                  </button>
                  <span className="unified-pagination-current">
                    Page {pagination.page} of {pagination.totalPages}
                  </span>
                  <button
                    className="unified-btn unified-btn-secondary unified-btn-sm"
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
