import { apiRequest } from '../../../services/api';

export const numberRangeAPI = {
  // Get all number ranges for business unit
  getAll: async (businessUnitId) => {
    return await apiRequest(`/api/number-ranges?businessUnitId=${businessUnitId}`);
  },

  // Get specific number range by ID
  getById: async (id) => {
    return await apiRequest(`/api/number-ranges/${id}`);
  },

  // Get number range for specific document type
  getByType: async (businessUnitId, documentType) => {
    return await apiRequest(`/api/number-ranges/type/${documentType}?businessUnitId=${businessUnitId}`);
  },

  // Create new number range
  create: async (rangeData) => {
    return await apiRequest('/api/number-ranges', {
      method: 'POST',
      body: JSON.stringify(rangeData)
    });
  },

  // Update number range (set manual number)
  update: async (id, updateData) => {
    return await apiRequest(`/api/number-ranges/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updateData)
    });
  },

  // Get next number (preview without incrementing)
  getNextNumber: async (businessUnitId, documentType) => {
    return await apiRequest(`/api/number-ranges/next/${documentType}?businessUnitId=${businessUnitId}`);
  },

  // Generate next number (increments counter)
  generateNext: async (businessUnitId, documentType) => {
    return await apiRequest(`/api/number-ranges/generate/${documentType}`, {
      method: 'POST',
      body: JSON.stringify({ businessUnitId })
    });
  },

  // Get all available document types
  getDocumentTypes: async () => {
    return await apiRequest('/api/number-ranges/meta/document-types');
  }
};
