import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { hospitalAPI } from '../hospitals/services/hospitalAPI';
import '../../shared/styles/unified-design.css';
import '../../shared/styles/unified-upload.css';

const MaterialAssignmentUpload = ({ onBack }) => {
  const [hospitals, setHospitals] = useState([]);
  const [selectedHospital, setSelectedHospital] = useState('');
  const [file, setFile] = useState(null);
  const [errors, setErrors] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [processedData, setProcessedData] = useState([]);
  const [uploadSummary, setUploadSummary] = useState(null);
  const [saveResults, setSaveResults] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');

  // Fetch hospitals on component mount
  useEffect(() => {
    const fetchHospitals = async () => {
      try {
        const response = await hospitalAPI.getAllHospitals();
        setHospitals(response || []);
      } catch (error) {
        console.error('Error fetching hospitals:', error);
        setErrors(['Failed to fetch hospitals list']);
      } finally {
        setLoading(false);
      }
    };

    fetchHospitals();
  }, []);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      const validTypes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
        'application/vnd.ms-excel', // .xls
        'text/csv'
      ];
      
      if (validTypes.includes(selectedFile.type)) {
        setFile(selectedFile);
        setProcessedData([]);
        setUploadSummary(null);
        setSaveResults(null);
        setMessage('');
      } else {
        alert('Please select a valid Excel (.xlsx, .xls) or CSV file');
      }
    }
  };

  const parseFileData = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const data = e.target.result;
          const workbook = XLSX.read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          
          // Convert to JSON with header row
          const jsonData = XLSX.utils.sheet_to_json(worksheet, {
            header: 1,
            defval: ''
          });

          if (jsonData.length < 2) {
            reject(new Error('File must contain at least one data row besides the header'));
            return;
          }

          // Expected columns: Material Number, MRP, Institutional Price, Flagged Billed
          const headers = jsonData[0];
          const dataRows = jsonData.slice(1);

          // Map the data to the expected format
          const assignments = dataRows.map((row, index) => {
            const assignment = {};
            
            // Find column indices (case insensitive)
            const materialNumberIndex = headers.findIndex(h => 
              h && h.toString().toLowerCase().includes('material') && h.toString().toLowerCase().includes('number')
            );
            const mrpIndex = headers.findIndex(h => 
              h && h.toString().toLowerCase().includes('mrp')
            );
            const institutionalPriceIndex = headers.findIndex(h => 
              h && (h.toString().toLowerCase().includes('institutional') || h.toString().toLowerCase().includes('price'))
            );
            const flaggedBilledIndex = headers.findIndex(h => 
              h && (h.toString().toLowerCase().includes('flagged') || h.toString().toLowerCase().includes('billed'))
            );

            if (materialNumberIndex >= 0) assignment.materialNumber = row[materialNumberIndex];
            if (mrpIndex >= 0) assignment.mrp = row[mrpIndex];
            if (institutionalPriceIndex >= 0 && institutionalPriceIndex !== mrpIndex) {
              assignment.institutionalPrice = row[institutionalPriceIndex];
            }
            if (flaggedBilledIndex >= 0) assignment.flaggedBilled = row[flaggedBilledIndex];

            return assignment;
          }).filter(assignment => assignment.materialNumber); // Only include rows with material number

          resolve(assignments);
        } catch (error) {
          reject(error);
        }
      };

      reader.onerror = () => reject(new Error('Error reading file'));
      reader.readAsArrayBuffer(file);
    });
  };

  const handleUpload = async () => {
    if (!file) {
      alert('Please select a file first');
      return;
    }

    if (!selectedHospital) {
      alert('Please select a hospital first');
      return;
    }

    try {
      setUploading(true);
      setProcessedData([]);
      setUploadSummary(null);
      setSaveResults(null);
      setMessage('');

      // Parse the file data
      const assignments = await parseFileData(file);
      
      if (assignments.length === 0) {
        setMessage('No valid data found in the file');
        setMessageType('warning');
        return;
      }

      // Process data on server
      const response = await hospitalAPI.bulkUploadMaterialAssignments(selectedHospital, assignments);
      
      setProcessedData(response.data || []);
      setUploadSummary({
        totalRows: response.totalRows || 0,
        validRows: response.validRows || 0,
        invalidRows: response.invalidRows || 0
      });

      if (response.validRows === 0) {
        setMessage('No valid rows found in the uploaded file');
        setMessageType('warning');
      } else {
        setMessage(`File processed successfully. ${response.validRows} valid rows, ${response.invalidRows} invalid rows`);
        setMessageType('success');
      }

    } catch (error) {
      console.error('Upload error:', error);
      setMessage(error.message || 'Error processing file');
      setMessageType('error');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteRow = (index) => {
    const updatedData = processedData.filter((_, i) => i !== index);
    setProcessedData(updatedData);
    
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
    const validRows = processedData.filter(row => row.isValid);
    
    if (validRows.length === 0) {
      setMessage('No valid rows to save');
      setMessageType('error');
      return;
    }

    try {
      setUploading(true);
      setMessage('');

      const response = await hospitalAPI.saveProcessedMaterialAssignments(selectedHospital, processedData);
      
      setSaveResults(response);
      
      if (response.successCount > 0) {
        setMessage(`Successfully saved ${response.successCount} material assignments to database`);
        setMessageType('success');
      }

    } catch (error) {
      console.error('Save error:', error);
      setMessage(error.message || 'Error saving to database');
      setMessageType('error');
    } finally {
      setUploading(false);
    }
  };

  const clearData = () => {
    setFile(null);
    setProcessedData([]);
    setUploadSummary(null);
    setSaveResults(null);
    setMessage('');
    setMessageType('');
    // Reset file input
    const fileInput = document.getElementById('materialAssignmentFile');
    if (fileInput) fileInput.value = '';
  };

  const downloadTemplate = () => {
    const selectedHospitalData = hospitals.find(h => h._id === selectedHospital);
    const hospitalName = selectedHospitalData ? selectedHospitalData.shortName : 'hospital';

    // Create template data
    const templateData = [
      ['Material Number', 'MRP', 'Institutional Price', 'Flagged Billed'],
      ['EXAMPLE001', '1000.00', '900.00', 'false'],
      ['EXAMPLE002', '', '', 'true'] // Example showing blank prices
    ];

    // Create workbook and worksheet
    const ws = XLSX.utils.aoa_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Material Assignments');

    // Download the file
    XLSX.writeFile(wb, `material_assignment_template_${hospitalName}.xlsx`);
  };

  if (loading) {
    return (
      <div className="unified-layout">
        <div className="unified-header">
          <div className="unified-header-content">
            <div className="unified-header-text">
              <h1>Material Assignment Upload</h1>
              <p>Loading hospitals...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="unified-layout">
      <div className="unified-header">
        <div className="unified-header-content">
          <div className="unified-header-text">
            <h1>Material Assignment Upload</h1>
            <p>Bulk upload material assignments from Excel files</p>
          </div>
          <button className="unified-btn unified-btn-secondary" onClick={onBack}>
            ← Back to Dashboard
          </button>
        </div>
      </div>

      <div className="unified-content">
        <div className="unified-card">
          <div className="unified-card-header">
            <h2>Upload Material Assignments</h2>
          </div>
          <div className="unified-card-body">
            
            <div className="upload-instructions">
              <h3>Instructions:</h3>
              <ul>
                <li>Select a hospital first, then download the template</li>
                <li><strong>Material Number</strong> is required and must exist in Material Master</li>
                <li><strong>MRP</strong> and <strong>Institutional Price</strong> are optional - if blank, values will be fetched from Material Master</li>
                <li>Supported formats: Excel (.xlsx, .xls) or CSV</li>
              </ul>
            </div>

            <div className="form-group">
              <label className="unified-form-label">
                Select Hospital *
              </label>
              <select
                className="unified-search-input"
                value={selectedHospital}
                onChange={(e) => setSelectedHospital(e.target.value)}
                required
              >
                <option value="">Choose a hospital...</option>
                {hospitals.map(hospital => (
                  <option key={hospital._id} value={hospital._id}>
                    {hospital.shortName}{hospital.displayName ? ` - ${hospital.displayName}` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="upload-actions">
              <button 
                className="unified-btn unified-btn-secondary"
                onClick={downloadTemplate}
                disabled={!selectedHospital}
              >
                📥 Download Template
              </button>
            </div>

            <div className="file-upload">
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileChange}
                className="unified-file-input"
                id="materialAssignmentFile"
              />
              <label htmlFor="materialAssignmentFile" className="unified-file-label">
                📁 {file ? file.name : 'Choose File'}
              </label>
            </div>

            <div className="upload-actions">
              <button
                className="unified-btn unified-btn-primary"
                onClick={handleUpload}
                disabled={!file || !selectedHospital || uploading}
              >
                {uploading ? '⏳ Processing...' : '📤 Process File'}
              </button>
              
              {(file || processedData.length > 0) && (
                <button
                  onClick={clearData}
                  disabled={uploading}
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

        {/* Error Display */}
        {errors.length > 0 && (
          <div className="unified-card error-message">
            <div className="unified-card-header">
              <h3>Errors</h3>
            </div>
            <div className="unified-card-body">
              <ul>
                {errors.map((error, index) => (
                  <li key={index} className="error-text">{error}</li>
                ))}
              </ul>
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
                    disabled={uploading}
                    className="unified-btn unified-btn-success"
                  >
                    {uploading ? 'Saving...' : `💾 Save ${uploadSummary.validRows} Records to Database`}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Data Preview */}
        {processedData.length > 0 && (
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
                      <th>Material Number</th>
                      <th>Description</th>
                      <th>Category</th>
                      <th>MRP</th>
                      <th>Institutional Price</th>
                      <th>Flagged Billed</th>
                      <th>Status</th>
                      <th>Validation Errors</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {processedData.map((row, index) => (
                      <tr key={index} className={row.isValid ? 'valid-row' : 'invalid-row'}>
                        <td>{row.rowIndex}</td>
                        <td>
                          <span className="code-badge">{row.materialNumber}</span>
                        </td>
                        <td className="description-cell">
                          {row.material?.description || 'N/A'}
                        </td>
                        <td>{row.material?.surgicalCategory || 'N/A'}</td>
                        <td>
                          {row.mrp ? (
                            <div>
                              <div>₹{parseFloat(row.mrp).toLocaleString()}</div>
                              {row.mrpSource && (
                                <small style={{ color: 'var(--gray-600)' }}>
                                  ({row.mrpSource})
                                </small>
                              )}
                            </div>
                          ) : 'N/A'}
                        </td>
                        <td>
                          {row.institutionalPrice ? (
                            <div>
                              <div>₹{parseFloat(row.institutionalPrice).toLocaleString()}</div>
                              {row.institutionalPriceSource && (
                                <small style={{ color: 'var(--gray-600)' }}>
                                  ({row.institutionalPriceSource})
                                </small>
                              )}
                            </div>
                          ) : 'N/A'}
                        </td>
                        <td>
                          <span className={`unified-badge ${row.flaggedBilled ? 'unified-badge-warning' : 'unified-badge-secondary'}`}>
                            {row.flaggedBilled ? 'Yes' : 'No'}
                          </span>
                        </td>
                        <td>
                          <span className={`unified-badge ${row.isValid ? 'unified-badge-success' : 'unified-badge-danger'}`}>
                            {row.isValid ? '✓ Valid' : '✗ Invalid'}
                          </span>
                        </td>
                        <td>
                          {row.validationErrors && row.validationErrors.length > 0 ? (
                            <ul className="validation-errors">
                              {row.validationErrors.map((error, errorIndex) => (
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
                            disabled={uploading}
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
                {processedData.map((row, index) => (
                  <div key={index} className={`mobile-data-card ${row.isValid ? 'valid-row' : 'invalid-row'}`}>
                    <div className="mobile-card-header">
                      <div className="mobile-card-title">
                        <span className="code-badge">{row.materialNumber}</span>
                      </div>
                      <span className={`unified-badge ${row.isValid ? 'unified-badge-success' : 'unified-badge-danger'}`}>
                        {row.isValid ? '✓ Valid' : '✗ Invalid'}
                      </span>
                    </div>
                    <div className="mobile-card-body">
                      <div className="mobile-card-row full-width">
                        <div className="mobile-card-label">Description</div>
                        <div className="mobile-card-value">{row.material?.description || 'N/A'}</div>
                      </div>
                      <div className="mobile-card-row">
                        <div className="mobile-card-label">Category</div>
                        <div className="mobile-card-value">{row.material?.surgicalCategory || 'N/A'}</div>
                      </div>
                      <div className="mobile-card-row">
                        <div className="mobile-card-label">Row</div>
                        <div className="mobile-card-value">{row.rowIndex}</div>
                      </div>
                      <div className="mobile-card-row">
                        <div className="mobile-card-label">MRP</div>
                        <div className="mobile-card-value">
                          {row.mrp ? (
                            <div>
                              <div>₹{parseFloat(row.mrp).toLocaleString()}</div>
                              {row.mrpSource && (
                                <small style={{ color: 'var(--gray-600)' }}>
                                  ({row.mrpSource})
                                </small>
                              )}
                            </div>
                          ) : 'N/A'}
                        </div>
                      </div>
                      <div className="mobile-card-row">
                        <div className="mobile-card-label">Institutional Price</div>
                        <div className="mobile-card-value">
                          {row.institutionalPrice ? (
                            <div>
                              <div>₹{parseFloat(row.institutionalPrice).toLocaleString()}</div>
                              {row.institutionalPriceSource && (
                                <small style={{ color: 'var(--gray-600)' }}>
                                  ({row.institutionalPriceSource})
                                </small>
                              )}
                            </div>
                          ) : 'N/A'}
                        </div>
                      </div>
                      <div className="mobile-card-row">
                        <div className="mobile-card-label">Flagged Billed</div>
                        <div className="mobile-card-value">
                          <span className={`unified-badge ${row.flaggedBilled ? 'unified-badge-warning' : 'unified-badge-secondary'}`}>
                            {row.flaggedBilled ? 'Yes' : 'No'}
                          </span>
                        </div>
                      </div>
                      {row.validationErrors && row.validationErrors.length > 0 && (
                        <div className="mobile-card-row full-width">
                          <div className="mobile-card-label">Validation Errors</div>
                          <div className="mobile-card-value">
                            <ul className="validation-errors">
                              {row.validationErrors.map((error, errorIndex) => (
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
                        disabled={uploading}
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

        {/* Save Results */}
        {saveResults && (
          <div className="unified-card">
            <div className="unified-card-header">
              <h2>Save Results</h2>
            </div>
            <div className="unified-card-body">
              <div className="unified-stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', marginBottom: '1.5rem' }}>
                <div className="unified-stat-card success">
                  <div className="unified-stat-icon">✅</div>
                  <div className="unified-stat-content">
                    <div className="unified-stat-number">{saveResults.successCount}</div>
                    <div className="unified-stat-label">Successfully Saved</div>
                  </div>
                </div>
                <div className="unified-stat-card danger">
                  <div className="unified-stat-icon">❌</div>
                  <div className="unified-stat-content">
                    <div className="unified-stat-number">{saveResults.errorCount}</div>
                    <div className="unified-stat-label">Errors</div>
                  </div>
                </div>
              </div>
              
              {saveResults.results && saveResults.results.length > 0 && (
                <div className="unified-table-responsive">
                  <table className="unified-table">
                    <thead>
                      <tr>
                        <th>Row</th>
                        <th>Material Number</th>
                        <th>Description</th>
                        <th>Status</th>
                        <th>Details</th>
                      </tr>
                    </thead>
                    <tbody>
                      {saveResults.results.map((result, index) => (
                        <tr key={index} className={result.status === 'success' ? 'valid-row' : 'invalid-row'}>
                          <td>{result.row}</td>
                          <td>
                            <span className="code-badge">{result.materialNumber}</span>
                          </td>
                          <td>{result.description || 'N/A'}</td>
                          <td>
                            <span className={`unified-badge ${result.status === 'success' ? 'unified-badge-success' : 'unified-badge-danger'}`}>
                              {result.status === 'success' ? '✓ Saved' : '✗ Error'}
                            </span>
                          </td>
                          <td>
                            {result.status === 'success' ? (
                              <div>
                                <div>MRP: ₹{result.mrp?.toLocaleString()}</div>
                                <div>Institutional: ₹{result.institutionalPrice?.toLocaleString()}</div>
                              </div>
                            ) : (
                              <span className="error-text">{result.error}</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MaterialAssignmentUpload;
