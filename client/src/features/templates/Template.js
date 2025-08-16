import React, { useState, useEffect, useCallback } from 'react';
import { templateAPI } from '../../services/templateAPI';
import { categoryAPI } from '../categories/services/categoryAPI';
import { paymentTypeAPI } from '../payment-types/services/paymentTypeAPI';
import { procedureAPI } from '../procedures/services/procedureAPI';
import { hospitalAPI } from '../hospitals/services/hospitalAPI';
import TemplateForm from './TemplateForm';
import MobileCard from '../../shared/components/MobileCard';
import '../../shared/styles/unified-design.css';
import './Template.css';

const Template = () => {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    surgicalCategory: '',
    surgicalProcedure: '',
    paymentMethod: ''
  });
  const [dropdownData, setDropdownData] = useState({
    surgicalCategories: [],
    surgicalProcedures: [],
    paymentMethods: [],
    hospitals: []
  });

  // Fetch dropdown data for filters
  const fetchDropdownData = useCallback(async () => {
    try {
      const [categoriesRes, proceduresRes, paymentMethodsRes, hospitalsRes] = await Promise.all([
        categoryAPI.getAll({ page: 1, limit: 1000 }),
        procedureAPI.getAll(),
        paymentTypeAPI.getAll({ page: 1, limit: 1000 }),
        hospitalAPI.getAllHospitals()
      ]);

      console.log('Dropdown data fetched successfully');
      console.log('Procedures response:', proceduresRes);

      const proceduresData = proceduresRes?.success ? proceduresRes.data : (proceduresRes?.data || proceduresRes || []);

      setDropdownData({
        surgicalCategories: categoriesRes.success ? categoriesRes.data : [],
        surgicalProcedures: Array.isArray(proceduresData) ? proceduresData : [],
        paymentMethods: paymentMethodsRes.success ? paymentMethodsRes.data : [],
        hospitals: hospitalsRes.success ? hospitalsRes.data : []
      });
    } catch (error) {
      console.error('Error fetching dropdown data:', error);
      setDropdownData({
        surgicalCategories: [],
        surgicalProcedures: [],
        paymentMethods: []
      });
    }
  }, []);

  // Debug dropdown data changes
  useEffect(() => {
    console.log('Dropdown data updated:', dropdownData);
  }, [dropdownData]);

  // Fetch templates with current filters and pagination
  const fetchTemplates = useCallback(async () => {
    try {
      setLoading(true);
      const params = {
        page: currentPage,
        limit: 10,
        search: searchTerm,
        ...filters
      };

      const response = await templateAPI.getTemplates(params);
      
      if (response.success) {
        setTemplates(response.data);
        setTotalPages(response.pagination.totalPages);
        setTotalItems(response.pagination.totalItems);
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
      setTemplates([]);
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchTerm, filters]);

  // Initialize data
  useEffect(() => {
    fetchDropdownData();
  }, [fetchDropdownData]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  // Handle search
  const handleSearch = (term) => {
    setSearchTerm(term);
    setCurrentPage(1);
  };

  // Handle filters
  const handleFilterChange = (filterName, value) => {
    setFilters(prev => ({
      ...prev,
      [filterName]: value
    }));
    setCurrentPage(1);
  };

  // Handle form submission
  const handleFormSubmit = async (formData) => {
    try {
      setLoading(true);
      
      console.log('Submitting template form data:', formData);
      
      if (editingTemplate) {
        const result = await templateAPI.updateTemplate(editingTemplate._id, formData);
        console.log('Update result:', result);
      } else {
        const result = await templateAPI.createTemplate(formData);
        console.log('Create result:', result);
      }
      
      setShowForm(false);
      setEditingTemplate(null);
      fetchTemplates();
    } catch (error) {
      console.error('Error saving template:', error);
      console.error('Error details:', error.response?.data || error.message);
      alert(`Error saving template: ${error.response?.data?.message || error.message}`);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Handle edit
  const handleEdit = (template) => {
    setEditingTemplate(template);
    setShowForm(true);
  };

  // Handle delete
  const handleDelete = async (templateId) => {
    if (!window.confirm('Are you sure you want to delete this template?')) {
      return;
    }

    try {
      setLoading(true);
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      await templateAPI.deleteTemplate(templateId, user._id);
      fetchTemplates();
    } catch (error) {
      console.error('Error deleting template:', error);
      alert('Error deleting template. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle form cancel
  const handleFormCancel = () => {
    setShowForm(false);
    setEditingTemplate(null);
  };

  // Format date for display
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN');
  };

  if (showForm) {
    return (
      <TemplateForm
        template={editingTemplate}
        dropdownData={dropdownData}
        onSubmit={handleFormSubmit}
        onCancel={handleFormCancel}
      />
    );
  }

  return (
    <div className="unified-container">
      {/* Header */}
      <div className="unified-header">
        <div className="unified-header-content">
          <div className="unified-header-text">
            <h1>Templates</h1>
            <p>Manage material combination templates for faster creation of inquiries, sales orders, and billing. Save frequently used material combinations with quantities and pricing.</p>
          </div>
          <button
            className="unified-btn unified-btn-primary"
            onClick={() => setShowForm(true)}
            disabled={loading}
          >
            Add New Template
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="unified-filters">
        <div className="unified-filters-row">
          <div className="unified-filter-group">
            <label className="unified-form-label">Search Templates</label>
            <input
              type="text"
              placeholder="Search by template number or description..."
              className="unified-search-input"
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
            />
          </div>
          <div className="unified-filter-group">
            <label className="unified-form-label">Surgical Category</label>
            <select
              className="unified-filter-select"
              value={filters.surgicalCategory}
              onChange={(e) => handleFilterChange('surgicalCategory', e.target.value)}
            >
              <option value="">All Categories</option>
              {dropdownData.surgicalCategories.map(category => (
                <option key={category._id} value={category._id}>
                  {category.description}
                </option>
              ))}
            </select>
          </div>
          <div className="unified-filter-group">
            <label className="unified-form-label">Surgical Procedure</label>
            <select
              className="unified-filter-select"
              value={filters.surgicalProcedure}
              onChange={(e) => handleFilterChange('surgicalProcedure', e.target.value)}
            >
              <option value="">All Procedures</option>
              {dropdownData.surgicalProcedures.map(procedure => (
                <option key={procedure._id} value={procedure._id}>
                  {procedure.name}
                </option>
              ))}
            </select>
          </div>
          <div className="unified-filter-group">
            <label className="unified-form-label">Payment Method</label>
            <select
              className="unified-filter-select"
              value={filters.paymentMethod}
              onChange={(e) => handleFilterChange('paymentMethod', e.target.value)}
            >
              <option value="">All Payment Methods</option>
              {dropdownData.paymentMethods.map(method => (
                <option key={method._id} value={method._id}>
                  {method.description}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="unified-filters-row" style={{ gridTemplateColumns: 'auto auto 1fr', justifyContent: 'start' }}>
          <button
            className="unified-btn unified-btn-secondary unified-btn-sm"
            onClick={() => {
              setFilters({
                surgicalCategory: '',
                surgicalProcedure: '',
                paymentMethod: ''
              });
              setSearchTerm('');
              setCurrentPage(1);
            }}
          >
            Clear Filters
          </button>
          <button
            className="unified-btn unified-btn-primary unified-btn-sm"
            onClick={fetchTemplates}
            disabled={loading}
          >
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="unified-content">
        {loading ? (
          <div className="unified-loading">Loading templates...</div>
        ) : templates.length === 0 ? (
          <div className="unified-empty-state">
            <div className="unified-empty-icon">📋</div>
            <div className="unified-empty-message">No templates found</div>
            <div className="unified-empty-submessage">
              {searchTerm || Object.values(filters).some(f => f) 
                ? 'Try adjusting your search or filters' 
                : 'Get started by creating your first template'
              }
            </div>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="unified-table-responsive">
              <table className="unified-table">
                <thead>
                  <tr>
                    <th>Template #</th>
                    <th>Description</th>
                    <th>Surgical Procedure</th>
                    <th>Payment Method</th>
                    <th>Discount Applicable</th>
                    <th>Total Amount</th>
                    <th>Items Count</th>
                    <th>Created Date</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {templates.map(template => (
                    <tr key={template._id}>
                      <td>
                        <span className="unified-code-badge">{template.templateNumber}</span>
                      </td>
                      <td>{template.description}</td>
                      <td>{template.surgicalProcedure?.name || '-'}</td>
                      <td>{template.paymentMethod?.description}</td>
                      <td>
                        <span className={`unified-status-badge ${template.discountApplicable ? 'unified-status-active' : 'unified-status-inactive'}`}>
                          {template.discountApplicable ? 'Yes' : 'No'}
                        </span>
                      </td>
                      <td>
                        {template.totalTemplateAmount ? (
                          <span className="unified-amount-text">
                            ₹{parseFloat(template.totalTemplateAmount).toLocaleString('en-IN', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2
                            })}
                          </span>
                        ) : (
                          <span className="unified-text-muted">-</span>
                        )}
                      </td>
                      <td>
                        <span className="unified-badge-primary">
                          {template.items?.length || 0}
                        </span>
                      </td>
                      <td>{formatDate(template.createdAt)}</td>
                      <td>
                        <span className={`unified-status-badge ${template.isActive ? 'unified-status-active' : 'unified-status-inactive'}`}>
                          {template.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td>
                        <div className="unified-table-actions">
                          <button
                            className="unified-table-action edit"
                            onClick={() => handleEdit(template)}
                            title="Edit"
                            disabled={loading}
                          >
                            ✏️
                          </button>
                          <button
                            className="unified-table-action delete"
                            onClick={() => handleDelete(template._id)}
                            title="Delete"
                            disabled={loading}
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="unified-mobile-cards">
              {templates.map((template) => (
                <MobileCard
                  key={template._id}
                  id={template._id}
                  title={template.description}
                  badge={template.templateNumber}
                  fields={[
                    { label: 'Description', value: template.description },
                    { label: 'Procedure', value: template.surgicalProcedure?.name || '-' },
                    { label: 'Payment', value: template.paymentMethod?.description || '-' },
                    { 
                      label: 'Discount Applicable', 
                      value: template.discountApplicable ? 'Yes' : 'No'
                    },
                    { label: 'Items', value: `${template.items?.length || 0} items` },
                    { 
                      label: 'Status', 
                      value: template.isActive ? 'Active' : 'Inactive'
                    }
                  ]}
                  sections={[
                    {
                      title: 'Details',
                      items: [
                        { label: 'Created', value: formatDate(template.createdAt) },
                        { 
                          label: 'Total Amount', 
                          value: template.totalTemplateAmount 
                            ? `₹${parseFloat(template.totalTemplateAmount).toLocaleString('en-IN', {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2
                              })}`
                            : '-'
                        }
                      ]
                    }
                  ]}
                  actions={[
                    {
                      label: 'Edit',
                      icon: '✏️',
                      onClick: () => handleEdit(template)
                    },
                    {
                      label: 'Delete',
                      icon: '🗑️',
                      variant: 'danger',
                      onClick: () => handleDelete(template._id)
                    }
                  ]}
                />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="unified-pagination">
                <button
                  className="unified-btn unified-btn-secondary"
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1 || loading}
                >
                  Previous
                </button>
                <span className="unified-pagination-info">
                  Page {currentPage} of {totalPages} ({totalItems} total)
                </span>
                <button
                  className="unified-btn unified-btn-secondary"
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages || loading}
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Template;
