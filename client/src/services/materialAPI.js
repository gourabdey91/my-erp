import { API_BASE_URL } from '../config/api';

const api = {
  get: async (url) => {
    // Ensure URL starts with /api if not already present
    const apiUrl = url.startsWith('/api/') ? url : `/api${url}`;
    
    const response = await fetch(`${API_BASE_URL}${apiUrl}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  }
};

export const materialAPI = {
  // Get assigned materials for inquiry selection with filtering
  getAssignedMaterialsForInquiry: async (hospitalId, filters = {}) => {
    try {
      const queryParams = new URLSearchParams();
      
      // Add filters to query parameters
      Object.keys(filters).forEach(key => {
        if (filters[key] !== undefined && filters[key] !== null && filters[key] !== '') {
          queryParams.append(key, filters[key]);
        }
      });
      
      const queryString = queryParams.toString();
      const url = `/hospitals/${hospitalId}/assigned-materials-for-inquiry${queryString ? `?${queryString}` : ''}`;
      
      const response = await api.get(url);
      
      // Ensure consistent response format
      if (response && typeof response === 'object' && response.success !== undefined) {
        return response;
      } else {
        // If backend doesn't return expected format, wrap it
        return {
          success: true,
          data: Array.isArray(response) ? response : (response ? [response] : [])
        };
      }
    } catch (error) {
      console.error('Error fetching assigned materials for inquiry:', error);
      return {
        success: false,
        error: error.message,
        data: []
      };
    }
  },

  // Get implant types available for a specific hospital and surgical category
  getAvailableImplantTypesForInquiry: async (hospitalId, surgicalCategoryId) => {
    try {
      console.log('🔧 Getting implant types for hospital:', hospitalId, 'category:', surgicalCategoryId);
      
      if (!hospitalId || !surgicalCategoryId) {
        console.warn('⚠️ Missing required parameters:', { hospitalId, surgicalCategoryId });
        return { success: false, error: 'Hospital ID and Surgical Category ID are required', data: [] };
      }
      
      // First test if server is reachable
      try {
        const testResponse = await fetch(`${API_BASE_URL}/api/health`);
        console.log('🏥 Server health check status:', testResponse.status);
      } catch (testError) {
        console.error('❌ Server unreachable:', testError.message);
        return { 
          success: false, 
          error: `Server is not reachable. Please ensure the backend server is running on ${API_BASE_URL}`, 
          data: [] 
        };
      }
      
      // Get all materials for this hospital and surgical category
      const response = await materialAPI.getAssignedMaterialsForInquiry(hospitalId, { 
        surgicalCategory: surgicalCategoryId 
      });
      
      console.log('📦 Materials response:', response);
      
      if (!response.success || !response.data) {
        console.warn('⚠️ No materials found or invalid response:', response);
        return { success: true, data: [] };
      }

      // Extract unique implant types from the materials
      const implantTypeMap = new Map();
      let materialsWithImplantTypes = 0;
      
      response.data.forEach((material, index) => {
        if (material.implantType && material.implantType._id) {
          materialsWithImplantTypes++;
          implantTypeMap.set(material.implantType._id, {
            _id: material.implantType._id,
            name: material.implantType.name
          });
        } else {
          console.log(`📋 Material ${index + 1} has no implant type:`, material.materialNumber || 'Unknown');
        }
      });

      const availableImplantTypes = Array.from(implantTypeMap.values());
      console.log(`🎯 Extracted ${availableImplantTypes.length} implant types from ${materialsWithImplantTypes}/${response.data.length} materials`);
      console.log('🏷️ Implant types found:', availableImplantTypes);

      return {
        success: true,
        data: availableImplantTypes,
        metadata: {
          totalMaterials: response.data.length,
          materialsWithImplantTypes,
          uniqueImplantTypes: availableImplantTypes.length
        }
      };
    } catch (error) {
      console.error('❌ Error fetching available implant types for inquiry:', error);
      return {
        success: false,
        error: `Network error: ${error.message}. Please check if the server is running.`,
        data: []
      };
    }
  },

  // Get implant types with subcategories
  getImplantTypes: async () => {
    try {
      const response = await api.get('/implant-types');
      return {
        success: true,
        data: response
      };
    } catch (error) {
      console.error('Error fetching implant types:', error);
      throw error;
    }
  },

  // Get unique subcategories for a given implant type and surgical category
  getSubcategoriesByImplantTypeAndCategory: async (implantTypeName, surgicalCategoryId, hospitalId) => {
    try {
      if (!hospitalId) {
        return { success: true, data: [] };
      }

      // Get all materials for this hospital and surgical category to find subcategories
      const response = await materialAPI.getAssignedMaterialsForInquiry(hospitalId, { 
        surgicalCategory: surgicalCategoryId 
      });
      
      if (!response.success || !response.data) {
        return { success: true, data: [] };
      }

      // Filter materials by implant type name and extract unique subcategories
      const subcategorySet = new Set();
      
      response.data.forEach(material => {
        if (material.implantType && 
            material.implantType.name === implantTypeName && 
            material.subCategory) {
          subcategorySet.add(material.subCategory);
        }
      });

      const subcategories = Array.from(subcategorySet).sort();
      
      return {
        success: true,
        data: subcategories
      };
    } catch (error) {
      console.error('Error fetching subcategories:', error);
      throw error;
    }
  },

  // Get unique lengths for materials by criteria
  getLengthsByCriteria: async (hospitalId, criteria) => {
    try {
      const response = await materialAPI.getAssignedMaterialsForInquiry(hospitalId, criteria);
      
      if (!response.success || !response.data) {
        return { success: true, data: [] };
      }

      // Extract unique lengths as simple values
      const lengths = response.data
        .filter(material => material.lengthMm !== null && material.lengthMm !== undefined)
        .map(material => material.lengthMm)
        .filter((length, index, arr) => arr.indexOf(length) === index)
        .sort((a, b) => a - b);

      return {
        success: true,
        data: lengths // Return simple array of numbers
      };
    } catch (error) {
      console.error('Error fetching lengths:', error);
      return {
        success: false,
        error: error.message,
        data: []
      };
    }
  }
};

export default materialAPI;
