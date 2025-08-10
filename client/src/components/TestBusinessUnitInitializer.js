import { useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useBusinessUnit } from '../contexts/BusinessUnitContext';

const TestBusinessUnitInitializer = () => {
  const { currentUser, refreshUser } = useAuth();
  const { initializeBusinessUnits } = useBusinessUnit();
  const refreshAttempted = useRef(false);

  useEffect(() => {
    if (currentUser) {
      const loadUserBusinessUnits = async () => {
        try {
          console.log('🏢 Loading business units for user:', currentUser.email);
          console.log('🔍 Current user object:', currentUser);
          
          // Always refresh business units if user has them in the login response
          if (currentUser.businessUnits && currentUser.businessUnits.length > 0) {
            console.log('✅ Using business units from user object:', currentUser.businessUnits);
            console.log('📋 Default business unit:', currentUser.defaultBusinessUnit);
            
            // Initialize with the user's business units
            initializeBusinessUnits(currentUser.businessUnits, currentUser.defaultBusinessUnit);
            refreshAttempted.current = false; // Reset flag for future logins
            return;
          }
          
          // Only attempt refresh once to avoid infinite loops
          if (!refreshAttempted.current) {
            console.log('⚠️ No business units found in user object, attempting to refresh user data...');
            console.log('🔄 User might need updated business unit assignments');
            refreshAttempted.current = true; // Prevent further refresh attempts
            
            // Try to refresh user data from server
            const refreshedUser = await refreshUser();
            if (refreshedUser && refreshedUser.businessUnits && refreshedUser.businessUnits.length > 0) {
              console.log('✅ User data refreshed with business units:', refreshedUser.businessUnits);
              initializeBusinessUnits(refreshedUser.businessUnits, refreshedUser.defaultBusinessUnit);
              return;
            }
          }
          
          console.log('⚠️ No business units available - user needs business units assigned');
          initializeBusinessUnits([], null);
          
        } catch (error) {
          console.error('❌ Error loading user business units:', error);
          initializeBusinessUnits([], null);
        }
      };

      loadUserBusinessUnits();
    } else {
      // Reset flag when user logs out
      refreshAttempted.current = false;
    }
  }, [currentUser, initializeBusinessUnits]); // Removed refreshUser from dependency array

  return null; // This component doesn't render anything
};

export default TestBusinessUnitInitializer;
