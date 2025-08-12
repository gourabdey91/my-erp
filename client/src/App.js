import React, { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { BusinessUnitProvider } from './contexts/BusinessUnitContext';
import TestBusinessUnitInitializer from './components/TestBusinessUnitInitializer';
import Navigation from './shared/components/Navigation';
import Dashboard from './features/dashboard/Dashboard';
import Users from './features/users/Users';
import BusinessUnits from './features/business-units/BusinessUnits';
import CompanyDetails from './features/company/CompanyDetails';
import Categories from './features/categories/Categories';
import PaymentTypes from './features/payment-types/PaymentTypes';
import ExpenseTypes from './features/expense-types/ExpenseTypes';
import Doctors from './features/doctors/Doctors';
import Hospitals from './features/hospitals/Hospitals';
import Procedures from './features/procedures/Procedures';
import ImplantTypes from './features/implant-types/ImplantTypes';
import MaterialMaster from './features/material-master/MaterialMaster';
import DeliveryChallanDetails from './features/delivery-challan-details/DeliveryChallanDetails';
import SalesOrders from './features/sales-orders/SalesOrders';
import FileUpload from './features/file-upload/FileUpload';
import MaterialMasterUpload from './features/file-upload/MaterialMasterUpload';
import MaterialMasterValidation from './features/file-upload/MaterialMasterValidation';
import MaterialAssignmentUpload from './features/material-assignment-upload/MaterialAssignmentUpload';
import Inquiry from './features/inquiry/Inquiry';
import LoginScreen from './features/auth/LoginScreen';
import './App.css';

function AppContent() {
  const [currentView, setCurrentView] = useState('dashboard');
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="app-loading">
        <div className="loading-spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginScreen />;
  }

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
      case 'categories':
        return <Categories />;
      case 'payment-types':
        return <PaymentTypes />;
      case 'expense-types':
        return <ExpenseTypes />;
      case 'doctors':
        return <Doctors />;
      case 'hospitals':
        return <Hospitals />;
      case 'procedures':
        return <Procedures />;
      case 'implant-types':
        return <ImplantTypes />;
      case 'material-master':
        return <MaterialMaster />;
      case 'delivery-challan-details':
        return <DeliveryChallanDetails />;
      case 'sales-order':
        return <SalesOrders />;
      case 'file-upload':
        return <FileUpload />;
      case 'material-master-upload':
        return <MaterialMasterUpload />;
      case 'material-master-validation':
        return <MaterialMasterValidation />;
      case 'material-assignment-upload':
        return <MaterialAssignmentUpload onBack={() => setCurrentView('dashboard')} />;
      case 'inquiry':
        return <Inquiry />;
      case 'company-details':
        return <CompanyDetails />;
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

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
