import React, { useState } from 'react';
import Navigation from './components/Navigation';
import Dashboard from './components/Dashboard';
import Users from './components/Users';
import './App.css';

function App() {
  const [currentView, setCurrentView] = useState('dashboard');

  const renderCurrentView = () => {
    switch (currentView) {
      case 'dashboard':
        return <Dashboard />;
      case 'users':
        return <Users />;
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
        return <Dashboard />;
    }
  };

  return (
    <div className="app">
      <Navigation currentView={currentView} onViewChange={setCurrentView} />
      <main className="app-content">
        {renderCurrentView()}
      </main>
    </div>
  );
}

export default App;
