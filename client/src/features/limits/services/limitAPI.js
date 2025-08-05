import { apiRequest } from '../../../services/api';

export const limitAPI = {
  // Get all limits for a business unit
  getAll: async (businessUnitId) => {
    return await apiRequest(`/api/limits?businessUnitId=${businessUnitId}`);
  },

  // Get limit by ID
  getById: async (id) => {
    return await apiRequest(`/api/limits/${id}`);
  },

  // Create new limit
  create: async (limitData) => {
    return await apiRequest('/api/limits', {
      method: 'POST',
      body: JSON.stringify(limitData)
    });
  },

  // Update limit
  update: async (id, limitData) => {
    return await apiRequest(`/api/limits/${id}`, {
      method: 'PUT',
      body: JSON.stringify(limitData)
    });
  },

  // Delete limit
  delete: async (id, updatedBy) => {
    return await apiRequest(`/api/limits/${id}`, {
      method: 'DELETE',
      body: JSON.stringify({ updatedBy })
    });
  }
};
