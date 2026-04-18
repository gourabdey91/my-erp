import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { useAuth } from '../../contexts/AuthContext';
import { apiRequest } from '../../services/api';
import '../../shared/styles/unified-design.css';
import '../../shared/styles/unified-upload.css';

const ImplantSubcategoryUpload = () => {
  const { currentUser } = useAuth();

  const [file, setFile] = useState(null);
  const [uploadedData, setUploadedData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadSummary, setUploadSummary] = useState(null);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');

  const downloadTemplate = () => {
    // Create template data with headers and sample rows
    const templateData = [
      {
        'Implant Type': 'Plates',
        'Surgical Category': 'General',
        'Subcategory': '2 Hole',
        'Length': '25'
      },
      {
        'Implant Type': 'Screws',
        'Surgical Category': 'Spine',
        'Subcategory': '3.5mm',
        'Length': '15'
      }
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'ImplantSubcategoryTemplate');

    // Auto-size columns
    const cols = [
      { wch: 20 },
      { wch: 20 },
      { wch: 20 },
      { wch: 12 }
    ];
    ws['!cols'] = cols;

    XLSX.writeFile(wb, 'implant_subcategory_template.xlsx');
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
      document.getElementById('implantFileInput').value = '';

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
    document.getElementById('implantFileInput').value = '';
  };

  return (
    <div className="unified-layout">
      <div className="unified-header">
        <div className="unified-header-content">
          <div className="unified-header-text">
            <h1>Implant Subcategory Upload</h1>
            <p>Bulk upload implant subcategory data from Excel files</p>
          </div>
        </div>
      </div>

      <div className="unified-content">
        <div className="unified-card">
          <div className="unified-card-header">
            <h2>Upload Implant Subcategory Data</h2>
          </div>
          <div className="unified-card-body">

            <div className="upload-instructions">
              <h3>Instructions:</h3>
              <ul>
                <li><strong>Implant Type</strong>, <strong>Surgical Category</strong>, and <strong>Subcategory</strong> are required</li>
                <li><strong>Implant Type</strong> must already exist in the system</li>
                <li><strong>Surgical Category</strong> must already exist in the system</li>
                <li><strong>Length</strong> is optional and must be a valid number (in mm)</li>
                <li>Supported formats: Excel (.xlsx, .xls)</li>
              </ul>
            </div>

            <div className="upload-actions">
              <button
                className="unified-btn unified-btn-secondary"
                onClick={downloadTemplate}
              >
                📥 Download Template
              </button>
            </div>

            <div className="file-upload">
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileChange}
                className="unified-file-input"
                id="implantFileInput"
              />
              <label htmlFor="implantFileInput" className="unified-file-label">
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
              {/* Desktop Table View */}
              <div className="unified-table-responsive d-none d-md-block">
                <table className="unified-table">
                  <thead>
                    <tr>
                      <th>Row</th>
                      <th>Implant Type</th>
                      <th>Surgical Category</th>
                      <th>Subcategory</th>
                      <th>Length (mm)</th>
                      <th>Status</th>
                      <th>Validation Errors</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(uploadedData || []).map((row, index) => (
                      <tr key={index} className={row.isValid ? 'valid-row' : 'invalid-row'}>
                        <td>{row.rowIndex}</td>
                        <td>
                          <span className="code-badge">{row.implantTypeName}</span>
                        </td>
                        <td>{row.surgicalCategory}</td>
                        <td>{row.subCategory}</td>
                        <td>{row.length !== null && row.length !== undefined ? `${row.length} mm` : 'N/A'}</td>
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

              {/* Mobile Cards View */}
              <div className="d-block d-md-none mobile-data-cards">
                {(uploadedData || []).map((row, index) => (
                  <div key={index} className={`mobile-data-card ${row.isValid ? 'valid-row' : 'invalid-row'}`}>
                    <div className="mobile-card-header">
                      <div className="mobile-card-title">
                        <span className="code-badge">{row.implantTypeName}</span>
                      </div>
                      <span className={`unified-badge ${row.isValid ? 'unified-badge-success' : 'unified-badge-danger'}`}>
                        {row.isValid ? '✓ Valid' : '✗ Invalid'}
                      </span>
                    </div>
                    <div className="mobile-card-body">
                      <div className="mobile-card-row full-width">
                        <div className="mobile-card-label">Subcategory</div>
                        <div className="mobile-card-value">{row.subCategory}</div>
                      </div>
                      <div className="mobile-card-row">
                        <div className="mobile-card-label">Surgical Category</div>
                        <div className="mobile-card-value">{row.surgicalCategory}</div>
                      </div>
                      <div className="mobile-card-row">
                        <div className="mobile-card-label">Row</div>
                        <div className="mobile-card-value">{row.rowIndex}</div>
                      </div>
                      <div className="mobile-card-row">
                        <div className="mobile-card-label">Length</div>
                        <div className="mobile-card-value">{row.length !== null && row.length !== undefined ? `${row.length} mm` : 'N/A'}</div>
                      </div>
                      {(row.validationErrors || []).length > 0 && (
                        <div className="mobile-card-row full-width">
                          <div className="mobile-card-label">Validation Errors</div>
                          <div className="mobile-card-value">
                            <ul className="validation-errors">
                              {(row.validationErrors || []).map((error, errorIndex) => (
                                <li key={errorIndex} className="error-text">{error}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="mobile-card-actions">
                      <button
                        onClick={() => handleDeleteRow(index)}
                        className="unified-btn unified-btn-danger unified-btn-small"
                        disabled={isLoading}
                      >
                        🗑️ Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ImplantSubcategoryUpload;
