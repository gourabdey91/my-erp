import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { hospitalAPI } from '../services/hospitalAPI';
import CascadedMaterialFilter from '../../../shared/components/CascadedMaterialFilter';
import MaterialAssignmentBulkUpload from './MaterialAssignmentBulkUpload';
import './MaterialAssignments.css';
import '../../../shared/styles/unified-design.css';
import '../../../shared/components/CascadedMaterialFilter.css';

const MaterialAssignments = ({ hospital, isOpen, onClose, onUpdate }) => {
  const { currentUser } = useAuth();
  
  const [materials, setMaterials] = useState([]);
  const [availableMaterials, setAvailableMaterials] = useState([]);
  const [filteredMaterials, setFilteredMaterials] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Cascaded filter state
  const [filters, setFilters] = useState({
    surgicalCategory: '',
    implantType: '',
    subCategory: '',
    lengthMm: ''
  });
  
  // Form states
  const [showAddForm, setShowAddForm] = useState(false);
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState('');
  const [customPricing, setCustomPricing] = useState({
    mrp: '',
    institutionalPrice: '',
    flaggedBilled: false
  });
  
  // Edit states
  const [editingAssignment, setEditingAssignment] = useState(null);
  const [editPricing, setEditPricing] = useState({
    mrp: '',
    institutionalPrice: ''
  });

  const fetchAvailableMaterials = useCallback(async () => {
    try {
      setLoading(true);
      const data = await hospitalAPI.getAvailableMaterials(hospital._id);
      setAvailableMaterials(data);
    } catch (err) {
      setError('Failed to fetch available materials');
      console.error('Error fetching available materials:', err);
    } finally {
      setLoading(false);
    }
  }, [hospital._id]);

  useEffect(() => {
    if (isOpen && hospital) {
      const activeMaterials = hospital.materialAssignments?.filter(assignment => assignment.isActive) || [];
      setMaterials(activeMaterials);
      setFilteredMaterials(activeMaterials);
      if (showAddForm) {
        fetchAvailableMaterials();
      }
    }
  }, [isOpen, hospital, showAddForm, fetchAvailableMaterials]);

  // Filter materials based on search term and cascaded filters
  useEffect(() => {
    let filtered = materials;

    // Apply search term filter
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(assignment => {
        const material = assignment.material;
        if (!material) return false;
        
        return (
          material.materialNumber?.toLowerCase().includes(searchLower) ||
          material.description?.toLowerCase().includes(searchLower) ||
          material.hsnCode?.toLowerCase().includes(searchLower) ||
          material.surgicalCategory?.description?.toLowerCase().includes(searchLower) ||
          material.implantType?.name?.toLowerCase().includes(searchLower) ||
          material.subCategory?.toLowerCase().includes(searchLower)
        );
      });
    }

    // Apply cascaded filters
    if (filters.surgicalCategory) {
      filtered = filtered.filter(assignment => 
        assignment.material?.surgicalCategory?._id === filters.surgicalCategory
      );
    }

    if (filters.implantType) {
      filtered = filtered.filter(assignment => 
        assignment.material?.implantType?._id === filters.implantType
      );
    }

    if (filters.subCategory) {
      filtered = filtered.filter(assignment => 
        assignment.material?.subCategory === filters.subCategory
      );
    }

    if (filters.lengthMm) {
      filtered = filtered.filter(assignment => 
        assignment.material?.lengthMm?.toString() === filters.lengthMm
      );
    }

    setFilteredMaterials(filtered);
  }, [materials, searchTerm, filters]);

  const handleMaterialSelect = (materialId) => {
    setSelectedMaterial(materialId);
    const material = availableMaterials.find(m => m._id === materialId);
    if (material) {
      setCustomPricing({
        mrp: material.mrp.toString(),
        institutionalPrice: material.institutionalPrice.toString()
      });
    }
  };

  const handleAddMaterial = async (e) => {
    e.preventDefault();
    
    if (!selectedMaterial) {
      setError('Please select a material');
      return;
    }

    try {
      setLoading(true);
      
      const assignmentData = {
        materialId: selectedMaterial,
        updatedBy: currentUser._id
      };

      // Only include pricing if hospital doesn't use default pricing
      if (!hospital.defaultPricing) {
        assignmentData.mrp = parseFloat(customPricing.mrp);
        assignmentData.institutionalPrice = parseFloat(customPricing.institutionalPrice);
      }

      const updatedHospital = await hospitalAPI.addMaterialAssignment(hospital._id, assignmentData);
      
      setSuccess('Material assigned successfully');
      setMaterials(updatedHospital.materialAssignments?.filter(assignment => assignment.isActive) || []);
      
      // Reset form
      setSelectedMaterial('');
      setCustomPricing({ mrp: '', institutionalPrice: '' });
      setShowAddForm(false);
      
      // Refresh available materials
      fetchAvailableMaterials();
      
      if (onUpdate) {
        onUpdate(updatedHospital);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to assign material');
      console.error('Error assigning material:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleEditPricing = (assignment) => {
    setEditingAssignment(assignment._id);
    setEditPricing({
      mrp: assignment.mrp.toString(),
      institutionalPrice: assignment.institutionalPrice.toString()
    });
  };

  const handleUpdatePricing = async () => {
    try {
      setLoading(true);
      
      const pricingData = {
        mrp: parseFloat(editPricing.mrp),
        institutionalPrice: parseFloat(editPricing.institutionalPrice),
        updatedBy: currentUser._id
      };

      await hospitalAPI.updateMaterialAssignment(hospital._id, editingAssignment, pricingData);
      
      setSuccess('Pricing updated successfully');
      
      // Update local materials list
      setMaterials(prevMaterials => 
        prevMaterials.map(material => 
          material._id === editingAssignment 
            ? { ...material, ...pricingData }
            : material
        )
      );
      
      setEditingAssignment(null);
      setEditPricing({ mrp: '', institutionalPrice: '' });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update pricing');
      console.error('Error updating pricing:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveMaterial = async (assignmentId) => {
    if (!window.confirm('Are you sure you want to remove this material assignment?')) {
      return;
    }

    try {
      setLoading(true);
      
      await hospitalAPI.removeMaterialAssignment(hospital._id, assignmentId, currentUser._id);
      
      setSuccess('Material assignment removed successfully');
      setMaterials(prevMaterials => 
        prevMaterials.filter(material => material._id !== assignmentId)
      );
      
      // Refresh available materials
      if (showAddForm) {
        fetchAvailableMaterials();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to remove material assignment');
      console.error('Error removing material assignment:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  };

  if (!isOpen) return null;

  return (
    <div className="unified-modal-overlay">
      <div className="unified-modal-container" style={{maxWidth: '1200px', width: '95%'}}>
        <div className="unified-modal-content" style={{maxHeight: '90vh', display: 'flex', flexDirection: 'column'}}>
          {/* Header */}
          <div className="unified-modal-header">
            <div className="unified-modal-title">
              <h1>Material Assignments</h1>
              <p>Manage material assignments and pricing for {hospital?.shortName}</p>
            </div>
            <button 
              className="unified-modal-close"
              onClick={onClose}
              aria-label="Close dialog"
            >
              ×
            </button>
          </div>

          {error && <div className="unified-alert unified-alert-danger">{error}</div>}
          {success && <div className="unified-alert unified-alert-success">{success}</div>}

          {/* Scrollable Content */}
          <div className="unified-modal-body" style={{flex: 1, overflow: 'auto', padding: '1.5rem'}}>
            {/* Action Buttons */}
            {!showAddForm && (
              <div className="unified-modal-actions" style={{marginBottom: '1.5rem', borderTop: 'none', padding: 0}}>
                <button 
                  className="unified-btn unified-btn-secondary"
                  onClick={() => setShowBulkUpload(true)}
                >
                  📥 Bulk Upload
                </button>
                <button 
                  className="unified-btn unified-btn-primary"
                  onClick={() => setShowAddForm(true)}
                >
                  ✚ Add Material
                </button>
              </div>
            )}

            {/* Default Pricing Info */}
            <div className="unified-card" style={{marginBottom: '1.5rem'}}>
              <div className="unified-card-body">
                <div style={{display: 'flex', alignItems: 'center', gap: '1rem'}}>
                  <span><strong>Default Pricing:</strong></span>
                  <span className={`unified-badge ${hospital?.defaultPricing ? 'unified-badge-success' : 'unified-badge-secondary'}`}>
                    {hospital?.defaultPricing ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
                {hospital?.defaultPricing && (
                  <p style={{marginTop: '0.5rem', marginBottom: 0, color: 'var(--text-muted)'}}>
                    Material prices are automatically set from the material master and cannot be edited.
                  </p>
                )}
              </div>
            </div>

          {/* Add Material Form */}
          {showAddForm && (
          <div className="unified-content">
            <div className="form-container">
              <div className="form-header">
                <h2>Add Material Assignment</h2>
              </div>
              <form onSubmit={handleAddMaterial} className="material-assignment-form">
                <div className="form-group">
                  <label className="unified-form-label">
                    Select Material *
                  </label>
                  <select
                    className="unified-search-input"
                    value={selectedMaterial}
                    onChange={(e) => handleMaterialSelect(e.target.value)}
                    required
                  >
                    <option value="">Choose a material...</option>
                    {availableMaterials.map(material => (
                      <option key={material._id} value={material._id}>
                        {material.materialNumber} - {material.description}
                      </option>
                    ))}
                  </select>
                </div>

                {selectedMaterial && !hospital.defaultPricing && (
                  <div className="form-row">
                    <div className="form-group">
                      <label className="unified-form-label">
                        MRP *
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        className="unified-search-input"
                        value={customPricing.mrp}
                        onChange={(e) => setCustomPricing(prev => ({...prev, mrp: e.target.value}))}
                        placeholder="Enter MRP"
                        required
                      />
                    </div>
                    
                    <div className="form-group">
                      <label className="unified-form-label">
                        Institutional Price *
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        className="unified-search-input"
                        value={customPricing.institutionalPrice}
                        onChange={(e) => setCustomPricing(prev => ({...prev, institutionalPrice: e.target.value}))}
                        placeholder="Enter institutional price"
                        required
                      />
                    </div>
                  </div>
                )}

                {selectedMaterial && (
                  <div className="form-group">
                    <label className="unified-checkbox-container">
                      <input
                        type="checkbox"
                        checked={customPricing.flaggedBilled || false}
                        onChange={(e) => setCustomPricing(prev => ({...prev, flaggedBilled: e.target.checked}))}
                        className="unified-checkbox"
                      />
                      <span className="checkmark"></span>
                      <span className="checkbox-label">🏥 Flagged for Billing</span>
                    </label>
                  </div>
                )}

                <div className="form-actions">
                  <button type="submit" className="unified-btn unified-btn-primary" disabled={loading}>
                    {loading ? 'Adding...' : 'Add Material Assignment'}
                  </button>
                  <button 
                    type="button" 
                    className="unified-btn unified-btn-secondary"
                    onClick={() => setShowAddForm(false)}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Materials List */}
        {!showAddForm && (
          <div className="unified-content">
            <div className="materials-list-header">
              <div className="materials-list-title">
                <h2 style={{fontSize: '1.25rem', color: 'var(--gray-800)'}}>Assigned Materials</h2>
                <span className="materials-count-badge">
                  {materials.length} material{materials.length !== 1 ? 's' : ''}
                </span>
              </div>
              <div className="materials-search-container">
                <div className="search-with-icon">
                  <span className="search-icon">🔍</span>
                  <input
                    type="text"
                    className="unified-search-input materials-search"
                    placeholder="Search by material number, description, category..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Cascaded Filters */}
            <CascadedMaterialFilter
              filters={filters}
              onFilterChange={handleFilterChange}
              disabled={loading}
            />

            {filteredMaterials.length === 0 ? (
              <div className="unified-empty-state">
                <p>No materials assigned yet.</p>
              </div>
            ) : (
              <>
                {/* Desktop Table */}
                <div className="unified-table-responsive">
                  <table className="unified-table">
                    <thead>
                      <tr>
                        <th>Material Number</th>
                        <th>Description</th>
                        <th>Category</th>
                        <th>Implant Type</th>
                        <th>Sub Category</th>
                        <th>Length</th>
                        <th>MRP</th>
                        <th>Institutional Price</th>
                        <th>
                          <span className="table-header-icon" title="Flagged for billing">�</span>
                          Flagged Billed
                        </th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredMaterials.map(assignment => (
                        <tr key={assignment._id}>
                          <td>
                            <span className="code-badge">{assignment.material?.materialNumber}</span>
                          </td>
                          <td>
                            <span className="name-text" title={assignment.material?.description}>
                              {assignment.material?.description}
                            </span>
                          </td>
                          <td>
                            <span className="category-text">{assignment.material?.surgicalCategory?.description}</span>
                          </td>
                          <td>
                            <span className="implant-text">{assignment.material?.implantType?.name}</span>
                          </td>
                          <td>
                            <span className="sub-category-text">{assignment.material?.subCategory}</span>
                          </td>
                          <td>
                            <span className="length-text">
                              {assignment.material?.lengthMm ? `${assignment.material.lengthMm}mm` : '-'}
                            </span>
                          </td>
                          <td>
                            {editingAssignment === assignment._id ? (
                              <input
                                type="number"
                                step="0.01"
                                className="unified-input unified-input-sm"
                                value={editPricing.mrp}
                                onChange={(e) => setEditPricing(prev => ({...prev, mrp: e.target.value}))}
                                required
                              />
                            ) : (
                              <span className="price-value">{formatCurrency(assignment.mrp)}</span>
                            )}
                          </td>
                          <td>
                            {editingAssignment === assignment._id ? (
                              <input
                                type="number"
                                step="0.01"
                                className="unified-input unified-input-sm"
                                value={editPricing.institutionalPrice}
                                onChange={(e) => setEditPricing(prev => ({...prev, institutionalPrice: e.target.value}))}
                                required
                              />
                            ) : (
                              <span className="price-value">{formatCurrency(assignment.institutionalPrice)}</span>
                            )}
                          </td>
                          <td className="checkbox-cell">
                            <label className="unified-checkbox-container-inline">
                              <input
                                type="checkbox"
                                checked={assignment.flaggedBilled || false}
                                onChange={(e) => console.log('Flagged billed toggle:', e.target.checked)}
                                className="unified-checkbox"
                                disabled
                                title="Feature temporarily disabled"
                              />
                              <span className="checkmark"></span>
                            </label>
                          </td>
                          <td>
                            {editingAssignment === assignment._id ? (
                              <div className="unified-table-actions">
                                <button
                                  type="button"
                                  onClick={handleUpdatePricing}
                                  className="unified-table-action save"
                                  title="Save changes"
                                  disabled={loading}
                                >
                                  ✅
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingAssignment(null)}
                                  className="unified-table-action cancel"
                                  title="Cancel editing"
                                >
                                  ❌
                                </button>
                              </div>
                            ) : (
                              <div className="unified-table-actions">
                                {!hospital.defaultPricing && (
                                  <button
                                    type="button"
                                    onClick={() => handleEditPricing(assignment)}
                                    className="unified-table-action edit"
                                    title="Edit pricing"
                                  >
                                    ✏️
                                  </button>
                                )}
                                <button
                                  onClick={() => handleRemoveMaterial(assignment._id)}
                                  className="unified-table-action delete"
                                  title="Remove assignment"
                                >
                                  🗑️
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Cards */}
                <div className="unified-mobile-cards">
                  {filteredMaterials.map(assignment => (
                    <div key={assignment._id} className="unified-card-mobile" style={{marginBottom: '1rem', borderRadius: '8px', border: '1px solid var(--gray-200)', overflow: 'hidden'}}>
                      <div className="unified-card-mobile-header" style={{padding: '1rem', background: 'var(--gray-50)', borderBottom: '1px solid var(--gray-200)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem'}}>
                        <div className="material-title" style={{flex: 1, minWidth: '200px'}}>
                          <span className="code-badge" style={{display: 'inline-block', background: 'var(--primary-color)', color: 'white', padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.5rem'}}>{assignment.material?.materialNumber}</span>
                          <div style={{fontSize: '0.875rem', color: 'var(--gray-600)', fontWeight: '500', lineHeight: '1.3'}}>{assignment.material?.description}</div>
                        </div>
                        <div className="price-badge" style={{display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.25rem', minWidth: 'fit-content'}}>
                          <div style={{fontSize: '0.75rem', color: 'var(--gray-600)', fontWeight: '500'}}>MRP</div>
                          {editingAssignment === assignment._id ? (
                            <input
                              type="number"
                              step="0.01"
                              className="unified-input unified-input-sm"
                              value={editPricing.mrp}
                              onChange={(e) => setEditPricing(prev => ({...prev, mrp: e.target.value}))}
                              required
                              style={{width: '100px', fontSize: '0.875rem', padding: '0.25rem 0.5rem'}}
                            />
                          ) : (
                            <span style={{color: 'var(--success-color)', fontWeight: '600', fontSize: '0.875rem'}}>{formatCurrency(assignment.mrp)}</span>
                          )}
                        </div>
                      </div>
                      <div className="unified-card-mobile-body" style={{padding: '1rem'}}>
                        <div className="unified-card-mobile-details" style={{display: 'grid', gap: '0.75rem'}}>
                          <div className="unified-card-mobile-row" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderBottom: '1px solid var(--gray-100)'}}>
                            <span className="unified-card-mobile-label" style={{fontSize: '0.875rem', color: 'var(--gray-600)', fontWeight: '500', minWidth: '120px'}}>Category:</span>
                            <span className="unified-card-mobile-value" style={{fontSize: '0.875rem', color: 'var(--gray-800)', textAlign: 'right', flex: 1, wordBreak: 'break-word'}}>{assignment.material?.surgicalCategory?.description || '-'}</span>
                          </div>
                          
                          <div className="unified-card-mobile-row" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderBottom: '1px solid var(--gray-100)'}}>
                            <span className="unified-card-mobile-label" style={{fontSize: '0.875rem', color: 'var(--gray-600)', fontWeight: '500', minWidth: '120px'}}>Implant Type:</span>
                            <span className="unified-card-mobile-value" style={{fontSize: '0.875rem', color: 'var(--gray-800)', textAlign: 'right', flex: 1, wordBreak: 'break-word'}}>{assignment.material?.implantType?.name || '-'}</span>
                          </div>
                          
                          <div className="unified-card-mobile-row" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderBottom: '1px solid var(--gray-100)'}}>
                            <span className="unified-card-mobile-label" style={{fontSize: '0.875rem', color: 'var(--gray-600)', fontWeight: '500', minWidth: '120px'}}>Sub Category:</span>
                            <span className="unified-card-mobile-value" style={{fontSize: '0.875rem', color: 'var(--gray-800)', textAlign: 'right', flex: 1, wordBreak: 'break-word'}}>{assignment.material?.subCategory || '-'}</span>
                          </div>
                          
                          <div className="unified-card-mobile-row" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderBottom: '1px solid var(--gray-100)'}}>
                            <span className="unified-card-mobile-label" style={{fontSize: '0.875rem', color: 'var(--gray-600)', fontWeight: '500', minWidth: '120px'}}>Length:</span>
                            <span className="unified-card-mobile-value" style={{fontSize: '0.875rem', color: 'var(--gray-800)', textAlign: 'right', flex: 1, wordBreak: 'break-word'}}>
                              {assignment.material?.lengthMm ? `${assignment.material.lengthMm}mm` : '-'}
                            </span>
                          </div>
                          
                          <div className="unified-card-mobile-row" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderBottom: '1px solid var(--gray-100)'}}>
                            <span className="unified-card-mobile-label" style={{fontSize: '0.875rem', color: 'var(--gray-600)', fontWeight: '500', minWidth: '120px'}}>Institutional Price:</span>
                            {editingAssignment === assignment._id ? (
                              <input
                                type="number"
                                step="0.01"
                                className="unified-input unified-input-sm"
                                value={editPricing.institutionalPrice}
                                onChange={(e) => setEditPricing(prev => ({...prev, institutionalPrice: e.target.value}))}
                                required
                                style={{width: '100px', fontSize: '0.875rem', padding: '0.25rem 0.5rem'}}
                              />
                            ) : (
                              <span className="unified-card-mobile-value" style={{fontSize: '0.875rem', color: 'var(--accent-color)', textAlign: 'right', flex: 1, fontWeight: '600'}}>{formatCurrency(assignment.institutionalPrice)}</span>
                            )}
                          </div>
                        </div>
                        
                        <div className="mobile-checkboxes-grid" style={{marginTop: '1rem', padding: '0.75rem', background: 'var(--gray-50)', borderRadius: '6px'}}>
                          <div className="unified-checkbox-container">
                            <label className="unified-checkbox-label" style={{display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.875rem'}}>
                              <input
                                type="checkbox"
                                checked={assignment.flaggedBilled || false}
                                onChange={(e) => console.log('Flagged billed toggle:', e.target.checked)}
                                className="unified-checkbox"
                                disabled
                                title="Feature temporarily disabled"
                              />
                              <span className="checkbox-text" style={{color: 'var(--gray-700)', fontWeight: '500'}}>🏥 Flagged Billed</span>
                            </label>
                          </div>
                        </div>
                      </div>
                      <div className="unified-card-mobile-actions" style={{padding: '1rem', borderTop: '1px solid var(--gray-200)', background: 'var(--gray-50)', display: 'flex', gap: '0.5rem', flexWrap: 'wrap'}}>
                        {editingAssignment === assignment._id ? (
                          <>
                            <button
                              type="button"
                              onClick={handleUpdatePricing}
                              className="unified-btn unified-btn-sm unified-btn-success"
                              disabled={loading}
                              style={{flex: 1, minWidth: '80px'}}
                            >
                              ✅ Save
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingAssignment(null)}
                              className="unified-btn unified-btn-sm unified-btn-secondary"
                              style={{flex: 1, minWidth: '80px'}}
                            >
                              ❌ Cancel
                            </button>
                          </>
                        ) : (
                          <>
                            {!hospital.defaultPricing && (
                              <button
                                type="button"
                                onClick={() => handleEditPricing(assignment)}
                                className="unified-btn unified-btn-sm unified-btn-primary"
                                style={{flex: 1, minWidth: '80px'}}
                              >
                                ✏️ Edit
                              </button>
                            )}
                            <button
                              onClick={() => handleRemoveMaterial(assignment._id)}
                              className="unified-btn unified-btn-sm unified-btn-danger"
                              style={{flex: 1, minWidth: '80px'}}
                            >
                              🗑️ Remove
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                
                {filteredMaterials.length === 0 && materials.length > 0 && (
                  <div className="unified-empty-state">
                    <p>No materials found matching "{searchTerm}"</p>
                  </div>
                )}
              </>
            )}
          </div>
        )}
          </div>
        </div>
      </div>
      
      {/* Bulk Upload Modal */}
      {showBulkUpload && (
        <MaterialAssignmentBulkUpload
          hospitalId={hospital?._id}
          hospitalName={hospital?.shortName}
          onClose={() => setShowBulkUpload(false)}
          onSuccess={() => {
            setShowBulkUpload(false);
            onUpdate?.(); // Refresh the materials list
            setSuccess('Materials uploaded successfully!');
            setTimeout(() => setSuccess(''), 3000);
          }}
        />
      )}
    </div>
  );
};

export default MaterialAssignments;
