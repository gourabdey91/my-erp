import { apiRequest } from '../../../services/api';

const hospitalAPI = {
  // Get all hospitals
  getAllHospitals: async () => {
    const response = await apiRequest('/api/hospitals');
    return response;
  },

  // Get all hospitals for a business unit
  getHospitals: async (businessUnitId) => {
    const response = await apiRequest(`/api/hospitals?businessUnitId=${businessUnitId}`);
    return response;
  },

  // Get hospital by ID
  getHospital: async (id) => {
    const response = await apiRequest(`/api/hospitals/${id}`);
    return response;
  },

  // Create new hospital
  createHospital: async (hospitalData) => {
    const response = await apiRequest('/api/hospitals', {
      method: 'POST',
      body: JSON.stringify(hospitalData)
    });
    return response;
  },

  // Update hospital
  updateHospital: async (id, hospitalData) => {
    const response = await apiRequest(`/api/hospitals/${id}`, {
      method: 'PUT',
      body: JSON.stringify(hospitalData)
    });
    return response;
  },

  // Delete hospital
  deleteHospital: async (id, updatedBy) => {
    const response = await apiRequest(`/api/hospitals/${id}`, {
      method: 'DELETE',
      body: JSON.stringify({ updatedBy })
    });
    return response;
  },

  // Get surgical categories for dropdown
  getSurgicalCategories: async (businessUnitId) => {
    const response = await apiRequest(`/api/hospitals/categories/${businessUnitId}`);
    return response;
  },

  // Get all surgical categories (independent of business unit)
  getAllSurgicalCategories: async () => {
    const response = await apiRequest('/api/categories');
    return response.data || response; // Handle both structured and direct response
  },

  // Get business units for dropdown
  getBusinessUnits: async () => {
    const response = await apiRequest('/api/business-units');
    return response.data || response; // Handle both structured and direct response
  },

  // Get available materials for hospital assignment
  getAvailableMaterials: async (hospitalId) => {
    const response = await apiRequest(`/api/hospitals/${hospitalId}/available-materials`);
    return response;
  },

  // Add material assignment to hospital
  addMaterialAssignment: async (hospitalId, assignmentData) => {
    const response = await apiRequest(`/api/hospitals/${hospitalId}/materials`, {
      method: 'POST',
      body: JSON.stringify(assignmentData)
    });
    return response;
  },

  // Update material assignment pricing
  updateMaterialAssignment: async (hospitalId, assignmentId, pricingData) => {
    const response = await apiRequest(`/api/hospitals/${hospitalId}/materials/${assignmentId}`, {
      method: 'PUT',
      body: JSON.stringify(pricingData)
    });
    return response;
  },

  // Update material assignment field (for checkboxes and other fields)
  updateMaterialAssignmentField: async (hospitalId, assignmentId, fieldData) => {
    const response = await apiRequest(`/api/hospitals/${hospitalId}/materials/${assignmentId}/field`, {
      method: 'PATCH',
      body: JSON.stringify(fieldData)
    });
    return response;
  },

  // Remove material assignment from hospital
  removeMaterialAssignment: async (hospitalId, assignmentId, updatedBy) => {
    const response = await apiRequest(`/api/hospitals/${hospitalId}/materials/${assignmentId}`, {
      method: 'DELETE',
      body: JSON.stringify({ updatedBy })
    });
    return response;
  }
};

export { hospitalAPI };
export default hospitalAPI;
