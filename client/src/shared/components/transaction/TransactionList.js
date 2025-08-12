import React from 'react';
import '../../styles/unified-design.css';

const TransactionList = ({ 
  title,
  data = [],
  columns = [],
  onEdit,
  onDelete,
  onView,
  emptyMessage = 'No records found.',
  loading = false,
  className = ''
}) => {
  const renderActions = (record) => {
    const actions = [];
    
    if (onView) {
      actions.push(
        <button
          key="view"
          onClick={() => onView(record)}
          className="unified-table-action view"
          title="View details"
        >
          👁️
        </button>
      );
    }
    
    if (onEdit) {
      actions.push(
        <button
          key="edit"
          onClick={() => onEdit(record)}
          className="unified-table-action edit"
          title="Edit record"
        >
          ✏️
        </button>
      );
    }
    
    if (onDelete) {
      actions.push(
        <button
          key="delete"
          onClick={() => onDelete(record)}
          className="unified-table-action delete"
          title="Delete record"
        >
          🗑️
        </button>
      );
    }
    
    return actions.length > 0 ? (
      <div className="unified-table-actions">
        {actions}
      </div>
    ) : null;
  };

  const renderCellValue = (record, column) => {
    if (column.render) {
      return column.render(record[column.key], record);
    }
    
    if (column.key === 'actions') {
      return renderActions(record);
    }
    
    return record[column.key] || '-';
  };

  if (loading) {
    return (
      <div className={`unified-content ${className}`}>
        <div className="unified-loading">Loading records...</div>
      </div>
    );
  }

  return (
    <div className={`unified-content ${className}`}>
      {title && <h3>{title}</h3>}
      
      {data.length === 0 ? (
        <div className="unified-empty-state">
          <h3>No Records</h3>
          <p>{emptyMessage}</p>
        </div>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="unified-table-responsive">
            <table className="unified-table">
              <thead>
                <tr>
                  {columns.map((column) => (
                    <th key={column.key}>{column.title}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.map((record, index) => (
                  <tr key={record.id || record._id || index}>
                    {columns.map((column) => (
                      <td key={column.key} data-label={column.title}>
                        {renderCellValue(record, column)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="unified-mobile-cards">
            {data.map((record, index) => (
              <div key={record.id || record._id || index} className="unified-mobile-card">
                <div className="unified-card-header">
                  <div className="unified-card-title">
                    {record.displayTitle || `Record ${index + 1}`}
                  </div>
                  {record.status && (
                    <div className={`unified-card-badge ${record.status.type || 'badge-info'}`}>
                      {record.status.label}
                    </div>
                  )}
                </div>
                
                <div className="unified-card-content">
                  {columns
                    .filter(col => col.key !== 'actions' && col.showInCard !== false)
                    .map((column) => (
                      <div key={column.key} className="unified-card-field">
                        <span className="field-label">{column.title}:</span>
                        <span className="field-value">
                          {renderCellValue(record, column)}
                        </span>
                      </div>
                    ))}
                  
                  {renderActions(record) && (
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                      {onView && (
                        <button
                          onClick={() => onView(record)}
                          className="unified-btn unified-btn-secondary"
                          style={{ flex: 1 }}
                        >
                          View
                        </button>
                      )}
                      {onEdit && (
                        <button
                          onClick={() => onEdit(record)}
                          className="unified-btn unified-btn-primary"
                          style={{ flex: 1 }}
                        >
                          Edit
                        </button>
                      )}
                      {onDelete && (
                        <button
                          onClick={() => onDelete(record)}
                          className="unified-btn unified-btn-danger"
                          style={{ flex: 1 }}
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default TransactionList;
