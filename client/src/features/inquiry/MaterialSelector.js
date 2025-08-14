import React, { useState, useEffect } from 'react';
import '../../shared/styles/unified-design.css';

const MaterialSelector = ({ 
  isOpen, 
  onClose, 
  onSelect, 
  hospital, 
  surgicalCategory,
  dropdownData 
}) => {
  const [materials, setMaterials] = useState([]);
  const [filteredMaterials, setFilteredMaterials] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState(null);

  // Mock data for now - will be replaced with actual API call
  const mockMaterials = [
    {
      _id: '1',
      materialNumber: 'MAT001',
      description: 'Surgical Suture 3-0',
      hsnCode: '30051000',
      unitRate: 150.00,
      gstPercentage: 12,
      unit: 'PCS',
      category: 'Sutures'
    },
    {
      _id: '2',
      materialNumber: 'MAT002',
      description: 'Disposable Syringe 10ml',
      hsnCode: '90183100',
      unitRate: 25.50,
      gstPercentage: 12,
      unit: 'PCS',
      category: 'Disposables'
    },
    {
      _id: '3',
      materialNumber: 'MAT003',
      description: 'Surgical Gloves Size M',
      hsnCode: '40151100',
      unitRate: 180.00,
      gstPercentage: 18,
      unit: 'PAIR',
      category: 'PPE'
    },
    {
      _id: '4',
      materialNumber: 'MAT004',
      description: 'Orthopedic Implant Screw',
      hsnCode: '90212100',
      unitRate: 2500.00,
      gstPercentage: 5,
      unit: 'PCS',
      category: 'Implants'
    },
    {
      _id: '5',
      materialNumber: 'MAT005',
      description: 'Cardiac Stent Drug Eluting',
      hsnCode: '90212200',
      unitRate: 45000.00,
      gstPercentage: 5,
      unit: 'PCS',
      category: 'Cardiovascular'
    }
  ];

  // Fetch materials based on hospital and surgical category
  useEffect(() => {
    if (isOpen && hospital && surgicalCategory) {
      setLoading(true);
      
      // Simulate API call delay
      setTimeout(() => {
        // For now, return mock data filtered by category
        // In real implementation, this would be an API call to get materials
        // assigned to the specific hospital and surgical category
        setMaterials(mockMaterials);
        setFilteredMaterials(mockMaterials);
        setLoading(false);
      }, 500);
    }
  }, [isOpen, hospital, surgicalCategory]);

  // Filter materials based on search term
  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredMaterials(materials);
    } else {
      const filtered = materials.filter(material =>
        material.materialNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        material.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        material.hsnCode.includes(searchTerm)
      );
      setFilteredMaterials(filtered);
    }
  }, [searchTerm, materials]);

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
    onClose();
  };

  const formatCurrency = (amount) => {
    return parseFloat(amount).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  const getHospitalName = () => {
    const hospitalData = dropdownData.hospitals?.find(h => h._id === hospital);
    return hospitalData ? (hospitalData.shortName || hospitalData.legalName) : 'Unknown Hospital';
  };

  const getCategoryName = () => {
    const categoryData = dropdownData.surgicalCategories?.find(c => c._id === surgicalCategory);
    return categoryData ? categoryData.description : 'Unknown Category';
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
              <span className="context-label">Hospital:</span>
              <span className="context-value">{getHospitalName()}</span>
            </div>
            <div className="context-item">
              <span className="context-label">Surgical Category:</span>
              <span className="context-value">{getCategoryName()}</span>
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
                    <div className="material-header">
                      <span className="material-number">{material.materialNumber}</span>
                      <span className="material-category">{material.category}</span>
                    </div>
                    <div className="material-description">{material.description}</div>
                    <div className="material-details">
                      <div className="detail-group">
                        <span className="detail-label">HSN Code:</span>
                        <span className="detail-value">{material.hsnCode}</span>
                      </div>
                      <div className="detail-group">
                        <span className="detail-label">Unit Rate:</span>
                        <span className="detail-value">₹{formatCurrency(material.unitRate)}</span>
                      </div>
                      <div className="detail-group">
                        <span className="detail-label">GST:</span>
                        <span className="detail-value">{material.gstPercentage}%</span>
                      </div>
                      <div className="detail-group">
                        <span className="detail-label">Unit:</span>
                        <span className="detail-value">{material.unit}</span>
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
