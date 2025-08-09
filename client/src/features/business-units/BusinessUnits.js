import React, { useState, useEffect } from 'react';
import '../../shared/styles/unified-design.css';
import './BusinessUnits.css';
import BusinessUnitForm from './components/BusinessUnitForm';
import BusinessUnitList from './components/BusinessUnitList';
import { businessUnitAPI } from './services/businessUnitAPI';

const BusinessUnits = () => {
  const [businessUnits, setBusinessUnits] = useState([]);
  const [selectedBusinessUnit, setSelectedBusinessUnit] = useState(null);
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchBusinessUnits();
  }, []);

  const fetchBusinessUnits = async () => {
    try {
      setLoading(true);
      const data = await businessUnitAPI.getAll();
      setBusinessUnits(data);
      setError('');
    } catch (err) {
      setError('Failed to fetch business units');
      console.error('Error fetching business units:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNew = () => {
    setSelectedBusinessUnit(null);
    setIsFormVisible(true);
  };

  const handleEdit = (businessUnit) => {
    setSelectedBusinessUnit(businessUnit);
    setIsFormVisible(true);
  };

  const handleFormSubmit = async (formData) => {
    try {
      if (selectedBusinessUnit) {
        await businessUnitAPI.update(selectedBusinessUnit._id, formData);
      } else {
        await businessUnitAPI.create(formData);
      }
      await fetchBusinessUnits();
      setIsFormVisible(false);
      setSelectedBusinessUnit(null);
      setError('');
    } catch (err) {
      setError(err.message || 'Failed to save business unit');
    }
  };

  const handleFormCancel = () => {
    setIsFormVisible(false);
    setSelectedBusinessUnit(null);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to deactivate this business unit?')) {
      try {
        await businessUnitAPI.delete(id);
        await fetchBusinessUnits();
        setError('');
      } catch (err) {
        setError('Failed to deactivate business unit');
      }
    }
  };

  if (loading) {
    return (
      <div className="business-units-container">
        <div className="loading-message">Loading business units...</div>
      </div>
    );
  }

  return (
    <div className="unified-container">
      {/* Header */}
      <div className="unified-header">
        <div className="unified-header-content">
          <div className="unified-header-text">
            <h1>Business Units</h1>
            <p>Manage business unit categories for your organization.</p>
          </div>
          <button 
            className="unified-btn unified-btn-primary"
            onClick={handleCreateNew}
            disabled={isFormVisible}
          >
            Create New Business Unit
          </button>
        </div>
      </div>

      {error && (
        <div className="unified-content">
          <div style={{ padding: '1rem', background: '#fee', border: '1px solid #fcc', borderRadius: '8px', color: '#c33' }}>
            {error}
          </div>
        </div>
      )}

      {isFormVisible ? (
        <BusinessUnitForm
          businessUnit={selectedBusinessUnit}
          onSubmit={handleFormSubmit}
          onCancel={handleFormCancel}
        />
      ) : (
        <BusinessUnitList
          businessUnits={businessUnits}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
};

export default BusinessUnits;
