import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { hospitalAPI } from '../services/hospitalAPI';
import './MaterialAssignments.css';

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

  useEffect(() => {
    if (isOpen && hospital) {
      const activeMaterials = hospital.materialAssignments?.filter(assignment => assignment.isActive) || [];
      setMaterials(activeMaterials);
      setFilteredMaterials(activeMaterials);
      if (showAddForm) {
        fetchAvailableMaterials();
      }
    }
  }, [isOpen, hospital, showAddForm]);

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

  const fetchAvailableMaterials = async () => {
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
  };

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

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  };

  const clearMessages = () => {
    setError('');
    setSuccess('');
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content material-assignments-modal">
        <div className="modal-header">
          <h2>Material Assignments - {hospital?.shortName}</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          {error && (
            <div className="error-message">
              {error}
              <button onClick={clearMessages} className="close-error">×</button>
            </div>
          )}
          
          {success && (
            <div className="success-message">
              {success}
              <button onClick={clearMessages} className="close-success">×</button>
            </div>
          )}

          <div className="hospital-pricing-info">
            <div className="pricing-indicator">
              <span className="label">Default Pricing:</span>
              <span className={`value ${hospital?.defaultPricing ? 'enabled' : 'disabled'}`}>
                {hospital?.defaultPricing ? 'Enabled' : 'Disabled'}
              </span>
            </div>
            {hospital?.defaultPricing && (
              <p className="pricing-note">
                Material prices are automatically set from the material master and cannot be edited.
              </p>
            )}
          </div>

          <div className="materials-section">
            <div className="section-header">
              <h3>Assigned Materials ({materials.length})</h3>
              <div className="header-actions">
                <div className="search-container">
                  <input
                    type="text"
                    placeholder="Search materials..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="search-input"
                  />
                </div>
                {!showAddForm && (
                  <button 
                    className="add-button"
                    onClick={() => setShowAddForm(true)}
                    disabled={loading}
                  >
                    + Add Material
                  </button>
                )}
              </div>
            </div>

            {showAddForm && (
              <div className="add-material-form">
                <form onSubmit={handleAddMaterial}>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Select Material</label>
                      <select
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
                    <div className="form-row">
                      <div className="form-group">
                        <label>MRP</label>
                        <input
                          type="number"
                          step="0.01"
                          value={customPricing.mrp}
                          onChange={(e) => setCustomPricing(prev => ({...prev, mrp: e.target.value}))}
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label>Institutional Price</label>
                        <input
                          type="number"
                          step="0.01"
                          value={customPricing.institutionalPrice}
                          onChange={(e) => setCustomPricing(prev => ({...prev, institutionalPrice: e.target.value}))}
                          required
                        />
                      </div>
                    </div>
                  )}

                  <div className="form-actions">
                    <button type="button" onClick={() => setShowAddForm(false)} className="cancel-button">
                      Cancel
                    </button>
                    <button type="submit" className="submit-button" disabled={loading}>
                      {loading ? 'Adding...' : 'Add Material'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            <div className="materials-list">
              {materials.length === 0 ? (
                <div className="empty-state">
                  <p>No materials assigned yet.</p>
                </div>
              ) : (
                <div className="materials-table-container">
                  <table className="materials-table">
                    <thead>
                      <tr>
                        <th>Material Number</th>
                        <th>Description</th>
                        <th>Category</th>
                        <th>Implant Type</th>
                        <th>Sub Category</th>
                        <th>MRP</th>
                        <th>Institutional Price</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredMaterials.map(assignment => (
                        <tr key={assignment._id}>
                          <td data-label="Material Number">
                            <div className="material-number">
                              {assignment.material?.materialNumber}
                            </div>
                          </td>
                          <td data-label="Description">
                            <div className="material-description" title={assignment.material?.description}>
                              {assignment.material?.description}
                            </div>
                          </td>
                          <td data-label="Category">{assignment.material?.surgicalCategory?.description}</td>
                          <td data-label="Implant Type">{assignment.material?.implantType?.name}</td>
                          <td data-label="Sub Category">{assignment.material?.subCategory}</td>
                          <td data-label="MRP">
                            {editingAssignment === assignment._id ? (
                              <input
                                type="number"
                                step="0.01"
                                value={editPricing.mrp}
                                onChange={(e) => setEditPricing(prev => ({...prev, mrp: e.target.value}))}
                                className="price-input"
                                required
                              />
                            ) : (
                              <span className="price">{formatCurrency(assignment.mrp)}</span>
                            )}
                          </td>
                          <td data-label="Institutional Price">
                            {editingAssignment === assignment._id ? (
                              <input
                                type="number"
                                step="0.01"
                                value={editPricing.institutionalPrice}
                                onChange={(e) => setEditPricing(prev => ({...prev, institutionalPrice: e.target.value}))}
                                className="price-input"
                                required
                              />
                            ) : (
                              <span className="price">{formatCurrency(assignment.institutionalPrice)}</span>
                            )}
                          </td>
                          <td data-label="Actions">
                            <div className="action-buttons">
                              {editingAssignment === assignment._id ? (
                                <div className="edit-actions">
                                  <button
                                    type="button"
                                    onClick={() => setEditingAssignment(null)}
                                    className="cancel-btn"
                                    title="Cancel"
                                  >
                                    ✕
                                  </button>
                                  <button
                                    type="button"
                                    onClick={handleUpdatePricing}
                                    className="save-btn"
                                    disabled={loading}
                                    title="Save"
                                  >
                                    ✓
                                  </button>
                                </div>
                              ) : (
                                <div className="view-actions">
                                  {!hospital.defaultPricing && (
                                    <button
                                      className="edit-btn"
                                      onClick={() => handleEditPricing(assignment)}
                                      title="Edit Pricing"
                                    >
                                      ✏️
                                    </button>
                                  )}
                                  <button
                                    className="remove-btn"
                                    onClick={() => handleRemoveMaterial(assignment._id)}
                                    title="Remove Material"
                                  >
                                    🗑️
                                  </button>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  
                  {filteredMaterials.length === 0 && materials.length > 0 && (
                    <div className="no-results">
                      <p>No materials found matching "{searchTerm}"</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MaterialAssignments;
