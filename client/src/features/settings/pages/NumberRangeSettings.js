import React from 'react';
import { useBusinessUnit } from '../../../contexts/BusinessUnitContext';
import NumberRangeManager from '../components/NumberRangeManager';
import '../styles/NumberRangeSettings.css';

const NumberRangeSettings = () => {
  const { currentBusinessUnit } = useBusinessUnit();

  if (!currentBusinessUnit) {
    return (
      <div className="number-range-settings">
        <div className="message-box warning">
          <p>Please select a business unit from the dashboard to manage number ranges.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="number-range-settings">
      <div className="page-header">
        <h1>Document Number Range Settings</h1>
        <div className="business-unit-info">
          <p>
            Business Unit: <strong>{currentBusinessUnit.name}</strong>
            {currentBusinessUnit.code && (
              <span className="code"> ({currentBusinessUnit.code})</span>
            )}
          </p>
        </div>
      </div>

      <div className="settings-content">
        <NumberRangeManager businessUnitId={currentBusinessUnit._id} />
      </div>

      <div className="help-section">
        <h3>How Number Ranges Work</h3>
        <div className="help-content">
          <div className="help-item">
            <h4>🎯 Automatic Numbering</h4>
            <p>
              When you create a new document (Inquiry, Sales Order, etc.), 
              the system automatically generates the next number in sequence.
            </p>
          </div>

          <div className="help-item">
            <h4>🔧 Manual Configuration</h4>
            <p>
              Use this page to set starting numbers for each document type. 
              Useful for syncing with your offline records or adjusting sequences.
            </p>
          </div>

          <div className="help-item">
            <h4>🔄 Setting Manual Numbers</h4>
            <ol>
              <li>Click "Edit" on the document type you want to adjust</li>
              <li>Enter the current number from your offline records</li>
              <li>The next document will get the next incremented number</li>
            </ol>
          </div>

          <div className="help-item">
            <h4>📋 Your Document Types</h4>
            <table className="doc-types-table">
              <tbody>
                <tr>
                  <td><strong>EST</strong></td>
                  <td>Inquiry (Estimation) - EST00000001</td>
                </tr>
                <tr>
                  <td><strong>CS</strong></td>
                  <td>Sales Order - CS10000509</td>
                </tr>
                <tr>
                  <td><strong>CINV</strong></td>
                  <td>Billing - CINV100508</td>
                </tr>
                <tr>
                  <td><strong>CN</strong></td>
                  <td>Credit Note - CN1000001</td>
                </tr>
                <tr>
                  <td><strong>PO</strong></td>
                  <td>Purchase Order - PO5000000</td>
                </tr>
                <tr>
                  <td><strong>INV</strong></td>
                  <td>Invoice - INV1000000</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NumberRangeSettings;
