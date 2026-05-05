import React, { useState, useEffect } from 'react';
import { numberRangeAPI } from '../services/numberRangeAPI';
import NumberRangeForm from './NumberRangeForm';
import NumberRangeList from './NumberRangeList';
import '../styles/NumberRangeManager.css';

const NumberRangeManager = ({ businessUnitId }) => {
  const [ranges, setRanges] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingRange, setEditingRange] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    if (businessUnitId) {
      fetchRanges();
    }
  }, [businessUnitId]);

  const fetchRanges = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await numberRangeAPI.getAll(businessUnitId);
      if (response.success) {
        setRanges(response.data);
      } else {
        setError(response.message || 'Failed to fetch number ranges');
      }
    } catch (err) {
      setError(err.message || 'Error fetching number ranges');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (range) => {
    setEditingRange(range);
    setShowForm(true);
  };

  const handleCancel = () => {
    setEditingRange(null);
    setShowForm(false);
  };

  const handleSaveSuccess = () => {
    setEditingRange(null);
    setShowForm(false);
    setSuccessMessage('Number range saved successfully');
    setTimeout(() => setSuccessMessage(''), 3000);
    fetchRanges();
  };

  const handleCreateClick = () => {
    setEditingRange(null);
    setShowForm(true);
  };

  return (
    <div className="number-range-manager">
      <div className="manager-header">
        <h2>Number Range Management</h2>
        <p className="subtitle">Configure document numbering for your business unit</p>
      </div>

      {error && <div className="error-message">{error}</div>}
      {successMessage && <div className="success-message">{successMessage}</div>}

      {!showForm ? (
        <>
          <button 
            className="create-button" 
            onClick={handleCreateClick}
          >
            + Create Number Range
          </button>

          {loading ? (
            <div className="loading">Loading number ranges...</div>
          ) : (
            <NumberRangeList 
              ranges={ranges} 
              onEdit={handleEdit}
              businessUnitId={businessUnitId}
            />
          )}
        </>
      ) : (
        <NumberRangeForm 
          range={editingRange}
          businessUnitId={businessUnitId}
          onSave={handleSaveSuccess}
          onCancel={handleCancel}
        />
      )}
    </div>
  );
};

export default NumberRangeManager;
