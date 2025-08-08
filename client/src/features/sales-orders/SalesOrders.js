import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import './SalesOrders.css';

const SalesOrders = () => {
  const { currentUser } = useAuth();
  const [salesOrders, setSalesOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [filteredDoctors, setFilteredDoctors] = useState([]);
  const [categories, setCategories] = useState([]);
  const [filteredCategories, setFilteredCategories] = useState([]);
  const [procedures, setProcedures] = useState([]);
  const [filteredProcedures, setFilteredProcedures] = useState([]);
  const [paymentTypes, setPaymentTypes] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [formData, setFormData] = useState({
    customer: '',
    documentDate: new Date().toISOString().split('T')[0],
    dueDate: '',
    patientName: '',
    uhid: '',
    surgeon: '',
    consultingDoctor: '',
    surgicalCategory: '',
    procedure: '',
    paymentType: '',
    specialInstructions: '',
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
      surgicalCategory: '',
      procedure: '',
      paymentType: '',
      // Clear hospital-specific fields for non-hospital customers
      patientName: customer?.customerIsHospital ? prev.patientName : '',
      uhid: customer?.customerIsHospital ? prev.uhid : ''
    }));

    // Filter surgical categories based on customer assignments
    if (customer?.customerIsHospital && customer.surgicalCategories) {
      const customerCategories = categories.filter(cat => 
        customer.surgicalCategories.includes(cat._id)
      );
      setFilteredCategories(customerCategories);
    } else {
      setFilteredCategories([]);
    }
    
    // Clear other filtered arrays
    setFilteredDoctors([]);
    setFilteredProcedures([]);
  };

  // Handle surgical category change
  const handleSurgicalCategoryChange = async (surgicalCategoryId) => {
    setFormData(prev => ({
      ...prev,
      surgicalCategory: surgicalCategoryId,
      surgeon: '',
      consultingDoctor: '',
      procedure: ''
    }));

    if (formData.customer && surgicalCategoryId) {
      // Load filtered doctors for this customer and surgical category
      try {
        const response = await fetch(`/api/sales-orders/meta/doctors/${formData.customer}/${surgicalCategoryId}`);
        if (response.ok) {
          const data = await response.json();
          setFilteredDoctors(data.doctors || []);
        }
      } catch (err) {
        console.error('Error loading filtered doctors:', err);
      }
    } else if (formData.customer) {
      // Load all doctors for this customer (no surgical category filter)
      try {
        const response = await fetch(`/api/sales-orders/meta/doctors/${formData.customer}`);
        if (response.ok) {
          const data = await response.json();
          setFilteredDoctors(data.doctors || []);
        }
      } catch (err) {
        console.error('Error loading filtered doctors:', err);
      }
    }
  };

  // Handle payment type change
  const handlePaymentTypeChange = async (paymentTypeId) => {
    setFormData(prev => ({
      ...prev,
      paymentType: paymentTypeId,
      procedure: ''
    }));

    if (paymentTypeId) {
      // Load procedures for this payment type
      try {
        const response = await fetch(`/api/sales-orders/meta/procedures/${paymentTypeId}`);
        if (response.ok) {
          const data = await response.json();
          setFilteredProcedures(data.procedures || []);
        }
      } catch (err) {
        console.error('Error loading filtered procedures:', err);
      }
    } else {
      setFilteredProcedures([]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const salesOrderData = {
        ...formData,
        createdBy: currentUser?.id,
        updatedBy: currentUser?.id
      };

      const response = await fetch('/api/sales-orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(salesOrderData),
      });

      const contentType = response.headers.get('content-type');
      
      if (response.ok) {
        setShowForm(false);
        setSelectedCustomer(null);
        setFilteredDoctors([]);
        setFilteredCategories([]);
        setFilteredProcedures([]);
        setFormData({
          customer: '',
          documentDate: new Date().toISOString().split('T')[0],
          dueDate: '',
          patientName: '',
          uhid: '',
          surgeon: '',
          consultingDoctor: '',
          surgicalCategory: '',
          procedure: '',
          paymentType: '',
          specialInstructions: '',
          status: 'DRAFT'
        });
        loadSalesOrders();
        setError('');
      } else {
        let errorMessage = `Server error: ${response.status} ${response.statusText}`;
        
        if (contentType && contentType.includes('application/json')) {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
        }
        
        setError(errorMessage);
      }
    } catch (err) {
      setError('Failed to connect to server');
      console.error('Error creating sales order:', err);
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setSelectedCustomer(null);
    setFilteredDoctors([]);
    setFilteredCategories([]);
    setFilteredProcedures([]);
    setFormData({
      customer: '',
      documentDate: new Date().toISOString().split('T')[0],
      dueDate: '',
      patientName: '',
      uhid: '',
      surgeon: '',
      consultingDoctor: '',
      surgicalCategory: '',
      procedure: '',
      paymentType: '',
      specialInstructions: '',
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
          setSalesOrders(data.salesOrders || []);
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
          onClick={() => setShowForm(true)}
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
              <h2>Add New Sales Order</h2>
              <button 
                className="close-btn"
                onClick={() => setShowForm(false)}
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
                    <label htmlFor="dueDate">Due Date</label>
                    <input
                      type="date"
                      id="dueDate"
                      value={formData.dueDate}
                      onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                    />
                  </div>
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
                        <label htmlFor="surgicalCategory">Surgical Category</label>
                        <select
                          id="surgicalCategory"
                          value={formData.surgicalCategory}
                          onChange={(e) => handleSurgicalCategoryChange(e.target.value)}
                        >
                          <option value="">Select Category</option>
                          {filteredCategories.map((category) => (
                            <option key={category._id} value={category._id}>
                              {category.code} - {category.description}
                            </option>
                          ))}
                        </select>
                      </div>
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
                          onChange={(e) => setFormData({ ...formData, procedure: e.target.value })}
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
                          {filteredDoctors.map((doctor) => (
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
                  <label htmlFor="specialInstructions">Special Instructions</label>
                  <textarea
                    id="specialInstructions"
                    value={formData.specialInstructions}
                    onChange={(e) => setFormData({ ...formData, specialInstructions: e.target.value })}
                    rows="3"
                    placeholder="Enter any special instructions..."
                  />
                </div>

                <div className="form-actions">
                  <button type="submit" className="btn btn-primary">
                    Create Sales Order
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
                  <button className="btn btn-outline">View</button>
                  <button className="btn btn-outline">Edit</button>
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
