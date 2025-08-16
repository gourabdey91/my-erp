import React, { useState, useEffect } from 'react';
import { materialAPI } from '../../services/materialAPI';
import { categoryAPI } from '../categories/services/categoryAPI';
import '../../shared/styles/unified-design.css';

const SimpleMaterialSelector = ({ 
  isOpen, 
  onClose, 
  onSelect, 
  hospital,
  surgicalCategory 
}) => {
  const [materials, setMaterials] = useState([]);
  const [implantTypes, setImplantTypes] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [lengths, setLengths] = useState([]);
  const [filteredMaterials, setFilteredMaterials] = useState([]);
  const [surgicalCategories, setSurgicalCategories] = useState([]);
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
      fetchSurgicalCategories();
      
      // Set surgical category from template if provided - do this after resetFilters
      if (surgicalCategory) {
        console.log('Setting surgical category from template:', surgicalCategory);
        setTimeout(() => {
          setSelectedSurgicalCategory(surgicalCategory);
        }, 0);
      }
    }
  }, [isOpen, surgicalCategory]);

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
    // Don't reset surgical category if it's provided from template
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

      console.log('Fetching materials with filters:', {
        hospitalId,
        surgicalCategory: selectedSurgicalCategory,
        implantType: selectedImplantType,
        subcategory: selectedSubcategory,
        length: selectedLength
      });

      let response;
      if (hospitalId) {
        // Hospital-dependent: Use inquiry API for assigned materials
        const filters = {
          surgicalCategory: selectedSurgicalCategory,
          ...(selectedImplantType && { implantType: selectedImplantType }),
          ...(selectedSubcategory && { subCategory: selectedSubcategory }),
          ...(selectedLength && { lengthMm: selectedLength })
        };
        
        response = await materialAPI.getAssignedMaterialsForInquiry(hospitalId, filters);
      } else {
        // Hospital-agnostic: Get all materials for the surgical category
        const filters = {
          surgicalCategory: selectedSurgicalCategory,
          ...(selectedImplantType && { implantType: selectedImplantType }),
          ...(selectedSubcategory && { subcategory: selectedSubcategory }),
          ...(selectedLength && { length: selectedLength })
        };
        
        response = await materialAPI.getMaterialsBySurgicalCategory(filters);
      }
      
      console.log('Materials API response:', response);
      
      if (response && response.success && response.data && response.data.length > 0) {
        const materials = response.data;
        // Sort materials by unit rate or assignedInstitutionalPrice
        materials.sort((a, b) => {
          const priceA = parseFloat(a.assignedInstitutionalPrice || a.unitRate || 0);
          const priceB = parseFloat(b.assignedInstitutionalPrice || b.unitRate || 0);
          return priceA - priceB;
        });
        
        setMaterials(materials);
        setFilteredMaterials(materials);
        console.log('Materials loaded successfully:', materials.length);
      } else {
        setMaterials([]);
        setFilteredMaterials([]);
        console.log('No materials found or API error');
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

  // Fetch subcategories for selected implant type
  const fetchSubcategories = async (implantType) => {
    if (!implantType || !selectedSurgicalCategory) {
      setSubcategories([]);
      return;
    }

    try {
      const hospitalId = hospital?._id;
      
      if (hospitalId) {
        const response = await materialAPI.getSubcategoriesByImplantTypeAndCategory(
          implantType, 
          selectedSurgicalCategory, 
          hospitalId
        );
        if (response && response.success) {
          setSubcategories(response.data || []);
        }
      } else {
        // For hospital-agnostic materials, get subcategories from all materials
        const response = await materialAPI.getMaterialsBySurgicalCategory({
          surgicalCategory: selectedSurgicalCategory,
          implantType
        });
        
        if (response && response.success && response.data) {
          const uniqueSubcategories = [...new Set(
            response.data
              .filter(m => m.subcategory)
              .map(m => m.subcategory)
          )];
          setSubcategories(uniqueSubcategories);
        }
      }
    } catch (error) {
      console.error('Error fetching subcategories:', error);
      setSubcategories([]);
    }
  };

  // Fetch lengths for selected filters
  const fetchLengths = async (implantType, subcategory = null) => {
    if (!implantType || !selectedSurgicalCategory) {
      setLengths([]);
      return;
    }

    try {
      const hospitalId = hospital?._id;
      
      if (hospitalId) {
        const criteria = {
          surgicalCategory: selectedSurgicalCategory,
          implantType
        };
        
        if (subcategory) {
          criteria.subCategory = subcategory;
        }

        const response = await materialAPI.getLengthsByCriteria(hospitalId, criteria);
        
        if (response && response.success) {
          const lengthData = response.data || [];
          
          // Ensure all lengths are primitives and sort them
          const safeLengths = lengthData
            .filter(length => typeof length !== 'object')
            .sort((a, b) => {
              const aNum = parseFloat(a);
              const bNum = parseFloat(b);
              if (!isNaN(aNum) && !isNaN(bNum)) {
                return aNum - bNum;
              }
              return a.localeCompare(b);
            });
            
          setLengths(safeLengths);
        }
      } else {
        // For hospital-agnostic materials, get lengths from all materials
        const params = {
          surgicalCategory: selectedSurgicalCategory,
          implantType
        };
        
        if (subcategory) {
          params.subcategory = subcategory;
        }

        const response = await materialAPI.getMaterialsBySurgicalCategory(params);
        
        if (response && response.success && response.data) {
          const uniqueLengths = [...new Set(
            response.data
              .filter(m => m.length)
              .map(m => m.length)
          )].sort((a, b) => {
            const aNum = parseFloat(a);
            const bNum = parseFloat(b);
            if (!isNaN(aNum) && !isNaN(bNum)) {
              return aNum - bNum;
            }
            return a.localeCompare(b);
          });
          
          setLengths(uniqueLengths);
        }
      }
    } catch (error) {
      console.error('Error fetching lengths:', error);
      setLengths([]);
    }
  };

  const handleImplantTypeChange = async (value) => {
    setSelectedImplantType(value);
    setSelectedSubcategory('');
    setSelectedLength('');
    
    if (!value) {
      setSubcategories([]);
      setLengths([]);
      return;
    }

    // Use helper functions for cleaner code
    await Promise.all([
      fetchSubcategories(value),
      fetchLengths(value)
    ]);
  };

  const handleSubcategoryChange = async (value) => {
    setSelectedSubcategory(value);
    setSelectedLength('');
    
    // Fetch lengths for the selected subcategory
    if (selectedImplantType) {
      await fetchLengths(selectedImplantType, value);
    }
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
          
          {/* Always show material selector interface regardless of hospital context */}
          <>
            {!hospital && (
              <div className="unified-alert unified-alert-info" style={{ marginBottom: '1rem' }}>
                <strong>Hospital-Agnostic Template</strong>
                <p>This template is not tied to a specific hospital. Materials shown are from the general catalog. Hospital-specific pricing and assignments will apply when creating inquiries from this template.</p>
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
                  disabled={loading || surgicalCategory} // Disable if surgical category is provided from template
                >
                  <option value="">
                    {surgicalCategory ? 
                      (surgicalCategories.find(cat => cat._id === surgicalCategory)?.description || 'Template Category') :
                      'Select Surgical Category'
                    }
                  </option>
                  {!surgicalCategory && surgicalCategories.map(category => (
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
                  {lengths.map(length => (
                    <option key={length} value={length}>
                      {length}
                    </option>
                  ))}
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
              ) : surgicalCategory ? (
                <div className="no-materials">Loading materials for template category...</div>
              ) : (
                <div className="no-materials">Please select a surgical category to view materials</div>
              )}
            </div>
          </>
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
