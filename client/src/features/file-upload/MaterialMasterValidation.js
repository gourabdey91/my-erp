import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { useAuth } from '../../contexts/AuthContext';
import { apiRequest } from '../../services/api';
import '../../shared/styles/unified-design.css';
import '../../shared/styles/unified-upload.css';
import './MaterialMasterValidation.css';

const MaterialMasterValidation = () => {
  const { currentUser } = useAuth();
  
  const [file, setFile] = useState(null);
  const [validationData, setValidationData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [validationSummary, setValidationSummary] = useState(null);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  
  // Filter states
  const [showInvalidOnly, setShowInvalidOnly] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Apply filters to validation data
  useEffect(() => {
    let filtered = [...validationData];
    
    // Filter by validity
    if (showInvalidOnly) {
      filtered = filtered.filter(item => !item.isValid);
    }
    
    // Filter by search term
    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(item => 
        item.materialNumber?.toLowerCase().includes(search) ||
        item.description?.toLowerCase().includes(search) ||
        item.hsnCode?.toLowerCase().includes(search)
      );
    }
    
    setFilteredData(filtered);
  }, [validationData, showInvalidOnly, searchTerm]);

  const downloadTemplate = () => {
    const templateData = [
      {
        'Material Number': 'MAT001',
        'Description': 'Sample Material Description',
        'HSN Code': '1234567',
        'GST %': '18',
        'MRP': '1000.00',
        'Institutional Price': '800.00'
      }
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'MaterialValidationTemplate');
    
    // Auto-size columns
    const cols = [
      {wch: 15}, {wch: 30}, {wch: 10}, {wch: 8}, {wch: 10}, {wch: 15}
    ];
    ws['!cols'] = cols;
    
    XLSX.writeFile(wb, 'material_validation_template.xlsx');
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setValidationData([]);
      setFilteredData([]);
      setValidationSummary(null);
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

      const response = await apiRequest('/api/file-upload/material-validation', {
        method: 'POST',
        body: formData
      });

      setValidationData(response.data || []);
      setValidationSummary({
        totalRows: response.totalRows || 0,
        validRows: response.validRows || 0,
        invalidRows: response.invalidRows || 0
      });
      
      if ((response.totalRows || 0) === 0) {
        setMessage('No data found in the uploaded file');
        setMessageType('warning');
      } else {
        setMessage(`Validation complete. ${response.validRows || 0} valid records, ${response.invalidRows || 0} invalid records`);
        setMessageType(response.invalidRows > 0 ? 'warning' : 'success');
      }
    } catch (error) {
      console.error('Error validating file:', error);
      setMessage(error.message || 'Error validating file');
      setMessageType('error');
    } finally {
      setIsLoading(false);
    }
  };

  const getValidationStatusBadge = (isValid) => {
    return (
      <span className={`unified-badge ${isValid ? 'badge-success' : 'badge-danger'}`}>
        {isValid ? '✓ Valid' : '✗ Invalid'}
      </span>
    );
  };

  const renderValidationErrors = (errors) => {
    if (!errors || errors.length === 0) return null;
    
    return (
      <div className="validation-errors">
        {errors.map((error, index) => (
          <span key={index} className="error-tag">
            {error}
          </span>
        ))}
      </div>
    );
  };

  const formatCurrency = (amount) => {
    if (!amount) return '-';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  };

  return (
    <div className="unified-container">
      {/* Header */}
      <div className="unified-header">
        <div className="unified-header-content">
          <div className="unified-header-text">
            <h1>Material Master Validation</h1>
            <p>Upload and validate material master data against existing database records</p>
          </div>
          <div className="unified-header-actions">
            <button
              className="unified-btn unified-btn-secondary"
              onClick={downloadTemplate}
              disabled={isLoading}
            >
              📥 Download Template
            </button>
          </div>
        </div>
      </div>

      {/* Upload Section */}
      <div className="unified-content">
        <div className="unified-upload-section">
          <h3>Upload File for Validation</h3>
          <p>Select an Excel file containing material numbers, descriptions, HSN codes, GST%, MRP, and institutional prices</p>
          
          <div className="unified-upload-area">
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileChange}
              className="unified-file-input"
              id="validation-file"
            />
            <label htmlFor="validation-file" className="unified-file-label">
              <div className="upload-icon">📁</div>
              <div className="upload-text">
                {file ? file.name : 'Choose Excel file or drag & drop'}
              </div>
            </label>
          </div>

          <div className="unified-upload-actions">
            <button
              className="unified-btn unified-btn-primary"
              onClick={handleFileUpload}
              disabled={!file || isLoading}
            >
              {isLoading ? 'Validating...' : 'Validate Material Data'}
            </button>
          </div>

          {message && (
            <div className={`unified-alert unified-alert-${messageType}`}>
              {message}
            </div>
          )}
        </div>
      </div>

      {/* Validation Summary */}
      {validationSummary && (
        <div className="unified-content">
          <h3>Validation Summary</h3>
          <div className="unified-stats-grid">
            <div className="unified-stat-card">
              <div className="stat-value">{validationSummary.totalRows}</div>
              <div className="stat-label">Total Records</div>
            </div>
            <div className="unified-stat-card success">
              <div className="stat-value">{validationSummary.validRows}</div>
              <div className="stat-label">Valid Records</div>
            </div>
            <div className="unified-stat-card danger">
              <div className="stat-value">{validationSummary.invalidRows}</div>
              <div className="stat-label">Invalid Records</div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      {validationData.length > 0 && (
        <div className="unified-content">
          <div className="unified-filters-row">
            <div className="unified-filter-group" style={{flex: '2 1 300px'}}>
              <label>Search Records</label>
              <input
                type="text"
                className="unified-search-input"
                placeholder="Search by material number, description, or HSN code..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="unified-filter-group" style={{flex: '1 1 250px', minWidth: '250px'}}>
              <label>Filter by Status</label>
              <div className="unified-checkbox">
                <input
                  type="checkbox"
                  id="invalid-only"
                  checked={showInvalidOnly}
                  onChange={(e) => setShowInvalidOnly(e.target.checked)}
                />
                <label htmlFor="invalid-only">Show Invalid Records Only</label>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Validation Results */}
      {filteredData.length > 0 && (
        <div className="unified-content">
          <h3>Validation Results ({filteredData.length} records)</h3>
          
          {/* Desktop Table */}
          <div className="unified-table-responsive">
            <table className="unified-table">
              <thead>
                <tr>
                  <th>Status</th>
                  <th>Material Number</th>
                  <th>Description</th>
                  <th>HSN Code</th>
                  <th>GST %</th>
                  <th>MRP</th>
                  <th>Institutional Price</th>
                  <th>Issues</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.map((record, index) => (
                  <tr key={index} className={!record.isValid ? 'invalid-row' : ''}>
                    <td>{getValidationStatusBadge(record.isValid)}</td>
                    <td>
                      <div className="material-number">
                        <strong>{record.materialNumber || '-'}</strong>
                        {record.dbMaterialNumber && record.dbMaterialNumber !== record.materialNumber && (
                          <div className="db-value">DB: {record.dbMaterialNumber}</div>
                        )}
                      </div>
                    </td>
                    <td>
                      <div className="description">
                        {record.description || '-'}
                        {record.dbDescription && record.dbDescription !== record.description && (
                          <div className="db-value">DB: {record.dbDescription}</div>
                        )}
                      </div>
                    </td>
                    <td>
                      <div className="hsn-code">
                        {record.hsnCode || '-'}
                        {record.dbHsnCode && record.dbHsnCode !== record.hsnCode && (
                          <div className="db-value">DB: {record.dbHsnCode}</div>
                        )}
                      </div>
                    </td>
                    <td>
                      <div className="gst-percent">
                        {record.gstPercent || '-'}%
                        {record.dbGstPercent && record.dbGstPercent !== record.gstPercent && (
                          <div className="db-value">DB: {record.dbGstPercent}%</div>
                        )}
                      </div>
                    </td>
                    <td>
                      <div className="price">
                        {formatCurrency(record.mrp)}
                        {record.dbMrp && record.dbMrp !== record.mrp && (
                          <div className="db-value">DB: {formatCurrency(record.dbMrp)}</div>
                        )}
                      </div>
                    </td>
                    <td>
                      <div className="price">
                        {formatCurrency(record.institutionalPrice)}
                        {record.dbInstitutionalPrice && record.dbInstitutionalPrice !== record.institutionalPrice && (
                          <div className="db-value">DB: {formatCurrency(record.dbInstitutionalPrice)}</div>
                        )}
                      </div>
                    </td>
                    <td>{renderValidationErrors(record.errors)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="unified-mobile-cards">
            {filteredData.map((record, index) => (
              <div key={index} className={`unified-mobile-card ${!record.isValid ? 'invalid-card' : ''}`}>
                <div className="unified-card-header">
                  <div className="unified-card-title">
                    {record.materialNumber || 'Unknown Material'}
                  </div>
                  {getValidationStatusBadge(record.isValid)}
                </div>
                
                <div className="unified-card-content">
                  <div className="unified-card-field">
                    <span className="field-label">Description:</span>
                    <span className="field-value">
                      {record.description || '-'}
                      {record.dbDescription && record.dbDescription !== record.description && (
                        <div className="db-value">DB: {record.dbDescription}</div>
                      )}
                    </span>
                  </div>
                  
                  <div className="unified-card-field">
                    <span className="field-label">HSN Code:</span>
                    <span className="field-value">
                      {record.hsnCode || '-'}
                      {record.dbHsnCode && record.dbHsnCode !== record.hsnCode && (
                        <div className="db-value">DB: {record.dbHsnCode}</div>
                      )}
                    </span>
                  </div>
                  
                  <div className="unified-card-field">
                    <span className="field-label">GST %:</span>
                    <span className="field-value">
                      {record.gstPercent || '-'}%
                      {record.dbGstPercent && record.dbGstPercent !== record.gstPercent && (
                        <div className="db-value">DB: {record.dbGstPercent}%</div>
                      )}
                    </span>
                  </div>
                  
                  <div className="unified-card-field">
                    <span className="field-label">MRP:</span>
                    <span className="field-value">
                      {formatCurrency(record.mrp)}
                      {record.dbMrp && record.dbMrp !== record.mrp && (
                        <div className="db-value">DB: {formatCurrency(record.dbMrp)}</div>
                      )}
                    </span>
                  </div>
                  
                  <div className="unified-card-field">
                    <span className="field-label">Institutional Price:</span>
                    <span className="field-value">
                      {formatCurrency(record.institutionalPrice)}
                      {record.dbInstitutionalPrice && record.dbInstitutionalPrice !== record.institutionalPrice && (
                        <div className="db-value">DB: {formatCurrency(record.dbInstitutionalPrice)}</div>
                      )}
                    </span>
                  </div>
                  
                  {record.errors && record.errors.length > 0 && (
                    <div className="unified-card-field">
                      <span className="field-label">Issues:</span>
                      <div className="field-value">
                        {renderValidationErrors(record.errors)}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {validationData.length > 0 && filteredData.length === 0 && (
        <div className="unified-content">
          <div className="unified-empty-state">
            <h3>No Records Found</h3>
            <p>No records match your current filters. Try adjusting your search or filter criteria.</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default MaterialMasterValidation;
