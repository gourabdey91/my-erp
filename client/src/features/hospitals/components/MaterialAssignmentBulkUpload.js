import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { hospitalAPI } from '../services/hospitalAPI';

const MaterialAssignmentBulkUpload = ({ hospitalId, hospitalName, onClose, onSuccess }) => {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [results, setResults] = useState(null);
  const [errors, setErrors] = useState([]);

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
        setResults(null);
        setErrors([]);
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

    try {
      setUploading(true);
      setResults(null);
      setErrors([]);

      // Parse the file data
      const assignments = await parseFileData(file);
      
      if (assignments.length === 0) {
        alert('No valid data found in the file');
        return;
      }

      // Upload to server
      const response = await hospitalAPI.bulkUploadMaterialAssignments(hospitalId, assignments);
      
      setResults(response);
      
      if (response.successCount > 0) {
        onSuccess?.();
      }

    } catch (error) {
      console.error('Upload error:', error);
      setErrors([error.message]);
    } finally {
      setUploading(false);
    }
  };

  const downloadTemplate = () => {
    // Create template data
    const templateData = [
      ['Material Number', 'MRP', 'Institutional Price', 'Flagged Billed'],
      ['EXAMPLE001', '1000.00', '900.00', 'false'],
      ['EXAMPLE002', '', '', 'true'] // Example showing blank prices will be fetched from material master
    ];

    // Create workbook and worksheet
    const ws = XLSX.utils.aoa_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Material Assignments');

    // Download the file
    XLSX.writeFile(wb, `material_assignment_template_${hospitalName || 'hospital'}.xlsx`);
  };

  return (
    <div className="unified-modal-overlay">
      <div className="unified-modal-content" style={{ maxWidth: '800px', maxHeight: '90vh', overflow: 'auto' }}>
        <div className="unified-modal-header">
          <h2>Bulk Upload Material Assignments</h2>
          <span className="hospital-name-badge">{hospitalName}</span>
          <button className="unified-modal-close" onClick={onClose}>×</button>
        </div>

        <div className="unified-modal-body">
          <div className="upload-section">
            <div className="upload-instructions">
              <h3>Instructions:</h3>
              <ul>
                <li>Download the template file and fill in your data</li>
                <li><strong>Material Number</strong> is required and must exist in Material Master</li>
                <li><strong>MRP</strong> and <strong>Institutional Price</strong> are optional - if blank, values will be fetched from Material Master</li>
                <li><strong>Flagged Billed</strong> should be 'true' or 'false' (optional, defaults to false)</li>
                <li>Supported formats: Excel (.xlsx, .xls) or CSV</li>
              </ul>
            </div>

            <div className="template-download">
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
                disabled={!file || uploading}
              >
                {uploading ? '⏳ Uploading...' : '📤 Upload Material Assignments'}
              </button>
            </div>
          </div>

          {/* Results Section */}
          {results && (
            <div className="upload-results">
              <h3>Upload Results</h3>
              <div className="results-summary">
                <div className="result-stat success">
                  <strong>✅ Success: {results.successCount}</strong>
                </div>
                <div className="result-stat error">
                  <strong>❌ Errors: {results.errorCount}</strong>
                </div>
                <div className="result-stat total">
                  <strong>📊 Total Processed: {results.totalProcessed}</strong>
                </div>
              </div>

              {results.errors && results.errors.length > 0 && (
                <div className="error-details">
                  <h4>Errors:</h4>
                  <ul>
                    {results.errors.map((error, index) => (
                      <li key={index} className="error-item">{error}</li>
                    ))}
                  </ul>
                </div>
              )}

              {results.results && results.results.length > 0 && (
                <div className="success-details">
                  <h4>Successfully Uploaded:</h4>
                  <div className="results-table">
                    <table className="unified-table">
                      <thead>
                        <tr>
                          <th>Material Number</th>
                          <th>Description</th>
                          <th>MRP</th>
                          <th>Institutional Price</th>
                        </tr>
                      </thead>
                      <tbody>
                        {results.results.map((result, index) => (
                          <tr key={index}>
                            <td>{result.materialNumber}</td>
                            <td>{result.description}</td>
                            <td>₹{result.mrp.toLocaleString()}</td>
                            <td>₹{result.institutionalPrice.toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {errors.length > 0 && (
            <div className="error-section">
              <h3>Errors:</h3>
              {errors.map((error, index) => (
                <div key={index} className="error-message">{error}</div>
              ))}
            </div>
          )}
        </div>

        <div className="unified-modal-actions">
          <button className="unified-btn unified-btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default MaterialAssignmentBulkUpload;
