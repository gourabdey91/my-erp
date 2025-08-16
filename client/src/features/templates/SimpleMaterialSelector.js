import React, { useState, useEffect } from 'react';
import { materialAPI } from '../../services/materialAPI';
import '../../shared/styles/unified-design.css';

const SimpleMaterialSelector = ({ 
  isOpen, 
  onClose, 
  onSelect, 
  surgicalCategories = [] 
}) => {
  const [materials, setMaterials] = useState([]);
  const [filteredMaterials, setFilteredMaterials] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedCategory('');
      setError('');
      setMaterials([]);
      setFilteredMaterials([]);
      setSearchTerm('');
      
      // For templates, we'll just show a message that hospital selection is needed
      setError('Material selection requires hospital context. Please use material number input instead.');
    }
  }, [isOpen]);

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
      <div className="unified-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="unified-modal-header">
          <h3>Select Material</h3>
          <button className="unified-modal-close" onClick={onClose}>×</button>
        </div>
        
        <div className="unified-modal-body">
          <div className="material-selector-info">
            <div className="unified-alert unified-alert-info">
              <strong>Template Material Selection</strong>
              <p>For templates, please enter the material number directly in the table. Material selection with full details requires hospital and procedure context which is available when creating inquiries from templates.</p>
            </div>
            
            {surgicalCategories.length > 0 && (
              <div className="categories-info">
                <h4>Available Categories:</h4>
                <div className="categories-list">
                  {surgicalCategories.map((category) => (
                    <span key={category.id} className="unified-tag">
                      {category.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
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
