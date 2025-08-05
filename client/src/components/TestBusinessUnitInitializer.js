import React, { useEffect } from 'react';
import { useBusinessUnit } from '../contexts/BusinessUnitContext';
import { userAuthAPI } from '../services/userAuthAPI';

const TestBusinessUnitInitializer = () => {
  const { initializeBusinessUnits, currentBusinessUnit } = useBusinessUnit();

  useEffect(() => {
    const loadUserBusinessUnits = async () => {
      try {
        // Get current user data (with business units populated)
        const currentUser = await userAuthAPI.getCurrentUser();
        
        if (currentUser && currentUser.businessUnits) {
          const userBusinessUnits = currentUser.businessUnits;
          const defaultBU = currentUser.defaultBusinessUnit;
          
          // Initialize with real user data
          initializeBusinessUnits(userBusinessUnits, defaultBU);
        } else {
          console.log('No user business units found');
        }
      } catch (error) {
        console.error('Error loading user business units:', error);
        // Fallback to empty state
        initializeBusinessUnits([], null);
      }
    };

    loadUserBusinessUnits();
  }, [initializeBusinessUnits]);

  return null; // This component doesn't render anything
};

export default TestBusinessUnitInitializer;
