import { apiRequest } from '../../../services/api';

export const procedureAPI = {
  // Get all procedures for a business unit
  getAll: async (businessUnitId) => {
    return await apiRequest(`/api/procedures?businessUnitId=${businessUnitId}`);
  },

  // Get procedure by ID
  getById: async (id) => {
    return await apiRequest(`/api/procedures/${id}`);
  },

  // Create new procedure
  create: async (procedureData) => {
    return await apiRequest('/api/procedures', {
      method: 'POST',
      body: JSON.stringify(procedureData)
    });
  },

  // Update procedure
  update: async (id, procedureData) => {
    return await apiRequest(`/api/procedures/${id}`, {
      method: 'PUT',
      body: JSON.stringify(procedureData)
    });
  },

  // Delete procedure
  delete: async (id, updatedBy) => {
    return await apiRequest(`/api/procedures/${id}`, {
      method: 'DELETE',
      body: JSON.stringify({ updatedBy })
    });
  }
};
