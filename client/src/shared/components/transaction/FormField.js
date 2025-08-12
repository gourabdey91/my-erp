import React from 'react';
import '../../styles/unified-design.css';

const FormField = ({ 
  label,
  required = false,
  error = null,
  children,
  className = ''
}) => {
  return (
    <div className={`unified-form-field ${className}`}>
      <label className="unified-form-label">
        {label}
        {required && <span style={{color: 'var(--danger-color)'}}>*</span>}
      </label>
      {children}
      {error && (
        <div className="unified-field-error" style={{
          color: 'var(--danger-color)',
          fontSize: '0.875rem',
          marginTop: '0.25rem'
        }}>
          {error}
        </div>
      )}
    </div>
  );
};

export default FormField;
