import React, { useState, useEffect } from 'react';
import { materialAPI } from '../../services/materialAPI';
import '../../shared/styles/unified-design.css';

const MaterialSelector = ({ 
  isOpen, 
  onClose, 
  onSelect, 
  hospital, 
  procedure, // Changed from surgicalCategory to procedure
  dropdownData 
}) => {
  const [materials, setMaterials] = useState([]);
  const [filteredMaterials, setFilteredMaterials] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(''); // Add error state
  const [selectedMaterial, setSelectedMaterial] = useState(null);
  const [selectedSurgicalCategory, setSelectedSurgicalCategory] = useState(''); // Add surgical category selection
  
  // Filter states
  const [implantTypes, setImplantTypes] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [lengths, setLengths] = useState([]);
  
  // Selected filter values
  const [selectedImplantType, setSelectedImplantType] = useState('');
  const [selectedSubcategory, setSelectedSubcategory] = useState('');
  const [selectedLength, setSelectedLength] = useState('');

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedSurgicalCategory('');
      setSelectedImplantType('');
      setSelectedSubcategory('');
      setSelectedLength('');
      setError('');
      setMaterials([]);
      setFilteredMaterials([]);
    }
  }, [isOpen]);

  // Load implant types when component opens
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (isOpen && hospital && selectedSurgicalCategory) {
      loadAvailableImplantTypes();
    }
  }, [isOpen, hospital, selectedSurgicalCategory]);

  // Fetch materials when filters change
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (isOpen && hospital && selectedSurgicalCategory) {
      fetchMaterials();
    }
  }, [isOpen, hospital, selectedSurgicalCategory, selectedImplantType, selectedSubcategory, selectedLength]);

  // Filter materials based on search term and sort by unit rate
  useEffect(() => {
    let filtered;
    if (searchTerm.trim() === '') {
      filtered = [...materials];
    } else {
      filtered = materials.filter(material =>
        material.materialNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        material.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        material.hsnCode.includes(searchTerm)
      );
    }
    
    // Sort by unit rate (assignedInstitutionalPrice) in ascending order
    filtered.sort((a, b) => {
      const priceA = parseFloat(a.assignedInstitutionalPrice) || 0;
      const priceB = parseFloat(b.assignedInstitutionalPrice) || 0;
      return priceA - priceB;
    });
    
    setFilteredMaterials(filtered);
  }, [searchTerm, materials]);

  // Load available implant types for this hospital and surgical category
  const loadAvailableImplantTypes = async () => {
    try {
      // Extract IDs from objects if necessary
      const hospitalId = typeof hospital === 'object' ? hospital._id : hospital;
      
      console.log('🚀 Loading implant types for:', { hospitalId, selectedSurgicalCategory });
      
      if (!hospitalId || !selectedSurgicalCategory) {
        console.warn('⚠️ Missing hospital or surgical category ID');
        setImplantTypes([]);
        setError('Please select both hospital and surgical category first');
        return;
      }
      
      setLoading(true);
      setError(''); // Clear any previous errors
      
      const response = await materialAPI.getAvailableImplantTypesForInquiry(hospitalId, selectedSurgicalCategory);
      console.log('📊 Implant types API response:', response);
      
      if (response && response.success) {
        console.log('✅ Available implant types:', response.data);
        setImplantTypes(response.data || []);
        
        // Show user feedback if no implant types found
        if (!response.data || response.data.length === 0) {
          setError('No implant types available for the selected hospital and surgical category');
        }
      } else {
        console.warn('❌ Failed to load implant types:', response);
        setImplantTypes([]);
        setError(response.error || 'Failed to load implant types. Please try again.');
      }
    } catch (error) {
      console.error('❌ Error loading available implant types:', error);
      setImplantTypes([]);
      setError(`Network error: ${error.message}. Please check your connection and try again.`);
    } finally {
      setLoading(false);
    }
  };

  // Fetch materials with current filters
  const fetchMaterials = async () => {
    setLoading(true);
    
    try {
      // Extract IDs from objects if necessary
      const hospitalId = typeof hospital === 'object' ? hospital._id : hospital;
      
      const filters = {
        surgicalCategory: selectedSurgicalCategory,
        ...(selectedImplantType && { implantType: selectedImplantType }),
        ...(selectedSubcategory && { subCategory: selectedSubcategory }),
        ...(selectedLength && { lengthMm: selectedLength })
      };

      const response = await materialAPI.getAssignedMaterialsForInquiry(hospitalId, filters);
      
      if (response.success) {
        setMaterials(response.data || []);
        setFilteredMaterials(response.data || []);
      } else {
        setMaterials([]);
        setFilteredMaterials([]);
      }
    } catch (error) {
      console.error('Error fetching materials:', error);
      setMaterials([]);
      setFilteredMaterials([]);
    } finally {
      setLoading(false);
    }
  };

  // Handle implant type change
  const handleImplantTypeChange = async (value) => {
    setSelectedImplantType(value);
    setSelectedSubcategory('');
    setSelectedLength('');
    
    if (value) {
      // Extract IDs from objects if necessary
      const hospitalId = typeof hospital === 'object' ? hospital._id : hospital;
      const surgicalCategoryId = typeof surgicalCategory === 'object' ? surgicalCategory._id : surgicalCategory;
      
      // Load subcategories for selected implant type
      try {
        const response = await materialAPI.getSubcategoriesByImplantTypeAndCategory(value, surgicalCategoryId, hospitalId);
        if (response.success) {
          setSubcategories(response.data || []);
        }
      } catch (error) {
        console.error('Error loading subcategories:', error);
        setSubcategories([]);
      }
      
      // Load lengths for selected implant type
      try {
        const lengthResponse = await materialAPI.getLengthsByCriteria(hospitalId, { 
          surgicalCategory: surgicalCategoryId, 
          implantType: value 
        });
        if (lengthResponse.success) {
          const lengthData = lengthResponse.data || [];
          console.log('🔧 Length data received:', lengthData);
          
          // Ensure all lengths are primitives
          const safeLengths = lengthData.filter(length => {
            if (typeof length === 'object') {
              console.warn('⚠️ Found object in lengths:', length);
              return false;
            }
            return true;
          });
          
          setLengths(safeLengths);
          console.log('✅ Safe lengths set:', safeLengths);
        }
      } catch (error) {
        console.error('Error loading lengths:', error);
        setLengths([]);
      }
    } else {
      setSubcategories([]);
      setLengths([]);
    }
  };

  // Handle subcategory change
  const handleSubcategoryChange = async (value) => {
    setSelectedSubcategory(value);
    setSelectedLength('');
    
    if (value && selectedImplantType) {
      // Extract IDs from objects if necessary
      const hospitalId = typeof hospital === 'object' ? hospital._id : hospital;
      const surgicalCategoryId = typeof surgicalCategory === 'object' ? surgicalCategory._id : surgicalCategory;
      
      // Load lengths for selected implant type and subcategory
      try {
        const lengthResponse = await materialAPI.getLengthsByCriteria(hospitalId, { 
          surgicalCategory: surgicalCategoryId,
          implantType: selectedImplantType,
          subCategory: value
        });
        if (lengthResponse.success) {
          const lengthData = lengthResponse.data || [];
          console.log('🔧 Length data received (subcategory):', lengthData);
          
          // Ensure all lengths are primitives
          const safeLengths = lengthData.filter(length => {
            if (typeof length === 'object') {
              console.warn('⚠️ Found object in lengths (subcategory):', length);
              return false;
            }
            return true;
          });
          
          setLengths(safeLengths);
          console.log('✅ Safe lengths set (subcategory):', safeLengths);
        }
      } catch (error) {
        console.error('Error loading lengths:', error);
        setLengths([]);
      }
    }
  };

  const handleMaterialSelect = (material) => {
    setSelectedMaterial(material);
  };

  const handleConfirmSelection = () => {
    if (selectedMaterial) {
      onSelect(selectedMaterial);
      handleClose();
    }
  };

  const handleClose = () => {
    setSelectedMaterial(null);
    setSearchTerm('');
    setSelectedSurgicalCategory(''); // Reset surgical category selection
    setSelectedImplantType('');
    setSelectedSubcategory('');
    setSelectedLength('');
    onClose();
  };

  const formatCurrency = (amount) => {
    if (typeof amount !== 'number' || isNaN(amount) || amount === null || amount === undefined) {
      return '0.00';
    }
    return amount.toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  const getHospitalName = () => {
    try {
      const hospitalId = typeof hospital === 'object' ? hospital._id : hospital;
      const hospitalData = dropdownData?.hospitals?.find(h => h._id === hospitalId);
      return hospitalData ? (hospitalData.shortName || hospitalData.legalName || 'Unknown Hospital') : 'Unknown Hospital';
    } catch (error) {
      console.error('Error getting hospital name:', error);
      return 'Unknown Hospital';
    }
  };

  // Get available surgical categories from selected procedure
  const getAvailableSurgicalCategories = () => {
    if (!procedure || !procedure.items) {
      return [];
    }
    return procedure.items.map(item => ({
      _id: item.surgicalCategoryId._id || item.surgicalCategoryId,
      description: item.surgicalCategoryId.description || 'Unknown Category'
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="unified-modal-overlay">
      <div className="unified-modal-container material-selector-modal">
        <div className="unified-modal-header">
          <h2>Select Material</h2>
          <button 
            className="unified-modal-close"
            onClick={handleClose}
            type="button"
          >
            &times;
          </button>
        </div>

        <div className="unified-modal-body">
          {/* Context Information */}
          <div className="material-selector-context">
            <div className="context-item">
              <span className="context-label">Procedure:</span>
              <span className="context-value">{procedure ? `${procedure.code} - ${procedure.name}` : 'No Procedure Selected'}</span>
            </div>
          </div>

          {/* Filter Controls */}
          <div className="filter-section">
            {/* Error Display */}
            {error && (
              <div className="error-message" style={{
                background: '#ffe6e6',
                color: '#d32f2f',
                padding: '10px',
                borderRadius: '4px',
                marginBottom: '15px',
                border: '1px solid #ffcdd2'
              }}>
                ⚠️ {error}
              </div>
            )}
            
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
                  disabled={loading || !procedure}
                >
                  <option value="">{procedure ? "Select Surgical Category" : "No Procedure Selected"}</option>
                  {getAvailableSurgicalCategories().map(category => (
                    <option key={category._id} value={category._id}>
                      {category.description}
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
                >
                  <option value="">All Lengths</option>
                  {lengths.map((length, index) => (
                    <option key={index} value={length}>
                      {typeof length === 'object' ? JSON.stringify(length) : length}mm
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Search */}
          <div className="unified-form-field">
            <label className="unified-form-label">Search Materials</label>
            <input
              type="text"
              className="unified-search-input"
              placeholder="Search by material number, description, or HSN code..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Materials List */}
          <div className="materials-list-container">
            {loading ? (
              <div className="unified-loading">
                <div className="unified-loading-spinner"></div>
                <span>Loading materials...</span>
              </div>
            ) : filteredMaterials.length === 0 ? (
              <div className="unified-empty-state">
                <div className="unified-empty-icon">📦</div>
                <div className="unified-empty-title">No Materials Found</div>
                <div className="unified-empty-subtitle">
                  {searchTerm 
                    ? 'Try adjusting your search criteria'
                    : 'No materials available for this hospital and category combination'
                  }
                </div>
              </div>
            ) : (
              <div className="materials-list">
                {filteredMaterials.map(material => (
                  <div
                    key={material._id}
                    className={`material-item ${selectedMaterial?._id === material._id ? 'selected' : ''}`}
                    onClick={() => handleMaterialSelect(material)}
                  >
                    <div className="material-main-row">
                      <div className="material-left">
                        <span className="material-number clickable">{material.materialNumber}</span>
                        <span className="material-description">{material.description}</span>
                      </div>
                      <div className="material-right">
                        <span className="material-unit-rate">₹{formatCurrency(material.assignedInstitutionalPrice)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="unified-modal-actions">
          <button
            type="button"
            className="unified-btn unified-btn-secondary"
            onClick={handleClose}
          >
            Cancel
          </button>
          <button
            type="button"
            className="unified-btn unified-btn-primary"
            onClick={handleConfirmSelection}
            disabled={!selectedMaterial}
          >
            Select Material
          </button>
        </div>
      </div>
    </div>
  );
};

export default MaterialSelector;
