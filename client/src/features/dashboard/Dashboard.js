import React, { useState, useEffect } from 'react';
import './Dashboard.css';
import { dashboardAPI } from './services/dashboardAPI';

const Dashboard = ({ onViewChange }) => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState(() => {
    // Load saved tab from localStorage, default to 'access'
    return localStorage.getItem('dashboardActiveTab') || 'access';
  });

  // Save active tab to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('dashboardActiveTab', activeTab);
  }, [activeTab]);

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
            id: 'procedures',
            title: 'Procedures',
            subtitle: 'Medical Procedures',
            icon: '⚕️',
            count: stats?.procedures?.count || '...',
            onClick: () => onViewChange('procedures'),
            enabled: true
          },
          {
            id: 'expense-types',
            title: 'Expense Types',
            subtitle: 'Manage Expense Types',
            icon: '💸',
            count: stats?.expenseTypes?.count || '...',
            onClick: () => onViewChange('expense-types'),
            enabled: true
          },
          {
            id: 'implant-types',
            title: 'Implant Types',
            subtitle: 'Manage Implant Types',
            icon: '🦴',
            count: stats?.implantTypes?.count || '...',
            onClick: () => onViewChange('implant-types'),
            enabled: true
          }
        ]
      },
      masterData: {
        title: 'Master Data',
        tiles: [
          {
            id: 'doctors',
            title: 'Doctor Details',
            subtitle: 'Manage Doctors',
            icon: '👨‍⚕️',
            count: stats?.doctors?.count || '...',
            onClick: () => onViewChange('doctors'),
            enabled: true
          },
          {
            id: 'hospitals',
            title: 'Customer Details',
            subtitle: 'Manage Customers',
            icon: '🏥',
            count: stats?.hospitals?.count || '...',
            onClick: () => onViewChange('hospitals'),
            enabled: true
          },
          {
            id: 'material-master',
            title: 'Material Master',
            subtitle: 'Manage Materials',
            icon: '📦',
            count: stats?.materialMaster?.count || '...',
            onClick: () => onViewChange('material-master'),
            enabled: true
          }
        ]
      },
      dataImport: {
        title: 'Data Import',
        tiles: [
          {
            id: 'file-upload',
            title: 'Implant Subcategory',
            subtitle: 'Import Excel Data',
            icon: '📤',
            count: 'XLSX',
            onClick: () => onViewChange('file-upload'),
            enabled: true
          },
          {
            id: 'material-master-upload',
            title: 'Material Master',
            subtitle: 'Import Material Data',
            icon: '📦',
            count: 'XLSX',
            onClick: () => onViewChange('material-master-upload'),
            enabled: true
          }
        ]
      },
      transactional: {
        title: 'Transactional Data',
        tiles: [
          {
            id: 'delivery-challan-details',
            title: 'Challan Details',
            subtitle: 'Track Challans',
            icon: '📦',
            count: stats?.deliveryChallanDetails?.count || '...',
            onClick: () => onViewChange('delivery-challan-details'),
            enabled: true
          },
          {
            id: 'templates',
            title: 'Templates',
            subtitle: 'Document Templates',
            icon: '📄',
            count: stats?.templates?.count || '...',
            onClick: () => onViewChange('templates'),
            enabled: false
          },
          {
            id: 'sales-order',
            title: 'Sales Order',
            subtitle: 'Manage Sales Orders',
            icon: '📝',
            count: stats?.salesOrders?.count || '...',
            onClick: () => onViewChange('sales-order'),
            enabled: false
          },
          {
            id: 'delivery',
            title: 'Delivery',
            subtitle: 'Track Deliveries',
            icon: '🚚',
            count: stats?.deliveries?.count || '...',
            onClick: () => onViewChange('delivery'),
            enabled: false
          },
          {
            id: 'billing',
            title: 'Billing',
            subtitle: 'Create & Manage Bills',
            icon: '💰',
            count: stats?.billing?.count || '...',
            onClick: () => onViewChange('billing'),
            enabled: false
          },
          {
            id: 'expense',
            title: 'Expense',
            subtitle: 'Track Expenses',
            icon: '💸',
            count: stats?.expenses?.count || '...',
            onClick: () => onViewChange('expense'),
            enabled: false
          },
          {
            id: 'payment',
            title: 'Payment',
            subtitle: 'Manage Payments',
            icon: '💳',
            count: stats?.payments?.count || '...',
            onClick: () => onViewChange('payment'),
            enabled: false
          }
        ]
      },
      other: {
        title: 'Reports & Analytics',
        tiles: [
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
    { key: 'masterData', label: 'Master Data' },
    { key: 'transactional', label: 'Transactional Data' },
    { key: 'other', label: 'Reports & Analytics' }
  ];

  // Function to scroll to section
  const scrollToSection = (sectionKey) => {
    const sectionElement = document.getElementById(`section-${sectionKey}`);
    if (sectionElement) {
      // Calculate offset to account for sticky header and tabs (approximately 100px)
      const elementPosition = sectionElement.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - 100;
      
      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
  };

  return (
    <div className="fiori-dashboard">
      {/* Tab Navigation */}
      <div className="dashboard-tabs">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            className={`tab-button ${activeTab === tab.key ? 'active' : ''}`}
            onClick={() => {
              setActiveTab(tab.key);
              scrollToSection(tab.key);
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tile Container - Show All Sections */}
      <div className="fiori-tile-container">
        {/* Error/Loading Messages */}
        {loading && (
          <div className="dashboard-status loading" style={{ margin: '1rem 0' }}>
            <span>📊</span> Loading statistics...
          </div>
        )}
        {error && (
          <div className="dashboard-status error" style={{ margin: '1rem 0' }}>
            <span>⚠️</span> {error}
          </div>
        )}
        
        {Object.entries(sections).map(([sectionKey, section]) => (
          <div key={sectionKey} id={`section-${sectionKey}`} className="fiori-section">
            <h2 className="section-title">{section.title}</h2>
            <div className="fiori-tiles-grid">
              {section.tiles.map((tile) => (
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
        ))}
      </div>
    </div>
  );
};

export default Dashboard;
