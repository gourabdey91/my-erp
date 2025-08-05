import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useBusinessUnit } from '../../contexts/BusinessUnitContext';
import './Navigation.css';

const Navigation = ({ currentView, onViewChange }) => {
  const { currentUser, logout } = useAuth();
  const { currentBusinessUnit, userBusinessUnits, switchBusinessUnit, loading } = useBusinessUnit();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const menuRef = useRef(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsUserMenuOpen(false);
      }
    };

    if (isUserMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isUserMenuOpen]);

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
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="3" y="3" width="7" height="7" rx="1" fill="white"/>
            <rect x="14" y="3" width="7" height="7" rx="1" fill="white"/>
            <rect x="3" y="14" width="7" height="7" rx="1" fill="white"/>
            <rect x="14" y="14" width="7" height="7" rx="1" fill="white"/>
          </svg>
        </div>
        <h1>Home</h1>
      </div>
      
      <div className="nav-right">
        <div className="nav-user-info" onClick={toggleUserMenu} ref={menuRef}>
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
                  🏢 Business Unit
                </div>
                {loading ? (
                  <div className="menu-item disabled">
                    <span>Loading business units...</span>
                  </div>
                ) : userBusinessUnits && userBusinessUnits.length > 0 ? (
                  userBusinessUnits.map((bu) => (
                    <div 
                      key={bu._id || bu.id} 
                      className={`menu-item bu-item ${currentBusinessUnit?._id === bu._id ? 'active' : ''}`}
                      onClick={() => handleBusinessUnitSwitch(bu)}
                    >
                      <div className="bu-item-info">
                        <span className="bu-item-code">{bu.code}</span>
                        <span className="bu-item-name">{bu.name}</span>
                      </div>
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
