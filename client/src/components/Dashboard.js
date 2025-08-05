import React from 'react';
import './Dashboard.css';

const Dashboard = () => {
  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>Dashboard</h1>
        <p>Welcome to your ERP Billing System</p>
      </div>

      <div className="dashboard-grid">
        <div className="dashboard-card">
          <div className="card-icon">👥</div>
          <div className="card-content">
            <h3>Users</h3>
            <p>Manage system users and their roles</p>
            <div className="card-action">
              <span>Click "Users" in the navigation to get started</span>
            </div>
          </div>
        </div>

        <div className="dashboard-card">
          <div className="card-icon">💰</div>
          <div className="card-content">
            <h3>Billing</h3>
            <p>Create and manage invoices and bills</p>
            <div className="card-action">
              <span>Coming soon...</span>
            </div>
          </div>
        </div>

        <div className="dashboard-card">
          <div className="card-icon">📈</div>
          <div className="card-content">
            <h3>Reports</h3>
            <p>View analytics and generate reports</p>
            <div className="card-action">
              <span>Coming soon...</span>
            </div>
          </div>
        </div>

        <div className="dashboard-card">
          <div className="card-icon">⚙️</div>
          <div className="card-content">
            <h3>Settings</h3>
            <p>Configure system settings and preferences</p>
            <div className="card-action">
              <span>Coming soon...</span>
            </div>
          </div>
        </div>
      </div>

      <div className="quick-stats">
        <h2>Quick Stats</h2>
        <div className="stats-grid">
          <div className="stat-item">
            <span className="stat-number">-</span>
            <span className="stat-label">Total Users</span>
          </div>
          <div className="stat-item">
            <span className="stat-number">-</span>
            <span className="stat-label">Active Invoices</span>
          </div>
          <div className="stat-item">
            <span className="stat-number">-</span>
            <span className="stat-label">Monthly Revenue</span>
          </div>
          <div className="stat-item">
            <span className="stat-number">-</span>
            <span className="stat-label">Pending Payments</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
