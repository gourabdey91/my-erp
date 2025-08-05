import React, { useState, useEffect } from 'react';
import { BusinessUnitProvider } from './contexts/BusinessUnitContext';
import TestBusinessUnitInitializer from './components/TestBusinessUnitInitializer';
import Navigation from './shared/components/Navigation';
import Dashboard from './features/dashboard/Dashboard';
import Users from './features/users/Users';
import BusinessUnits from './features/business-units/BusinessUnits';
import './App.css';

function App() {
  const [currentView, setCurrentView] = useState('dashboard');

  return (
    <BusinessUnitProvider>
      <TestBusinessUnitInitializer />
      <div className="app">
        <Navigation currentView={currentView} onViewChange={setCurrentView} />
        <main className="app-content">
          {renderCurrentView()}
        </main>
      </div>
    </BusinessUnitProvider>
  );

  function renderCurrentView() {
    switch (currentView) {
      case 'dashboard':
        return <Dashboard onViewChange={setCurrentView} />;
      case 'users':
        return <Users />;
      case 'business-units':
        return <BusinessUnits />;
      case 'billing':
        return (
          <div style={{ padding: '50px', textAlign: 'center' }}>
            <h2>Billing Module</h2>
            <p>Coming soon...</p>
          </div>
        );
      case 'reports':
        return (
          <div style={{ padding: '50px', textAlign: 'center' }}>
            <h2>Reports Module</h2>
            <p>Coming soon...</p>
          </div>
        );
      default:
        return <Dashboard onViewChange={setCurrentView} />;
    }
  }
}

export default App;
