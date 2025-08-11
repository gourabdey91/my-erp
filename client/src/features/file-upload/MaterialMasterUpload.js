import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useBusinessUnit } from '../../contexts/BusinessUnitContext';
import { apiRequest } from '../../services/api';
import '../../shared/styles/unified-design.css';
import './MaterialMasterUpload.css';

const MaterialMasterUpload = () => {
  const { currentUser } = useAuth();
  const { selectedBusinessUnit } = useBusinessUnit();
  
  const [file, setFile] = useState(null);
  const [uploadedData, setUploadedData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadSummary, setUploadSummary] = useState(null);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setUploadedData([]);
      setUploadSummary(null);
      setMessage('');
    }
  };

  const handleFileUpload = async () => {
    if (!file) {
      setMessage('Please select a file first');
      setMessageType('error');
      return;
    }

    if (!currentUser) {
      setMessage('User not authenticated');
      setMessageType('error');
      return;
    }

    setIsLoading(true);
    setMessage('');

    try {
      const formData = new FormData();
      formData.append('excelFile', file);

      const response = await apiRequest('/api/file-upload/material-master', {
        method: 'POST',
        body: formData
      });

      setUploadedData(response.data || []);
      setUploadSummary({
        totalRows: response.totalRows || 0,
        validRows: response.validRows || 0,
        invalidRows: response.invalidRows || 0
      });
      
      if ((response.validRows || 0) === 0) {
        setMessage('No valid rows found in the uploaded file');
        setMessageType('warning');
      } else {
        setMessage(`File processed successfully. ${response.validRows || 0} valid rows, ${response.invalidRows || 0} invalid rows`);
        setMessageType('success');
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      setMessage(error.message || 'Error uploading file');
      setMessageType('error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteRow = (index) => {
    const updatedData = (uploadedData || []).filter((_, i) => i !== index);
    setUploadedData(updatedData);
    
    // Update summary
    const validRows = updatedData.filter(row => row.isValid).length;
    const invalidRows = updatedData.filter(row => !row.isValid).length;
    setUploadSummary({
      totalRows: updatedData.length,
      validRows,
      invalidRows
    });
  };

  const handleSaveToDatabase = async () => {
    const validRows = (uploadedData || []).filter(row => row.isValid);
    
    if (validRows.length === 0) {
      setMessage('No valid rows to save');
      setMessageType('error');
      return;
    }

    if (!currentUser?._id) {
      setMessage('User not authenticated');
      setMessageType('error');
      return;
    }

    setIsLoading(true);
    setMessage('');

    try {
      const response = await apiRequest('/api/file-upload/save-material-master', {
        method: 'POST',
        body: JSON.stringify({
          data: validRows,
          updatedBy: currentUser._id
        })
      });

      setMessage(response.message);
      setMessageType('success');
      
      // Clear the data after successful save
      setUploadedData([]);
      setUploadSummary(null);
      setFile(null);
      // Reset file input
      document.getElementById('materialFileInput').value = '';
      
    } catch (error) {
      console.error('Error saving data:', error);
      setMessage(error.message || 'Error saving data to database');
      setMessageType('error');
    } finally {
      setIsLoading(false);
    }
  };

  const clearData = () => {
    setFile(null);
    setUploadedData([]);
    setUploadSummary(null);
    setMessage('');
    document.getElementById('materialFileInput').value = '';
  };

  return (
    <div className="unified-layout">
      <div className="unified-header">
        <div className="unified-header-content">
          <div className="unified-header-text">
            <h1>Material Master Upload</h1>
            <p>Bulk upload material master data from Excel files</p>
          </div>
        </div>
      </div>

      <div className="unified-content">
        <div className="unified-card">
          <div className="unified-card-header">
            <h2>Upload Material Master Data</h2>
          </div>
          <div className="unified-card-body">
            
            <div className="upload-instructions" style={{ marginBottom: '2rem' }}>
              <h3>Instructions:</h3>
              <ul>
                <li>Upload Excel file with BU, Material Number, Description, HSN Code, Prices, and Category data</li>
                <li><strong>Business Unit</strong>, <strong>Material Number</strong>, and <strong>Description</strong> are required</li>
                <li><strong>HSN Code</strong>, <strong>GST %</strong>, and pricing information are required</li>
                <li><strong>Category</strong>, <strong>Implant Type</strong> must exist in the system</li>
                <li>Supported formats: Excel (.xlsx, .xls)</li>
              </ul>
            </div>

            <div className="file-upload">
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileChange}
                className="unified-file-input"
                id="materialFileInput"
              />
              <label htmlFor="materialFileInput" className="unified-file-label">
                📁 {file ? file.name : 'Choose File'}
              </label>
            </div>

            <div className="upload-actions">
              <button
                className="unified-btn unified-btn-primary"
                onClick={handleFileUpload}
                disabled={!file || isLoading}
              >
                {isLoading ? '⏳ Processing...' : '📤 Process File'}
              </button>
              
              {(file || (uploadedData || []).length > 0) && (
                <button
                  onClick={clearData}
                  disabled={isLoading}
                  className="unified-btn unified-btn-secondary"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Message Display */}
        {message && (
          <div className={`unified-card ${messageType === 'error' ? 'error-message' : messageType === 'warning' ? 'warning-message' : 'success-message'}`}>
            <div className="unified-card-body">
              {message}
            </div>
          </div>
        )}

        {/* Upload Summary */}
        {uploadSummary && (
          <div className="unified-card">
            <div className="unified-card-header">
              <h2>Processing Summary</h2>
            </div>
            <div className="unified-card-body">
              <div className="unified-stats-grid">
                <div className="unified-stat-card">
                  <div className="unified-stat-icon">📊</div>
                  <div className="unified-stat-content">
                    <div className="unified-stat-number">{uploadSummary.totalRows}</div>
                    <div className="unified-stat-label">Total Rows</div>
                  </div>
                </div>
                <div className="unified-stat-card">
                  <div className="unified-stat-icon">✅</div>
                  <div className="unified-stat-content">
                    <div className="unified-stat-number">{uploadSummary.validRows}</div>
                    <div className="unified-stat-label">Valid Rows</div>
                  </div>
                </div>
                <div className="unified-stat-card">
                  <div className="unified-stat-icon">❌</div>
                  <div className="unified-stat-content">
                    <div className="unified-stat-number">{uploadSummary.invalidRows}</div>
                    <div className="unified-stat-label">Invalid Rows</div>
                  </div>
                </div>
              </div>
              
              {uploadSummary.validRows > 0 && (
                <div style={{ marginTop: '1.5rem' }}>
                  <button
                    onClick={handleSaveToDatabase}
                    disabled={isLoading}
                    className="unified-btn unified-btn-success"
                  >
                    {isLoading ? '💾 Saving...' : `💾 Save ${uploadSummary.validRows} Records to Database`}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Data Preview */}
        {(uploadedData || []).length > 0 && (
          <div className="unified-card">
            <div className="unified-card-header">
              <h2>Data Preview</h2>
            </div>
            <div className="unified-card-body">
              <div className="unified-table-responsive">
                <table className="unified-table">
                  <thead>
                    <tr>
                      <th>Row</th>
                      <th>BU</th>
                      <th>Material Number</th>
                      <th>Description</th>
                      <th>HSN Code</th>
                      <th>GST %</th>
                      <th>MRP</th>
                      <th>Institutional Price</th>
                      <th>Distribution Price</th>
                      <th>Surgical Category</th>
                      <th>Implant Type</th>
                      <th>Sub Category</th>
                      <th>Length (mm)</th>
                      <th>Unit</th>
                      <th>Status</th>
                      <th>Validation Errors</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(uploadedData || []).map((row, index) => (
                      <tr key={index} className={row.isValid ? 'valid-row' : 'invalid-row'}>
                        <td>{row.rowIndex}</td>
                        <td>{row.businessUnitCode || 'N/A'}</td>
                        <td>
                          <span className="code-badge">{row.materialNumber}</span>
                        </td>
                        <td className="description-cell">{row.description}</td>
                        <td>{row.hsnCode}</td>
                        <td>{row.gstPercentage !== null && row.gstPercentage !== undefined ? `${row.gstPercentage}%` : 'N/A'}</td>
                        <td>{row.mrp !== null && row.mrp !== undefined ? `₹${row.mrp}` : 'N/A'}</td>
                        <td>{row.institutionalPrice !== null && row.institutionalPrice !== undefined ? `₹${row.institutionalPrice}` : 'N/A'}</td>
                        <td>{row.distributionPrice !== null && row.distributionPrice !== undefined ? `₹${row.distributionPrice}` : 'N/A'}</td>
                        <td>{row.surgicalCategory}</td>
                        <td>{row.implantType || 'N/A'}</td>
                        <td>{row.subCategory || 'N/A'}</td>
                        <td>{row.lengthMm !== null && row.lengthMm !== undefined ? `${row.lengthMm}mm` : 'N/A'}</td>
                        <td>{row.unit || 'N/A'}</td>
                        <td>
                          <span className={`unified-badge ${row.isValid ? 'unified-badge-success' : 'unified-badge-danger'}`}>
                            {row.isValid ? '✓ Valid' : '✗ Invalid'}
                          </span>
                        </td>
                        <td>
                          {(row.validationErrors || []).length > 0 ? (
                            <ul className="validation-errors">
                              {(row.validationErrors || []).map((error, errorIndex) => (
                                <li key={errorIndex} className="error-text">{error}</li>
                              ))}
                            </ul>
                          ) : (
                            <span className="success-text">No errors</span>
                          )}
                        </td>
                        <td>
                          <button
                            onClick={() => handleDeleteRow(index)}
                            className="unified-btn unified-btn-danger unified-btn-small"
                            disabled={isLoading}
                          >
                            🗑️ Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MaterialMasterUpload;
