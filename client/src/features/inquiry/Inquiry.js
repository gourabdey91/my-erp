import React, { useState, useEffect, useCallback } from 'react';
import { inquiryAPI } from '../../services/inquiryAPI';
import InquiryForm from './InquiryForm';
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
        fetch('/api/hospitals?page=1&limit=1000'),
        fetch('/api/categories?page=1&limit=1000'),
        fetch('/api/payment-types?page=1&limit=1000')
      ]);

      const [hospitals, categories, paymentMethods] = await Promise.all([
        hospitalsRes.json(),
        categoriesRes.json(),
        paymentMethodsRes.json()
      ]);

      setDropdownData({
        hospitals: hospitals.success ? hospitals.data : [],
        surgicalCategories: categories.success ? categories.data : [],
        paymentMethods: paymentMethods.success ? paymentMethods.data : []
      });
    } catch (error) {
      console.error('Error fetching dropdown data:', error);
    }
  }, []);

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
      
      if (editingInquiry) {
        await inquiryAPI.updateInquiry(editingInquiry._id, formData);
      } else {
        await inquiryAPI.createInquiry(formData);
      }
      
      setShowForm(false);
      setEditingInquiry(null);
      fetchInquiries();
    } catch (error) {
      console.error('Error saving inquiry:', error);
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
    <div className="inquiry-container">
      {/* Header */}
      <div className="inquiry-header">
        <h1 className="inquiry-title">Inquiries</h1>
        <div className="inquiry-actions">
          <button
            className="btn-primary"
            onClick={() => setShowForm(true)}
          >
            Add New Inquiry
          </button>
          <button
            className="btn-secondary"
            onClick={fetchInquiries}
            disabled={loading}
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="inquiry-search-section">
        <div className="inquiry-search-grid">
          <div>
            <input
              type="text"
              placeholder="Search by inquiry number, patient name, or UHID..."
              className="inquiry-search-input"
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
            />
          </div>
          <div>
            <select
              className="inquiry-filter-select"
              value={filters.hospital}
              onChange={(e) => handleFilterChange('hospital', e.target.value)}
            >
              <option value="">All Hospitals</option>
              {dropdownData.hospitals.map(hospital => (
                <option key={hospital._id} value={hospital._id}>
                  {hospital.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <select
              className="inquiry-filter-select"
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
          <div>
            <select
              className="inquiry-filter-select"
              value={filters.paymentMethod}
              onChange={(e) => handleFilterChange('paymentMethod', e.target.value)}
            >
              <option value="">All Payment Methods</option>
              {dropdownData.paymentMethods.map(method => (
                <option key={method._id} value={method._id}>
                  {method.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <button
              className="btn-secondary"
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
              Clear
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="inquiry-table-container">
        {loading ? (
          <div className="inquiry-loading">Loading inquiries...</div>
        ) : inquiries.length === 0 ? (
          <div className="inquiry-empty-state">
            <div className="inquiry-empty-icon">🔍</div>
            <div className="inquiry-empty-message">No inquiries found</div>
            <div className="inquiry-empty-submessage">
              {searchTerm || Object.values(filters).some(f => f) 
                ? 'Try adjusting your search or filters' 
                : 'Get started by creating your first inquiry'
              }
            </div>
          </div>
        ) : (
          <>
            <table className="inquiry-table">
              <thead>
                <tr>
                  <th>Inquiry #</th>
                  <th>Date</th>
                  <th>Patient Name</th>
                  <th>Patient UHID</th>
                  <th>Hospital</th>
                  <th>Surgical Category</th>
                  <th>Payment Method</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {inquiries.map(inquiry => (
                  <tr key={inquiry._id}>
                    <td>{inquiry.inquiryNumber}</td>
                    <td>{formatDate(inquiry.inquiryDate)}</td>
                    <td>{inquiry.patientName}</td>
                    <td>{inquiry.patientUHID}</td>
                    <td>{inquiry.hospital?.name}</td>
                    <td>{inquiry.surgicalCategory?.description}</td>
                    <td>{inquiry.paymentMethod?.name}</td>
                    <td>
                      <span className={`inquiry-status-${inquiry.isActive ? 'active' : 'inactive'}`}>
                        {inquiry.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      <div className="inquiry-action-buttons">
                        <button
                          className="inquiry-action-btn inquiry-action-btn-edit"
                          onClick={() => handleEdit(inquiry)}
                          title="Edit"
                        >
                          Edit
                        </button>
                        <button
                          className="inquiry-action-btn inquiry-action-btn-delete"
                          onClick={() => handleDelete(inquiry._id)}
                          title="Delete"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            <div className="inquiry-pagination">
              <div className="inquiry-pagination-info">
                Showing {((currentPage - 1) * 10) + 1} to {Math.min(currentPage * 10, totalItems)} of {totalItems} inquiries
              </div>
              <div className="inquiry-pagination-controls">
                <button
                  className="inquiry-pagination-btn"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(prev => prev - 1)}
                >
                  Previous
                </button>
                
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const startPage = Math.max(1, currentPage - 2);
                  const page = startPage + i;
                  
                  if (page > totalPages) return null;
                  
                  return (
                    <button
                      key={page}
                      className={`inquiry-pagination-btn ${currentPage === page ? 'active' : ''}`}
                      onClick={() => setCurrentPage(page)}
                    >
                      {page}
                    </button>
                  );
                })}
                
                <button
                  className="inquiry-pagination-btn"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(prev => prev + 1)}
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Inquiry;
