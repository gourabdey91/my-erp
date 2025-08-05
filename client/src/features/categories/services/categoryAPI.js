import { apiRequest } from '../../../services/api';

export const categoryAPI = {
  // Get all categories for a business unit
  getAll: async (businessUnitId) => {
    return await apiRequest(`/api/categories?businessUnitId=${businessUnitId}`);
  },

  // Get category by ID
  getById: async (id) => {
    return await apiRequest(`/api/categories/${id}`);
  },

  // Create new category
  create: async (categoryData) => {
    return await apiRequest('/api/categories', {
      method: 'POST',
      body: JSON.stringify(categoryData)
    });
  },

  // Update category
  update: async (id, categoryData) => {
    return await apiRequest(`/api/categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(categoryData)
    });
  },

  // Delete category
  delete: async (id, updatedBy) => {
    return await apiRequest(`/api/categories/${id}`, {
      method: 'DELETE',
      body: JSON.stringify({ updatedBy })
    });
  }
};
