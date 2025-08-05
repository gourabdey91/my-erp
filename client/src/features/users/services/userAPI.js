import api from '../../../shared/services/api';

// User-specific API functions
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

export default userAPI;
