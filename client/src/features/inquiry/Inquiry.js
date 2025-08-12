import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { inquiryAPI } from '../../services/inquiryAPI';
import { getDropdownData } from '../../services/inquiryAPI';
import TransactionHeader from '../../shared/components/transaction/TransactionHeader';
import TransactionList from '../../shared/components/transaction/TransactionList';
import InquiryForm from './InquiryForm';
import '../../shared/styles/unified-design.css';
import './Inquiry.css';

const Inquiry = () => {
  const { currentUser } = useAuth();
  
  // State management
  const [inquiries, setInquiries] = useState([]);
  const [filteredInquiries, setFilteredInquiries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Form and modal states
  const [showForm, setShowForm] = useState(false);
  const [editingInquiry, setEditingInquiry] = useState(null);
  const [viewingInquiry, setViewingInquiry] = useState(null);
  
  // Filter states
  const [filters, setFilters] = useState({
    hospital: '',
    surgicalCategory: '',
    paymentMethod: '',
    dateFrom: '',
    dateTo: '',
    status: ''
  });
  const [searchTerm, setSearchTerm] = useState('');
  
  // Pagination
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  });

  // Dropdown data
  const [dropdownData, setDropdownData] = useState({
    hospitals: [],
    surgicalCategories: [],
    paymentMethods: [],
    procedures: [],
    doctors: []
  });

  // Fetch inquiries
  const fetchInquiries = async () => {
    try {
      setLoading(true);
      setError('');
      
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        ...filters
      };
      
      const response = await inquiryAPI.getInquiries(params);
      
      setInquiries(response.data || []);
      setPagination(prev => ({
        ...prev,
        total: response.pagination?.total || 0,
        totalPages: response.pagination?.totalPages || 0
      }));
      
    } catch (err) {
      console.error('Error fetching inquiries:', err);
      setError('Failed to fetch inquiries');
    } finally {
      setLoading(false);
    }
  };

  // Fetch dropdown data
  const fetchDropdownData = async () => {
    try {
      const response = await getDropdownData();
      setDropdownData(response);
    } catch (err) {
      console.error('Error fetching dropdown data:', err);
    }
  };

  // Initialize component
  useEffect(() => {
    fetchDropdownData();
  }, []);

  useEffect(() => {
    fetchInquiries();
    // eslint-disable-next-line
  }, [pagination.page, filters]);

  // Filter inquiries by search term
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredInquiries(inquiries);
    } else {
      const searchLower = searchTerm.toLowerCase();
      const filtered = inquiries.filter(inquiry => 
        inquiry.patientName?.toLowerCase().includes(searchLower) ||
        inquiry.patientUHID?.toLowerCase().includes(searchLower) ||
        inquiry.hospital?.shortName?.toLowerCase().includes(searchLower) ||
        inquiry.hospital?.name?.toLowerCase().includes(searchLower) ||
        inquiry.surgicalCategory?.description?.toLowerCase().includes(searchLower)
      );
      setFilteredInquiries(filtered);
    }
  }, [inquiries, searchTerm]);

  // Handle form submission
  const handleFormSubmit = async (formData) => {
    try {
      setLoading(true);
      setError('');
      setSuccess('');

      if (editingInquiry) {
        await inquiryAPI.updateInquiry(editingInquiry._id, {
          ...formData,
          updatedBy: currentUser._id
        });
        setSuccess('Inquiry updated successfully');
      } else {
        await inquiryAPI.createInquiry({
          ...formData,
          createdBy: currentUser._id,
          updatedBy: currentUser._id
        });
        setSuccess('Inquiry created successfully');
      }

      setShowForm(false);
      setEditingInquiry(null);
      fetchInquiries();
      
    } catch (err) {
      console.error('Error saving inquiry:', err);
      setError(err.message || 'Failed to save inquiry');
    } finally {
      setLoading(false);
    }
  };

  // Handle delete inquiry
  const handleDelete = async (inquiry) => {
    if (!window.confirm(`Are you sure you want to delete the inquiry for ${inquiry.patientName}?`)) {
      return;
    }

    try {
      setLoading(true);
      await inquiryAPI.deleteInquiry(inquiry._id, currentUser._id);
      setSuccess('Inquiry deleted successfully');
      fetchInquiries();
    } catch (err) {
      console.error('Error deleting inquiry:', err);
      setError('Failed to delete inquiry');
    } finally {
      setLoading(false);
    }
  };

  // Define table columns
  const tableColumns = [
    {
      key: 'inquiryDate',
      title: 'Date',
      render: (value) => value ? new Date(value).toLocaleDateString() : '-'
    },
    {
      key: 'hospital',
      title: 'Hospital',
      render: (value) => value?.shortName || value?.name || '-'
    },
    {
      key: 'patientName',
      title: 'Patient Name'
    },
    {
      key: 'patientUHID',
      title: 'Patient UHID'
    },
    {
      key: 'surgicalCategory',
      title: 'Surgical Category',
      render: (value) => value?.description || '-'
    },
    {
      key: 'paymentMethod',
      title: 'Payment Method',
      render: (value) => value?.description || '-'
    },
    {
      key: 'surgeon',
      title: 'Surgeon',
      render: (value) => value?.name || '-'
    },
    {
      key: 'actions',
      title: 'Actions'
    }
  ];

  // Header actions
  const headerActions = [
    {
      label: 'Add Inquiry',
      icon: '➕',
      onClick: () => {
        setEditingInquiry(null);
        setShowForm(true);
      },
      variant: 'unified-btn-primary'
    }
  ];

  return (
    <div className="unified-container">
      <TransactionHeader
        title="Inquiry Management"
        subtitle="Manage patient inquiries and surgical requirements"
        actions={headerActions}
      />

      {/* Alert Messages */}
      {error && (
        <div className="unified-alert unified-alert-danger">
          {error}
        </div>
      )}
      
      {success && (
        <div className="unified-alert unified-alert-success">
          {success}
        </div>
      )}

      {/* Filters Section */}
      <div className="unified-content">
        <h3>Search and Filter</h3>
        <div className="unified-filters-row">
          <div className="unified-filter-group" style={{flex: '2 1 300px'}}>
            <label>Search Inquiries</label>
            <input
              type="text"
              className="unified-search-input"
              placeholder="Search by patient name, UHID, or hospital..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="unified-filter-group">
            <label>Hospital</label>
            <select
              className="unified-filter-select"
              value={filters.hospital}
              onChange={(e) => setFilters({...filters, hospital: e.target.value})}
            >
              <option value="">All Hospitals</option>
              {dropdownData.hospitals.map(hospital => (
                <option key={hospital._id} value={hospital._id}>
                  {hospital.shortName || hospital.name}
                </option>
              ))}
            </select>
          </div>
          
          <div className="unified-filter-group">
            <label>Surgical Category</label>
            <select
              className="unified-filter-select"
              value={filters.surgicalCategory}
              onChange={(e) => setFilters({...filters, surgicalCategory: e.target.value})}
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
            <label>Date From</label>
            <input
              type="date"
              className="unified-filter-select"
              value={filters.dateFrom}
              onChange={(e) => setFilters({...filters, dateFrom: e.target.value})}
            />
          </div>
        </div>
      </div>

      {/* Inquiry List */}
      <TransactionList
        title={`Inquiries (${filteredInquiries.length} records)`}
        data={filteredInquiries.map(inquiry => ({
          ...inquiry,
          displayTitle: inquiry.patientName,
          status: inquiry.status ? { label: inquiry.status, type: 'badge-info' } : null
        }))}
        columns={tableColumns}
        onEdit={(inquiry) => {
          setEditingInquiry(inquiry);
          setShowForm(true);
        }}
        onDelete={handleDelete}
        onView={(inquiry) => setViewingInquiry(inquiry)}
        loading={loading}
        emptyMessage="No inquiries found. Click 'Add Inquiry' to create your first inquiry."
      />

      {/* Inquiry Form Modal */}
      {showForm && (
        <InquiryForm
          inquiry={editingInquiry}
          dropdownData={dropdownData}
          onSubmit={handleFormSubmit}
          onCancel={() => {
            setShowForm(false);
            setEditingInquiry(null);
          }}
          loading={loading}
        />
      )}

      {/* Inquiry View Modal */}
      {viewingInquiry && (
        <div className="unified-modal-overlay">
          <div className="unified-modal-container" style={{maxWidth: '800px'}}>
            <div className="unified-modal-header">
              <div className="unified-modal-title">
                <h1>Inquiry Details</h1>
                <p>Patient: {viewingInquiry.patientName}</p>
              </div>
              <button 
                className="unified-modal-close"
                onClick={() => setViewingInquiry(null)}
              >
                ×
              </button>
            </div>
            
            <div className="unified-modal-body">
              <div className="unified-content">
                <div className="unified-form-grid">
                  <div className="unified-form-field">
                    <label>Inquiry Date:</label>
                    <span>{new Date(viewingInquiry.inquiryDate).toLocaleDateString()}</span>
                  </div>
                  <div className="unified-form-field">
                    <label>Hospital:</label>
                    <span>{viewingInquiry.hospital?.name || '-'}</span>
                  </div>
                  <div className="unified-form-field">
                    <label>Patient Name:</label>
                    <span>{viewingInquiry.patientName}</span>
                  </div>
                  <div className="unified-form-field">
                    <label>Patient UHID:</label>
                    <span>{viewingInquiry.patientUHID}</span>
                  </div>
                  <div className="unified-form-field">
                    <label>Surgical Category:</label>
                    <span>{viewingInquiry.surgicalCategory?.description || '-'}</span>
                  </div>
                  <div className="unified-form-field">
                    <label>Payment Method:</label>
                    <span>{viewingInquiry.paymentMethod?.description || '-'}</span>
                  </div>
                  <div className="unified-form-field">
                    <label>Surgeon:</label>
                    <span>{viewingInquiry.surgeon?.name || '-'}</span>
                  </div>
                  <div className="unified-form-field">
                    <label>Consulting Doctor:</label>
                    <span>{viewingInquiry.consultingDoctor?.name || '-'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Inquiry;
