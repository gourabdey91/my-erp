import { apiRequest } from '../../../services/api';

export const companyDetailsAPI = {
  // Get all companies
  getAll: async () => {
    return await apiRequest('/api/company-details');
  },

  // Get company by company code
  getByCode: async (companyCode) => {
    return await apiRequest(`/api/company-details/code/${companyCode}`);
  },

  // Get single company (deprecated - use getAll or getByCode)
  get: async () => {
    return await apiRequest('/api/company-details');
  },

  // Create new company
  save: async (companyData) => {
    return await apiRequest('/api/company-details', {
      method: 'POST',
      body: JSON.stringify(companyData)
    });
  },

  // Update company
  update: async (id, companyData) => {
    return await apiRequest(`/api/company-details/${id}`, {
      method: 'PUT',
      body: JSON.stringify(companyData)
    });
  },

  // Delete/deactivate company
  delete: async (id, updatedBy) => {
    return await apiRequest(`/api/company-details/${id}`, {
      method: 'DELETE',
      body: JSON.stringify({ updatedBy })
    });
  }
};
