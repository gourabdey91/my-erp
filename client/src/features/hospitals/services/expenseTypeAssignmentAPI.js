import { apiRequest } from '../../../services/api';

export const expenseTypeAssignmentAPI = {
  getAssignmentsByHospital: async (hospitalId) => {
    return await apiRequest(`/api/expense-type-assignments/hospital/${hospitalId}`);
  },
  getOptions: async (hospitalId) => {
    return await apiRequest(`/api/expense-type-assignments/options/${hospitalId}`);
  },
  createAssignment: async (payload) => {
    return await apiRequest('/api/expense-type-assignments', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },
  updateAssignment: async (id, payload) => {
    return await apiRequest(`/api/expense-type-assignments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
  },
  deleteAssignment: async (id, updatedBy) => {
    return await apiRequest(`/api/expense-type-assignments/${id}`, {
      method: 'DELETE',
      body: JSON.stringify({ updatedBy })
    });
  }
};
