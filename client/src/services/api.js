import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// User API functions
export const userAPI = {
  // Get all users
  getUsers: () => api.get('/users'),

  // Get user by ID
  getUser: (id) => api.get(`/users/${id}`),

  // Create new user
  createUser: (userData) => api.post('/users', userData),

  // Update user
  updateUser: (id, userData) => api.put(`/users/${id}`, userData),

  // Delete user
  deleteUser: (id) => api.delete(`/users/${id}`),

  // Update user status
  updateUserStatus: (id, status) => api.patch(`/users/${id}/status`, { status }),
};

export default api;
