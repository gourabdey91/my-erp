// API configuration and base URL
const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://your-backend-url.com' // Update this with your production backend URL
  : 'http://localhost:5000';

// Common API request function
export const apiRequest = async (endpoint, options = {}) => {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const defaultOptions = {
    headers: {
      'Content-Type': 'application/json',
    },
  };

  // Don't set Content-Type for FormData - let browser handle it
  const isFormData = options.body instanceof FormData;
  
  const config = {
    ...defaultOptions,
    ...options,
    headers: {
      ...(isFormData ? {} : defaultOptions.headers),
      ...options.headers,
    },
  };

  try {
    const response = await fetch(url, config);
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || `HTTP error! status: ${response.status}`);
    }
    
    return data;
  } catch (error) {
    console.error('API request failed:', error);
    throw error;
  }
};

export default apiRequest;