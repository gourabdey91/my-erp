import { apiRequest } from '../../../services/api';

export const implantTypesAPI = {
  // Get all implant types
  getAll: async () => {
    try {
      const response = await apiRequest('/api/implant-types');
      return response;
    } catch (error) {
      console.error('Error fetching implant types:', error);
      throw error;
    }
  },

  // Get categories for dropdown
  getCategories: async () => {
    try {
      const response = await apiRequest('/api/implant-types/categories');
      return response;
    } catch (error) {
      console.error('Error fetching categories:', error);
      throw error;
    }
  },

  // Create new implant type
  create: async (implantTypeData) => {
    try {
      const response = await apiRequest('/api/implant-types', {
        method: 'POST',
        body: JSON.stringify(implantTypeData)
      });
      return response;
    } catch (error) {
      console.error('Error creating implant type:', error);
      throw error;
    }
  },

  // Update implant type
  update: async (id, implantTypeData) => {
    try {
      const response = await apiRequest(`/api/implant-types/${id}`, {
        method: 'PUT',
        body: JSON.stringify(implantTypeData)
      });
      return response;
    } catch (error) {
      console.error('Error updating implant type:', error);
      throw error;
    }
  },

  // Delete implant type
  delete: async (id) => {
    try {
      const response = await apiRequest(`/api/implant-types/${id}`, {
        method: 'DELETE'
      });
      return response;
    } catch (error) {
      console.error('Error deleting implant type:', error);
      throw error;
    }
  }
};
