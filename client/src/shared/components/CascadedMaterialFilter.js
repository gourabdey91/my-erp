import React, { useState, useEffect, useCallback } from 'react';
import { materialMasterAPI } from '../../features/material-master/services/materialMasterAPI';

const CascadedMaterialFilter = ({ 
  filters, 
  onFilterChange, 
  className = '',
  showClearButton = true,
  disabled = false
}) => {
  const [categories, setCategories] = useState([]);
  const [implantTypes, setImplantTypes] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [lengths, setLengths] = useState([]);
  const [loading, setLoading] = useState(false);

  // Fetch categories on component mount
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await materialMasterAPI.getDropdownData();
        setCategories(response.surgicalCategories || []);
      } catch (err) {
        console.error('Error fetching categories:', err);
      }
    };
    
    fetchCategories();
  }, []);

  // Handle Surgical Category change
  const handleSurgicalCategoryChange = useCallback(async (surgicalCategoryId) => {
    const newFilters = {
      ...filters,
      surgicalCategory: surgicalCategoryId,
      implantType: '',
      subCategory: '',
      lengthMm: ''
    };
    
    onFilterChange(newFilters);
    
    // Reset dependent dropdowns
    setImplantTypes([]);
    setSubcategories([]);
    setLengths([]);
    
    if (surgicalCategoryId) {
      try {
        setLoading(true);
        const filteredTypes = await materialMasterAPI.getImplantTypesBySurgicalCategory(surgicalCategoryId);
        setImplantTypes(filteredTypes);
      } catch (err) {
        console.error('Error fetching filtered implant types:', err);
        setImplantTypes([]);
      } finally {
        setLoading(false);
      }
    }
  }, [filters, onFilterChange]);

  // Handle Implant Type change
  const handleImplantTypeChange = useCallback(async (implantTypeId) => {
    const newFilters = {
      ...filters,
      implantType: implantTypeId,
      subCategory: '',
      lengthMm: ''
    };
    
    onFilterChange(newFilters);
    
    // Reset dependent dropdowns
    setSubcategories([]);
    setLengths([]);
    
    if (implantTypeId && filters.surgicalCategory) {
      try {
        setLoading(true);
        const filteredSubs = await materialMasterAPI.getFilteredSubcategories(filters.surgicalCategory, implantTypeId);
        setSubcategories(filteredSubs);
      } catch (err) {
        console.error('Error fetching filtered subcategories:', err);
        setSubcategories([]);
      } finally {
        setLoading(false);
      }
    }
  }, [filters, onFilterChange]);

  // Handle Sub Category change
  const handleSubCategoryChange = useCallback(async (subCategoryValue) => {
    const newFilters = {
      ...filters,
      subCategory: subCategoryValue,
      lengthMm: ''
    };
    
    onFilterChange(newFilters);
    
    // Reset lengths
    setLengths([]);
    
    if (subCategoryValue && filters.surgicalCategory && filters.implantType) {
      try {
        setLoading(true);
        const filteredLengths = await materialMasterAPI.getFilteredLengths(
          filters.surgicalCategory, 
          filters.implantType, 
          subCategoryValue
        );
        setLengths(filteredLengths);
      } catch (err) {
        console.error('Error fetching filtered lengths:', err);
        setLengths([]);
      } finally {
        setLoading(false);
      }
    }
  }, [filters, onFilterChange]);

  // Handle Length change
  const handleLengthChange = useCallback((lengthValue) => {
    const newFilters = {
      ...filters,
      lengthMm: lengthValue
    };
    
    onFilterChange(newFilters);
  }, [filters, onFilterChange]);

  // Clear all filters
  const clearFilters = () => {
    const clearedFilters = {
      surgicalCategory: '',
      implantType: '',
      subCategory: '',
      lengthMm: ''
    };
    
    onFilterChange(clearedFilters);
    setImplantTypes([]);
    setSubcategories([]);
    setLengths([]);
  };

  // Initialize dependent dropdowns when filters are pre-populated
  useEffect(() => {
    const initializeDependentDropdowns = async () => {
      try {
        // If surgical category is selected, load implant types
        if (filters.surgicalCategory) {
          const filteredTypes = await materialMasterAPI.getImplantTypesBySurgicalCategory(filters.surgicalCategory);
          setImplantTypes(filteredTypes);
          
          // If implant type is also selected, load subcategories
          if (filters.implantType) {
            const filteredSubs = await materialMasterAPI.getFilteredSubcategories(filters.surgicalCategory, filters.implantType);
            setSubcategories(filteredSubs);
            
            // If subcategory is also selected, load lengths
            if (filters.subCategory) {
              const filteredLengths = await materialMasterAPI.getFilteredLengths(
                filters.surgicalCategory, 
                filters.implantType, 
                filters.subCategory
              );
              setLengths(filteredLengths);
            }
          }
        }
      } catch (err) {
        console.error('Error initializing dependent dropdowns:', err);
      }
    };

    initializeDependentDropdowns();
  }, []); // Only run once on mount

  return (
    <div className={`cascaded-material-filter ${className}`}>
      <div className="unified-filters-row">
        <div className="unified-filter-group">
          <label>Surgical Category</label>
          <select
            value={filters.surgicalCategory || ''}
            onChange={(e) => handleSurgicalCategoryChange(e.target.value)}
            className="unified-filter-select"
            disabled={disabled || loading}
          >
            <option value="">All Categories</option>
            {categories.map(category => (
              <option key={category._id} value={category._id}>
                {category.code} - {category.description}
              </option>
            ))}
          </select>
        </div>
        
        <div className="unified-filter-group">
          <label>Implant Type</label>
          <select
            value={filters.implantType || ''}
            onChange={(e) => handleImplantTypeChange(e.target.value)}
            className="unified-filter-select"
            disabled={disabled || loading || !filters.surgicalCategory}
            title={!filters.surgicalCategory ? 'Please select a surgical category first' : ''}
          >
            <option value="">
              {filters.surgicalCategory ? 'All Implant Types' : 'Select Category First'}
            </option>
            {implantTypes.map(implantType => (
              <option key={implantType._id} value={implantType._id}>
                {implantType.name}
              </option>
            ))}
          </select>
        </div>
        
        <div className="unified-filter-group">
          <label>Sub Category</label>
          <select
            value={filters.subCategory || ''}
            onChange={(e) => handleSubCategoryChange(e.target.value)}
            className="unified-filter-select"
            disabled={disabled || loading || !filters.implantType}
            title={!filters.implantType ? 'Please select an implant type first' : ''}
          >
            <option value="">
              {filters.implantType ? 'All Sub Categories' : 'Select Implant Type First'}
            </option>
            {subcategories.map((subcat, index) => (
              <option key={index} value={subcat.subCategory}>
                {subcat.subCategory}
              </option>
            ))}
          </select>
        </div>
        
        <div className="unified-filter-group">
          <label>Length</label>
          <select
            value={filters.lengthMm || ''}
            onChange={(e) => handleLengthChange(e.target.value)}
            className="unified-filter-select"
            disabled={disabled || loading || !filters.subCategory}
            title={!filters.subCategory ? 'Please select a sub category first' : ''}
          >
            <option value="">
              {filters.subCategory ? 'All Lengths' : 'Select Sub Category First'}
            </option>
            {lengths.map((length, index) => (
              <option key={index} value={length}>
                {length}mm
              </option>
            ))}
          </select>
        </div>
        
        {showClearButton && (
          <div className="unified-filter-group">
            <button
              type="button"
              className="unified-btn unified-btn-secondary"
              onClick={clearFilters}
              disabled={disabled || loading}
            >
              Clear Filters
            </button>
          </div>
        )}
      </div>
      
      {loading && (
        <div className="filter-loading-indicator">
          <span>Loading options...</span>
        </div>
      )}
    </div>
  );
};

export default CascadedMaterialFilter;
