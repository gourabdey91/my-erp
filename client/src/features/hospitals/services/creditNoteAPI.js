import { apiRequest } from '../../../services/api';

export const creditNoteAPI = {
  // Get all credit notes for a hospital
  getCreditNotesByHospital: async (hospitalId) => {
    const response = await apiRequest(`/api/credit-notes/hospital/${hospitalId}`);
    return response;
  },

  // Get payment types and categories for dropdowns
  getOptions: async (hospitalId) => {
    const response = await apiRequest(`/api/credit-notes/options/${hospitalId}`);
    return response;
  },

  // Create a new credit note
  createCreditNote: async (creditNoteData) => {
    const response = await apiRequest('/api/credit-notes', {
      method: 'POST',
      body: JSON.stringify(creditNoteData)
    });
    return response;
  },

  // Update an existing credit note
  updateCreditNote: async (id, creditNoteData) => {
    const response = await apiRequest(`/api/credit-notes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(creditNoteData)
    });
    return response;
  },

  // Delete a credit note (soft delete)
  deleteCreditNote: async (id, updatedBy) => {
    const response = await apiRequest(`/api/credit-notes/${id}`, {
      method: 'DELETE',
      body: JSON.stringify({ updatedBy })
    });
    return response;
  }
};
