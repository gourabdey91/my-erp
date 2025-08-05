import React from 'react';
import './Navigation.css';

const Navigation = ({ currentView, onViewChange }) => {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'users', label: 'Users', icon: '👥' },
    { id: 'billing', label: 'Billing', icon: '💰' },
    { id: 'reports', label: 'Reports', icon: '📈' },
  ];

  return (
    <nav className="navigation">
      <div className="nav-brand">
        <h1>My ERP</h1>
      </div>
      <ul className="nav-menu">
        {navItems.map(item => (
          <li key={item.id} className="nav-item">
            <button
              className={`nav-link ${currentView === item.id ? 'active' : ''}`}
              onClick={() => onViewChange(item.id)}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
};

export default Navigation;
