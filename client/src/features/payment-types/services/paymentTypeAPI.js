import { apiRequest } from '../../../services/api';

export const paymentTypeAPI = {
  // Get all payment types for a business unit
  getAll: async (businessUnitId) => {
    return await apiRequest(`/api/payment-types?businessUnitId=${businessUnitId}`);
  },

  // Get payment type by ID
  getById: async (id) => {
    return await apiRequest(`/api/payment-types/${id}`);
  },

  // Create new payment type
  create: async (paymentTypeData) => {
    return await apiRequest('/api/payment-types', {
      method: 'POST',
      body: JSON.stringify(paymentTypeData)
    });
  },

  // Update payment type
  update: async (id, paymentTypeData) => {
    return await apiRequest(`/api/payment-types/${id}`, {
      method: 'PUT',
      body: JSON.stringify(paymentTypeData)
    });
  },

  // Delete payment type
  delete: async (id, updatedBy) => {
    return await apiRequest(`/api/payment-types/${id}`, {
      method: 'DELETE',
      body: JSON.stringify({ updatedBy })
    });
  }
};
