import React, { useState, useEffect, useCallback } from 'react';
import { inquiryAPI } from '../../services/inquiryAPI';
import { hospitalAPI } from '../hospitals/services/hospitalAPI';
import { categoryAPI } from '../categories/services/categoryAPI';
import { paymentTypeAPI } from '../payment-types/services/paymentTypeAPI';
import InquiryForm from './InquiryForm';
import MobileCard from '../../shared/components/MobileCard';
import '../../shared/styles/unified-design.css';
import './Inquiry.css';

const Inquiry = () => {
  const [inquiries, setInquiries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingInquiry, setEditingInquiry] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    hospital: '',
    surgicalCategory: '',
    paymentMethod: ''
  });
  const [dropdownData, setDropdownData] = useState({
    hospitals: [],
    surgicalCategories: [],
    paymentMethods: []
  });

  // Fetch dropdown data for filters
  const fetchDropdownData = useCallback(async () => {
    try {
      const [hospitalsRes, categoriesRes, paymentMethodsRes] = await Promise.all([
        hospitalAPI.getAllHospitals(),
        categoryAPI.getAll({ page: 1, limit: 1000 }),
        paymentTypeAPI.getAll({ page: 1, limit: 1000 })
      ]);

      console.log('Dropdown data fetched successfully');

      const hospitalsData = Array.isArray(hospitalsRes) ? hospitalsRes : (hospitalsRes.data || []);

      setDropdownData({
        hospitals: hospitalsData,
        surgicalCategories: categoriesRes.success ? categoriesRes.data : [],
        paymentMethods: paymentMethodsRes.success ? paymentMethodsRes.data : []
      });
    } catch (error) {
      console.error('Error fetching dropdown data:', error);
      setDropdownData({
        hospitals: [],
        surgicalCategories: [],
        paymentMethods: []
      });
    }
  }, []);

  // Debug dropdown data changes
  useEffect(() => {
    console.log('Dropdown data updated:', dropdownData);
  }, [dropdownData]);

  // Fetch inquiries with current filters and pagination
  const fetchInquiries = useCallback(async () => {
    try {
      setLoading(true);
      const params = {
        page: currentPage,
        limit: 10,
        search: searchTerm,
        ...filters
      };

      const response = await inquiryAPI.getInquiries(params);
      
      if (response.success) {
        setInquiries(response.data);
        setTotalPages(response.pagination.totalPages);
        setTotalItems(response.pagination.totalItems);
      }
    } catch (error) {
      console.error('Error fetching inquiries:', error);
      setInquiries([]);
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchTerm, filters]);

  // Initialize data
  useEffect(() => {
    fetchDropdownData();
  }, [fetchDropdownData]);

  useEffect(() => {
    fetchInquiries();
  }, [fetchInquiries]);

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
      
      console.log('Submitting form data:', formData);
      
      if (editingInquiry) {
        const result = await inquiryAPI.updateInquiry(editingInquiry._id, formData);
        console.log('Update result:', result);
      } else {
        const result = await inquiryAPI.createInquiry(formData);
        console.log('Create result:', result);
      }
      
      setShowForm(false);
      setEditingInquiry(null);
      fetchInquiries();
    } catch (error) {
      console.error('Error saving inquiry:', error);
      console.error('Error details:', error.response?.data || error.message);
      alert(`Error saving inquiry: ${error.response?.data?.message || error.message}`);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Handle edit
  const handleEdit = (inquiry) => {
    setEditingInquiry(inquiry);
    setShowForm(true);
  };

  // Handle delete
  const handleDelete = async (inquiryId) => {
    if (!window.confirm('Are you sure you want to delete this inquiry?')) {
      return;
    }

    try {
      setLoading(true);
      await inquiryAPI.deleteInquiry(inquiryId);
      fetchInquiries();
    } catch (error) {
      console.error('Error deleting inquiry:', error);
      alert('Error deleting inquiry. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle form cancel
  const handleFormCancel = () => {
    setShowForm(false);
    setEditingInquiry(null);
  };

  // Format date for display
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN');
  };

  if (showForm) {
    return (
      <InquiryForm
        inquiry={editingInquiry}
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
            <h1>Inquiries</h1>
            <p>Manage patient inquiries with surgical categories filtered by hospital assignments. Track inquiry details, patient information, and payment methods.</p>
          </div>
          <button
            className="unified-btn unified-btn-primary"
            onClick={() => setShowForm(true)}
            disabled={loading}
          >
            Add New Inquiry
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="unified-filters">
        <div className="unified-filters-row">
          <div className="unified-filter-group">
            <label className="unified-form-label">Search Inquiries</label>
            <input
              type="text"
              placeholder="Search by inquiry number, patient name, or UHID..."
              className="unified-search-input"
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
            />
          </div>
          <div className="unified-filter-group">
            <label className="unified-form-label">Hospital</label>
            <select
              className="unified-filter-select"
              value={filters.hospital}
              onChange={(e) => handleFilterChange('hospital', e.target.value)}
            >
              <option value="">All Hospitals</option>
              {dropdownData.hospitals.map(hospital => (
                <option key={hospital._id} value={hospital._id}>
                  {hospital.shortName || hospital.legalName}
                </option>
              ))}
            </select>
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
                hospital: '',
                surgicalCategory: '',
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
            onClick={fetchInquiries}
            disabled={loading}
          >
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="unified-content">
        {loading ? (
          <div className="unified-loading">Loading inquiries...</div>
        ) : inquiries.length === 0 ? (
          <div className="unified-empty-state">
            <div className="unified-empty-icon">🔍</div>
            <div className="unified-empty-message">No inquiries found</div>
            <div className="unified-empty-submessage">
              {searchTerm || Object.values(filters).some(f => f) 
                ? 'Try adjusting your search or filters' 
                : 'Get started by creating your first inquiry'
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
                    <th>Inquiry #</th>
                    <th>Hospital</th>
                    <th>Date</th>
                    <th>Surgical Procedure</th>
                    <th>Surgical Categories</th>
                    <th>Payment Method</th>
                    <th>Total Amount</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {inquiries.map(inquiry => (
                    <tr key={inquiry._id}>
                      <td>
                        <span className="unified-code-badge">{inquiry.inquiryNumber}</span>
                      </td>
                      <td>{inquiry.hospital?.shortName || inquiry.hospital?.legalName}</td>
                      <td>{formatDate(inquiry.inquiryDate)}</td>
                      <td>{inquiry.surgicalProcedure?.name || '-'}</td>
                      <td>
                        {inquiry.surgicalProcedure?.items && inquiry.surgicalProcedure.items.length > 0 ? (
                          <div className="categories-list">
                            {inquiry.surgicalProcedure.items.map((item, index) => (
                              <span key={index} className="unified-tag">
                                {item.surgicalCategoryId?.description || item.surgicalCategoryId?.name || item.surgicalCategoryId || 'Unknown'}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="unified-text-muted">-</span>
                        )}
                      </td>
                      <td>{inquiry.paymentMethod?.description}</td>
                      <td>
                        {inquiry.totalInquiryAmount ? (
                          <span className="unified-amount-text">
                            {parseFloat(inquiry.totalInquiryAmount).toLocaleString('en-IN', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2
                            })}
                          </span>
                        ) : (
                          <span className="unified-text-muted">-</span>
                        )}
                      </td>
                      <td>
                        <span className={`unified-status-badge ${inquiry.isActive ? 'unified-status-active' : 'unified-status-inactive'}`}>
                          {inquiry.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td>
                        <div className="unified-table-actions">
                          <button
                            className="unified-table-action edit"
                            onClick={() => handleEdit(inquiry)}
                            title="Edit"
                            disabled={loading}
                          >
                            ✏️
                          </button>
                          <button
                            className="unified-table-action delete"
                            onClick={() => handleDelete(inquiry._id)}
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
              {inquiries.map((inquiry) => (
                <MobileCard
                  key={inquiry._id}
                  id={inquiry._id}
                  title={`${inquiry.patientName || 'Unknown Patient'}`}
                  badge={inquiry.inquiryNumber}
                  fields={[
                    { label: 'Patient', value: inquiry.patientName || 'Unknown Patient' },
                    { label: 'Hospital', value: inquiry.hospital?.shortName || inquiry.hospital?.legalName || '-' },
                    { label: 'Procedure', value: inquiry.surgicalProcedure?.name || '-' },
                    { 
                      label: 'Categories', 
                      value: inquiry.surgicalProcedure?.items && inquiry.surgicalProcedure.items.length > 0
                        ? inquiry.surgicalProcedure.items.map(item => item.surgicalCategoryId?.description || item.surgicalCategoryId?.name || item.surgicalCategoryId || 'Unknown').join(', ')
                        : '-'
                    },
                    { label: 'Payment', value: inquiry.paymentMethod?.description || '-' },
                    { 
                      label: 'Status', 
                      value: inquiry.isActive ? 'Active' : 'Inactive'
                    }
                  ]}
                  sections={[
                    {
                      title: 'Details',
                      items: [
                        { label: 'Date', value: formatDate(inquiry.inquiryDate) },
                        { 
                          label: 'Total Amount', 
                          value: inquiry.totalInquiryAmount 
                            ? `₹${parseFloat(inquiry.totalInquiryAmount).toLocaleString('en-IN', {
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
                      onClick: () => handleEdit(inquiry)
                    },
                    {
                      label: 'Delete',
                      icon: '🗑️',
                      variant: 'danger',
                      onClick: () => handleDelete(inquiry._id)
                    }
                  ]}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Inquiry;
