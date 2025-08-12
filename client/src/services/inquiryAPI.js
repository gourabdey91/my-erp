import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle response errors
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    console.error('API Error:', error);
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    throw error;
  }
);

// Inquiry API endpoints
export const inquiryAPI = {
  // Get all inquiries with filters and pagination
  getInquiries: (params = {}) => 
    api.get('/inquiries', { params }),

  // Get inquiry by ID
  getInquiry: (id) => 
    api.get(`/inquiries/${id}`),

  // Create new inquiry
  createInquiry: (data) => 
    api.post('/inquiries', data),

  // Update inquiry
  updateInquiry: (id, data) => 
    api.put(`/inquiries/${id}`, data),

  // Delete inquiry (soft delete)
  deleteInquiry: (id, data) => 
    api.delete(`/inquiries/${id}`, { data }),

  // Search inquiries
  searchInquiries: (query) => 
    api.get('/inquiries/search', { params: { q: query } }),

  // Get inquiry statistics
  getStats: () => 
    api.get('/inquiries/stats'),

  // Get cascading dropdown data
  getCascadingData: (type, filters = {}) => 
    api.get(`/inquiries/cascading-data/${type}`, { params: filters }),
};

// Get dropdown data for forms
export const getDropdownData = () => 
  api.get('/inquiries/dropdown-data');

export default inquiryAPI;
