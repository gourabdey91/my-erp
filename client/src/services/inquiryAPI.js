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

// Inquiry API endpoints
export const inquiryAPI = {
  // Get all inquiries with filters and pagination
  getInquiries: (params = {}) => 
    api.get('/inquiries', { params }).then(response => response.data),

  // Get inquiry by ID
  getInquiry: (id) => 
    api.get(`/inquiries/${id}`).then(response => response.data),

  // Create new inquiry
  createInquiry: (data) => 
    api.post('/inquiries', data).then(response => response.data),

  // Update inquiry
  updateInquiry: (id, data) => 
    api.put(`/inquiries/${id}`, data).then(response => response.data),

  // Delete inquiry (soft delete)
  deleteInquiry: (id) => 
    api.delete(`/inquiries/${id}`).then(response => response.data),

  // Get surgical categories by hospital
  getSurgicalCategoriesByHospital: (hospitalId) =>
    api.get(`/inquiries/hospital/${hospitalId}/surgical-categories`).then(response => response.data),

  // Get inquiry statistics
  getInquiryStats: () =>
    api.get('/inquiries/stats/overview').then(response => response.data)
};

export default inquiryAPI;
