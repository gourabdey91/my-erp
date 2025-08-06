import { apiRequest } from '../../../services/api';

export const expenseTypeAPI = {
  // Get all expense types
  getAll: async () => {
    return await apiRequest('/api/expense-types');
  },

  // Get expense type by ID
  getById: async (id) => {
    return await apiRequest(`/api/expense-types/${id}`);
  },

  // Create new expense type
  create: async (expenseTypeData) => {
    return await apiRequest('/api/expense-types', {
      method: 'POST',
      body: JSON.stringify(expenseTypeData)
    });
  },

  // Update expense type
  update: async (id, expenseTypeData) => {
    return await apiRequest(`/api/expense-types/${id}`, {
      method: 'PUT',
      body: JSON.stringify(expenseTypeData)
    });
  },

  // Delete expense type
  delete: async (id, updatedBy) => {
    return await apiRequest(`/api/expense-types/${id}`, {
      method: 'DELETE',
      body: JSON.stringify({ updatedBy })
    });
  }
};
