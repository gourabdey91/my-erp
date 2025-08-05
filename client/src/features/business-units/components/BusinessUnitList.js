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
      <div className="business-unit-table">
        <div className="table-header">
          <div className="header-cell">Code</div>
          <div className="header-cell">Name</div>
          <div className="header-cell">Partners</div>
          <div className="header-cell">Status</div>
          <div className="header-cell">Actions</div>
        </div>
        
        <div className="table-body">
          {businessUnits.map((businessUnit) => (
            <div key={businessUnit._id} className="table-row">
              <div className="cell" data-label="Code">
                <span className="business-unit-code">{businessUnit.code}</span>
              </div>
              <div className="cell" data-label="Name">
                <span className="business-unit-name">{businessUnit.name}</span>
              </div>
              <div className="cell" data-label="Partners">
                <div className="partners-cell">
                  {businessUnit.partners && businessUnit.partners.length > 0 ? (
                    <div className="partners-list">
                      {businessUnit.partners.slice(0, 2).map((partner, index) => (
                        <span key={index} className="partner-tag">
                          {partner}
                        </span>
                      ))}
                      {businessUnit.partners.length > 2 && (
                        <span className="partner-count">
                          +{businessUnit.partners.length - 2} more
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="no-partners">No partners</span>
                  )}
                </div>
              </div>
              <div className="cell" data-label="Status">
                <span className={`status-badge ${businessUnit.isActive ? 'active' : 'inactive'}`}>
                  {businessUnit.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div className="cell" data-label="Actions">
                <div className="action-buttons">
                  <button
                    onClick={() => onEdit(businessUnit)}
                    className="btn btn-small btn-primary"
                  >
                    Edit
                  </button>
                  {businessUnit.isActive && (
                    <button
                      onClick={() => onDelete(businessUnit._id)}
                      className="btn btn-small btn-danger"
                    >
                      Deactivate
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default BusinessUnitList;
