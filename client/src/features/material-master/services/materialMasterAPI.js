import { apiRequest } from '../../../services/api';

export const materialMasterAPI = {
  // Get all materials with pagination and filtering
  getAll: async (params = {}) => {
    try {
      const queryParams = new URLSearchParams();
      Object.keys(params).forEach(key => {
        if (params[key] !== undefined && params[key] !== '') {
          queryParams.append(key, params[key]);
        }
      });
      
      const queryString = queryParams.toString();
      const url = `/api/material-master${queryString ? `?${queryString}` : ''}`;
      
      const response = await apiRequest(url);
      return response;
    } catch (error) {
      console.error('Error fetching materials:', error);
      throw error;
    }
  },

  // Get dropdown data for filters
  getDropdownData: async () => {
    try {
      const response = await apiRequest('/api/material-master/dropdown-data');
      return response;
    } catch (error) {
      console.error('Error fetching dropdown data:', error);
      throw error;
    }
  },

  // Get subcategories by implant type
  getSubcategories: async (implantTypeId) => {
    try {
      const response = await apiRequest(`/api/material-master/subcategories/${implantTypeId}`);
      return response;
    } catch (error) {
      console.error('Error fetching subcategories:', error);
      throw error;
    }
  },

  // Create new material
  create: async (materialData) => {
    try {
      const response = await apiRequest('/api/material-master', {
        method: 'POST',
        body: JSON.stringify(materialData)
      });
      return response;
    } catch (error) {
      console.error('Error creating material:', error);
      throw error;
    }
  },

  // Update material
  update: async (id, materialData) => {
    try {
      const response = await apiRequest(`/api/material-master/${id}`, {
        method: 'PUT',
        body: JSON.stringify(materialData)
      });
      return response;
    } catch (error) {
      console.error('Error updating material:', error);
      throw error;
    }
  },

  // Delete material
  delete: async (id) => {
    try {
      const response = await apiRequest(`/api/material-master/${id}`, {
        method: 'DELETE'
      });
      return response;
    } catch (error) {
      console.error('Error deleting material:', error);
      throw error;
    }
  }
};
