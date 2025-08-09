import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { deliveryChallanAPI } from './services/deliveryChallanAPI';
import '../../shared/styles/unified-design.css';
import './DeliveryChallanDetails.css';
import MobileCard from '../../shared/components/MobileCard';
import { scrollToTop } from '../../shared/utils/scrollUtils';

const DeliveryChallanDetails = () => {
  const { currentUser } = useAuth();
  
  const [deliveryChallans, setDeliveryChallans] = useState([]);
  const [hospitals, setHospitals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Form states
  const [showForm, setShowForm] = useState(false);
  const [editingChallan, setEditingChallan] = useState(null);
  const [formData, setFormData] = useState({
    deliveryChallanNumber: '',
    hospital: '',
    challanDate: '',
    salesOrderNumber: '',
    consumedIndicator: false
  });

  // Pagination and filters
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterHospital, setFilterHospital] = useState('');
  const [filterConsumed, setFilterConsumed] = useState('');

  const fetchDeliveryChallans = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage,
        limit: 10
      });
      
      if (searchTerm) params.append('search', searchTerm);
      if (filterHospital) params.append('hospitalId', filterHospital);
      if (filterConsumed) params.append('consumed', filterConsumed);
      
      const response = await deliveryChallanAPI.getAllDeliveryChallans(params);
      setDeliveryChallans(response.deliveryChallans || []);
      setTotalPages(response.pagination.pages || 1);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch delivery challans');
      console.error('Error fetching delivery challans:', err);
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchTerm, filterHospital, filterConsumed]);

  useEffect(() => {
    fetchDeliveryChallans();
    fetchDropdownData();
  }, [fetchDeliveryChallans]);

  const fetchDropdownData = async () => {
    try {
      const response = await deliveryChallanAPI.getDropdownData();
      setHospitals(response.hospitals || []);
    } catch (err) {
      console.error('Error fetching dropdown data:', err);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const resetForm = () => {
    setFormData({
      deliveryChallanNumber: '',
      hospital: '',
      challanDate: '',
      salesOrderNumber: '',
      consumedIndicator: false
    });
    setEditingChallan(null);
    setShowForm(false);
    setError('');
    setSuccess('');
  };

  const validateForm = () => {
    if (!formData.deliveryChallanNumber.trim()) {
      return 'Delivery challan number is required';
    }
    if (!formData.hospital) {
      return 'Hospital is required';
    }
    if (formData.salesOrderNumber && formData.salesOrderNumber.length > 10) {
      return 'Sales order number cannot exceed 10 characters';
    }
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!currentUser || !currentUser._id) {
      setError('User authentication required. Please log in again.');
      return;
    }
    
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setError('');
      setSuccess('');
      
      const challanData = {
        ...formData,
        deliveryChallanNumber: formData.deliveryChallanNumber.trim(),
        salesOrderNumber: formData.salesOrderNumber.trim(),
        createdBy: currentUser._id,
        updatedBy: currentUser._id
      };

      if (editingChallan) {
        await deliveryChallanAPI.updateDeliveryChallan(editingChallan._id, {
          ...challanData,
          updatedBy: currentUser._id
        });
        setSuccess('Challan updated successfully!');
      } else {
        await deliveryChallanAPI.createDeliveryChallan(challanData);
        setSuccess('Challan created successfully!');
      }

      resetForm();
      fetchDeliveryChallans();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save delivery challan');
      console.error('Error saving delivery challan:', err);
    }
  };

  const handleEdit = (challan) => {
    setFormData({
      deliveryChallanNumber: challan.deliveryChallanNumber,
      hospital: challan.hospital._id,
      challanDate: new Date(challan.challanDate).toISOString().split('T')[0],
      salesOrderNumber: challan.salesOrderNumber,
      consumedIndicator: challan.consumedIndicator
    });
    setEditingChallan(challan);
    setShowForm(true);
    setError('');
    setSuccess('');
    
    // Scroll to top to show form
    scrollToTop();
  };

  const handleDelete = async (challan) => {
    if (!window.confirm(`Are you sure you want to delete challan "${challan.deliveryChallanNumber}"?`)) {
      return;
    }

    try {
      setError('');
      await deliveryChallanAPI.deleteDeliveryChallan(challan._id, currentUser._id);
      setSuccess('Challan deleted successfully!');
      fetchDeliveryChallans();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete delivery challan');
      console.error('Error deleting delivery challan:', err);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN');
  };

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  if (loading && deliveryChallans.length === 0) {
    return <div className="loading">Loading delivery challans...</div>;
  }

  return (
    <div className="unified-container">
      {/* Header */}
      <div className="unified-header">
        <div className="unified-header-content">
          <div className="unified-header-text">
            <h1>Delivery Challan Details</h1>
            <p>Manage delivery challan information and track consumption status.</p>
          </div>
          <button
            className="unified-btn unified-btn-primary"
            onClick={() => {
              if (!showForm) {
                resetForm();
                setShowForm(true);
                scrollToTop();
              } else {
                resetForm();
                setShowForm(false);
              }
            }}
            disabled={loading}
          >
            {showForm ? 'Cancel' : 'Add Challan'}
          </button>
        </div>
      </div>

      {/* Status Messages */}
      {error && (
        <div className="unified-content">
          <div style={{ padding: '1rem', background: '#fee', border: '1px solid #fcc', borderRadius: '8px', color: '#c33', marginBottom: '1rem' }}>
            {error}
          </div>
        </div>
      )}
      {success && (
        <div className="unified-content">
          <div style={{ padding: '1rem', background: '#efe', border: '1px solid #cfc', borderRadius: '8px', color: '#363', marginBottom: '1rem' }}>
            {success}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="unified-filters">
        <div className="unified-filters-row">
          <div className="unified-filter-group">
            <label>Search</label>
            <input
              type="text"
              placeholder="Search by challan number or sales order..."
              value={searchTerm}
              onChange={handleSearch}
              className="unified-search-input"
            />
          </div>
          
          <div className="unified-filter-group">
            <label>Hospital</label>
            <select
              value={filterHospital}
              onChange={(e) => {
                setFilterHospital(e.target.value);
                setCurrentPage(1);
              }}
              className="unified-filter-select"
            >
              <option value="">All Hospitals</option>
              {hospitals.map(hospital => (
                <option key={hospital._id} value={hospital._id}>
                  {hospital.shortName}
                </option>
              ))}
            </select>
          </div>
          
          <div className="unified-filter-group">
            <label>Status</label>
            <select
              value={filterConsumed}
              onChange={(e) => {
                setFilterConsumed(e.target.value);
                setCurrentPage(1);
              }}
              className="unified-filter-select"
            >
              <option value="">All Status</option>
              <option value="true">Consumed</option>
              <option value="false">Not Consumed</option>
            </select>
          </div>
          
          <div className="unified-filter-group">
            <button
              type="button"
              className="unified-btn unified-btn-secondary"
              onClick={() => {
                setSearchTerm('');
                setFilterHospital('');
                setFilterConsumed('');
                setCurrentPage(1);
              }}
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Content Section */}
      {!showForm && (
        <div className="unified-content">
          {deliveryChallans.length === 0 ? (
            <div className="empty-state">
              {loading ? (
                <p>Loading delivery challans...</p>
              ) : (
                <>
                  <p>No delivery challans found.</p>
                  <p>Click "Add Challan" to create your first entry.</p>
                </>
              )}
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="unified-table-responsive">
                <table className="unified-table">
                  <thead>
                    <tr>
                      <th>Challan ID</th>
                      <th>Challan Number</th>
                      <th>Hospital</th>
                      <th>Challan Date</th>
                      <th>Sales Order</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {deliveryChallans.map(challan => (
                      <tr key={challan._id}>
                        <td>
                          <span className="identifier-text">{challan.challanId}</span>
                        </td>
                        <td>
                          <span className="name-text">{challan.deliveryChallanNumber}</span>
                        </td>
                        <td>{challan.hospital?.shortName}</td>
                        <td>{formatDate(challan.challanDate)}</td>
                        <td>{challan.salesOrderNumber}</td>
                        <td>
                          <span className={`unified-status-badge ${challan.consumedIndicator ? 'success' : 'warning'}`}>
                            {challan.consumedIndicator ? 'Consumed' : 'Pending'}
                          </span>
                        </td>
                        <td>
                          <div className="unified-table-actions">
                            <button
                              className="unified-table-action edit"
                              onClick={() => handleEdit(challan)}
                              disabled={loading}
                              title="Edit challan"
                            >
                              ✏️
                            </button>
                            <button
                              className="unified-table-action delete"
                              onClick={() => handleDelete(challan)}
                              disabled={loading}
                              title="Delete challan"
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

              {/* Mobile Card View */}
              <div className="unified-mobile-cards">
                {deliveryChallans.map(challan => (
                  <MobileCard
                    key={challan._id}
                    id={challan._id}
                    title={challan.challanId}
                    subtitle={challan.deliveryChallanNumber}
                    badge={{
                      text: challan.consumedIndicator ? 'Consumed' : 'Pending',
                      type: challan.consumedIndicator ? 'success' : 'warning'
                    }}
                    fields={[
                      { label: 'Hospital', value: challan.hospital?.shortName || 'N/A' },
                      { label: 'Challan Date', value: formatDate(challan.challanDate) },
                      { label: 'Sales Order', value: challan.salesOrderNumber || 'N/A' }
                    ]}
                    actions={[
                      {
                        label: 'Edit',
                        onClick: () => handleEdit(challan),
                        variant: 'primary',
                        disabled: loading
                      },
                      {
                        label: 'Delete',
                        onClick: () => handleDelete(challan),
                        variant: 'danger',
                        disabled: loading
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
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1 || loading}
                  >
                    Previous
                  </button>
                  
                  <div className="page-info">
                    <span>Page {currentPage} of {totalPages}</span>
                  </div>
                  
                  <button
                    className="unified-btn unified-btn-secondary"
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages || loading}
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Form Section */}
      {showForm && (
        <div className="unified-content">
          <div style={{ borderBottom: '2px solid var(--gray-200)', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
            <h2 style={{ margin: 0, color: 'var(--primary-color)', fontSize: '1.5rem', fontWeight: '600' }}>
              {editingChallan ? 'Edit Delivery Challan' : 'Add New Delivery Challan'}
            </h2>
          </div>
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '2rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: 'var(--gray-700)' }}>
                  Delivery Challan Number *
                </label>
                <input
                  type="text"
                  name="deliveryChallanNumber"
                  value={formData.deliveryChallanNumber}
                  onChange={handleInputChange}
                  placeholder="Enter challan number"
                  required
                  className="unified-search-input"
                />
              </div>
              
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: 'var(--gray-700)' }}>
                  Hospital *
                </label>
                <select
                  name="hospital"
                  value={formData.hospital}
                  onChange={handleInputChange}
                  required
                  className="unified-search-input"
                >
                  <option value="">Select Hospital</option>
                  {hospitals.map(hospital => (
                    <option key={hospital._id} value={hospital._id}>
                      {hospital.shortName} - {hospital.legalName}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: 'var(--gray-700)' }}>
                  Challan Date <span style={{ color: 'var(--gray-500)', fontWeight: '400' }}>(Optional)</span>
                </label>
                <input
                  type="date"
                  name="challanDate"
                  value={formData.challanDate}
                  onChange={handleInputChange}
                  className="unified-search-input"
                />
              </div>
              
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: 'var(--gray-700)' }}>
                  Sales Order Number <span style={{ color: 'var(--gray-500)', fontWeight: '400' }}>(Optional, Max 10 chars)</span>
                </label>
                <input
                  type="text"
                  name="salesOrderNumber"
                  value={formData.salesOrderNumber}
                  onChange={handleInputChange}
                  placeholder="Enter sales order number"
                  maxLength="10"
                  className="unified-search-input"
                />
              </div>
            </div>

            <div style={{ marginBottom: '2rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: '500', color: 'var(--gray-700)', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  name="consumedIndicator"
                  checked={formData.consumedIndicator}
                  onChange={handleInputChange}
                />
                Consumed Indicator
              </label>
              <small style={{ color: 'var(--gray-500)', marginLeft: '1.5rem' }}>
                Mark this if the materials have been consumed
              </small>
            </div>

            <div style={{ display: 'flex', gap: '1rem' }}>
              <button type="submit" className="unified-btn unified-btn-primary" disabled={loading}>
                {loading ? 'Saving...' : (editingChallan ? 'Update Challan' : 'Add Challan')}
              </button>
              <button
                type="button"
                className="unified-btn unified-btn-secondary"
                onClick={() => {
                  resetForm();
                  setShowForm(false);
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default DeliveryChallanDetails;
