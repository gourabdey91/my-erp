import { apiRequest } from '../../../services/api';

export const inquiryAPI = {
  // Get all inquiries with pagination and filters
  getInquiries: async (page = 1, limit = 20, filters = {}) => {
    const queryParams = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...Object.fromEntries(
        Object.entries(filters).filter(([_, value]) => value !== '' && value != null)
      )
    });

    const response = await apiRequest(`/api/inquiries?${queryParams}`);
    return response;
  },

  // Get inquiry by ID
  getInquiryById: async (id) => {
    const response = await apiRequest(`/api/inquiries/${id}`);
    return response;
  },

  // Create new inquiry
  createInquiry: async (inquiryData) => {
    const response = await apiRequest('/api/inquiries', {
      method: 'POST',
      body: JSON.stringify(inquiryData)
    });
    return response;
  },

  // Update inquiry
  updateInquiry: async (id, inquiryData) => {
    const response = await apiRequest(`/api/inquiries/${id}`, {
      method: 'PUT',
      body: JSON.stringify(inquiryData)
    });
    return response;
  },

  // Delete inquiry
  deleteInquiry: async (id, updatedBy) => {
    const response = await apiRequest(`/api/inquiries/${id}`, {
      method: 'DELETE',
      body: JSON.stringify({ updatedBy })
    });
    return response;
  },

  // Get inquiry statistics
  getInquiryStats: async () => {
    const response = await apiRequest('/api/inquiries/stats');
    return response;
  },

  // Get dropdown data for forms
  getDropdownData: async () => {
    const response = await apiRequest('/api/inquiries/dropdown-data');
    return response;
  },

  // Search inquiries
  searchInquiries: async (searchTerm) => {
    const response = await apiRequest(`/api/inquiries/search?q=${encodeURIComponent(searchTerm)}`);
    return response;
  }
};

export default inquiryAPI;
