import React, { useState, useEffect } from 'react';
import { templateAPI } from '../../services/templateAPI';
import '../../shared/styles/unified-design.css';

const CopyFromTemplateModal = ({ 
  isOpen, 
  onClose, 
  onCopyTemplate,
  procedure, // The surgical procedure from inquiry
  dropdownData 
}) => {
  const [selectedSurgicalCategory, setSelectedSurgicalCategory] = useState('');
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Get available surgical categories from selected procedure or all categories
  const getAvailableSurgicalCategories = () => {
    if (procedure && procedure.items) {
      // If procedure is selected, show its surgical categories
      return procedure.items.map(item => ({
        _id: item.surgicalCategoryId._id || item.surgicalCategoryId,
        description: item.surgicalCategoryId.description || 'Unknown Category'
      }));
    } else {
      // If no procedure is selected, show all surgical categories
      return dropdownData?.surgicalCategories?.map(category => ({
        _id: category._id,
        description: category.description
      })) || [];
    }
  };

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedSurgicalCategory('');
      setSelectedTemplate('');
      setTemplates([]);
      setError('');
      
      // Auto-select surgical category if only one exists
      const availableCategories = getAvailableSurgicalCategories();
      if (availableCategories.length === 1) {
        setSelectedSurgicalCategory(availableCategories[0]._id);
      }
    }
  }, [isOpen, procedure, dropdownData]);

  // Fetch templates when surgical category is selected
  useEffect(() => {
    if (selectedSurgicalCategory) {
      fetchTemplatesBySurgicalCategory();
    } else {
      setTemplates([]);
      setSelectedTemplate('');
    }
  }, [selectedSurgicalCategory]);

  const fetchTemplatesBySurgicalCategory = async () => {
    if (!selectedSurgicalCategory) return;
    
    setLoading(true);
    setError('');
    
    try {
      const response = await templateAPI.getTemplates({
        surgicalCategory: selectedSurgicalCategory,
        limit: 100 // Get more templates for selection
      });
      
      if (response.success) {
        setTemplates(response.data || []);
        if (response.data.length === 0) {
          setError('No templates found for the selected surgical category.');
        }
      } else {
        setError(response.message || 'Failed to fetch templates');
        setTemplates([]);
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
      setError('Error loading templates. Please try again.');
      setTemplates([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyTemplate = async () => {
    if (!selectedTemplate) {
      setError('Please select a template to copy.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Fetch the full template details
      const response = await templateAPI.getTemplate(selectedTemplate);
      
      if (response.success && response.data) {
        onCopyTemplate(response.data);
        onClose();
      } else {
        setError(response.message || 'Failed to load template details');
      }
    } catch (error) {
      console.error('Error copying template:', error);
      setError('Error copying template. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="unified-modal-overlay">
      <div className="unified-modal-container material-selector-modal">
        <div className="unified-modal-header">
          <button 
            onClick={onClose} 
            className="unified-modal-close"
            type="button"
          >
            &times;
          </button>
        </div>

        <div className="unified-modal-body">
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
                  className="filter-select"
                  value={selectedSurgicalCategory}
                  onChange={(e) => setSelectedSurgicalCategory(e.target.value)}
                  disabled={loading}
                >
                  <option value="">Select Surgical Category</option>
                  {getAvailableSurgicalCategories().map(category => (
                    <option key={category._id} value={category._id}>
                      {category.description}
                    </option>
                  ))}
                </select>
              </div>

              <div className="filter-group">
                <label>Template:</label>
                <select
                  className="filter-select"
                  value={selectedTemplate}
                  onChange={(e) => setSelectedTemplate(e.target.value)}
                  disabled={loading || !selectedSurgicalCategory}
                >
                  <option value="">
                    {loading ? 'Loading templates...' : 'Select Template'}
                  </option>
                  {templates.map(template => (
                    <option key={template._id} value={template._id}>
                      {template.description} 
                      {template.hospitalDependent && template.hospital ? 
                        ` (${template.hospital.shortName || template.hospital.legalName})` : 
                        ' (General)'
                      }
                    </option>
                  ))}
                </select>
                {selectedSurgicalCategory && templates.length > 0 && (
                  <small style={{ 
                    color: '#666', 
                    fontSize: '0.875rem', 
                    marginTop: '4px', 
                    display: 'block' 
                  }}>
                    Found {templates.length} template(s) for this category
                  </small>
                )}
              </div>
            </div>
            
            <div className="filter-actions">
              <button
                type="button"
                className="unified-btn unified-btn-secondary"
                onClick={onClose}
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="button"
                className="unified-btn unified-btn-primary"
                onClick={handleCopyTemplate}
                disabled={loading || !selectedTemplate}
              >
                {loading ? 'Copying...' : 'Copy Template'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CopyFromTemplateModal;
