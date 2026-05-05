import React, { useState } from 'react';
import { numberRangeAPI } from '../services/numberRangeAPI';
import '../styles/NumberRangeList.css';

const NumberRangeList = ({ ranges, onEdit, businessUnitId }) => {
  const [loadingNextNumber, setLoadingNextNumber] = useState({});

  const handleGetNextNumber = async (range) => {
    setLoadingNextNumber(prev => ({ ...prev, [range._id]: true }));
    try {
      const response = await numberRangeAPI.getNextNumber(businessUnitId, range.documentType);
      if (response.success) {
        alert(`Next number for ${range.documentType}: ${response.nextNumber}\n\nCurrent: ${response.currentNumber}`);
      } else {
        alert('Error getting next number: ' + response.message);
      }
    } catch (error) {
      alert('Error: ' + error.message);
    } finally {
      setLoadingNextNumber(prev => ({ ...prev, [range._id]: false }));
    }
  };

  if (ranges.length === 0) {
    return (
      <div className="empty-state">
        <p>No number ranges configured yet.</p>
        <p className="hint">Create one to get started with document numbering.</p>
      </div>
    );
  }

  return (
    <div className="number-range-list">
      <div className="list-table-wrapper">
        <table className="list-table">
          <thead>
            <tr>
              <th>Document Type</th>
              <th>Prefix</th>
              <th>Current Number</th>
              <th>Next Number Preview</th>
              <th>Padding Length</th>
              <th>Status</th>
              <th>Last Updated</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {ranges.map(range => (
              <tr key={range._id}>
                <td className="doc-type">{range.documentType}</td>
                <td className="prefix">{range.prefix}</td>
                <td className="current-number">
                  <span className="number-display">
                    {range.prefix}{range.currentNumber.toString().padStart(range.paddingLength, '0')}
                  </span>
                </td>
                <td className="next-preview">
                  <span className="number-display next">
                    {range.prefix}{(range.currentNumber + 1).toString().padStart(range.paddingLength, '0')}
                  </span>
                </td>
                <td className="padding">{range.paddingLength}</td>
                <td className="status">
                  <span className={`badge ${range.isActive ? 'active' : 'inactive'}`}>
                    {range.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="updated-date">
                  {range.updatedAt ? new Date(range.updatedAt).toLocaleDateString() : 'N/A'}
                </td>
                <td className="actions">
                  <button 
                    className="btn-edit" 
                    onClick={() => onEdit(range)}
                    title="Edit range"
                  >
                    Edit
                  </button>
                  <button 
                    className="btn-preview" 
                    onClick={() => handleGetNextNumber(range)}
                    disabled={loadingNextNumber[range._id]}
                    title="Preview next number"
                  >
                    {loadingNextNumber[range._id] ? '...' : 'Preview'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="info-box">
        <h4>How to Set Manual Numbers</h4>
        <p>Click "Edit" on any range to set a manual number. This is useful for:</p>
        <ul>
          <li>Syncing offline records with your system</li>
          <li>Resetting sequences for a new period</li>
          <li>Adjusting for gaps or corrections</li>
        </ul>
      </div>
    </div>
  );
};

export default NumberRangeList;
