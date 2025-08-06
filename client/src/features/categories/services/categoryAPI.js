import { apiRequest } from '../../../services/api';

export const categoryAPI = {
  // Get all categories
  getAll: async () => {
    return await apiRequest('/api/categories');
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
