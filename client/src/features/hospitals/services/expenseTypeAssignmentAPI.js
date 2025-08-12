import { apiRequest } from '../../../services/api';

export const expenseTypeAssignmentAPI = {
  getAssignmentsByHospital: async (hospitalId) => {
    return await apiRequest(`/api/expense-type-assignments/hospital/${hospitalId}`);
  },
  getOptions: async (hospitalId, paymentTypeFilter = '', categoryFilter = '') => {
    const params = new URLSearchParams();
    if (paymentTypeFilter) params.append('paymentType', paymentTypeFilter);
    if (categoryFilter) params.append('category', categoryFilter);
    
    const queryString = params.toString();
    const url = `/api/expense-type-assignments/options/${hospitalId}${queryString ? `?${queryString}` : ''}`;
    
    return await apiRequest(url);
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
