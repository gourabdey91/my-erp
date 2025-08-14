// Clean table body for InquiryItems.js
<tbody>
  {inquiryItems.map((item, index) => (
    <tr key={index}>
      <td data-label="S.No" className="text-center">
        <input
          type="text"
          className="unified-input text-center"
          style={{ width: '50px' }}
          value={formatSerialNumber(item.serialNumber)}
          onChange={(e) => {
            const numericValue = e.target.value.replace(/\D/g, '');
            handleInputChange(index, 'serialNumber', numericValue || '1');
          }}
          placeholder="01"
          title="Enter serial number for custom ordering. Items will be sorted when saved."
        />
      </td>
      
      <td data-label="Material No.">
        <div className="material-number-container">
          <input
            type="text"
            className={`unified-input ${errors[`${index}_materialNumber`] ? 'error' : ''}`}
            value={item.materialNumber}
            onChange={(e) => handleInputChange(index, 'materialNumber', e.target.value)}
            placeholder="Enter material number"
            readOnly={!!item.materialDescription}
          />
          <button
            type="button"
            className="material-selector-btn"
            onClick={() => openMaterialSelector(index)}
            disabled={!hospital || !surgicalCategory}
            title={!hospital || !surgicalCategory ? 'Please select hospital and surgical category first' : 'Select from material master'}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M21 21L16.514 16.506M19 10.5C19 15.194 15.194 19 10.5 19C5.806 19 2 15.194 2 10.5C2 5.806 5.806 2 10.5 2C15.194 2 19 5.806 19 10.5Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
        {errors[`${index}_materialNumber`] && (
          <span className="unified-error-text">{errors[`${index}_materialNumber`]}</span>
        )}
      </td>

      <td data-label="Material Description">
        {item.materialDescription ? (
          <div className="material-description-display">
            <span className="material-description-text">
              {item.materialDescription}
            </span>
            <small className="material-description-note">
              (From Material Master)
            </small>
          </div>
        ) : (
          <input
            type="text"
            className="unified-input"
            value={item.materialDescription || ''}
            onChange={(e) => handleInputChange(index, 'materialDescription', e.target.value)}
            placeholder="Enter material description"
            title="Material description - auto-filled when selected from material master"
          />
        )}
      </td>

      <td data-label="Unit Rate">
        <input
          type="number"
          className={`unified-input ${errors[`${index}_unitRate`] ? 'error' : ''}`}
          value={item.unitRate}
          onChange={(e) => handleInputChange(index, 'unitRate', e.target.value)}
          placeholder="0.00"
          min="0"
          step="0.01"
          style={{ textAlign: 'right' }}
          readOnly={!!item.materialDescription}
          title={item.materialDescription ? "Unit Rate is derived from material master" : "Enter Unit Rate"}
        />
        {errors[`${index}_unitRate`] && (
          <span className="unified-error-text">{errors[`${index}_unitRate`]}</span>
        )}
      </td>

      <td data-label="Quantity">
        <input
          type="number"
          className={`unified-input ${errors[`${index}_quantity`] ? 'error' : ''}`}
          value={item.quantity}
          onChange={(e) => handleInputChange(index, 'quantity', e.target.value)}
          placeholder="1"
          min="1"
          style={{ textAlign: 'center' }}
        />
        {errors[`${index}_quantity`] && (
          <span className="unified-error-text">{errors[`${index}_quantity`]}</span>
        )}
      </td>

      <td data-label="Unit">
        <input
          type="text"
          className="unified-input"
          value={item.unit}
          onChange={(e) => handleInputChange(index, 'unit', e.target.value)}
          placeholder="Unit"
          readOnly
          title="Unit is derived from material master"
        />
      </td>

      <td data-label="HSN Code">
        <input
          type="text"
          className={`unified-input ${errors[`${index}_hsnCode`] ? 'error' : ''}`}
          value={item.hsnCode}
          onChange={(e) => handleInputChange(index, 'hsnCode', e.target.value)}
          placeholder="HSN Code"
          readOnly={!!item.materialDescription}
          title={item.materialDescription ? "HSN Code is derived from material master" : "Enter HSN Code"}
        />
        {errors[`${index}_hsnCode`] && (
          <span className="unified-error-text">{errors[`${index}_hsnCode`]}</span>
        )}
      </td>

      <td data-label="GST %">
        <input
          type="number"
          className={`unified-input ${errors[`${index}_gstPercentage`] ? 'error' : ''}`}
          value={item.gstPercentage}
          onChange={(e) => handleInputChange(index, 'gstPercentage', e.target.value)}
          placeholder="GST%"
          min="0"
          max="100"
          step="0.01"
          style={{ textAlign: 'right' }}
          readOnly={!!item.materialDescription}
          title={item.materialDescription ? "GST% is derived from material master" : "Enter GST%"}
        />
        {errors[`${index}_gstPercentage`] && (
          <span className="unified-error-text">{errors[`${index}_gstPercentage`]}</span>
        )}
      </td>

      <td data-label="Disc %">
        <input
          type="number"
          className="unified-input"
          value={item.discountPercentage}
          onChange={(e) => handleInputChange(index, 'discountPercentage', e.target.value)}
          placeholder="0"
          min="0"
          max="100"
          step="0.01"
          style={{ textAlign: 'right' }}
        />
      </td>

      <td data-label="Disc Amt">
        <input
          type="number"
          className="unified-input"
          value={item.discountAmount}
          onChange={(e) => handleInputChange(index, 'discountAmount', e.target.value)}
          placeholder="0.00"
          min="0"
          step="0.01"
          style={{ textAlign: 'right' }}
        />
      </td>

      <td data-label="Total Amount">
        <input
          type="text"
          className="unified-input total-amount"
          value={formatCurrency(item.totalAmount, item.currency)}
          readOnly
          style={{ textAlign: 'right', fontWeight: '600', color: '#28a745' }}
          title={`Total amount for this item: ${formatCurrency(item.totalAmount, item.currency)}`}
        />
      </td>

      <td data-label="Actions">
        <div className="action-buttons">
          {inquiryItems.length > 1 && (
            <button
              type="button"
              className="delete-item-btn"
              onClick={() => removeItem(index)}
              title="Remove Item"
            >
              🗑️
            </button>
          )}
        </div>
      </td>
    </tr>
  ))}
</tbody>
