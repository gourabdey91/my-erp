import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useBusinessUnit } from '../../contexts/BusinessUnitContext';
import './Navigation.css';

const Navigation = ({ currentView, onViewChange }) => {
  const { currentUser, logout } = useAuth();
  const { currentBusinessUnit, userBusinessUnits, switchBusinessUnit } = useBusinessUnit();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const handleBusinessUnitSwitch = (businessUnit) => {
    switchBusinessUnit(businessUnit);
    setIsUserMenuOpen(false);
  };

  const toggleUserMenu = () => {
    setIsUserMenuOpen(!isUserMenuOpen);
  };

  const handleLogout = () => {
    logout();
    setIsUserMenuOpen(false);
  };

  return (
    <nav className="navigation">
      <div className="nav-brand" onClick={() => onViewChange('dashboard')}>
        <div className="nav-logo">
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="32" height="32" rx="6" fill="white" fillOpacity="0.2"/>
            <rect x="6" y="6" width="8" height="8" rx="2" fill="white"/>
            <rect x="18" y="6" width="8" height="8" rx="2" fill="white"/>
            <rect x="6" y="18" width="8" height="8" rx="2" fill="white"/>
            <rect x="18" y="18" width="8" height="8" rx="2" fill="white"/>
          </svg>
        </div>
        <h1>My ERP Launchpad</h1>
      </div>
      
      <div className="nav-right">
        <div className="nav-user-info" onClick={toggleUserMenu}>
          <div className="user-avatar">
            <span>{currentUser?.firstName ? currentUser.firstName.charAt(0).toUpperCase() : 'U'}</span>
          </div>
          <span className="user-name">{currentUser?.fullName || 'User'}</span>
          <span className={`dropdown-arrow ${isUserMenuOpen ? 'open' : ''}`}>▼</span>
          
          {isUserMenuOpen && (
            <div className="user-menu">
              <div className="user-menu-header">
                <div className="user-avatar-large">
                  <span>{currentUser?.firstName ? currentUser.firstName.charAt(0).toUpperCase() : 'U'}</span>
                </div>
                <div className="user-details">
                  <div className="user-name-large">{currentUser?.fullName || 'User'}</div>
                  <div className="user-email">{currentUser?.email || 'user@example.com'}</div>
                </div>
              </div>
              
              <div className="menu-divider"></div>
              
              <div className="menu-section">
                <div className="menu-section-title">
                  🏢 Switch Business Unit
                  {currentBusinessUnit && (
                    <span className="current-bu-indicator">
                      (Current: {currentBusinessUnit.code})
                    </span>
                  )}
                </div>
                {userBusinessUnits.length > 0 ? (
                  userBusinessUnits.map((bu) => (
                    <div 
                      key={bu._id} 
                      className={`menu-item bu-item ${currentBusinessUnit?._id === bu._id ? 'active' : ''}`}
                      onClick={() => handleBusinessUnitSwitch(bu)}
                    >
                      <span className="bu-item-code">{bu.code}</span>
                      <span className="bu-item-name">{bu.name}</span>
                      {currentBusinessUnit?._id === bu._id && <span className="current-indicator">✓</span>}
                    </div>
                  ))
                ) : (
                  <div className="menu-item disabled">
                    <span>No business units assigned</span>
                  </div>
                )}
              </div>
              
              <div className="menu-divider"></div>
              
              <div className="menu-item" onClick={() => setIsUserMenuOpen(false)}>
                <span>⚙️ Settings</span>
              </div>
              <div className="menu-item logout" onClick={handleLogout}>
                <span>🔓 Logout</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
