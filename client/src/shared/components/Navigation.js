import React from 'react';
import './Navigation.css';

const Navigation = ({ currentView, onViewChange }) => {
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
      <div className="nav-user-info">
        <div className="user-avatar">
          <span>A</span>
        </div>
        <span className="user-name">Admin User</span>
      </div>
    </nav>
  );
};

export default Navigation;
