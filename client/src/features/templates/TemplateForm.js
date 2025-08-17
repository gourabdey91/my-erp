import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { materialAPI } from '../../services/materialAPI';
import TemplateItems from './TemplateItems';
import '../../shared/styles/unified-design.css';
import '../inquiry/Inquiry.css'; // Import inquiry styles for categories
import './Template.css';

const TemplateForm = ({ template, dropdownData, onSubmit, onCancel }) => {
  const { currentUser } = useAuth();
  const [formData, setFormData] = useState({
    templateNumber: template?.templateNumber || '',
    description: template?.description || '',
    surgicalCategory: template?.surgicalCategory || '',
    limit: {
      amount: template?.limit?.amount || '',
      currency: template?.limit?.currency || 'INR'
    },
    discountApplicable: template?.discountApplicable || false,
    hospitalDependent: template?.hospitalDependent || false, // New field for hospital dependency
    hospital: template?.hospital || '', // Hospital selection when dependent
    items: template?.items || [],
    totalTemplateAmount: template?.totalTemplateAmount || 0
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  // Initialize form data when template changes
  useEffect(() => {
    console.log('TemplateForm: Template data changed:', template);
    
    if (template) {
      console.log('TemplateForm: Initializing form with template data');
      console.log('TemplateForm: template.hospitalDependent =', template.hospitalDependent);
      console.log('TemplateForm: template.hospital =', template.hospital);
      
      // Set form data
      const newFormData = {
        templateNumber: template.templateNumber || '',
        description: template.description || '',
        surgicalCategory: template.surgicalCategory?._id || template.surgicalCategory || '',
        limit: {
          amount: template.limit?.amount || '',
          currency: template.limit?.currency || 'INR'
        },
        discountApplicable: template.discountApplicable || false,
        hospitalDependent: template.hospitalDependent || false,
        hospital: template.hospital?._id || template.hospital || undefined,
        items: template.items || [],
        totalTemplateAmount: template.totalTemplateAmount || 0
      };
      
      console.log('TemplateForm: Setting form data to:', newFormData);
      setFormData(newFormData);
    } else {
      // New template
      setFormData({
        templateNumber: '',
        description: '',
        surgicalCategory: '',
        limit: {
          amount: '',
          currency: 'INR'
        },
        discountApplicable: false,
        hospitalDependent: false,
        hospital: undefined,
        items: [],
        totalTemplateAmount: 0
      });
    }
  }, [template]);

  // Debug formData changes
  useEffect(() => {
    console.log('TemplateForm: Form data updated:', formData);
  }, [formData]);

  // Debug dropdown data changes
  useEffect(() => {
    console.log('TemplateForm: Dropdown data updated:', dropdownData);
    console.log('TemplateForm: Hospitals count:', dropdownData?.hospitals?.length || 0);
  }, [dropdownData]);

  // Handle input changes
  const handleChange = (field, value) => {
    if (field.startsWith('limit.')) {
      const limitField = field.split('.')[1];
      setFormData(prev => ({
        ...prev,
        limit: {
          ...prev.limit,
          [limitField]: value
        }
      }));
    } else if (field === 'hospitalDependent') {
      // Hospital dependency changed - clear hospital field if unchecked
      setFormData(prev => ({
        ...prev,
        hospitalDependent: value,
        hospital: value ? prev.hospital : undefined // Clear hospital if hospitalDependent is false
      }));
    } else if (field === 'surgicalCategory') {
      // Surgical category changed - clear hospital field since hospital list will be filtered
      setFormData(prev => ({
        ...prev,
        surgicalCategory: value,
        hospital: undefined // Clear hospital when surgical category changes
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: field === 'hospital' && value === '' ? undefined : value
      }));
    }
  };

  // Handle items change
  const handleItemsChange = (items) => {
    const totalAmount = items.reduce((sum, item) => sum + (parseFloat(item.totalAmount) || 0), 0);
    setFormData(prev => ({
      ...prev,
      items,
      totalTemplateAmount: totalAmount
    }));
  };

  // Validate form
  const validateForm = async () => {
    const newErrors = {};

    if (!formData.description?.trim()) {
      newErrors.description = 'Description is required';
    }

    if (!formData.surgicalCategory) {
      newErrors.surgicalCategory = 'Surgical category is required';
    }

    if (formData.hospitalDependent && !formData.hospital) {
      newErrors.hospital = 'Hospital is required when template is hospital dependent';
    }

    if (!formData.limit?.amount || formData.limit.amount <= 0) {
      newErrors.limit = 'Limit amount must be greater than 0';
    }

    // Validate total template amount doesn't exceed limit
    if (formData.totalTemplateAmount && formData.limit?.amount) {
      const totalAmount = parseFloat(formData.totalTemplateAmount);
      const limitAmount = parseFloat(formData.limit.amount);
      
      if (totalAmount > limitAmount) {
        newErrors.totalAmount = `Total amount (₹${totalAmount.toLocaleString('en-IN', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        })}) exceeds the limit (₹${limitAmount.toLocaleString('en-IN', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        })})`;
      }
    }

    // Validate materials belong to selected surgical category
    if (formData.surgicalCategory && formData.items.length > 0) {
      console.log('🔍 Validating materials belong to surgical category...');
      try {
        // Get all materials for the surgical category
        const response = await materialAPI.getImplantTypes(formData.surgicalCategory);
        
        if (response.success && response.data) {
          // Get all material numbers for this surgical category by fetching materials
          // We need to get materials for all implant types in this category
          const allCategoryMaterials = [];
          
          for (const implantType of response.data) {
            try {
              const materialsResponse = await materialAPI.getMaterials({
                surgicalCategory: formData.surgicalCategory,
                implantType: implantType._id
              });
              
              if (materialsResponse.success && materialsResponse.data) {
                allCategoryMaterials.push(...materialsResponse.data);
              }
            } catch (error) {
              console.error(`Error fetching materials for implant type ${implantType._id}:`, error);
            }
          }

          const categoryMaterialNumbers = allCategoryMaterials.map(material => material.materialNumber);
          
          // Check if any template items don't belong to the surgical category
          const wrongCategoryMaterials = formData.items.filter(item => 
            !categoryMaterialNumbers.includes(item.materialNumber)
          );

          if (wrongCategoryMaterials.length > 0) {
            const materialList = wrongCategoryMaterials
              .map(material => `${material.materialNumber} (${material.description || 'Unknown'})`)
              .join(', ');
            
            newErrors.categoryMaterials = `The following materials do not belong to the selected surgical category: ${materialList}. Please remove them or change the surgical category.`;
          }
        }
      } catch (error) {
        console.error('Error validating surgical category materials:', error);
        newErrors.categoryMaterials = 'Unable to validate surgical category materials. Please try again.';
      }
    }

    // Validate hospital-dependent template materials
    if (formData.hospitalDependent && formData.hospital && formData.items.length > 0) {
      console.log('🔍 Validating hospital-dependent template materials...');
      try {
        // Get hospital's assigned materials for the surgical category
        const response = await materialAPI.getAssignedMaterialsForInquiry(formData.hospital, {
          surgicalCategory: formData.surgicalCategory
        });

        if (response.success && response.data) {
          const hospitalMaterials = response.data;
          const hospitalMaterialNumbers = hospitalMaterials.map(material => material.materialNumber);
          
          // Check if any template items are not available in the hospital
          const unavailableMaterials = formData.items.filter(item => 
            !hospitalMaterialNumbers.includes(item.materialNumber)
          );

          if (unavailableMaterials.length > 0) {
            const materialList = unavailableMaterials
              .map(material => `${material.materialNumber} (${material.description || 'Unknown'})`)
              .join(', ');
            
            newErrors.hospitalMaterials = `The following materials are not available in the selected hospital: ${materialList}. Please remove them or change to a non-hospital-dependent template.`;
          }
        }
      } catch (error) {
        console.error('Error validating hospital materials:', error);
        newErrors.hospitalMaterials = 'Unable to validate hospital materials. Please try again.';
      }
    }

    if (formData.items.length === 0) {
      newErrors.items = 'At least one item is required';
    }

    if (!currentUser || !currentUser._id) {
      newErrors.user = 'User authentication required. Please log in again.';
    }

    setErrors(newErrors);
    
    // Auto-scroll to top if there are errors so user can see them
    if (Object.keys(newErrors).length > 0) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    setLoading(true);
    
    try {
      const isValid = await validateForm();
      if (!isValid) {
        setLoading(false);
        return;
      }

      // Prepare submission data
      const submissionData = {
        ...formData,
        // Only include hospital field if hospitalDependent is true
        hospital: formData.hospitalDependent ? formData.hospital : undefined,
        createdBy: !template ? currentUser._id : undefined,
        updatedBy: template ? currentUser._id : undefined
      };

      console.log('Submitting template data:', submissionData);
      await onSubmit(submissionData);
    } catch (error) {
      console.error('Form submission error:', error);
      setLoading(false);
    }
  };

  return (
    <div className="unified-container">
      {/* Header */}
      <div className="unified-header">
        <div className="unified-header-content">
          <div className="unified-header-text">
            <h1>
              {template ? 'Edit Template' : 'Add New Template'}
              {template && formData.templateNumber && (
                <span className="inquiry-number-badge">#{formData.templateNumber}</span>
              )}
            </h1>
            <p>
              {template 
                ? 'Update template information and material combinations for faster order creation.'
                : 'Create a new template with material combinations for faster inquiry, sales order, and billing creation.'
              }
            </p>
          </div>
          <div className="unified-header-actions">
            <div className="header-total-amount">
              <span className="header-total-label">Total Amount:</span>
              <span className={`header-total-value ${errors.totalAmount ? 'error' : ''}`}>
                ₹{parseFloat(formData.totalTemplateAmount || 0).toLocaleString('en-IN', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                })}
              </span>
              {errors.totalAmount && (
                <div className="unified-error-text" style={{ marginTop: '4px', fontSize: '12px' }}>
                  {errors.totalAmount}
                </div>
              )}
              {errors.categoryMaterials && (
                <div className="unified-error-text" style={{ marginTop: '4px', fontSize: '12px' }}>
                  ⚠️ {errors.categoryMaterials}
                </div>
              )}
              {errors.hospitalMaterials && (
                <div className="unified-error-text" style={{ marginTop: '4px', fontSize: '12px' }}>
                  ⚠️ {errors.hospitalMaterials}
                </div>
              )}
            </div>
            <button
              className="unified-btn unified-btn-secondary"
              onClick={onCancel}
              type="button"
              disabled={loading}
            >
              ← Back to List
            </button>
          </div>
        </div>
      </div>

      {/* Form Card */}
      <div className="unified-card">
        <div className="unified-card-content">
          {/* General Error Display */}
          {errors.user && (
            <div className="unified-alert unified-alert-danger" style={{ marginBottom: '20px' }}>
              {errors.user}
            </div>
          )}
          
          <form onSubmit={handleSubmit}>
            <div className="form-section">
              <div className="form-section-title">
                Template Information
              </div>
              
              <div className="unified-form-grid">
                {/* Surgical Category */}
                <div className="unified-form-field">
                  <label className="unified-form-label">Surgical Category *</label>
                  <select
                    className={`unified-input ${errors.surgicalCategory ? 'unified-input-error' : ''}`}
                    value={formData.surgicalCategory}
                    onChange={(e) => handleChange('surgicalCategory', e.target.value)}
                    disabled={loading}
                  >
                    <option value="">Select Surgical Category</option>
                    {dropdownData.surgicalCategories.map(category => (
                      <option key={category._id} value={category._id}>
                        {category.description}
                      </option>
                    ))}
                  </select>
                  {errors.surgicalCategory && (
                    <span className="unified-error-text">{errors.surgicalCategory}</span>
                  )}
                </div>

                {/* Limit Amount - Moved here */}
                <div className="unified-form-field">
                  <label className="unified-form-label">Limit Amount *</label>
                  <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <input
                      type="number"
                      className={`unified-input ${errors.limit ? 'unified-input-error' : ''}`}
                      placeholder="Enter limit amount"
                      value={formData.limit?.amount || ''}
                      onChange={(e) => handleChange('limit.amount', e.target.value)}
                      min="0"
                      step="0.01"
                      style={{ flex: '2' }}
                      disabled={loading}
                    />
                    <select
                      className="unified-input"
                      value={formData.limit?.currency || 'INR'}
                      onChange={(e) => handleChange('limit.currency', e.target.value)}
                      style={{ flex: '1' }}
                      disabled={loading}
                    >
                      <option value="INR">INR</option>
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                    </select>
                  </div>
                  {errors.limit && (
                    <span className="unified-error-text">{errors.limit}</span>
                  )}
                </div>
              </div>

              {/* Second row with Hospital Dependent and Hospital */}
              <div className="unified-form-grid">
                {/* Hospital Dependent Switch - 3rd field */}
                <div className="unified-form-field">
                  <label className="unified-form-label">Hospital Dependent</label>
                  <div className="toggle-container">
                    <label className="toggle-label">
                      <input
                        type="checkbox"
                        checked={formData.hospitalDependent}
                        onChange={(e) => handleChange('hospitalDependent', e.target.checked)}
                        className="toggle-checkbox"
                        disabled={loading}
                      />
                      <span className="toggle-slider"></span>
                      <span className="toggle-text">
                        {formData.hospitalDependent ? 'Yes' : 'No'}
                      </span>
                    </label>
                  </div>
                </div>

                {/* Hospital field - 4th field */}
                <div className="unified-form-field">
                  <label className="unified-form-label">
                    Hospital {formData.hospitalDependent ? '*' : ''}
                  </label>
                  <select
                    className={`unified-input ${errors.hospital ? 'unified-input-error' : ''}`}
                    value={formData.hospitalDependent ? (formData.hospital || '') : ''}
                    onChange={(e) => handleChange('hospital', e.target.value)}
                    disabled={loading || !formData.hospitalDependent}
                  >
                    <option value="">
                      {formData.hospitalDependent ? 'Select Hospital' : 'All Hospitals'}
                    </option>
                    {dropdownData.hospitals
                      .filter(hospital => {
                        // Filter hospitals by surgical category if selected and hospital dependent
                        if (!formData.surgicalCategory || !formData.hospitalDependent) {
                          return true; // Show all hospitals if no category selected or not hospital dependent
                        }
                        // Check if hospital supports the selected surgical category
                        if (!hospital.surgicalCategories || hospital.surgicalCategories.length === 0) {
                          return true; // Include hospitals without category restrictions
                        }
                        return hospital.surgicalCategories.some(cat => 
                          (cat._id || cat) === formData.surgicalCategory
                        );
                      })
                      .map(hospital => (
                        <option key={hospital._id} value={hospital._id}>
                          {hospital.shortName || hospital.legalName}
                        </option>
                      ))}
                  </select>
                  {errors.hospital && (
                    <span className="unified-error-text">{errors.hospital}</span>
                  )}
                </div>
              </div>

              {/* Third row with Discount Applicable */}
              <div className="unified-form-grid">
                {/* Discount Applicable Switch */}
                <div className="unified-form-field">
                  <label className="unified-form-label">Discount Applicable</label>
                  <div className="toggle-container">
                    <label className="toggle-label">
                      <input
                        type="checkbox"
                        checked={formData.discountApplicable}
                        onChange={(e) => handleChange('discountApplicable', e.target.checked)}
                        className="toggle-checkbox"
                        disabled={loading}
                      />
                      <span className="toggle-slider"></span>
                      <span className="toggle-text">
                        {formData.discountApplicable ? 'Yes' : 'No'}
                      </span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Description - Full width */}
              <div className="unified-form-field">
                <label className="unified-form-label">Description *</label>
                <input
                  type="text"
                  className={`unified-input ${errors.description ? 'unified-input-error' : ''}`}
                  value={formData.description}
                  onChange={(e) => handleChange('description', e.target.value)}
                  placeholder="Enter template description"
                  maxLength={200}
                  disabled={loading}
                />
                {errors.description && (
                  <span className="unified-error-text">{errors.description}</span>
                )}
              </div>
            </div>

            {/* Template Items */}
            <TemplateItems
              items={formData.items}
              discountApplicable={formData.discountApplicable}
              hospitalDependent={formData.hospitalDependent}
              hospital={formData.hospital}
              surgicalCategory={formData.surgicalCategory}
              onChange={handleItemsChange}
              errors={errors.items}
              disabled={loading}
            />

            {/* Form Actions */}
            <div className="unified-form-actions">
              <button
                type="submit"
                className="unified-btn unified-btn-primary"
                disabled={loading}
              >
                {loading ? 'Saving...' : (template ? 'Save Template' : 'Create Template')}
              </button>
              <button
                type="button"
                className="unified-btn unified-btn-secondary"
                onClick={onCancel}
                disabled={loading}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default TemplateForm;
