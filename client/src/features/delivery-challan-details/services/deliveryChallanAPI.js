import { apiRequest } from '../../../services/api';

const deliveryChallanAPI = {
  // Get all delivery challans with pagination and filters
  getAllDeliveryChallans: async (params) => {
    const queryString = params.toString();
    const response = await apiRequest(`/api/delivery-challan-details?${queryString}`);
    return response;
  },

  // Get delivery challan by ID
  getDeliveryChallan: async (id) => {
    const response = await apiRequest(`/api/delivery-challan-details/${id}`);
    return response;
  },

  // Create new delivery challan
  createDeliveryChallan: async (challanData) => {
    const response = await apiRequest('/api/delivery-challan-details', {
      method: 'POST',
      body: JSON.stringify(challanData)
    });
    return response;
  },

  // Update delivery challan
  updateDeliveryChallan: async (id, challanData) => {
    const response = await apiRequest(`/api/delivery-challan-details/${id}`, {
      method: 'PUT',
      body: JSON.stringify(challanData)
    });
    return response;
  },

  // Delete delivery challan
  deleteDeliveryChallan: async (id, updatedBy) => {
    const response = await apiRequest(`/api/delivery-challan-details/${id}`, {
      method: 'DELETE',
      body: JSON.stringify({ updatedBy })
    });
    return response;
  },

  // Get dropdown data (hospitals)
  getDropdownData: async () => {
    const response = await apiRequest('/api/delivery-challan-details/dropdown-data');
    return response;
  }
};

export { deliveryChallanAPI };
export default deliveryChallanAPI;
