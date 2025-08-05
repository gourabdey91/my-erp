import React, { useState, useEffect } from 'react';
import './Dashboard.css';
import { dashboardAPI } from './services/dashboardAPI';

const Dashboard = ({ onViewChange }) => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('access');

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

  const getTilesBySection = () => {
    const sections = {
      access: {
        title: 'Access and Authorization',
        tiles: [
          {
            id: 'users',
            title: 'User Management',
            subtitle: 'Manage Users & Roles',
            icon: '👥',
            count: stats?.users?.count || '...',
            onClick: () => onViewChange('users'),
            enabled: true
          }
        ]
      },
      configuration: {
        title: 'Configuration Data',
        tiles: [
          {
            id: 'company-details',
            title: 'Company Details',
            subtitle: 'Company Information',
            icon: '🏛️',
            count: stats?.companyDetails?.count || '...',
            onClick: () => onViewChange('company-details'),
            enabled: true
          },
          {
            id: 'business-units',
            title: 'Business Units',
            subtitle: 'Manage Business Units',
            icon: '🏢',
            count: stats?.businessUnits?.count || '...',
            onClick: () => onViewChange('business-units'),
            enabled: true
          },
          {
            id: 'categories',
            title: 'Surgical Categories',
            subtitle: 'Manage Categories',
            icon: '📋',
            count: stats?.categories?.count || '...',
            onClick: () => onViewChange('categories'),
            enabled: true
          },
          {
            id: 'payment-types',
            title: 'Payment Types',
            subtitle: 'Manage Payment Types',
            icon: '💳',
            count: stats?.paymentTypes?.count || '...',
            onClick: () => onViewChange('payment-types'),
            enabled: true
          },
          {
            id: 'limits',
            title: 'Payment Limits',
            subtitle: 'Category Rate Mapping',
            icon: '⚖️',
            count: stats?.limits?.count || '...',
            onClick: () => onViewChange('limits'),
            enabled: true
          }
        ]
      },
      other: {
        title: 'Other',
        tiles: [
          {
            id: 'billing',
            title: 'Billing & Invoicing',
            subtitle: 'Create & Manage Bills',
            icon: '💰',
            count: stats?.billing?.count || '24',
            onClick: () => onViewChange('billing'),
            enabled: false
          },
          {
            id: 'reports',
            title: 'Reports & Analytics',
            subtitle: 'View Business Insights',
            icon: '📊',
            count: stats?.reports?.count || '8',
            onClick: () => onViewChange('reports'),
            enabled: false
          },
          {
            id: 'settings',
            title: 'System Settings',
            subtitle: 'Configure System',
            icon: '⚙️',
            count: stats?.settings?.count || '3',
            onClick: () => onViewChange('settings'),
            enabled: false
          },
          {
            id: 'help',
            title: 'Help & Support',
            subtitle: 'Get Assistance',
            icon: '❓',
            count: '24/7',
            onClick: () => onViewChange('help'),
            enabled: false
          }
        ]
      }
    };

    return sections;
  };

  const sections = getTilesBySection();
  const tabs = [
    { key: 'access', label: 'Access and Authorization' },
    { key: 'configuration', label: 'Configuration Data' },
    { key: 'other', label: 'Other' }
  ];

  return (
    <div className="fiori-dashboard">
      {/* Status Bar */}
      <div className="dashboard-status-bar">
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
      </div>

      {/* Tab Navigation */}
      <div className="dashboard-tabs">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            className={`tab-button ${activeTab === tab.key ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tile Container */}
      <div className="fiori-tile-container">
        <div className="fiori-section">
          <div className="fiori-tiles-grid">
            {sections[activeTab]?.tiles.map((tile) => (
              <div
                key={tile.id}
                className={`fiori-tile ${!tile.enabled ? 'disabled' : ''} ${loading ? 'loading' : ''}`}
                onClick={tile.enabled ? tile.onClick : undefined}
              >
                <div className="tile-content">
                  <div className="tile-header">
                    <h3 className="tile-title">{tile.title}</h3>
                    {!tile.enabled && <div className="coming-soon-badge">Soon</div>}
                  </div>
                  <div className="tile-body">
                    <div className="tile-icon">{tile.icon}</div>
                    <div className="tile-count">{loading ? '...' : tile.count}</div>
                  </div>
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
