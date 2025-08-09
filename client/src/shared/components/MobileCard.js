import React from 'react';
import { useDropdownMenu } from '../hooks/useDropdownMenu';
import '../styles/unified-design.css';

const MobileCard = ({ 
  title, 
  badge, 
  fields = [], 
  sections = [], 
  actions = [],
  id,
  className = '' 
}) => {
  const { openMenuId, toggleMenu, closeMenu, dropdownRef } = useDropdownMenu();
  const isMenuOpen = openMenuId === id;

  const handleActionClick = (action) => {
    closeMenu();
    action.onClick();
  };

  const renderBadge = () => {
    if (!badge) return null;
    
    if (typeof badge === 'string') {
      return <span className="unified-card-badge">{badge}</span>;
    }
    
    if (typeof badge === 'object' && badge.text) {
      const badgeClass = `unified-card-badge ${badge.type ? `badge-${badge.type}` : ''}`;
      return <span className={badgeClass}>{badge.text}</span>;
    }
    
    return null;
  };

  return (
    <div className={`unified-mobile-card ${className}`}>
      <div className="unified-card-header">
        <h3 className="unified-card-title">{title}</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {renderBadge()}
          {actions.length > 0 && (
            <div className="unified-card-menu" ref={dropdownRef}>
              <button
                className="unified-menu-trigger"
                onClick={() => toggleMenu(id)}
                aria-label="More options"
              >
                ⋮
              </button>
              {isMenuOpen && (
                <div className="unified-dropdown-menu">
                  {actions.map((action, index) => (
                    <button
                      key={index}
                      className={`unified-dropdown-item ${action.variant || ''}`}
                      onClick={() => handleActionClick(action)}
                    >
                      {action.icon && <span className="action-icon">{action.icon}</span>}
                      {action.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      
      <div className="unified-card-content">
        {fields.map((field, index) => (
          <div key={index} className="unified-card-field">
            <strong>{field.label}:</strong>
            <span>{field.value}</span>
          </div>
        ))}
        
        {sections.map((section, sectionIndex) => (
          <div key={sectionIndex} className="unified-card-section">
            <div className="unified-section-title">{section.title}</div>
            <div className="unified-section-content">
              {section.items.map((item, itemIndex) => (
                <div key={itemIndex} className="unified-section-item">
                  <strong>{item.label}</strong>
                  <span>{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MobileCard;
