import React from 'react';
import '../../styles/unified-design.css';

const TransactionForm = ({ 
  title,
  children,
  onSubmit,
  onCancel,
  submitLabel = 'Save',
  cancelLabel = 'Cancel',
  isLoading = false,
  showActions = true,
  className = ''
}) => {
  const handleSubmit = (e) => {
    e.preventDefault();
    if (onSubmit) {
      onSubmit(e);
    }
  };

  return (
    <div className={`unified-content ${className}`}>
      {title && (
        <div style={{borderBottom: '2px solid var(--gray-200)', paddingBottom: '1rem', marginBottom: '1.5rem'}}>
          <h2 style={{margin: 0, color: 'var(--primary-color)', fontSize: '1.25rem', fontWeight: '600'}}>
            {title}
          </h2>
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
        <div className="unified-form-grid">
          {children}
        </div>
        
        {showActions && (
          <div className="unified-form-actions">
            <button 
              type="submit" 
              className="unified-btn unified-btn-primary"
              disabled={isLoading}
            >
              {isLoading ? 'Saving...' : submitLabel}
            </button>
            {onCancel && (
              <button 
                type="button" 
                className="unified-btn unified-btn-secondary"
                onClick={onCancel}
                disabled={isLoading}
              >
                {cancelLabel}
              </button>
            )}
          </div>
        )}
      </form>
    </div>
  );
};

export default TransactionForm;
