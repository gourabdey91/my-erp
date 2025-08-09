// Production API Configuration
const API_CONFIG = {
  development: {
    BASE_URL: 'http://localhost:5000',
    API_URL: 'http://localhost:5000/api'
  },
  production: {
    BASE_URL: process.env.REACT_APP_API_URL || 'https://your-backend-domain.railway.app',
    API_URL: process.env.REACT_APP_API_URL ? `${process.env.REACT_APP_API_URL}/api` : 'https://your-backend-domain.railway.app/api'
  }
};

const ENV = process.env.NODE_ENV || 'development';

export const API_BASE_URL = API_CONFIG[ENV].BASE_URL;
export const API_URL = API_CONFIG[ENV].API_URL;

export default API_CONFIG[ENV];
