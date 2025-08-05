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
    
    if (savedBU) {
      try {
        setCurrentBusinessUnit(JSON.parse(savedBU));
      } catch (err) {
        console.error('Error parsing saved business unit:', err);
      }
    }
    
    if (savedUserBUs) {
      try {
        setUserBusinessUnits(JSON.parse(savedUserBUs));
      } catch (err) {
        console.error('Error parsing saved user business units:', err);
      }
    }
    
    setLoading(false);
  }, []);

  // Save to localStorage when currentBusinessUnit changes
  useEffect(() => {
    if (currentBusinessUnit) {
      localStorage.setItem('currentBusinessUnit', JSON.stringify(currentBusinessUnit));
    }
  }, [currentBusinessUnit]);

  // Save to localStorage when userBusinessUnits changes
  useEffect(() => {
    if (userBusinessUnits.length > 0) {
      localStorage.setItem('userBusinessUnits', JSON.stringify(userBusinessUnits));
    }
  }, [userBusinessUnits]);

  const switchBusinessUnit = (businessUnit) => {
    console.log('Switching to business unit:', businessUnit);
    setCurrentBusinessUnit(businessUnit);
    // You can add additional logic here like refreshing data, etc.
  };

  const initializeBusinessUnits = (userBUs, defaultBU = null) => {
    setUserBusinessUnits(userBUs);
    
    // Set default BU if provided, otherwise use first available
    if (defaultBU && userBUs.find(bu => bu._id === defaultBU._id)) {
      setCurrentBusinessUnit(defaultBU);
    } else if (userBUs.length > 0) {
      setCurrentBusinessUnit(userBUs[0]);
    }
  };

  const clearBusinessUnitContext = () => {
    setCurrentBusinessUnit(null);
    setUserBusinessUnits([]);
    localStorage.removeItem('currentBusinessUnit');
    localStorage.removeItem('userBusinessUnits');
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
