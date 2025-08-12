// API configuration and base URL
// Force production URL - check multiple conditions to ensure we use backend URL
const isProduction = process.env.NODE_ENV === 'production' || 
                    window.location.hostname === 'my-erp.onrender.com' ||
                    window.location.hostname !== 'localhost';

const API_BASE_URL = isProduction
  ? 'https://myerp-backend.onrender.com' // Backend URL for production
  : 'http://localhost:5000'; // Local development

console.log('API Configuration:', {
  hostname: window.location.hostname,
  NODE_ENV: process.env.NODE_ENV,
  isProduction,
  API_BASE_URL
});

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
    
    // Check if response is actually JSON
    const contentType = response.headers.get('content-type');
    const isJsonResponse = contentType && contentType.includes('application/json');
    
    let data;
    if (isJsonResponse) {
      data = await response.json();
    } else {
      // If not JSON, get the text to show in error
      const text = await response.text();
      data = { message: `Server returned non-JSON response: ${response.status} ${response.statusText}` };
    }
    
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