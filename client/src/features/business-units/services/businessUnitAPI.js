import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const api = axios.create({
  baseURL: API_URL,
});

export const businessUnitAPI = {
  // Get all business units
  getAll: async () => {
    try {
      const response = await api.get('/api/business-units');
      return response.data.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch business units');
    }
  },

  // Get business unit by ID
  getById: async (id) => {
    try {
      const response = await api.get(`/api/business-units/${id}`);
      return response.data.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch business unit');
    }
  },

  // Create new business unit
  create: async (businessUnitData) => {
    try {
      const response = await api.post('/api/business-units', businessUnitData);
      return response.data.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to create business unit');
    }
  },

  // Update business unit
  update: async (id, businessUnitData) => {
    try {
      const response = await api.put(`/api/business-units/${id}`, businessUnitData);
      return response.data.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to update business unit');
    }
  },

  // Delete (deactivate) business unit
  delete: async (id) => {
    try {
      const response = await api.delete(`/api/business-units/${id}`);
      return response.data.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to deactivate business unit');
    }
  }
};
