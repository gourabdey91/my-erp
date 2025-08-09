import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { deliveryChallanAPI } from './services/deliveryChallanAPI';
import './DeliveryChallanDetails.css';

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

  useEffect(() => {
    fetchDeliveryChallans();
    fetchDropdownData();
  }, [currentPage, searchTerm, filterHospital, filterConsumed]);

  const fetchDeliveryChallans = async () => {
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
  };

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
    
    // Scroll to form after state update
    setTimeout(() => {
      const formContainer = document.querySelector('.form-container');
      if (formContainer) {
        formContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
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

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  if (loading && deliveryChallans.length === 0) {
    return <div className="loading">Loading delivery challans...</div>;
  }

  return (
    <div className="delivery-challan-container">
      <div className="delivery-challan-header">
        <div className="header-content">
          <div className="header-text">
            <h1>Challan Details</h1>
            <p>Manage challan information and track consumption status</p>
          </div>
          <button
            className="btn btn-primary"
            onClick={() => setShowForm(true)}
          >
            + Add Challan
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="filters-section">
        <div className="search-filter">
          <input
            type="text"
            placeholder="Search by challan number or sales order..."
            value={searchTerm}
            onChange={handleSearch}
            className="search-input"
          />
        </div>
        <div className="dropdown-filters">
          <select
            value={filterHospital}
            onChange={(e) => {
              setFilterHospital(e.target.value);
              setCurrentPage(1);
            }}
            className="filter-select"
          >
            <option value="">All Hospitals</option>
            {hospitals.map(hospital => (
              <option key={hospital._id} value={hospital._id}>
                {hospital.shortName}
              </option>
            ))}
          </select>
          <select
            value={filterConsumed}
            onChange={(e) => {
              setFilterConsumed(e.target.value);
              setCurrentPage(1);
            }}
            className="filter-select"
          >
            <option value="">All Status</option>
            <option value="true">Consumed</option>
            <option value="false">Not Consumed</option>
          </select>
        </div>
      </div>

      {/* Status Messages */}
      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      {/* Delivery Challans List */}
      <div className="delivery-challans-content">
        {deliveryChallans.length === 0 ? (
          <div className="empty-state">
            <p>No delivery challans found.</p>
            <p>Click "Add Challan" to create your first entry.</p>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="desktop-table-view">
              <table className="delivery-challans-table">
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
                      <td>{challan.challanId}</td>
                      <td>{challan.deliveryChallanNumber}</td>
                      <td>{challan.hospital?.shortName}</td>
                      <td>{formatDate(challan.challanDate)}</td>
                      <td>{challan.salesOrderNumber}</td>
                      <td>
                        <span className={`status-badge ${challan.consumedIndicator ? 'consumed' : 'pending'}`}>
                          {challan.consumedIndicator ? 'Consumed' : 'Pending'}
                        </span>
                      </td>
                      <td>
                        <div className="action-buttons">
                          <button
                            className="btn btn-sm btn-outline-primary"
                            onClick={() => handleEdit(challan)}
                            disabled={loading}
                          >
                            Edit
                          </button>
                          <button
                            className="btn btn-sm btn-outline-danger"
                            onClick={() => handleDelete(challan)}
                            disabled={loading}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="mobile-card-view">
              {deliveryChallans.map(challan => (
                <div key={`mobile-${challan._id}`} className="challan-mobile-card">
                  <div className="card-header">
                    <h3>{challan.challanId}</h3>
                    <span className={`status-badge ${challan.consumedIndicator ? 'consumed' : 'pending'}`}>
                      {challan.consumedIndicator ? 'Consumed' : 'Pending'}
                    </span>
                  </div>
                  <div className="card-body">
                    <div className="card-field">
                      <label>Challan Number:</label>
                      <span>{challan.deliveryChallanNumber}</span>
                    </div>
                    <div className="card-field">
                      <label>Hospital:</label>
                      <span>{challan.hospital?.shortName}</span>
                    </div>
                    <div className="card-field">
                      <label>Challan Date:</label>
                      <span>{formatDate(challan.challanDate)}</span>
                    </div>
                    <div className="card-field">
                      <label>Sales Order:</label>
                      <span>{challan.salesOrderNumber}</span>
                    </div>
                  </div>
                  <div className="card-actions">
                    <button
                      className="btn btn-sm btn-outline-primary"
                      onClick={() => handleEdit(challan)}
                      disabled={loading}
                    >
                      Edit
                    </button>
                    <button
                      className="btn btn-sm btn-outline-danger"
                      onClick={() => handleDelete(challan)}
                      disabled={loading}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="pagination">
          <button
            className="btn btn-outline-secondary"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1 || loading}
          >
            Previous
          </button>
          <span className="page-info">
            Page {currentPage} of {totalPages}
          </span>
          <button
            className="btn btn-outline-secondary"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages || loading}
          >
            Next
          </button>
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="modal-overlay" onClick={(e) => e.target.classList.contains('modal-overlay') && resetForm()}>
          <div className="form-container">
            <div className="form-header">
              <h2>{editingChallan ? 'Edit Challan' : 'Add New Challan'}</h2>
              <button type="button" className="close-btn" onClick={resetForm}>×</button>
            </div>
            
            <div className="form-content">
              <form onSubmit={handleSubmit} className="delivery-challan-form">
                <div className="form-row">
                  <div className="form-group">
                    <label>Delivery Challan Number *</label>
                    <input
                      type="text"
                      name="deliveryChallanNumber"
                      value={formData.deliveryChallanNumber}
                      onChange={handleInputChange}
                      placeholder="Enter challan number"
                      required
                    />
                  </div>
                  
                  <div className="form-group">
                    <label>Hospital *</label>
                    <select
                      name="hospital"
                      value={formData.hospital}
                      onChange={handleInputChange}
                      required
                    >
                      <option value="">Select Hospital</option>
                      {hospitals.map(hospital => (
                        <option key={hospital._id} value={hospital._id}>
                          {hospital.shortName} - {hospital.legalName}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Challan Date (Optional)</label>
                    <input
                      type="date"
                      name="challanDate"
                      value={formData.challanDate}
                      onChange={handleInputChange}
                    />
                  </div>
                  
                  <div className="form-group">
                    <label>Sales Order Number (Optional, Max 10 chars)</label>
                    <input
                      type="text"
                      name="salesOrderNumber"
                      value={formData.salesOrderNumber}
                      onChange={handleInputChange}
                      placeholder="Enter sales order number"
                      maxLength="10"
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group checkbox-group">
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        name="consumedIndicator"
                        checked={formData.consumedIndicator}
                        onChange={handleInputChange}
                      />
                      <span>Consumed Indicator</span>
                    </label>
                    <small className="help-text">
                      Mark this if the materials have been consumed
                    </small>
                  </div>
                </div>
              </form>
            </div>

            <div className="form-actions">
              <button type="button" className="btn btn-secondary" onClick={resetForm}>
                Cancel
              </button>
              <button type="submit" onClick={handleSubmit} className="btn btn-primary" disabled={loading}>
                {loading ? 'Saving...' : editingChallan ? 'Update Challan' : 'Create Challan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DeliveryChallanDetails;
