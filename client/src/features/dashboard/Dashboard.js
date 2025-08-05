import React, { useState, useEffect } from 'react';
import './Dashboard.css';
import { dashboardAPI } from './services/dashboardAPI';

const Dashboard = ({ onViewChange }) => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch dashboard statistics when component mounts
  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const response = await dashboardAPI.getStats();
        if (response.success) {
          setStats(response.data);
        } else {
          setError('Failed to fetch dashboard statistics');
        }
      } catch (err) {
        console.error('Dashboard stats error:', err);
        setError('Error connecting to server');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const getTileData = () => {
    if (!stats) {
      // Fallback data while loading or if API fails
      return [
        {
          id: 'users',
          title: 'User Management',
          subtitle: 'Manage Users & Roles',
          icon: '👥',
          count: '...',
          countLabel: 'Active Users',
          onClick: () => onViewChange('users'),
          enabled: true
        },
        {
          id: 'business-units',
          title: 'Business Units',
          subtitle: 'Manage Business Units',
          icon: '🏢',
          count: '...',
          countLabel: 'Business Units',
          onClick: () => onViewChange('business-units'),
          enabled: true
        },
        {
          id: 'billing',
          title: 'Billing & Invoicing',
          subtitle: 'Create & Manage Bills',
          icon: '💰',
          count: '...',
          countLabel: 'Pending Bills',
          onClick: () => onViewChange('billing'),
          enabled: false
        },
        {
          id: 'reports',
          title: 'Reports & Analytics',
          subtitle: 'View Business Insights',
          icon: '📊',
          count: '...',
          countLabel: 'Reports',
          onClick: () => onViewChange('reports'),
          enabled: false
        },
        {
          id: 'master-data',
          title: 'Master Data',
          subtitle: 'Manage Core Data',
          icon: '🗂️',
          count: '...',
          countLabel: 'Records',
          onClick: () => onViewChange('master-data'),
          enabled: false
        },
        {
          id: 'settings',
          title: 'System Settings',
          subtitle: 'Configure System',
          icon: '⚙️',
          count: '...',
          countLabel: 'Settings',
          onClick: () => onViewChange('settings'),
          enabled: false
        },
        {
          id: 'help',
          title: 'Help & Support',
          subtitle: 'Get Assistance',
          icon: '❓',
          count: '...',
          countLabel: 'Support',
          onClick: () => onViewChange('help'),
          enabled: false
        }
      ];
    }

    return [
      {
        id: 'users',
        title: 'User Management',
        subtitle: 'Manage Users & Roles',
        icon: '👥',
        count: stats.users.count,
        countLabel: stats.users.label,
        onClick: () => onViewChange('users'),
        enabled: true
      },
      {
        id: 'business-units',
        title: 'Business Units',
        subtitle: 'Manage Business Units',
        icon: '🏢',
        count: stats.businessUnits?.count || '...',
        countLabel: stats.businessUnits?.label || 'Business Units',
        onClick: () => onViewChange('business-units'),
        enabled: true
      },
      {
        id: 'billing',
        title: 'Billing & Invoicing',
        subtitle: 'Create & Manage Bills',
        icon: '💰',
        count: stats.billing.count,
        countLabel: stats.billing.label,
        onClick: () => onViewChange('billing'),
        enabled: false
      },
      {
        id: 'reports',
        title: 'Reports & Analytics',
        subtitle: 'View Business Insights',
        icon: '📊',
        count: stats.reports.count,
        countLabel: stats.reports.label,
        onClick: () => onViewChange('reports'),
        enabled: false
      },
      {
        id: 'master-data',
        title: 'Master Data',
        subtitle: 'Manage Core Data',
        icon: '🗂️',
        count: stats.masterData.count,
        countLabel: stats.masterData.label,
        onClick: () => onViewChange('master-data'),
        enabled: false
      },
      {
        id: 'settings',
        title: 'System Settings',
        subtitle: 'Configure System',
        icon: '⚙️',
        count: stats.settings.count,
        countLabel: stats.settings.label,
        onClick: () => onViewChange('settings'),
        enabled: false
      },
      {
        id: 'help',
        title: 'Help & Support',
        subtitle: 'Get Assistance',
        icon: '❓',
        count: stats.support.count,
        countLabel: stats.support.label,
        onClick: () => onViewChange('help'),
        enabled: false
      }
    ];
  };

  const tiles = getTileData();

  return (
    <div className="fiori-dashboard">
      {/* Tile Container */}
      <div className="fiori-tile-container">
        <div className="fiori-section">
          <div className="section-header">
            <h2 className="section-title">Business Applications</h2>
            {loading && (
              <div className="dashboard-status loading">
                <span>📊</span> Loading statistics...
              </div>
            )}
            {error && (
              <div className="dashboard-status error">
                <span>⚠️</span> {error}
              </div>
            )}
            {stats && !loading && (
              <div className="dashboard-status success">
                <span>✅</span> Data updated {new Date().toLocaleTimeString()}
              </div>
            )}
          </div>
          <div className="fiori-tiles-grid">
            {tiles.map((tile) => (
              <div
                key={tile.id}
                className={`fiori-tile ${!tile.enabled ? 'disabled' : ''} ${loading ? 'loading' : ''}`}
                onClick={tile.enabled ? tile.onClick : undefined}
              >
                <div className="tile-header">
                  <div className="tile-icon">{tile.icon}</div>
                  {!tile.enabled && <div className="coming-soon-badge">Soon</div>}
                </div>
                <div className="tile-content">
                  <h3 className="tile-title">{tile.title}</h3>
                  <p className="tile-subtitle">{tile.subtitle}</p>
                </div>
                <div className="tile-footer">
                  <div className="tile-count">{loading ? '...' : tile.count}</div>
                  <div className="tile-count-label">{tile.countLabel}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
