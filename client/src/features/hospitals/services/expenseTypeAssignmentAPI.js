import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_BASE || '/api';

export const expenseTypeAssignmentAPI = {
  getAssignmentsByHospital: async (hospitalId) => {
    const res = await axios.get(`${API_BASE}/expense-type-assignments/hospital/${hospitalId}`);
    return res.data;
  },
  getOptions: async (hospitalId) => {
    const res = await axios.get(`${API_BASE}/expense-type-assignments/options/${hospitalId}`);
    return res.data;
  },
  createAssignment: async (payload) => {
    const res = await axios.post(`${API_BASE}/expense-type-assignments`, payload);
    return res.data;
  },
  updateAssignment: async (id, payload) => {
    const res = await axios.put(`${API_BASE}/expense-type-assignments/${id}`, payload);
    return res.data;
  },
  deleteAssignment: async (id, updatedBy) => {
    const res = await axios.delete(`${API_BASE}/expense-type-assignments/${id}`, { data: { updatedBy } });
    return res.data;
  }
};
