import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  // Load current user from localStorage on mount
  useEffect(() => {
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
      try {
        const user = JSON.parse(savedUser);
        setCurrentUser(user);
        setIsAuthenticated(true);
      } catch (err) {
        console.error('Error parsing saved user:', err);
        localStorage.removeItem('currentUser');
      }
    }
    setLoading(false);
  }, []);

  // Save to localStorage when currentUser changes
  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('currentUser', JSON.stringify(currentUser));
    }
  }, [currentUser]);

  const login = async (user) => {
    setCurrentUser(user);
    setIsAuthenticated(true);
    localStorage.setItem('currentUser', JSON.stringify(user));
  };

  const refreshUser = async () => {
    if (currentUser && currentUser.email) {
      try {
        console.log('🔄 Refreshing user data from server...');
        const response = await fetch('/api/auth/refresh', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email: currentUser.email }),
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.user) {
            console.log('✅ User data refreshed successfully');
            setCurrentUser(data.user);
            localStorage.setItem('currentUser', JSON.stringify(data.user));
            return data.user;
          }
        }
        console.log('⚠️ Failed to refresh user data');
      } catch (error) {
        console.error('❌ Error refreshing user data:', error);
      }
    }
    return null;
  };

  const logout = () => {
    console.log('🚪 Logging out user...');
    
    // Clear auth state
    setCurrentUser(null);
    setIsAuthenticated(false);
    
    // Clear all localStorage items related to user session
    localStorage.removeItem('currentUser');
    localStorage.removeItem('currentBusinessUnit');
    localStorage.removeItem('userBusinessUnits');
    
    console.log('✅ Logout complete - all context cleared');
  };

  const value = {
    currentUser,
    isAuthenticated,
    loading,
    login,
    logout,
    refreshUser
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
