import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { hospitalAPI } from '../services/hospitalAPI';
import './MaterialAssignments.css';
import '../../../shared/styles/unified-design.css';

const MaterialAssignments = ({ hospital, isOpen, onClose, onUpdate }) => {
  const { currentUser } = useAuth();
  
  const [materials, setMaterials] = useState([]);
  const [availableMaterials, setAvailableMaterials] = useState([]);
  const [filteredMaterials, setFilteredMaterials] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Form states
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState('');
  const [customPricing, setCustomPricing] = useState({
    mrp: '',
    institutionalPrice: ''
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

  // Filter materials based on search term
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredMaterials(materials);
    } else {
      const filtered = materials.filter(assignment => {
        const material = assignment.material;
        if (!material) return false;
        
        const searchLower = searchTerm.toLowerCase();
        return (
          material.materialNumber?.toLowerCase().includes(searchLower) ||
          material.description?.toLowerCase().includes(searchLower) ||
          material.hsnCode?.toLowerCase().includes(searchLower) ||
          material.surgicalCategory?.description?.toLowerCase().includes(searchLower) ||
          material.implantType?.name?.toLowerCase().includes(searchLower) ||
          material.subCategory?.toLowerCase().includes(searchLower)
        );
      });
      setFilteredMaterials(filtered);
    }
  }, [materials, searchTerm]);

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

  const handleCheckboxUpdate = async (assignmentId, fieldName, value) => {
    try {
      setLoading(true);
      
      const updateData = {
        [fieldName]: value,
        updatedBy: currentUser._id
      };
      
      await hospitalAPI.updateMaterialAssignmentField(hospital._id, assignmentId, updateData);
      
      setSuccess(`${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)} updated successfully`);
      
      // Update local state
      setMaterials(prevMaterials => 
        prevMaterials.map(material => 
          material._id === assignmentId 
            ? { ...material, [fieldName]: value }
            : material
        )
      );
      
      // Also update filtered materials
      setFilteredMaterials(prevFiltered => 
        prevFiltered.map(material => 
          material._id === assignmentId 
            ? { ...material, [fieldName]: value }
            : material
        )
      );
      
    } catch (err) {
      setError(err.response?.data?.message || `Failed to update ${fieldName}`);
      console.error(`Error updating ${fieldName}:`, err);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  };

  if (!isOpen) return null;

  return (
    <div className="material-assignments-modal">
      <div className="material-assignments-content unified-container" style={{padding: '2rem', background: 'var(--light-bg)', position: 'relative'}}>
        {/* Header */}
        <div className="unified-header" style={{marginBottom: '1.5rem'}}>
          <div className="unified-header-content">
            <div className="unified-header-text">
              <h1 style={{fontSize: '1.5rem'}}>Material Assignments</h1>
              <p>Manage material assignments and pricing for {hospital?.shortName}</p>
            </div>
            {!showAddForm && (
              <button 
                className="unified-btn unified-btn-primary"
                onClick={() => setShowAddForm(true)}
              >
                Add Material Assignment
              </button>
            )}
          </div>
          <button 
            className="close-button"
            onClick={onClose}
            style={{position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer'}}
          >
            ×
          </button>
        </div>

        {error && <div className="unified-alert unified-alert-danger">{error}</div>}
        {success && <div className="unified-alert unified-alert-success">{success}</div>}

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
            <div style={{ borderBottom: '2px solid var(--gray-200)', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
              <h2>{editingAssignment ? 'Edit Material Assignment' : 'Add Material Assignment'}</h2>
            </div>
            <form onSubmit={handleAddMaterial}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem', marginBottom: '2rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: 'var(--gray-700)' }}>
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
              </div>

              {selectedMaterial && !hospital.defaultPricing && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: 'var(--gray-700)' }}>
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
                  
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: 'var(--gray-700)' }}>
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

              <div style={{ display: 'flex', gap: '1rem' }}>
                <button type="submit" className="unified-btn unified-btn-primary" disabled={loading}>
                  {loading ? 'Adding...' : 'Add Material'}
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
        )}

        {/* Materials List */}
        {!showAddForm && (
          <div className="unified-content">
            <div style={{ borderBottom: '2px solid var(--gray-200)', paddingBottom: '1rem', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2>Assigned Materials ({materials.length})</h2>
              <input
                type="text"
                className="unified-search-input"
                placeholder="Search materials..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ width: '300px' }}
              />
            </div>

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
                        <th>MRP</th>
                        <th>Institutional Price</th>
                        <th>Flagged Billed</th>
                        <th>Sticker Available</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredMaterials.map(assignment => (
                        <tr key={assignment._id}>
                          <td>{assignment.material?.materialNumber}</td>
                          <td style={{maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}} title={assignment.material?.description}>
                            {assignment.material?.description}
                          </td>
                          <td>{assignment.material?.surgicalCategory?.description}</td>
                          <td>{assignment.material?.implantType?.name}</td>
                          <td>{assignment.material?.subCategory}</td>
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
                              <span>{formatCurrency(assignment.mrp)}</span>
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
                              <span>{formatCurrency(assignment.institutionalPrice)}</span>
                            )}
                          </td>
                          <td>
                            <input
                              type="checkbox"
                              checked={assignment.flaggedBilled || false}
                              onChange={(e) => handleCheckboxUpdate(assignment._id, 'flaggedBilled', e.target.checked)}
                              className="unified-checkbox"
                            />
                          </td>
                          <td>
                            <input
                              type="checkbox"
                              checked={assignment.stickerAvailable || false}
                              onChange={(e) => handleCheckboxUpdate(assignment._id, 'stickerAvailable', e.target.checked)}
                              className="unified-checkbox"
                            />
                          </td>
                          <td>
                            {editingAssignment === assignment._id ? (
                              <div className="unified-btn-group">
                                <button
                                  type="button"
                                  onClick={handleUpdatePricing}
                                  className="unified-btn unified-btn-sm unified-btn-outline-success"
                                  disabled={loading}
                                >
                                  Save
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingAssignment(null)}
                                  className="unified-btn unified-btn-sm unified-btn-outline-secondary"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <div className="unified-btn-group">
                                {!hospital.defaultPricing && (
                                  <button
                                    type="button"
                                    onClick={() => handleEditPricing(assignment)}
                                    className="unified-btn unified-btn-sm unified-btn-outline-primary"
                                  >
                                    Edit
                                  </button>
                                )}
                                <button
                                  onClick={() => handleRemoveMaterial(assignment._id)}
                                  className="unified-btn unified-btn-sm unified-btn-outline-danger"
                                >
                                  Remove
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
                <div className="d-block d-md-none">
                  {filteredMaterials.map(assignment => (
                    <div key={assignment._id} className="unified-card-mobile">
                      <div className="unified-card-mobile-header">
                        <h4 style={{fontSize: '0.9rem'}}>{assignment.material?.materialNumber}</h4>
                        <span className="unified-badge unified-badge-primary">
                          MRP: {formatCurrency(assignment.mrp)}
                        </span>
                      </div>
                      <div className="unified-card-mobile-body">
                        <div className="unified-card-mobile-item">
                          <strong>Description:</strong> {assignment.material?.description}
                        </div>
                        <div className="unified-card-mobile-item">
                          <strong>Category:</strong> {assignment.material?.surgicalCategory?.description}
                        </div>
                        <div className="unified-card-mobile-item">
                          <strong>Institutional Price:</strong> {formatCurrency(assignment.institutionalPrice)}
                        </div>
                        <div className="unified-card-mobile-item">
                          <strong>Flagged Billed:</strong>
                          <input
                            type="checkbox"
                            checked={assignment.flaggedBilled || false}
                            onChange={(e) => handleCheckboxUpdate(assignment._id, 'flaggedBilled', e.target.checked)}
                            className="unified-checkbox"
                            style={{marginLeft: '0.5rem'}}
                          />
                        </div>
                        <div className="unified-card-mobile-item">
                          <strong>Sticker Available:</strong>
                          <input
                            type="checkbox"
                            checked={assignment.stickerAvailable || false}
                            onChange={(e) => handleCheckboxUpdate(assignment._id, 'stickerAvailable', e.target.checked)}
                            className="unified-checkbox"
                            style={{marginLeft: '0.5rem'}}
                          />
                        </div>
                      </div>
                      <div className="unified-card-mobile-actions">
                        {editingAssignment === assignment._id ? (
                          <>
                            <button
                              type="button"
                              onClick={handleUpdatePricing}
                              className="unified-btn unified-btn-sm unified-btn-outline-success"
                              disabled={loading}
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingAssignment(null)}
                              className="unified-btn unified-btn-sm unified-btn-outline-secondary"
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <>
                            {!hospital.defaultPricing && (
                              <button
                                type="button"
                                onClick={() => handleEditPricing(assignment)}
                                className="unified-btn unified-btn-sm unified-btn-outline-primary"
                              >
                                Edit
                              </button>
                            )}
                            <button
                              onClick={() => handleRemoveMaterial(assignment._id)}
                              className="unified-btn unified-btn-sm unified-btn-outline-danger"
                            >
                              Remove
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
  );
};

export default MaterialAssignments;
