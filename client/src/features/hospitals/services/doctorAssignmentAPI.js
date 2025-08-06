import { apiRequest } from '../../../services/api';

export const doctorAssignmentAPI = {
  // Get all doctor assignments for a hospital
  getDoctorAssignmentsByHospital: async (hospitalId) => {
    const response = await apiRequest(`/api/doctor-assignments/hospital/${hospitalId}`);
    return response;
  },

  // Get doctors, payment types, categories, procedures, and expense types for dropdowns
  getOptions: async (hospitalId, paymentTypeFilter = '', categoryFilter = '') => {
    const params = new URLSearchParams();
    if (paymentTypeFilter) params.append('paymentType', paymentTypeFilter);
    if (categoryFilter) params.append('surgicalCategory', categoryFilter);
    
    const queryString = params.toString();
    const url = `/api/doctor-assignments/options/${hospitalId}${queryString ? `?${queryString}` : ''}`;
    
    const response = await apiRequest(url);
    return response;
  },

  // Create a new doctor assignment
  createDoctorAssignment: async (assignmentData) => {
    const response = await apiRequest('/api/doctor-assignments', {
      method: 'POST',
      body: JSON.stringify(assignmentData)
    });
    return response;
  },

  // Update an existing doctor assignment
  updateDoctorAssignment: async (id, assignmentData) => {
    const response = await apiRequest(`/api/doctor-assignments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(assignmentData)
    });
    return response;
  },

  // Delete a doctor assignment (soft delete)
  deleteDoctorAssignment: async (id, updatedBy) => {
    const response = await apiRequest(`/api/doctor-assignments/${id}`, {
      method: 'DELETE',
      body: JSON.stringify({ updatedBy })
    });
    return response;
  }
};
