import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { doctorAPI } from '../doctors/services/doctorAPI';
import './SalesOrders.css';

const SalesOrders = () => {
  const { currentUser } = useAuth();
  const [salesOrders, setSalesOrders] = useState([]);
  const [editingSalesOrder, setEditingSalesOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [customers, setCustomers] = useState([]);
  // eslint-disable-next-line no-unused-vars
  const [doctors, setDoctors] = useState([]);
  const [filteredDoctors, setFilteredDoctors] = useState([]);
  // eslint-disable-next-line no-unused-vars
  const [categories, setCategories] = useState([]);
  const [filteredCategories, setFilteredCategories] = useState([]);
  // eslint-disable-next-line no-unused-vars
  const [procedures, setProcedures] = useState([]);
  const [filteredProcedures, setFilteredProcedures] = useState([]);
  const [paymentTypes, setPaymentTypes] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [formData, setFormData] = useState({
    customer: '',
    documentDate: new Date().toISOString().split('T')[0],
    patientName: '',
    uhid: '',
    surgeon: '',
    consultingDoctor: '',
    surgicalCategory: '',
    procedure: '',
    paymentType: '',
    notes: '',
    status: 'DRAFT'
  });

  useEffect(() => {
    loadSalesOrders();
    loadDropdownData();
  }, []);

  const loadDropdownData = async () => {
    try {
      const response = await fetch('/api/sales-orders/meta/dropdown-data');
      const contentType = response.headers.get('content-type');
      
      if (response.ok && contentType && contentType.includes('application/json')) {
        const data = await response.json();
        setCustomers(data.customers || []);
        setDoctors(data.doctors || []);
        setCategories(data.categories || []);
        setProcedures(data.procedures || []);
        setPaymentTypes(data.paymentTypes || []);
      } else {
        console.error('Failed to load dropdown data:', response.status, response.statusText);
      }
    } catch (err) {
      console.error('Error loading dropdown data:', err);
    }
  };

  // Handle customer selection change
  const handleCustomerChange = (customerId) => {
    const customer = customers.find(c => c._id === customerId);
    setSelectedCustomer(customer);
    
    // Reset dependent fields
    setFormData(prev => ({
      ...prev,
      customer: customerId,
      surgeon: '',
      consultingDoctor: '',
      surgicalCategory: '', // Will be auto-derived from procedure
      procedure: '',
      paymentType: '',
      patientName: customer?.customerIsHospital ? prev.patientName : '',
      uhid: customer?.customerIsHospital ? prev.uhid : ''
    }));

    // Clear filtered arrays
    setFilteredDoctors([]);
    setFilteredProcedures([]);
  };

  // Note: Surgical category is now derived from procedure selection, not user input
  // This is handled in handleProcedureChange

  // Handle payment type change
  const handlePaymentTypeChange = async (paymentTypeId) => {
    setFormData(prev => ({
      ...prev,
      paymentType: paymentTypeId,
      procedure: '', // Clear procedure when payment type changes
      surgicalCategory: '' // Will be re-derived from new procedure
    }));

    if (formData.customer && paymentTypeId) {
      // Load procedures for this customer and payment type
      // Note: Category will be auto-derived from selected procedure
      try {
        const response = await fetch(
          `/api/sales-orders/procedures/${formData.customer}?paymentType=${paymentTypeId}`
        );
        if (response.ok) {
          const data = await response.json();
          setFilteredProcedures(data.data || []);
        }
      } catch (err) {
        console.error('Error loading procedures:', err);
      }
    } else {
      setFilteredProcedures([]);
    }
  };

  // Handle procedure selection - derives surgical category automatically
  const handleProcedureChange = (procedureId) => {
    // Find the selected procedure to extract category
    const selectedProcedure = filteredProcedures.find(p => p._id === procedureId);
    const derivedCategory = selectedProcedure?.items?.[0]?.surgicalCategoryId?._id || 
                           selectedProcedure?.items?.[0]?.surgicalCategoryId || null;

    setFormData(prev => ({
      ...prev,
      procedure: procedureId,
      surgicalCategory: derivedCategory // Auto-set from procedure
    }));

    // Load surgeons based on the derived category and customer
    if (formData.customer && derivedCategory) {
      doctorAPI.getSurgeonsByHospitalAndCategory(formData.customer, derivedCategory)
        .then(response => {
          if (response.success) {
            setFilteredDoctors(response.data || []);
          }
        })
        .catch(err => console.error('Error loading surgeons:', err));
    }
  };

  // Handle View sales order
  const handleView = (orderId) => {
    const order = salesOrders.find(o => o._id === orderId);
    if (order) {
      alert(`Sales Order: ${order.salesOrderNumber}\nCustomer: ${order.customer?.shortName}\nStatus: ${order.status}`);
      // TODO: Open detail view modal or navigate to detail page
    }
  };

  // Handle Edit sales order
  const handleEdit = (orderId) => {
    const order = salesOrders.find(o => o._id === orderId);
    if (order) {
      // Load order data into form
      setFormData({
        customer: order.customer?._id || '',
        documentDate: order.documentDate ? new Date(order.documentDate).toISOString().split('T')[0] : '',
        patientName: order.patientName || '',
        uhid: order.uhid || '',
        surgeon: order.surgeon?._id || '',
        consultingDoctor: order.consultingDoctor?._id || '',
        surgicalCategory: order.surgicalCategory?._id || '',
        procedure: order.procedure?._id || '',
        paymentType: order.paymentType?._id || '',
        notes: order.notes || '',
        status: order.status || 'DRAFT'
      });
      setEditingSalesOrder(order);
      
      // Fetch the full customer object from dropdown options to get customerIsHospital flag
      const fullCustomer = customers.find(c => c._id === order.customer?._id);
      setSelectedCustomer(fullCustomer || order.customer);
      
      // Populate procedures if payment type is set
      // Surgical category will be auto-derived from selected procedure
      if (order.paymentType?._id && order.customer?._id) {
        fetch(`/api/sales-orders/procedures/${order.customer._id}?paymentType=${order.paymentType._id}`)
          .then(res => res.json())
          .then(response => {
            if (response.success) {
              setFilteredProcedures(response.data || []);
            } else {
              setFilteredProcedures([]);
            }
          })
          .catch(err => {
            console.error('Failed to load procedures:', err);
            setFilteredProcedures([]);
          });
      } else {
        setFilteredProcedures([]);
      }
      
      // Populate surgeons if category is set (derived from procedure)
      if (order.surgicalCategory?._id && order.customer?._id) {
        doctorAPI.getSurgeonsByHospitalAndCategory(order.customer._id, order.surgicalCategory._id)
          .then(response => {
            if (response.success) {
              setFilteredDoctors(response.data || []);
            } else {
              setFilteredDoctors([]);
            }
          })
          .catch(err => {
            console.error('Failed to load surgeons:', err);
            setFilteredDoctors([]);
          });
      }
      
      setShowForm(true);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Derive surgical category from selected procedure (like Inquiry)
      const selectedProcedure = filteredProcedures.find(p => p._id === formData.procedure);
      const derivedSurgicalCategory = selectedProcedure?.items?.[0]?.surgicalCategoryId?._id || 
                                      selectedProcedure?.items?.[0]?.surgicalCategoryId || null;
      
      // Map form fields to backend field names
      const salesOrderData = {
        customer: formData.customer,
        patientName: formData.patientName,
        uhid: formData.uhid,
        surgeon: formData.surgeon || undefined,
        consultingDoctor: formData.consultingDoctor || undefined,
        surgicalCategory: derivedSurgicalCategory, // Derived from procedure, not user input
        procedure: formData.procedure || undefined,
        paymentType: formData.paymentType || undefined,
        notes: formData.notes || '', // Map specialInstructions → notes
        status: formData.status || 'DRAFT',
        createdBy: currentUser?.id,
        updatedBy: currentUser?.id
      };

      // If editing, send PUT request; otherwise send POST request
      const url = editingSalesOrder ? `/api/sales-orders/${editingSalesOrder._id}` : '/api/sales-orders';
      const method = editingSalesOrder ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(salesOrderData),
      });

      const contentType = response.headers.get('content-type');
      
      if (response.ok) {
        setShowForm(false);
        setEditingSalesOrder(null);
        setSelectedCustomer(null);
        setFilteredDoctors([]);
        setFilteredCategories([]);
        setFilteredProcedures([]);
        setFormData({
          customer: '',
          documentDate: new Date().toISOString().split('T')[0],
          patientName: '',
          uhid: '',
          surgeon: '',
          consultingDoctor: '',
          surgicalCategory: '',
          procedure: '',
          paymentType: '',
          notes: '',
          status: 'DRAFT'
        });
        loadSalesOrders();
        setError('');
      } else {
        let errorMessage = `Server error: ${response.status} ${response.statusText}`;
        
        if (contentType && contentType.includes('application/json')) {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
          
          // Add detailed field errors if available
          if (errorData.details && errorData.details.length > 0) {
            errorMessage += '\n\nField errors:\n' + errorData.details.join('\n');
          }
        }
        
        setError(errorMessage);
        console.error('Error creating/updating sales order:', errorMessage);
      }
    } catch (err) {
      setError('Failed to connect to server');
      console.error('Error creating/updating sales order:', err);
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingSalesOrder(null);
    setSelectedCustomer(null);
    setFilteredDoctors([]);
    setFilteredCategories([]);
    setFilteredProcedures([]);
    setFormData({
      customer: '',
      documentDate: new Date().toISOString().split('T')[0],
      patientName: '',
      uhid: '',
      surgeon: '',
      consultingDoctor: '',
      surgicalCategory: '',
      procedure: '',
      paymentType: '',
      notes: '',
      status: 'DRAFT'
    });
    setError('');
  };

  const loadSalesOrders = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/sales-orders');
      
      // Check if response is JSON
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const data = await response.json();
        if (response.ok) {
          setSalesOrders(data.data || []);
        } else {
          setError(data.message || 'Failed to load sales orders');
        }
      } else {
        setError(`Server error: ${response.status} ${response.statusText}`);
      }
    } catch (err) {
      setError('Failed to connect to server');
      console.error('Error loading sales orders:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="loading">Loading sales orders...</div>;
  }

  return (
    <div className="sales-orders-container">
      <div className="page-header">
        <h1>Sales Orders</h1>
        <button
          className="btn btn-primary"
          onClick={() => {
            setEditingSalesOrder(null);
            setFormData({
              customer: '',
              documentDate: new Date().toISOString().split('T')[0],
              patientName: '',
              uhid: '',
              surgeon: '',
              consultingDoctor: '',
              surgicalCategory: '',
              procedure: '',
              paymentType: '',
              notes: '',
              status: 'DRAFT'
            });
            setSelectedCustomer(null);
            setFilteredDoctors([]);
            setFilteredCategories([]);
            setFilteredProcedures([]);
            setError('');
            setShowForm(true);
          }}
        >
          + Add New Sales Order
        </button>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      <div className="stats-cards">
        <div className="stat-card">
          <h3>Total Sales Orders</h3>
          <div className="stat-number">{salesOrders.length}</div>
        </div>
        <div className="stat-card">
          <h3>Draft Orders</h3>
          <div className="stat-number">
            {salesOrders.filter(so => so.status === 'DRAFT').length}
          </div>
        </div>
        <div className="stat-card">
          <h3>Confirmed Orders</h3>
          <div className="stat-number">
            {salesOrders.filter(so => so.status === 'CONFIRMED').length}
          </div>
        </div>
      </div>

      {showForm && (
        <div className="form-overlay">
          <div className="form-container">
            <div className="form-header">
              <h2>{editingSalesOrder ? `Edit Sales Order ${editingSalesOrder.salesOrderNumber}` : 'Create New Sales Order'}</h2>
              <button 
                className="close-btn"
                onClick={handleCancel}
              >
                ×
              </button>
            </div>
            <div className="form-content">
              <form onSubmit={handleSubmit} className="sales-order-form">
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="customer">Customer *</label>
                    <select
                      id="customer"
                      value={formData.customer}
                      onChange={(e) => handleCustomerChange(e.target.value)}
                      required
                    >
                      <option value="">Select Customer</option>
                      {customers.map((customer) => (
                        <option key={customer._id} value={customer._id}>
                          {customer.shortName || customer.legalName}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label htmlFor="documentDate">Order Date *</label>
                    <input
                      type="date"
                      id="documentDate"
                      value={formData.documentDate}
                      onChange={(e) => setFormData({ ...formData, documentDate: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="status">Status</label>
                    <select
                      id="status"
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    >
                      <option value="DRAFT">Draft</option>
                      <option value="CONFIRMED">Confirmed</option>
                    </select>
                  </div>
                </div>

                {/* Hospital-specific fields - only show if customer is a hospital */}
                {selectedCustomer?.customerIsHospital && (
                  <>
                    <div className="form-row">
                      <div className="form-group">
                        <label htmlFor="patientName">Patient Name *</label>
                        <input
                          type="text"
                          id="patientName"
                          value={formData.patientName}
                          onChange={(e) => setFormData({ ...formData, patientName: e.target.value })}
                          required={selectedCustomer?.customerIsHospital}
                          placeholder="Enter patient name"
                        />
                      </div>
                      <div className="form-group">
                        <label htmlFor="uhid">UHID</label>
                        <input
                          type="text"
                          id="uhid"
                          value={formData.uhid}
                          onChange={(e) => setFormData({ ...formData, uhid: e.target.value })}
                          placeholder="Enter UHID"
                        />
                      </div>
                    </div>

                    <div className="form-row">
                      <div className="form-group">
                        <label htmlFor="paymentType">Payment Type</label>
                        <select
                          id="paymentType"
                          value={formData.paymentType}
                          onChange={(e) => handlePaymentTypeChange(e.target.value)}
                        >
                          <option value="">Select Payment Type</option>
                          {paymentTypes.map((paymentType) => (
                            <option key={paymentType._id} value={paymentType._id}>
                              {paymentType.code} - {paymentType.description}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="form-row">
                      <div className="form-group">
                        <label htmlFor="procedure">Procedure</label>
                        <select
                          id="procedure"
                          value={formData.procedure}
                          onChange={(e) => handleProcedureChange(e.target.value)}
                        >
                          <option value="">Select Procedure</option>
                          {filteredProcedures.map((procedure) => (
                            <option key={procedure._id} value={procedure._id}>
                              {procedure.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="form-group">
                        <label htmlFor="surgeon">Surgeon</label>
                        <select
                          id="surgeon"
                          value={formData.surgeon}
                          onChange={(e) => setFormData({ ...formData, surgeon: e.target.value })}
                        >
                          <option value="">Select Surgeon</option>
                          {filteredDoctors.map((doctor) => (
                            <option key={doctor._id} value={doctor._id}>
                              {doctor.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="form-row">
                      <div className="form-group">
                        <label htmlFor="consultingDoctor">Consulting Doctor</label>
                        <select
                          id="consultingDoctor"
                          value={formData.consultingDoctor}
                          onChange={(e) => setFormData({ ...formData, consultingDoctor: e.target.value })}
                        >
                          <option value="">Select Consulting Doctor</option>
                          {doctors.map((doctor) => (
                            <option key={doctor._id} value={doctor._id}>
                              {doctor.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="form-group">
                        {/* Empty space for layout */}
                      </div>
                    </div>
                  </>
                )}

                <div className="form-group full-width">
                  <label htmlFor="notes">Notes</label>
                  <textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows="3"
                    placeholder="Enter any notes or special instructions..."
                  />
                </div>

                <div className="form-actions">
                  <button type="submit" className="btn btn-primary">
                    {editingSalesOrder ? 'Update Sales Order' : 'Create Sales Order'}
                  </button>
                  <button type="button" className="btn btn-secondary" onClick={handleCancel}>
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      <div className="sales-orders-list">
        {salesOrders.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📝</div>
            <h3>No Sales Orders Found</h3>
            <p>Create your first sales order to get started.</p>
            <button
              className="btn btn-primary"
              onClick={() => setShowForm(true)}
            >
              Create Sales Order
            </button>
          </div>
        ) : (
          <div className="sales-orders-grid">
            {salesOrders.map((order) => (
              <div key={order._id} className="sales-order-card">
                <div className="order-header">
                  <h3>{order.salesOrderNumber}</h3>
                  <span className={`status-badge status-${order.status?.toLowerCase()}`}>
                    {order.status}
                  </span>
                </div>
                <div className="order-details">
                  <div className="detail-row">
                    <span className="label">Customer:</span>
                    <span className="value">
                      {order.customer?.shortName || order.customer?.legalName || 'N/A'}
                    </span>
                  </div>
                  <div className="detail-row">
                    <span className="label">Date:</span>
                    <span className="value">
                      {order.documentDate ? new Date(order.documentDate).toLocaleDateString() : 'N/A'}
                    </span>
                  </div>
                  <div className="detail-row">
                    <span className="label">Patient:</span>
                    <span className="value">{order.patientName || 'N/A'}</span>
                  </div>
                  {order.surgeon && (
                    <div className="detail-row">
                      <span className="label">Surgeon:</span>
                      <span className="value">{order.surgeon.name}</span>
                    </div>
                  )}
                </div>
                <div className="order-actions">
                  <button className="btn btn-outline" onClick={() => handleView(order._id)}>View</button>
                  <button className="btn btn-outline" onClick={() => handleEdit(order._id)}>Edit</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SalesOrders;
