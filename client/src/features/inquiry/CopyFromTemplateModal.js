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

  // Get surgical categories from the procedure
  const surgicalCategories = procedure?.surgicalCategories || [];

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedSurgicalCategory('');
      setSelectedTemplate('');
      setTemplates([]);
      setError('');
      
      // Auto-select surgical category if only one exists
      if (surgicalCategories.length === 1) {
        setSelectedSurgicalCategory(surgicalCategories[0]._id || surgicalCategories[0]);
      }
    }
  }, [isOpen, surgicalCategories]);

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
      <div className="unified-modal-container" style={{ maxWidth: '500px' }}>
        <div className="unified-modal-header">
          <h2>Copy from Template</h2>
          <button 
            onClick={onClose} 
            className="unified-modal-close"
            type="button"
          >
            &times;
          </button>
        </div>

        <div className="unified-modal-body">
          {/* Error Display */}
          {error && (
            <div className="unified-error-message" style={{
              background: '#ffe6e6',
              color: '#d32f2f',
              padding: '12px',
              borderRadius: 'var(--border-radius)',
              marginBottom: '1rem',
              border: '1px solid #ffcdd2'
            }}>
              {error}
            </div>
          )}

          {/* Surgical Category Selection */}
          <div className="unified-form-field">
            <label className="unified-form-label">Surgical Category *</label>
            <select
              className="unified-input"
              value={selectedSurgicalCategory}
              onChange={(e) => setSelectedSurgicalCategory(e.target.value)}
              disabled={loading}
            >
              <option value="">Select Surgical Category</option>
              {surgicalCategories.map(category => {
                const categoryId = category._id || category;
                const categoryName = category.description || 
                  dropdownData.surgicalCategories?.find(c => c._id === categoryId)?.description || 
                  categoryId;
                
                return (
                  <option key={categoryId} value={categoryId}>
                    {categoryName}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Template Selection */}
          {selectedSurgicalCategory && (
            <div className="unified-form-field">
              <label className="unified-form-label">Template *</label>
              <select
                className="unified-input"
                value={selectedTemplate}
                onChange={(e) => setSelectedTemplate(e.target.value)}
                disabled={loading}
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
                <small className="unified-help-text">
                  Found {templates.length} template(s) for this category
                </small>
              )}
            </div>
          )}
        </div>

        <div className="unified-modal-footer">
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
  );
};

export default CopyFromTemplateModal;
