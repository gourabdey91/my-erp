import React from 'react';
import '../../styles/unified-design.css';

const TransactionHeader = ({ 
  title, 
  subtitle, 
  actions = [], 
  status = null,
  className = '' 
}) => {
  return (
    <div className={`unified-header ${className}`}>
      <div className="unified-header-content">
        <div className="unified-header-text">
          <h1>
            {title}
            {status && (
              <span className={`unified-badge ${status.type || 'badge-info'}`} style={{marginLeft: '1rem'}}>
                {status.label}
              </span>
            )}
          </h1>
          {subtitle && <p>{subtitle}</p>}
        </div>
        {actions.length > 0 && (
          <div className="unified-header-actions">
            {actions.map((action, index) => (
              <button
                key={index}
                className={`unified-btn ${action.variant || 'unified-btn-primary'}`}
                onClick={action.onClick}
                disabled={action.disabled}
              >
                {action.icon && <span style={{marginRight: '0.5rem'}}>{action.icon}</span>}
                {action.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TransactionHeader;
