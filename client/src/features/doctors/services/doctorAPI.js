import { apiRequest } from '../../../services/api';

export const doctorAPI = {
  // Get all doctors for a business unit
  getAll: async (businessUnitId) => {
    return await apiRequest(`/api/doctors?businessUnitId=${businessUnitId}`);
  },

  // Get doctor by ID
  getById: async (id) => {
    return await apiRequest(`/api/doctors/${id}`);
  },

  // Get surgical categories for dropdown
  getCategories: async (businessUnitId) => {
    return await apiRequest(`/api/doctors/categories/${businessUnitId}`);
  },

  // Create new doctor
  create: async (doctorData) => {
    return await apiRequest('/api/doctors', {
      method: 'POST',
      body: JSON.stringify(doctorData)
    });
  },

  // Update doctor
  update: async (id, doctorData) => {
    return await apiRequest(`/api/doctors/${id}`, {
      method: 'PUT',
      body: JSON.stringify(doctorData)
    });
  },

  // Delete doctor
  delete: async (id, updatedBy) => {
    return await apiRequest(`/api/doctors/${id}`, {
      method: 'DELETE',
      body: JSON.stringify({ updatedBy })
    });
  }
};
