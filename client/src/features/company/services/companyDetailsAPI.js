import { apiRequest } from '../../../services/api';

export const companyDetailsAPI = {
  // Get company details
  get: async () => {
    return await apiRequest('/api/company-details');
  },

  // Create or update company details
  save: async (companyData) => {
    return await apiRequest('/api/company-details', {
      method: 'POST',
      body: JSON.stringify(companyData)
    });
  },

  // Update company details
  update: async (id, companyData) => {
    return await apiRequest(`/api/company-details/${id}`, {
      method: 'PUT',
      body: JSON.stringify(companyData)
    });
  }
};
