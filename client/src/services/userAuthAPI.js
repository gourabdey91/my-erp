import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const api = axios.create({
  baseURL: API_URL,
});

export const userAuthAPI = {
  // Get current user profile (in real app this would be authenticated)
  getCurrentUser: async () => {
    try {
      // For now, get the first user as a mock current user
      // In a real app, this would be based on authentication token
      const response = await api.get('/api/users');
      const users = response.data.data;
      if (users && users.length > 0) {
        // Return the first user with business units populated
        return users[0];
      }
      return null;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to get current user');
    }
  },

  // Get user business units
  getUserBusinessUnits: async (userId) => {
    try {
      const response = await api.get(`/api/users/${userId}`);
      const user = response.data.data;
      return {
        businessUnits: user.businessUnits || [],
        defaultBusinessUnit: user.defaultBusinessUnit || null
      };
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to get user business units');
    }
  }
};
