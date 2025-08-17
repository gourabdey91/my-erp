import React, { useState, useEffect } from 'react';
import { materialAPI } from '../../services/materialAPI';
import { categoryAPI } from '../categories/services/categoryAPI';
import '../../shared/styles/unified-design.css';

const SimpleMaterialSelector = ({ 
  isOpen, 
  onClose, 
  onSelect, 
  surgicalCategory
}) => {
  const [materials, setMaterials] = useState([]);
  const [filteredMaterials, setFilteredMaterials] = useState([]);
  const [surgicalCategories, setSurgicalCategories] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Filters
  const [selectedSurgicalCategory, setSelectedSurgicalCategory] = useState('');
  const [implantTypes, setImplantTypes] = useState([]);
  const [selectedImplantType, setSelectedImplantType] = useState('');
  const [subcategories, setSubcategories] = useState([]);
  const [selectedSubcategory, setSelectedSubcategory] = useState('');
  const [lengths, setLengths] = useState([]);
  const [selectedLength, setSelectedLength] = useState('');

  const resetFilters = () => {
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
  };

  const fetchSurgicalCategories = async () => {
    try {
      const response = await categoryAPI.getAll({ page: 1, limit: 1000 });
      if (response.success) {
        setSurgicalCategories(response.data);
      }
    } catch (error) {
      console.error('Error fetching surgical categories:', error);
      setSurgicalCategories([]);
    }
  };

  const extractSubcategoriesAndLengths = (materials) => {
    // Extract unique subcategories
    const uniqueSubcategories = [...new Set(
      materials
        .map(material => material.subCategory)
        .filter(Boolean)
    )].sort();
    setSubcategories(uniqueSubcategories);

    // Extract unique lengths
    const uniqueLengths = [...new Set(
      materials
        .map(material => material.lengthMm || material.length)
        .filter(val => val != null)
    )].sort((a, b) => {
      const aNum = parseFloat(a);
      const bNum = parseFloat(b);
      if (!isNaN(aNum) && !isNaN(bNum)) {
        return aNum - bNum;
      }
      return String(a).localeCompare(String(b));
    });
    setLengths(uniqueLengths);
  };

  const fetchMaterials = async () => {
    // Prevent multiple simultaneous API calls
    if (loading) {
      console.log('⏳ fetchMaterials already in progress, skipping...');
      return;
    }
    
    try {
      setLoading(true);
      setError('');
      
      if (!selectedSurgicalCategory) {
        setMaterials([]);
        setFilteredMaterials([]);
        return;
      }

      console.log('Fetching materials for surgical category:', selectedSurgicalCategory);

      // Build filters
      const filters = {
        surgicalCategory: selectedSurgicalCategory,
        ...(selectedImplantType && { implantType: selectedImplantType }),
        ...(selectedSubcategory && { subcategory: selectedSubcategory }),
        ...(selectedLength && { length: selectedLength })
      };

      const response = await materialAPI.getMaterialsBySurgicalCategory(filters);
      
      if (response && response.success && response.data) {
        const materials = response.data;
        setMaterials(materials);
        
        // Extract subcategories and lengths from filtered materials (not implant types)
        extractSubcategoriesAndLengths(materials);
        
        // Apply search filter
        applySearch(materials);
      } else {
        setMaterials([]);
        setFilteredMaterials([]);
        setError('No materials found for the selected filters');
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

  const applySearch = (materialsToFilter = materials) => {
    if (!searchTerm) {
      setFilteredMaterials(materialsToFilter);
      return;
    }

    const filtered = materialsToFilter.filter(material =>
      material.materialNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      material.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (material.hsnCode && material.hsnCode.includes(searchTerm))
    );
    setFilteredMaterials(filtered);
  };

  // Reset state when modal opens
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (isOpen) {
      resetFilters();
      setError('');
      fetchSurgicalCategories();
      
      // Set surgical category from template if provided
      if (surgicalCategory) {
        console.log('Setting surgical category from template:', surgicalCategory);
        setSelectedSurgicalCategory(surgicalCategory);
      }
    }
  }, [isOpen, surgicalCategory]);

  // Fetch implant types when surgical category changes
  useEffect(() => {
    const fetchImplantTypes = async () => {
      if (selectedSurgicalCategory) {
        try {
          console.log('🔍 Fetching implant types for surgical category:', selectedSurgicalCategory);
          
          const response = await materialAPI.getImplantTypesBySurgicalCategory(selectedSurgicalCategory);
          
          if (response && response.success && response.data) {
            console.log('✅ Found implant types:', response.data);
            const implantTypeNames = response.data.map(type => {
              // Handle both object and string formats
              if (typeof type === 'object' && type.name) {
                return type.name;
              } else if (typeof type === 'string') {
                return type;
              }
              return null;
            }).filter(Boolean);
            
            setImplantTypes(implantTypeNames);
            console.log('📋 Setting implant types:', implantTypeNames);
          } else {
            console.warn('⚠️ No implant types found');
            setImplantTypes([]);
          }
        } catch (error) {
          console.error('❌ Error fetching implant types:', error);
          setImplantTypes([]);
        }
      } else {
        setImplantTypes([]);
      }
    };

    fetchImplantTypes();
  }, [selectedSurgicalCategory]);

  // Fetch materials when surgical category or filters change
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (isOpen && selectedSurgicalCategory) {
      fetchMaterials();
    }
  }, [isOpen, selectedSurgicalCategory, selectedImplantType, selectedSubcategory, selectedLength]);

  // Apply search when search term changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    applySearch();
  }, [searchTerm, materials]);

  const handleImplantTypeChange = (value) => {
    setSelectedImplantType(value);
    setSelectedSubcategory('');
    setSelectedLength('');
  };

  const handleSubcategoryChange = (value) => {
    setSelectedSubcategory(value);
    setSelectedLength('');
  };

  const handleLengthChange = (value) => {
    setSelectedLength(value);
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content material-selector-modal">
        <div className="modal-header">
          <h2>Select Material</h2>
          <button onClick={onClose} className="close-button">&times;</button>
        </div>

        <div className="modal-body">
          {/* Surgical Category Selection */}
          {!surgicalCategory && (
            <div className="filter-group">
              <label>Surgical Category:</label>
              <select 
                value={selectedSurgicalCategory} 
                onChange={(e) => setSelectedSurgicalCategory(e.target.value)}
                className="filter-select"
              >
                <option value="">Select Surgical Category</option>
                {surgicalCategories.map(category => (
                  <option key={category._id} value={category._id}>
                    {category.description}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Filter Controls */}
          {selectedSurgicalCategory && (
            <div className="filters-section">
              <div className="filters-row">
                <div className="filter-group">
                  <label>Implant Type:</label>
                  <select 
                    value={selectedImplantType} 
                    onChange={(e) => handleImplantTypeChange(e.target.value)}
                    className="filter-select"
                  >
                    <option value="">All Types</option>
                    {implantTypes.map(type => (
                      <option key={type} value={type}>
                        {type}
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
                  >
                    <option value="">All Subcategories</option>
                    {subcategories.map(subcategory => (
                      <option key={subcategory} value={subcategory}>
                        {subcategory}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="filter-group">
                  <label>Length:</label>
                  <select 
                    value={selectedLength} 
                    onChange={(e) => handleLengthChange(e.target.value)}
                    className="filter-select"
                  >
                    <option value="">All Lengths</option>
                    {lengths.map(length => (
                      <option key={length} value={length}>
                        {length}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Search */}
              <div className="search-section">
                <input
                  type="text"
                  placeholder="Search by material number, description, or HSN code..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="search-input"
                />
              </div>
            </div>
          )}

          {/* Loading and Error States */}
          {loading && <div className="loading">Loading materials...</div>}
          {error && <div className="error-message">{error}</div>}

          {/* Materials List */}
          {!loading && filteredMaterials.length > 0 && (
            <div className="materials-list">
              <div className="materials-header">
                <span>Found {filteredMaterials.length} material(s)</span>
              </div>
              <div className="materials-grid">
                {filteredMaterials.map(material => (
                  <div key={material._id} className="material-card" onClick={() => onSelect(material)}>
                    <div className="material-info">
                      <div className="material-number">{material.materialNumber}</div>
                      <div className="material-description">{material.description}</div>
                      <div className="material-details">
                        {material.implantType && (
                          <span className="detail-badge">
                            {typeof material.implantType === 'object' ? material.implantType.name : material.implantType}
                          </span>
                        )}
                        {material.subCategory && (
                          <span className="detail-badge">{material.subCategory}</span>
                        )}
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
          {!loading && selectedSurgicalCategory && filteredMaterials.length === 0 && !error && (
            <div className="no-results">
              No materials found matching your criteria. Try adjusting your filters.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SimpleMaterialSelector;
