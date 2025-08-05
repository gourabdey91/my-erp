import api from '../../../shared/services/api';

export const businessUnitAPI = {
  // Get all business units
  getAll: async () => {
    try {
      const response = await api.get('/business-units');
      return response.data.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch business units');
    }
  },

  // Get business unit by ID
  getById: async (id) => {
    try {
      const response = await api.get(`/business-units/${id}`);
      return response.data.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch business unit');
    }
  },

  // Create new business unit
  create: async (businessUnitData) => {
    try {
      const response = await api.post('/business-units', businessUnitData);
      return response.data.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to create business unit');
    }
  },

  // Update business unit
  update: async (id, businessUnitData) => {
    try {
      const response = await api.put(`/business-units/${id}`, businessUnitData);
      return response.data.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to update business unit');
    }
  },

  // Delete (deactivate) business unit
  delete: async (id) => {
    try {
      const response = await api.delete(`/business-units/${id}`);
      return response.data.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to deactivate business unit');
    }
  }
};
