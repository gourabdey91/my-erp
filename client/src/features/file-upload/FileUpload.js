import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useBusinessUnit } from '../../contexts/BusinessUnitContext';
import apiService from '../../services/api';
import './FileUpload.css';

const FileUpload = () => {
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

      const response = await apiService.post('/file-upload/implant-subcategories', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      setUploadedData(response.data.data);
      setUploadSummary({
        totalRows: response.data.totalRows,
        validRows: response.data.validRows,
        invalidRows: response.data.invalidRows
      });
      
      if (response.data.validRows === 0) {
        setMessage('No valid rows found in the uploaded file');
        setMessageType('warning');
      } else {
        setMessage(`File processed successfully. ${response.data.validRows} valid rows, ${response.data.invalidRows} invalid rows`);
        setMessageType('success');
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      setMessage(error.response?.data?.message || 'Error uploading file');
      setMessageType('error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteRow = (index) => {
    const updatedData = uploadedData.filter((_, i) => i !== index);
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
    const validRows = uploadedData.filter(row => row.isValid);
    
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
      const response = await apiService.post('/file-upload/save-implant-subcategories', {
        data: validRows,
        updatedBy: currentUser._id
      });

      setMessage(response.data.message);
      setMessageType('success');
      
      // Clear the data after successful save
      setUploadedData([]);
      setUploadSummary(null);
      setFile(null);
      // Reset file input
      document.getElementById('fileInput').value = '';
      
    } catch (error) {
      console.error('Error saving data:', error);
      setMessage(error.response?.data?.message || 'Error saving data to database');
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
    <div className="file-upload-container">
      <div className="file-upload-header">
        <h2>Implant Subcategory Data Import</h2>
        <p className="file-upload-description">
          Upload Excel file with Implant Type, Surgical Category, Subcategory, and Length data
        </p>
      </div>

      <div className="file-upload-section">
        <div className="file-input-group">
          <label htmlFor="fileInput" className="file-input-label">
            Select Excel File (.xlsx)
          </label>
          <input
            id="fileInput"
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileChange}
            className="file-input"
          />
          {file && (
            <div className="selected-file">
              <span className="file-name">📄 {file.name}</span>
              <span className="file-size">({(file.size / 1024).toFixed(1)} KB)</span>
            </div>
          )}
        </div>

        <div className="file-actions">
          <button
            onClick={handleFileUpload}
            disabled={!file || isLoading}
            className="btn btn-primary"
          >
            {isLoading ? 'Processing...' : 'Upload & Process'}
          </button>
          
          {(file || uploadedData.length > 0) && (
            <button
              onClick={clearData}
              disabled={isLoading}
              className="btn btn-secondary"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {message && (
        <div className={`message ${messageType}`}>
          {message}
        </div>
      )}

      {uploadSummary && (
        <div className="upload-summary">
          <h3>Upload Summary</h3>
          <div className="summary-stats">
            <div className="stat-item">
              <span className="stat-label">Total Rows:</span>
              <span className="stat-value">{uploadSummary.totalRows}</span>
            </div>
            <div className="stat-item valid">
              <span className="stat-label">Valid Rows:</span>
              <span className="stat-value">{uploadSummary.validRows}</span>
            </div>
            <div className="stat-item invalid">
              <span className="stat-label">Invalid Rows:</span>
              <span className="stat-value">{uploadSummary.invalidRows}</span>
            </div>
          </div>
          
          {uploadSummary.validRows > 0 && (
            <button
              onClick={handleSaveToDatabase}
              disabled={isLoading}
              className="btn btn-success save-btn"
            >
              {isLoading ? 'Saving...' : `Save ${uploadSummary.validRows} Records to Database`}
            </button>
          )}
        </div>
      )}

      {uploadedData.length > 0 && (
        <div className="data-preview">
          <h3>Data Preview</h3>
          <div className="table-container">
            <table className="data-table">
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
                {uploadedData.map((row, index) => (
                  <tr key={index} className={row.isValid ? 'valid-row' : 'invalid-row'}>
                    <td>{row.rowIndex}</td>
                    <td>{row.implantTypeName}</td>
                    <td>{row.surgicalCategory}</td>
                    <td>{row.subCategory}</td>
                    <td>{row.length !== null ? row.length : 'Invalid'}</td>
                    <td>
                      <span className={`status-badge ${row.isValid ? 'valid' : 'invalid'}`}>
                        {row.isValid ? '✓ Valid' : '✗ Invalid'}
                      </span>
                    </td>
                    <td>
                      {row.validationErrors.length > 0 ? (
                        <ul className="validation-errors">
                          {row.validationErrors.map((error, errorIndex) => (
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
                        className="btn btn-danger btn-small"
                        disabled={isLoading}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default FileUpload;
