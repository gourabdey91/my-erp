import { useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useBusinessUnit } from '../contexts/BusinessUnitContext';

const TestBusinessUnitInitializer = () => {
  const { currentUser } = useAuth();
  const { initializeBusinessUnits, userBusinessUnits } = useBusinessUnit();

  useEffect(() => {
    if (currentUser && userBusinessUnits.length === 0) {
      const loadUserBusinessUnits = async () => {
        try {
          console.log('🏢 Loading business units for user:', currentUser.email);
          
          // Use business units from the login response (should be populated)
          if (currentUser.businessUnits && currentUser.businessUnits.length > 0) {
            console.log('✅ Using business units from user object:', currentUser.businessUnits);
            console.log('📋 Default business unit:', currentUser.defaultBusinessUnit);
            
            // Initialize with the user's business units
            initializeBusinessUnits(currentUser.businessUnits, currentUser.defaultBusinessUnit);
            return;
          }
          
          console.log('⚠️ No business units found in user object, user might need business units assigned');
          initializeBusinessUnits([], null);
          
        } catch (error) {
          console.error('❌ Error loading user business units:', error);
          initializeBusinessUnits([], null);
        }
      };

      loadUserBusinessUnits();
    }
  }, [currentUser, initializeBusinessUnits, userBusinessUnits.length]);

  return null; // This component doesn't render anything
};

export default TestBusinessUnitInitializer;
