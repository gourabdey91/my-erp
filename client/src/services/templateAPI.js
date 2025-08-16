import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for adding auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for handling errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Template API endpoints
export const templateAPI = {
  // Get all templates with filters and pagination
  getTemplates: (params = {}) => 
    api.get('/templates', { params }).then(response => response.data),

  // Get template by ID
  getTemplate: (id) => 
    api.get(`/templates/${id}`).then(response => response.data),

  // Create new template
  createTemplate: (data) => 
    api.post('/templates', data).then(response => response.data),

  // Update template
  updateTemplate: (id, data) => 
    api.put(`/templates/${id}`, data).then(response => response.data),

  // Delete template (soft delete)
  deleteTemplate: (id, updatedBy) => 
    api.delete(`/templates/${id}`, { data: { updatedBy } }).then(response => response.data),

  // Get template dropdown options
  getTemplateDropdownOptions: () =>
    api.get('/templates/dropdown/options').then(response => response.data),

  // Get procedures filtered by category and payment method
  getProceduresByFilters: (filters = {}) =>
    api.get('/procedures', { 
      params: { 
        category: filters.category, 
        paymentMethod: filters.paymentMethod 
      } 
    }).then(response => response.data),

  // Get template statistics
  getTemplateStats: () =>
    api.get('/templates/stats/overview').then(response => response.data)
};

export default templateAPI;
