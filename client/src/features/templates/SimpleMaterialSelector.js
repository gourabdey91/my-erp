import React, { useState, useEffect } from 'react';
import { materialAPI } from '../../services/materialAPI';
import '../../shared/styles/unified-design.css';

const SimpleMaterialSelector = ({ 
  isOpen, 
  onClose, 
  onSelect, 
  surgicalCategories = [],
  hospital 
}) => {
  const [materials, setMaterials] = useState([]);
  const [implantTypes, setImplantTypes] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [filteredMaterials, setFilteredMaterials] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedSurgicalCategory, setSelectedSurgicalCategory] = useState('');
  const [selectedImplantType, setSelectedImplantType] = useState('');
  const [selectedSubcategory, setSelectedSubcategory] = useState('');
  const [selectedLength, setSelectedLength] = useState('');

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      resetFilters();
      setError('');
    }
  }, [isOpen]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (isOpen && selectedSurgicalCategory) {
      fetchImplantTypes();
    }
  }, [isOpen, hospital, selectedSurgicalCategory]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (isOpen && selectedSurgicalCategory) {
      fetchMaterials();
    }
  }, [isOpen, hospital, selectedSurgicalCategory, selectedImplantType, selectedSubcategory, selectedLength]);

  const resetFilters = () => {
    setSelectedSurgicalCategory('');
    setSelectedImplantType('');
    setSelectedSubcategory('');
    setSelectedLength('');
    setImplantTypes([]);
    setSubcategories([]);
    setMaterials([]);
    setFilteredMaterials([]);
    setSearchTerm('');
  };

  const fetchImplantTypes = async () => {
    try {
      setLoading(true);
      setError('');
      
      const hospitalId = hospital?._id;
      
      if (!selectedSurgicalCategory) {
        setImplantTypes([]);
        return;
      }

      let response;
      if (hospitalId) {
        // Hospital-dependent: Get implant types specific to hospital and category
        response = await materialAPI.getAvailableImplantTypesForInquiry(hospitalId, selectedSurgicalCategory);
      } else {
        // Hospital-agnostic: Get all implant types for the surgical category
        response = await materialAPI.getImplantTypesBySurgicalCategory(selectedSurgicalCategory);
      }
      
      if (response.data && response.data.length > 0) {
        setImplantTypes(response.data);
      } else {
        setImplantTypes([]);
        setError(hospitalId 
          ? 'No implant types available for the selected hospital and surgical category'
          : 'No implant types available for the selected surgical category'
        );
      }
    } catch (error) {
      console.error('Error fetching implant types:', error);
      setError('Failed to load implant types');
      setImplantTypes([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchMaterials = async () => {
    try {
      setLoading(true);
      setError('');
      
      const hospitalId = hospital?._id;
      
      if (!selectedSurgicalCategory) {
        setMaterials([]);
        setFilteredMaterials([]);
        return;
      }

      let response;
      if (hospitalId) {
        // Hospital-dependent: Get materials specific to hospital
        response = await materialAPI.getMaterialsByFilters({
          hospitalId,
          surgicalCategory: selectedSurgicalCategory,
          implantType: selectedImplantType,
          subcategory: selectedSubcategory,
          length: selectedLength
        });
      } else {
        // Hospital-agnostic: Get all materials for the surgical category
        response = await materialAPI.getMaterialsBySurgicalCategory({
          surgicalCategory: selectedSurgicalCategory,
          implantType: selectedImplantType,
          subcategory: selectedSubcategory,
          length: selectedLength
        });
      }
      
      if (response.data && response.data.length > 0) {
        setMaterials(response.data);
        setFilteredMaterials(response.data);
      } else {
        setMaterials([]);
        setFilteredMaterials([]);
      }
    } catch (error) {
      console.error('Error fetching materials:', error);
      setError('Failed to load materials');
      setMaterials([]);
      setFilteredMaterials([]);
    } finally {
      setLoading(false);
    }
  };

  const handleImplantTypeChange = async (value) => {
    setSelectedImplantType(value);
    setSelectedSubcategory('');
    setSelectedLength('');
    
    if (!value) {
      setSubcategories([]);
      return;
    }

    try {
      const hospitalId = hospital?._id;
      if (!hospitalId) return;

      const response = await materialAPI.getSubcategoriesByImplantTypeAndCategory(value, selectedSurgicalCategory, hospitalId);
      
      if (response.data) {
        setSubcategories(response.data);
      } else {
        setSubcategories([]);
      }
    } catch (error) {
      console.error('Error fetching subcategories:', error);
      setSubcategories([]);
    }
  };

  const handleSubcategoryChange = (value) => {
    setSelectedSubcategory(value);
    setSelectedLength('');
  };

  const handleMaterialSelect = (material) => {
    if (onSelect) {
      onSelect(material);
    }
    onClose();
  };

  // Filter materials based on search term
  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredMaterials(materials);
    } else {
      const filtered = materials.filter(material =>
        material.materialNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        material.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        material.hsnCode?.includes(searchTerm)
      );
      setFilteredMaterials(filtered);
    }
  }, [searchTerm, materials]);

  if (!isOpen) return null;

  return (
    <div className="unified-modal-overlay" onClick={onClose}>
      <div className="unified-modal-content material-selector-modal" onClick={(e) => e.stopPropagation()}>
        <div className="unified-modal-header">
          <h3>Select Material</h3>
          <button className="unified-modal-close" onClick={onClose}>×</button>
        </div>
        
        <div className="unified-modal-body">
          {error && (
            <div className="unified-alert unified-alert-warning">
              ⚠️ {error}
            </div>
          )}
          
          {!hospital ? (
            <div className="unified-alert unified-alert-info">
              <strong>Hospital Context Required</strong>
              <p>Templates are hospital-agnostic. Material selection with full details requires hospital context, which is available when creating inquiries from templates. For now, you can enter material numbers directly in the table.</p>
              
              {surgicalCategories.length > 0 && (
                <div className="categories-info" style={{ marginTop: '1rem' }}>
                  <h4>Available Categories in Template:</h4>
                  <div className="categories-list" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.5rem' }}>
                    {surgicalCategories.map((category) => (
                      <span key={category._id || category.id} className="unified-tag" style={{ background: '#e5f3ff', color: '#0066cc', padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem' }}>
                        {category.description || category.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <>
              <div className="filter-row">
                <div className="filter-group">
                  <label>Surgical Category:</label>
                  <select 
                    value={selectedSurgicalCategory} 
                    onChange={(e) => {
                      setSelectedSurgicalCategory(e.target.value);
                      setSelectedImplantType('');
                      setSelectedSubcategory('');
                      setSelectedLength('');
                    }}
                    className="filter-select"
                    disabled={loading}
                  >
                    <option value="">Select Surgical Category</option>
                    {surgicalCategories.map(category => (
                      <option key={category._id || category.id} value={category._id || category.id}>
                        {category.description || category.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="filter-group">
                  <label>Implant Type:</label>
                  <select 
                    value={selectedImplantType} 
                    onChange={(e) => handleImplantTypeChange(e.target.value)}
                    className="filter-select"
                    disabled={loading || !selectedSurgicalCategory}
                  >
                    <option value="">{loading ? "Loading..." : "All Types"}</option>
                    {implantTypes.map(type => (
                      <option key={type._id} value={type.name}>
                        {type.name}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="filter-group">
                  <label>Subcategory:</label>
                  <select 
                    value={selectedSubcategory} 
                    onChange={(e) => handleSubcategoryChange(e.target.value)}
                    className="filter-select"
                    disabled={!selectedImplantType}
                  >
                    <option value="">All Subcategories</option>
                    {subcategories.map(sub => (
                      <option key={sub} value={sub}>
                        {sub}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="filter-group">
                  <label>Length:</label>
                  <select 
                    value={selectedLength} 
                    onChange={(e) => setSelectedLength(e.target.value)}
                    className="filter-select"
                    disabled={!selectedImplantType}
                  >
                    <option value="">All Lengths</option>
                    {/* Lengths will be populated dynamically based on available materials */}
                  </select>
                </div>
              </div>

              <div className="search-section">
                <input
                  type="text"
                  placeholder="Search materials..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="unified-input"
                />
              </div>

              <div className="materials-list">
                {loading ? (
                  <div className="loading-state">Loading materials...</div>
                ) : filteredMaterials.length > 0 ? (
                  filteredMaterials.map((material) => (
                    <div 
                      key={material._id} 
                      className="material-item"
                      onClick={() => handleMaterialSelect(material)}
                    >
                      <div className="material-info">
                        <div className="material-number">{material.materialNumber}</div>
                        <div className="material-description">{material.description}</div>
                        <div className="material-details">
                          <span>HSN: {material.hsnCode}</span>
                          <span>GST: {material.gstPercentage}%</span>
                          {material.implantType && <span>Type: {material.implantType}</span>}
                        </div>
                      </div>
                    </div>
                  ))
                ) : selectedSurgicalCategory ? (
                  <div className="no-materials">No materials found matching your criteria</div>
                ) : (
                  <div className="no-materials">Please select a surgical category to view materials</div>
                )}
              </div>
            </>
          )}
        </div>
        
        <div className="unified-modal-actions">
          <button className="unified-btn unified-btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default SimpleMaterialSelector;
