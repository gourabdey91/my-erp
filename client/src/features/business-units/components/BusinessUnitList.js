import React from 'react';
import MobileCard from '../../../shared/components/MobileCard';
import '../../../shared/styles/unified-design.css';
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
    <div className="unified-content">
      {/* Desktop Table View */}
      <div className="unified-table-responsive">
        <table className="unified-table">
          <thead>
            <tr>
              <th>Code</th>
              <th>Name</th>
              <th>Company</th>
              <th>Partners</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {businessUnits.map((businessUnit) => (
              <tr key={businessUnit._id}>
                <td>
                  <span className="code-badge">{businessUnit.code}</span>
                </td>
                <td>
                  <span className="name-text">{businessUnit.name}</span>
                </td>
                <td>
                  {businessUnit.companyDetails ? (
                    <span className="company-badge">
                      {businessUnit.companyDetails.companyCode} - {businessUnit.companyDetails.companyName}
                    </span>
                  ) : (
                    <span className="text-muted">No company assigned</span>
                  )}
                </td>
                <td>
                  {businessUnit.partners && businessUnit.partners.length > 0 ? (
                    <div className="partners-list">
                      {businessUnit.partners.map((partner, index) => (
                        <span key={index} className="partner-tag">
                          {partner}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-muted">No partners</span>
                  )}
                </td>
                <td>
                  <span className={`status-badge ${businessUnit.isActive ? 'active' : 'inactive'}`}>
                    {businessUnit.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td>
                  <div className="unified-table-actions">
                    <button
                      className="unified-table-action edit"
                      onClick={() => onEdit(businessUnit)}
                      title="Edit Business Unit"
                    >
                      ✏️
                    </button>
                    {businessUnit.isActive && (
                      <button
                        className="unified-table-action delete"
                        onClick={() => onDelete(businessUnit._id)}
                        title="Deactivate Business Unit"
                      >
                        🗑️
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="unified-mobile-cards">
        {businessUnits.map((businessUnit) => (
          <MobileCard
            key={businessUnit._id}
            id={businessUnit._id}
            title={businessUnit.name}
            badge={businessUnit.code}
            fields={[
              { 
                label: 'Status', 
                value: businessUnit.isActive ? 'Active' : 'Inactive' 
              },
              {
                label: 'Company',
                value: businessUnit.companyDetails 
                  ? `${businessUnit.companyDetails.companyCode} - ${businessUnit.companyDetails.companyName}`
                  : 'No company assigned'
              }
            ]}
            sections={[
              {
                title: 'Details',
                items: [
                  {
                    label: 'Partners',
                    value: businessUnit.partners && businessUnit.partners.length > 0 
                      ? businessUnit.partners.join(', ')
                      : 'No partners assigned'
                  }
                ]
              }
            ]}
            actions={[
              {
                label: 'Edit',
                icon: '✏️',
                onClick: () => onEdit(businessUnit)
              },
              ...(businessUnit.isActive ? [{
                label: 'Deactivate',
                icon: '🗑️',
                variant: 'danger',
                onClick: () => onDelete(businessUnit._id)
              }] : [])
            ]}
          />
        ))}
      </div>
    </div>
  );
};

export default BusinessUnitList;
