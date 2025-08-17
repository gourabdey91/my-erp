import React, { useState, useEffect } from 'react';
import { materialAPI } from '../../services/materialAPI';
import { categoryAPI } from '../categories/services/categoryAPI';
import '../../shared/styles/unified-design.css';

const SimpleMaterialSelector = ({ 
  isOpen, 
  onClose, 
  onSelect, 
  surgicalCategory,
  hospital // Optional hospital for filtering
}) => {
  // Step 1: Surgical Category (may be pre-selected)
  const [selectedSurgicalCategory, setSelectedSurgicalCategory] = useState('');
  const [surgicalCategories, setSurgicalCategories] = useState([]);

  // Step 2: Implant Types (from ImplantType master collection)
  const [implantTypes, setImplantTypes] = useState([]);
  const [selectedImplantType, setSelectedImplantType] = useState('');
  const [loadingImplantTypes, setLoadingImplantTypes] = useState(false);

  // Step 3: Subcategories (distinct from materials)
  const [subcategories, setSubcategories] = useState([]);
  const [selectedSubcategory, setSelectedSubcategory] = useState('');
  const [loadingSubcategories, setLoadingSubcategories] = useState(false);

  // Step 4: Lengths (optional, distinct from materials)
  const [lengths, setLengths] = useState([]);
  const [selectedLength, setSelectedLength] = useState('');
  const [loadingLengths, setLoadingLengths] = useState(false);

  // Step 5: Final Materials List
  const [materials, setMaterials] = useState([]);
  const [filteredMaterials, setFilteredMaterials] = useState([]);
  const [loadingMaterials, setLoadingMaterials] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // General states
  const [error, setError] = useState('');

  // Initialize when modal opens
  useEffect(() => {
    if (isOpen) {
      resetAllFilters();
      fetchSurgicalCategories();
      
      // If surgical category is provided from template, set it
      if (surgicalCategory) {
        console.log('🎯 Pre-selecting surgical category:', surgicalCategory);
        setSelectedSurgicalCategory(surgicalCategory);
      }
    }
  }, [isOpen, surgicalCategory]);

  // When surgical category changes, fetch implant types
  useEffect(() => {
    if (selectedSurgicalCategory) {
      fetchImplantTypes(selectedSurgicalCategory);
    } else {
      setImplantTypes([]);
      resetDependentFilters();
    }
  }, [selectedSurgicalCategory]);

  // When implant type changes, fetch subcategories and materials
  useEffect(() => {
    if (selectedSurgicalCategory && selectedImplantType) {
      fetchSubcategories(selectedSurgicalCategory, selectedImplantType);
      fetchMaterials(); // Fetch materials immediately with just category + implant type
    } else {
      setSubcategories([]);
      resetFromSubcategory();
    }
  }, [selectedImplantType]);

  // When subcategory changes, fetch lengths and materials
  useEffect(() => {
    if (selectedSurgicalCategory && selectedImplantType) {
      if (selectedSubcategory) {
        fetchLengths(selectedSurgicalCategory, selectedImplantType, selectedSubcategory);
      }
      fetchMaterials(); // Fetch materials when we have category + type (subcategory is optional)
    } else {
      setLengths([]);
      setMaterials([]);
      setFilteredMaterials([]);
    }
  }, [selectedSubcategory]);

  // When length changes, re-filter materials
  useEffect(() => {
    if (selectedLength) {
      fetchMaterials(); // Re-fetch with length filter
    }
  }, [selectedLength]);

  // Apply search filter
  useEffect(() => {
    applySearchFilter();
  }, [searchTerm, materials]);

  const resetAllFilters = () => {
    if (!surgicalCategory) {
      setSelectedSurgicalCategory('');
    }
    setSelectedImplantType('');
    setSelectedSubcategory('');
    setSelectedLength('');
    setImplantTypes([]);
    setSubcategories([]);
    setLengths([]);
    setMaterials([]);
    setFilteredMaterials([]);
    setSearchTerm('');
    setError('');
  };

  const resetDependentFilters = () => {
    setSelectedImplantType('');
    resetFromSubcategory();
  };

  const resetFromSubcategory = () => {
    setSelectedSubcategory('');
    setSelectedLength('');
    setSubcategories([]);
    setLengths([]);
    setMaterials([]);
    setFilteredMaterials([]);
  };

  const fetchSurgicalCategories = async () => {
    try {
      const response = await categoryAPI.getAll({ page: 1, limit: 1000 });
      if (response.success) {
        setSurgicalCategories(response.data);
      }
    } catch (error) {
      console.error('Error fetching surgical categories:', error);
      setError('Failed to fetch surgical categories');
    }
  };

  const fetchImplantTypes = async (categoryId) => {
    try {
      setLoadingImplantTypes(true);
      setError('');
      console.log('🔍 Fetching implant types for category:', categoryId, 'hospital:', hospital);

      // Use the new distinct implant types API
      const response = await materialAPI.getImplantTypesBySurgicalCategory(categoryId, hospital);
      
      if (response && response.success) {
        setImplantTypes(response.data || []);
        console.log(`✅ Loaded ${response.data?.length || 0} implant types`);
      } else {
        setImplantTypes([]);
        console.log('No implant types found');
      }
    } catch (error) {
      console.error('Error fetching implant types:', error);
      setError('Failed to fetch implant types');
      setImplantTypes([]);
    } finally {
      setLoadingImplantTypes(false);
    }
  };

  const fetchSubcategories = async (categoryId, implantTypeId) => {
    try {
      setLoadingSubcategories(true);
      setError('');
      console.log('🔍 Fetching subcategories for:', categoryId, implantTypeId, 'hospital:', hospital);

      const response = await materialAPI.getDistinctSubcategories(categoryId, implantTypeId, hospital);
      
      if (response && response.success) {
        setSubcategories(response.data || []);
        console.log(`✅ Loaded ${response.data?.length || 0} subcategories`);
      } else {
        setSubcategories([]);
      }
    } catch (error) {
      console.error('Error fetching subcategories:', error);
      setError('Failed to fetch subcategories');
      setSubcategories([]);
    } finally {
      setLoadingSubcategories(false);
    }
  };

  const fetchLengths = async (categoryId, implantTypeId, subcategory) => {
    try {
      setLoadingLengths(true);
      console.log('🔍 Fetching lengths for:', categoryId, implantTypeId, subcategory, 'hospital:', hospital);

      const response = await materialAPI.getDistinctLengths(categoryId, implantTypeId, subcategory, hospital);
      
      if (response && response.success) {
        setLengths(response.data || []);
        console.log(`✅ Loaded ${response.data?.length || 0} lengths`);
      } else {
        setLengths([]);
      }
    } catch (error) {
      console.error('Error fetching lengths:', error);
      // Don't set error for lengths as it's optional
      setLengths([]);
    } finally {
      setLoadingLengths(false);
    }
  };

  const fetchMaterials = async () => {
    if (!selectedSurgicalCategory || !selectedImplantType) {
      return;
    }

    try {
      setLoadingMaterials(true);
      setError('');
      
      console.log('🔍 Fetching materials with filters:', {
        surgicalCategory: selectedSurgicalCategory,
        implantType: selectedImplantType,
        subcategory: selectedSubcategory || '(optional)',
        length: selectedLength,
        hospital: hospital
      });

      let response;

      if (hospital) {
        // Hospital-specific materials: Use hospital's assigned materials API
        console.log('🏥 Fetching hospital-specific materials via assigned materials API');
        
        const filters = {
          surgicalCategory: selectedSurgicalCategory,
          implantType: selectedImplantType,
          ...(selectedSubcategory && { subCategory: selectedSubcategory }),
          ...(selectedLength && { lengthMm: selectedLength })
        };

        response = await materialAPI.getAssignedMaterialsForInquiry(hospital, filters);
        
      } else {
        // Template mode: Use general material master API
        console.log('🔍 Fetching template-mode materials via material master API');
        
        const filters = {
          surgicalCategory: selectedSurgicalCategory,
          implantType: selectedImplantType,
          ...(selectedSubcategory && { subcategory: selectedSubcategory }),
          ...(selectedLength && { length: selectedLength })
        };

        response = await materialAPI.getMaterialsBySurgicalCategory(filters);
      }
      
      if (response && response.success && response.data) {
        setMaterials(response.data);
        console.log(`✅ Loaded ${response.data.length} materials (${hospital ? 'hospital-specific' : 'template-mode'})`);
      } else {
        setMaterials([]);
        setError('No materials found for the selected criteria');
      }
    } catch (error) {
      console.error('Error fetching materials:', error);
      setError('Failed to fetch materials');
      setMaterials([]);
    } finally {
      setLoadingMaterials(false);
    }
  };

  const applySearchFilter = () => {
    if (!searchTerm) {
      setFilteredMaterials(materials);
      return;
    }

    const filtered = materials.filter(material =>
      material.materialNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      material.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (material.hsnCode && material.hsnCode.toLowerCase().includes(searchTerm.toLowerCase()))
    );
    setFilteredMaterials(filtered);
  };

  const getStepStatus = (step) => {
    switch (step) {
      case 1: return selectedSurgicalCategory ? 'completed' : 'active';
      case 2: return selectedImplantType ? 'completed' : selectedSurgicalCategory ? 'active' : 'pending';
      case 3: return selectedSubcategory ? 'completed' : selectedImplantType ? 'active' : 'pending';
      case 4: return materials.length > 0 ? 'completed' : selectedImplantType ? 'active' : 'pending';
      default: return 'pending';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="unified-modal-overlay">
      <div className="unified-modal-container material-selector-modal">
        <div className="unified-modal-header">
          <div>
            <h2>Select Material - Cascading Filter</h2>
            <div className="material-selector-mode">
              {hospital ? (
                <span style={{ color: '#059669', fontSize: '0.875rem', fontWeight: '500' }}>
                  🏥 Hospital-Specific Materials
                </span>
              ) : (
                <span style={{ color: '#6366f1', fontSize: '0.875rem', fontWeight: '500' }}>
                  📋 Template Materials (All Available)
                </span>
              )}
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="unified-modal-close"
            aria-label="Close"
          >
            &times;
          </button>
        </div>

        <div className="unified-modal-body">
          {/* Progress Indicator */}
          <div className="filter-progress">
            <div className="progress-steps">
              <span className={`step ${getStepStatus(1)}`}>1. Category</span>
              <span className={`step ${getStepStatus(2)}`}>2. Type</span>
              <span className={`step ${getStepStatus(3)}`}>3. Subcategory</span>
              <span className={`step ${getStepStatus(4)}`}>4. Materials</span>
            </div>
          </div>

          {/* Step 1: Surgical Category */}
          {!surgicalCategory && (
            <div className="filter-group">
              <label>Step 1 - Select Surgical Category:</label>
              <select 
                value={selectedSurgicalCategory} 
                onChange={(e) => setSelectedSurgicalCategory(e.target.value)}
                className="filter-select"
              >
                <option value="">Choose Surgical Category</option>
                {surgicalCategories.map(category => (
                  <option key={category._id} value={category._id}>
                    {category.description}
                  </option>
                ))}
              </select>
            </div>
          )}

          {surgicalCategory && (
            <div className="filter-info">
              <strong>Surgical Category:</strong> {surgicalCategories.find(c => c._id === surgicalCategory)?.description || surgicalCategory}
            </div>
          )}

          {/* Step 2: Implant Type */}
          {selectedSurgicalCategory && (
            <div className="filter-group">
              <label>
                Step 2 - Select Implant Type:
                {loadingImplantTypes && <span className="loading-text"> (Loading...)</span>}
              </label>
              <select 
                value={selectedImplantType} 
                onChange={(e) => setSelectedImplantType(e.target.value)}
                className="filter-select"
                disabled={loadingImplantTypes}
              >
                <option value="">
                  {loadingImplantTypes ? 'Loading implant types...' : 'Choose Implant Type'}
                </option>
                {implantTypes.map(type => (
                  <option key={type._id} value={type._id}>
                    {type.name}
                  </option>
                ))}
              </select>
              <small className="filter-info">
                {implantTypes.length > 0 ? `${implantTypes.length} types available` : 'No implant types found'}
              </small>
            </div>
          )}

          {/* Step 3: Subcategory */}
          {selectedImplantType && (
            <div className="filter-group">
              <label>
                Step 3 - Select Subcategory (Optional):
                {loadingSubcategories && <span className="loading-text"> (Loading...)</span>}
              </label>
              <select 
                value={selectedSubcategory} 
                onChange={(e) => setSelectedSubcategory(e.target.value)}
                className="filter-select"
                disabled={loadingSubcategories}
              >
                <option value="">
                  {loadingSubcategories ? 'Loading subcategories...' : 'Choose Subcategory (Optional)'}
                </option>
                {subcategories.map(sub => (
                  <option key={sub} value={sub}>
                    {sub}
                  </option>
                ))}
              </select>
              <small className="filter-info">
                {subcategories.length > 0 ? `${subcategories.length} subcategories available` : 'No subcategories found'}
              </small>
            </div>
          )}

          {/* Step 4: Length (Optional) */}
          {selectedSubcategory && (
            <div className="filter-group">
              <label>
                Step 4 - Select Length (Optional):
                {loadingLengths && <span className="loading-text"> (Loading...)</span>}
              </label>
              <select 
                value={selectedLength} 
                onChange={(e) => setSelectedLength(e.target.value)}
                className="filter-select"
                disabled={loadingLengths}
              >
                <option value="">All Lengths</option>
                {lengths.map(length => (
                  <option key={length} value={length}>
                    {length}mm
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Search */}
          {materials.length > 0 && (
            <div className="search-section">
              <input
                type="text"
                placeholder="Search materials by number, description, or HSN..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
              />
            </div>
          )}

          {/* Loading States */}
          {loadingMaterials && <div className="loading">Loading materials...</div>}
          
          {/* Error Messages */}
          {error && <div className="error-message">{error}</div>}

          {/* Materials Grid */}
          {!loadingMaterials && filteredMaterials.length > 0 && (
            <div className="materials-list">
              <div className="materials-header">
                <span>Found {filteredMaterials.length} material(s)</span>
                <small>Click to select</small>
              </div>
              <div className="materials-grid">
                {filteredMaterials.map(material => (
                  <div key={material._id} className="material-card" onClick={() => onSelect(material)}>
                    <div className="material-info">
                      <div className="material-number">{material.materialNumber}</div>
                      <div className="material-description">{material.description}</div>
                      <div className="material-details">
                        <span className="detail-badge">{material.subCategory}</span>
                        {(material.lengthMm || material.length) && (
                          <span className="detail-badge">{material.lengthMm || material.length}mm</span>
                        )}
                      </div>
                      <div className="material-price">
                        ₹{material.institutionalPrice || material.mrp || 0}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* No Results */}
          {!loadingMaterials && selectedImplantType && materials.length === 0 && !error && (
            <div className="no-results">
              No materials found for the selected criteria.
            </div>
          )}

          {/* Instructions */}
          {selectedSurgicalCategory && !selectedImplantType && !loadingImplantTypes && implantTypes.length === 0 && (
            <div className="instruction-text">
              No implant types found for this surgical category. Please check your data or try a different category.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SimpleMaterialSelector;
