import { apiRequest } from '../../../services/api';

export const doctorAPI = {
  // Get all doctors
  getAll: async () => {
    return await apiRequest('/api/doctors');
  },

  // Get doctor by ID
  getById: async (id) => {
    return await apiRequest(`/api/doctors/${id}`);
  },

  // Get surgical categories for dropdown
  getCategories: async () => {
    return await apiRequest('/api/doctors/categories');
  },

  // Get hospitals for filtering
  getHospitals: async () => {
    return await apiRequest('/api/doctors/hospitals');
  },

  // Get doctors by hospital filter
  getByHospital: async (hospitalId = 'all') => {
    if (hospitalId === 'all' || !hospitalId) {
      return await apiRequest('/api/doctors/by-hospital');
    }
    return await apiRequest(`/api/doctors/by-hospital/${hospitalId}`);
  },

  // Get doctors for dropdown (consulting doctor selection)
  getDropdownDoctors: async () => {
    return await apiRequest('/api/doctors/dropdown');
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
