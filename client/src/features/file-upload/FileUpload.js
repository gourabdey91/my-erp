import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useBusinessUnit } from '../../contexts/BusinessUnitContext';
import { apiRequest } from '../../services/api';
import * as XLSX from 'xlsx';
import '../../shared/styles/unified-upload.css';

const FileUpload = () => {
  const { currentUser } = useAuth();
  
  const [file, setFile] = useState(null);
  const [uploadedData, setUploadedData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadSummary, setUploadSummary] = useState(null);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');

  const downloadTemplate = () => {
    // Create template data
    const templateData = [
      {
        'Implant Type': 'Plates',
        'Surgical Category': 'Orthopedic',
        'Subcategory': '4 Hole Plate',
        'Length (mm)': 120.5
      },
      {
        'Implant Type': 'Screws',
        'Surgical Category': 'Orthopedic', 
        'Subcategory': 'Cortical Screw',
        'Length (mm)': 35
      },
      {
        'Implant Type': 'Mesh',
        'Surgical Category': 'General Surgery',
        'Subcategory': 'Borehole Mesh',
        'Length (mm)': ''  // Optional field example
      }
    ];

    // Create workbook and worksheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(templateData);

    // Set column widths
    ws['!cols'] = [
      { wch: 20 }, // Implant Type
      { wch: 18 }, // Surgical Category
      { wch: 20 }, // Subcategory
      { wch: 15 }  // Length (mm)
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Implant Subcategories');
    
    // Download file
    XLSX.writeFile(wb, 'implant-subcategory-template.xlsx');
  };

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

      const response = await apiRequest('/api/file-upload/implant-subcategories', {
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
      const response = await apiRequest('/api/file-upload/save-implant-subcategories', {
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
      document.getElementById('fileInput').value = '';
      
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
    document.getElementById('fileInput').value = '';
  };

  return (
    <div className="unified-upload-container">
      {/* Header */}
      <div className="unified-upload-header">
        <h2>Implant Subcategory Data Import</h2>
        <p>
          Bulk upload implant subcategories with surgical category mapping and optional length specifications.
        </p>
      </div>

      {/* Instructions */}
      <div className="unified-upload-instructions">
        <h3>📋 Instructions</h3>
        <ul>
          <li>Download the template file below to see the required format</li>
          <li>Fill in your data using the exact column headers</li>
          <li>Ensure Implant Type and Surgical Category exist in the system</li>
          <li>Length field is optional (leave empty if not applicable)</li>
          <li>Save as Excel (.xlsx) format before uploading</li>
        </ul>
        
        <div className="unified-upload-template">
          <button 
            type="button" 
            onClick={downloadTemplate}
            className="unified-template-btn"
          >
            📥 Download Template
          </button>
        </div>
      </div>

      {/* File Upload Section */}
      <div className="unified-upload-section">
        <div className="unified-upload-input-group">
          <label htmlFor="fileInput" className="unified-upload-label">
            Select Excel File (.xlsx)
          </label>
          <input
            id="fileInput"
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileChange}
            className="unified-upload-input"
          />
          {file && (
            <div className="unified-upload-selected-file">
              <span className="file-name">📄 {file.name}</span>
              <span className="file-size">({(file.size / 1024).toFixed(1)} KB)</span>
            </div>
          )}
        </div>

        <div className="unified-upload-actions">
          <button
            onClick={handleFileUpload}
            disabled={!file || isLoading}
            className="unified-upload-btn unified-upload-btn-primary"
          >
            {isLoading ? 'Processing...' : 'Upload & Process'}
          </button>
          
          {(file || (uploadedData || []).length > 0) && (
            <button
              onClick={clearData}
              disabled={isLoading}
              className="unified-upload-btn unified-upload-btn-secondary"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Message Display */}
      {message && (
        <div className={`unified-upload-message ${messageType}`}>
          {message}
        </div>
      )}

      {/* Upload Summary */}
      {uploadSummary && (
        <div className="unified-upload-summary">
          <h3>📊 Upload Summary</h3>
          <div className="unified-summary-stats">
            <div className="unified-stat-item">
              <span className="stat-label">Total Rows</span>
              <span className="stat-value">{uploadSummary.totalRows}</span>
            </div>
            <div className="unified-stat-item valid">
              <span className="stat-label">Valid Rows</span>
              <span className="stat-value">{uploadSummary.validRows}</span>
            </div>
            <div className="unified-stat-item invalid">
              <span className="stat-label">Invalid Rows</span>
              <span className="stat-value">{uploadSummary.invalidRows}</span>
            </div>
          </div>
          
          {uploadSummary.validRows > 0 && (
            <div className="unified-upload-confirmation">
              <button
                onClick={handleSaveToDatabase}
                disabled={isLoading}
                className="unified-upload-btn unified-upload-btn-success unified-confirmation-btn"
              >
                {isLoading ? 'Saving...' : `✅ Confirm & Save ${uploadSummary.validRows} Records`}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Data Preview */}
      {(uploadedData || []).length > 0 && (
        <div className="unified-upload-preview">
          <h3>👀 Data Preview</h3>
          
          {/* Desktop Table View */}
          <div className="unified-upload-table-container d-none d-md-block">
            <table className="unified-upload-table">
              <thead>
                <tr>
                  <th>Row</th>
                  <th>Implant Type</th>
                  <th>Surgical Category</th>
                  <th>Subcategory</th>
                  <th>Length</th>
                  <th>Status</th>
                  <th>Validation Errors</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {(uploadedData || []).map((row, index) => (
                  <tr key={index} className={row.isValid ? 'valid-row' : 'invalid-row'}>
                    <td>{row.rowIndex}</td>
                    <td>{row.implantTypeName}</td>
                    <td>{row.surgicalCategory}</td>
                    <td>{row.subCategory}</td>
                    <td>{row.length !== null && row.length !== undefined ? row.length : 'N/A'}</td>
                    <td>
                      <span className={`unified-status-badge ${row.isValid ? 'valid' : 'invalid'}`}>
                        {row.isValid ? '✓ Valid' : '✗ Invalid'}
                      </span>
                    </td>
                    <td>
                      {(row.validationErrors || []).length > 0 ? (
                        <ul className="unified-validation-errors">
                          {(row.validationErrors || []).map((error, errorIndex) => (
                            <li key={errorIndex}>{error}</li>
                          ))}
                        </ul>
                      ) : (
                        <span className="no-errors">No errors</span>
                      )}
                    </td>
                    <td>
                      <button
                        onClick={() => handleDeleteRow(index)}
                        className="unified-upload-btn unified-upload-btn-danger unified-upload-btn-small"
                        disabled={isLoading}
                      >
                        🗑️
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="unified-mobile-cards d-block d-md-none">
            {(uploadedData || []).map((row, index) => (
              <div key={index} className={`unified-mobile-card ${row.isValid ? 'valid' : 'invalid'}`}>
                <div className="unified-card-header">
                  <div className="unified-card-title">
                    Row {row.rowIndex}
                  </div>
                  <div className="unified-card-actions">
                    <span className={`unified-status-badge ${row.isValid ? 'valid' : 'invalid'}`}>
                      {row.isValid ? '✓' : '✗'}
                    </span>
                    <button
                      onClick={() => handleDeleteRow(index)}
                      className="unified-upload-btn unified-upload-btn-danger unified-upload-btn-small"
                      disabled={isLoading}
                    >
                      🗑️
                    </button>
                  </div>
                </div>
                <div className="unified-card-content">
                  <div className="unified-card-field">
                    <span className="unified-field-label">Implant Type:</span>
                    <span className="unified-field-value">{row.implantTypeName}</span>
                  </div>
                  <div className="unified-card-field">
                    <span className="unified-field-label">Surgical Category:</span>
                    <span className="unified-field-value">{row.surgicalCategory}</span>
                  </div>
                  <div className="unified-card-field">
                    <span className="unified-field-label">Subcategory:</span>
                    <span className="unified-field-value">{row.subCategory}</span>
                  </div>
                  <div className="unified-card-field">
                    <span className="unified-field-label">Length:</span>
                    <span className="unified-field-value">
                      {row.length !== null && row.length !== undefined ? `${row.length} mm` : 'N/A'}
                    </span>
                  </div>
                  {(row.validationErrors || []).length > 0 && (
                    <div className="unified-card-field">
                      <span className="unified-field-label">Errors:</span>
                      <div className="unified-field-value">
                        <ul className="unified-validation-errors">
                          {(row.validationErrors || []).map((error, errorIndex) => (
                            <li key={errorIndex}>{error}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default FileUpload;
