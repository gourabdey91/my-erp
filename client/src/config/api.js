/**
 * API Configuration for MyERP
 * Supports Development, Railway, and AWS Serverless deployments
 */

const API_CONFIG = {
  development: {
    BASE_URL: 'http://localhost:5000',
    API_URL: 'http://localhost:5000/api',
    ENVIRONMENT: 'development'
  },
  railway: {
    BASE_URL: 'https://my-erp-production.up.railway.app',
    API_URL: 'https://my-erp-production.up.railway.app/api',
    ENVIRONMENT: 'railway'
  },
  aws: {
    // TODO: Update this URL after AWS deployment
    BASE_URL: 'https://your-api-id.execute-api.ap-south-1.amazonaws.com/prod',
    API_URL: 'https://your-api-id.execute-api.ap-south-1.amazonaws.com/prod/api',
    ENVIRONMENT: 'aws'
  },
  production: {
    // Use Railway as default production environment
    BASE_URL: process.env.REACT_APP_API_URL || 'https://my-erp-production.up.railway.app',
    API_URL: process.env.REACT_APP_API_URL ? `${process.env.REACT_APP_API_URL}/api` : 'https://my-erp-production.up.railway.app/api',
    ENVIRONMENT: 'production'
  }
};

// Determine environment
const getEnvironment = () => {
  // Check for explicit environment variable
  if (process.env.REACT_APP_DEPLOYMENT_ENV) {
    return process.env.REACT_APP_DEPLOYMENT_ENV;
  }
  
  // Auto-detect based on NODE_ENV and hostname
  const nodeEnv = process.env.NODE_ENV || 'development';
  
  if (nodeEnv === 'development') {
    return 'development';
  }
  
  // Check hostname to determine production environment
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'development';
    }
    
    if (hostname.includes('railway.app')) {
      return 'railway';
    }
    
    if (hostname.includes('amazonaws.com') || hostname.includes('cloudfront.net')) {
      return 'aws';
    }
  }
  
  // Default to AWS for production
  return 'aws';
};

const ENV = getEnvironment();
const currentConfig = API_CONFIG[ENV] || API_CONFIG.development;

export const API_BASE_URL = currentConfig.BASE_URL;
export const API_URL = currentConfig.API_URL;
export const ENVIRONMENT = currentConfig.ENVIRONMENT;

// API Endpoints
export const API_ENDPOINTS = {
  // Authentication
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    VERIFY_TOKEN: '/auth/verify',
    REFRESH: '/auth/refresh'
  },
  
  // Users
  USERS: {
    BASE: '/users',
    PROFILE: '/users/profile',
    UPDATE_PROFILE: '/users/profile',
    CHANGE_PASSWORD: '/users/change-password'
  },
  
  // Business Units
  BUSINESS_UNITS: {
    BASE: '/business-units',
    BY_ID: (id) => `/business-units/${id}`
  },
  
  // Material Master
  MATERIAL_MASTER: {
    BASE: '/material-master',
    BY_ID: (id) => `/material-master/${id}`,
    UPLOAD: '/material-master/upload'
  },
  
  // Dashboard
  DASHBOARD: {
    STATS: '/dashboard/stats',
    CHARTS: '/dashboard/charts',
    RECENT: '/dashboard/recent'
  },
  
  // Categories
  CATEGORIES: {
    BASE: '/categories',
    BY_ID: (id) => `/categories/${id}`
  },
  
  // Payment Types
  PAYMENT_TYPES: {
    BASE: '/payment-types',
    BY_ID: (id) => `/payment-types/${id}`
  },
  
  // Doctors
  DOCTORS: {
    BASE: '/doctors',
    BY_ID: (id) => `/doctors/${id}`,
    SEARCH: '/doctors/search'
  },
  
  // Hospitals
  HOSPITALS: {
    BASE: '/hospitals',
    BY_ID: (id) => `/hospitals/${id}`,
    SEARCH: '/hospitals/search'
  },
  
  // Expense Types
  EXPENSE_TYPES: {
    BASE: '/expense-types',
    BY_ID: (id) => `/expense-types/${id}`
  },
  
  // Sales Orders
  SALES_ORDERS: {
    BASE: '/sales-orders',
    BY_ID: (id) => `/sales-orders/${id}`,
    STATS: '/sales-orders/stats'
  },
  
  // Health Check
  HEALTH: {
    CHECK: '/health',
    STATUS: '/health/status'
  }
};

// Helper function to get the correct API URL
export const getApiUrl = (endpoint) => {
  return `${API_URL}${endpoint}`;
};

// Build full URL for API calls
export const buildApiUrl = (endpoint) => {
  return `${API_URL}${endpoint}`;
};

// Helper function to get auth headers
export const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// Request configuration
export const REQUEST_CONFIG = {
  TIMEOUT: 10000, // 10 seconds
  HEADERS: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
};

export default currentConfig;
