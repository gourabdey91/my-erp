import React from 'react';
import './BusinessUnitList.css';

const BusinessUnitList = ({ businessUnits, onEdit, onDelete }) => {
  if (businessUnits.length === 0) {
    return (
      <div className="business-unit-list-container">
        <div className="empty-state">
          <p>No business units found. Create your first business unit to get started.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="business-unit-list-container">
      <div className="business-units-grid">
        {businessUnits.map((businessUnit) => (
          <div key={businessUnit._id} className="business-unit-card">
            <div className="business-unit-header">
              <h3>{businessUnit.name}</h3>
              <span className="business-unit-code">Code: {businessUnit.code}</span>
            </div>
            <div className="business-unit-details">
              <div className="status-section">
                <span className={`status-badge ${businessUnit.isActive ? 'active' : 'inactive'}`}>
                  {businessUnit.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div className="partners-section">
                <strong>Partners:</strong>
                {businessUnit.partners && businessUnit.partners.length > 0 ? (
                  <div className="partners-list">
                    {businessUnit.partners.map((partner, index) => (
                      <span key={index} className="partner-tag">
                        {partner}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="no-partners">No partners assigned</span>
                )}
              </div>
            </div>
            <div className="business-unit-actions">
              <button
                onClick={() => onEdit(businessUnit)}
                className="edit-button"
              >
                Edit
              </button>
              {businessUnit.isActive && (
                <button
                  onClick={() => onDelete(businessUnit._id)}
                  className="delete-button"
                >
                  Deactivate
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default BusinessUnitList;
