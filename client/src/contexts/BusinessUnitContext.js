import React, { createContext, useContext, useState, useEffect } from 'react';

const BusinessUnitContext = createContext();

export const useBusinessUnit = () => {
  const context = useContext(BusinessUnitContext);
  if (!context) {
    throw new Error('useBusinessUnit must be used within a BusinessUnitProvider');
  }
  return context;
};

export const BusinessUnitProvider = ({ children }) => {
  const [currentBusinessUnit, setCurrentBusinessUnit] = useState(null);
  const [userBusinessUnits, setUserBusinessUnits] = useState([]);
  const [loading, setLoading] = useState(true);

  // Load BU context from localStorage on mount
  useEffect(() => {
    const savedBU = localStorage.getItem('currentBusinessUnit');
    const savedUserBUs = localStorage.getItem('userBusinessUnits');
    const savedUser = localStorage.getItem('currentUser');
    
    // Only load saved BU data if user is still logged in
    if (savedUser) {
      if (savedBU) {
        try {
          const parsedBU = JSON.parse(savedBU);
          setCurrentBusinessUnit(parsedBU);
          console.log('🏢 Restored current business unit from localStorage:', parsedBU);
        } catch (err) {
          console.error('Error parsing saved business unit:', err);
          localStorage.removeItem('currentBusinessUnit');
        }
      }
      
      if (savedUserBUs) {
        try {
          const parsedBUs = JSON.parse(savedUserBUs);
          setUserBusinessUnits(parsedBUs);
          console.log('🏢 Restored user business units from localStorage:', parsedBUs);
        } catch (err) {
          console.error('Error parsing saved user business units:', err);
          localStorage.removeItem('userBusinessUnits');
        }
      }
    } else {
      // User is not logged in, clear any stale BU data
      console.log('🧹 No user logged in, clearing business unit data');
      localStorage.removeItem('currentBusinessUnit');
      localStorage.removeItem('userBusinessUnits');
      setCurrentBusinessUnit(null);
      setUserBusinessUnits([]);
    }
    
    setLoading(false);
  }, []);

  // Listen for user logout (localStorage changes)
  useEffect(() => {
    const handleStorageChange = (event) => {
      if (event.key === 'currentUser' && event.newValue === null) {
        // User was logged out, clear business unit context
        console.log('🚪 User logged out detected, clearing business unit context');
        setCurrentBusinessUnit(null);
        setUserBusinessUnits([]);
        localStorage.removeItem('currentBusinessUnit');
        localStorage.removeItem('userBusinessUnits');
      }
    };

    // Listen for storage changes (logout from another tab)
    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // Save to localStorage when currentBusinessUnit changes
  useEffect(() => {
    if (currentBusinessUnit) {
      localStorage.setItem('currentBusinessUnit', JSON.stringify(currentBusinessUnit));
      console.log('💾 Saved current business unit to localStorage:', currentBusinessUnit);
    }
  }, [currentBusinessUnit]);

  // Save to localStorage when userBusinessUnits changes
  useEffect(() => {
    if (userBusinessUnits.length > 0) {
      localStorage.setItem('userBusinessUnits', JSON.stringify(userBusinessUnits));
      console.log('💾 Saved user business units to localStorage:', userBusinessUnits.length, 'units');
    }
  }, [userBusinessUnits]);

  const switchBusinessUnit = (businessUnit) => {
    console.log('Switching to business unit:', businessUnit);
    setCurrentBusinessUnit(businessUnit);
    // You can add additional logic here like refreshing data, etc.
  };

  const initializeBusinessUnits = (userBUs, defaultBU = null) => {
    console.log('Initializing business units:', userBUs, 'Default:', defaultBU);
    setUserBusinessUnits(userBUs);
    
    // Set default BU if provided, otherwise use first available
    if (defaultBU && userBUs.find(bu => bu._id === defaultBU._id)) {
      setCurrentBusinessUnit(defaultBU);
      console.log('Set default business unit:', defaultBU);
    } else if (userBUs.length > 0) {
      setCurrentBusinessUnit(userBUs[0]);
      console.log('Set first available business unit:', userBUs[0]);
    } else {
      console.log('No business units available');
    }
    setLoading(false);
  };

  const clearBusinessUnitContext = () => {
    console.log('🧹 Clearing business unit context...');
    setCurrentBusinessUnit(null);
    setUserBusinessUnits([]);
    localStorage.removeItem('currentBusinessUnit');
    localStorage.removeItem('userBusinessUnits');
    console.log('✅ Business unit context cleared');
  };

  const value = {
    currentBusinessUnit,
    userBusinessUnits,
    loading,
    switchBusinessUnit,
    initializeBusinessUnits,
    clearBusinessUnitContext
  };

  return (
    <BusinessUnitContext.Provider value={value}>
      {children}
    </BusinessUnitContext.Provider>
  );
};
