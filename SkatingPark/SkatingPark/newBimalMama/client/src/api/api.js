import axios from 'axios';
import { TOKEN_STORAGE_KEY } from '../context/AppContext';

// Use environment variable for API URL, fallback to localhost for development
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

const getSessionToken = () => {
  if (typeof window === 'undefined') return null;
  return window.sessionStorage.getItem(TOKEN_STORAGE_KEY);
};

// Auth API
export const authAPI = {
  login: (credentials) => axios.post(`${API_BASE_URL}/auth/login`, credentials),
  register: (userData) => axios.post(`${API_BASE_URL}/auth/register`, userData),
  getProfile: () => axios.get(`${API_BASE_URL}/auth/me`),
  updateProfile: (data) => axios.put(`${API_BASE_URL}/auth/update-profile`, data),
  changePassword: (data) => axios.put(`${API_BASE_URL}/auth/change-password`, data),
  checkSetup: () => axios.get(`${API_BASE_URL}/auth/check-setup`),
  changePasswordPublic: (data) => axios.post(`${API_BASE_URL}/auth/change-password-public`, data),
  requestPasswordReset: (data) => axios.post(`${API_BASE_URL}/auth/forgot-password`, data),
  verifyResetCode: (data) => axios.post(`${API_BASE_URL}/auth/verify-reset-code`, data),
  resetPasswordWithCode: (data) => axios.post(`${API_BASE_URL}/auth/reset-password`, data),
};

// Users API
export const usersAPI = {
  getAll: () => axios.get(`${API_BASE_URL}/users`),
  getById: (id) => axios.get(`${API_BASE_URL}/users/${id}`),
  create: (userData) => axios.post(`${API_BASE_URL}/users`, userData),
  update: (id, userData) => axios.put(`${API_BASE_URL}/users/${id}`, userData),
  delete: (id) => axios.delete(`${API_BASE_URL}/users/${id}`),
  getByBranch: (branchId) => axios.get(`${API_BASE_URL}/users/branch/${branchId}`),
};

// Branches API
export const branchesAPI = {
  getAll: () => axios.get(`${API_BASE_URL}/branches`),
  getById: (id) => axios.get(`${API_BASE_URL}/branches/${id}`),
  create: (branchData) => axios.post(`${API_BASE_URL}/branches`, branchData),
  update: (id, branchData) => axios.put(`${API_BASE_URL}/branches/${id}`, branchData),
  delete: (id) => axios.delete(`${API_BASE_URL}/branches/${id}`),
};

// Tickets API
export const ticketsAPI = {
  getAll: (params = {}) => axios.get(`${API_BASE_URL}/tickets`, { params }),
  getById: (id) => axios.get(`${API_BASE_URL}/tickets/${id}`),
  lookup: (ticketNo) => axios.get(`${API_BASE_URL}/tickets/lookup/${ticketNo}`),
  create: (ticketData) => axios.post(`${API_BASE_URL}/tickets`, ticketData),
  quickCreate: (ticketData) => axios.post(`${API_BASE_URL}/tickets/quick`, ticketData),
  update: (id, ticketData) => axios.put(`${API_BASE_URL}/tickets/${id}`, ticketData),
  delete: (id) => axios.delete(`${API_BASE_URL}/tickets/${id}`),
  refund: (id, data) => axios.put(`${API_BASE_URL}/tickets/${id}/refund`, data),
  partialRefund: (id, data) => axios.put(`${API_BASE_URL}/tickets/${id}/partial-refund`, data),
  updatePlayerStatus: (id, data) => axios.put(`${API_BASE_URL}/tickets/${id}/player-status`, data),
  markPrinted: (id) => axios.put(`${API_BASE_URL}/tickets/${id}/print`),
  getStats: (branchId, period = 'today') => 
    axios.get(`${API_BASE_URL}/tickets/stats/${branchId}`, { params: { period } }),
  addExtraTime: (ticketId, data) => axios.post(`${API_BASE_URL}/tickets/${ticketId}/extra-time`, data),
  getExtraTimeEntries: (ticketId) => axios.get(`${API_BASE_URL}/tickets/${ticketId}/extra-time`),
  getExtraTimeReport: (params = {}) => axios.get(`${API_BASE_URL}/tickets/extra-time/report`, { params })
};

// Sales API
// Enhanced Sales API with product and customer management
export const salesAPI = {
  // Existing sales endpoints
  getAll: (params = {}) => axios.get(`${API_BASE_URL}/sales`, { params }),
  getById: (id) => axios.get(`${API_BASE_URL}/sales/${id}`),
  create: (saleData) => axios.post(`${API_BASE_URL}/sales`, saleData),
  update: (id, saleData) => axios.put(`${API_BASE_URL}/sales/${id}`, saleData),
  delete: (id) => axios.delete(`${API_BASE_URL}/sales/${id}`),
  getStats: (branchId, period = 'today') => 
    axios.get(`${API_BASE_URL}/sales/stats/${branchId}`, { params: { period } }),
  
  // Product endpoints
  getProducts: (params = {}) => axios.get(`${API_BASE_URL}/sales/products`, { params }),
  createProduct: (productData) => axios.post(`${API_BASE_URL}/sales/products`, productData),
  updateProduct: (id, productData) => axios.put(`${API_BASE_URL}/sales/products/${id}`, productData),
  deleteProduct: (id) => axios.delete(`${API_BASE_URL}/sales/products/${id}`),
  
  // Customer endpoints
  getCustomers: (params = {}) => axios.get(`${API_BASE_URL}/sales/customers`, { params }),
  createCustomer: (customerData) => axios.post(`${API_BASE_URL}/sales/customers`, customerData),
  updateCustomer: (id, customerData) => axios.put(`${API_BASE_URL}/sales/customers/${id}`, customerData),
  deleteCustomer: (id) => axios.delete(`${API_BASE_URL}/sales/customers/${id}`),
  
  // Alert endpoints
  getLowStockAlerts: () => axios.get(`${API_BASE_URL}/sales/alerts/low-stock`),
  
  // Utility method for dynamic endpoints
  get: (endpoint, config = {}) => axios.get(`${API_BASE_URL}/sales${endpoint}`, config),
  post: (endpoint, data) => axios.post(`${API_BASE_URL}/sales${endpoint}`, data),
};

// Expenses API

export const expensesAPI = {
  getAll: (params = {}) => axios.get(`${API_BASE_URL}/expenses`, { params }),
  getById: (id) => axios.get(`${API_BASE_URL}/expenses/${id}`),
  create: (expenseData) => axios.post(`${API_BASE_URL}/expenses`, expenseData),
  update: (id, expenseData) => axios.put(`${API_BASE_URL}/expenses/${id}`, expenseData),
  delete: (id) => axios.delete(`${API_BASE_URL}/expenses/${id}`),
  getStats: (branchId, period = 'today') => 
    axios.get(`${API_BASE_URL}/expenses/stats/${branchId}`, { params: { period } }),
  getCategories: () => axios.get(`${API_BASE_URL}/expenses/categories`), // Add this line
};

// Settings API
export const settingsAPI = {
  getByBranch: (branchId) => axios.get(`${API_BASE_URL}/settings/${branchId}`),
  update: (branchId, settingsData) => axios.put(`${API_BASE_URL}/settings/${branchId}`, settingsData),
  uploadLogo: (formData) => axios.post(`${API_BASE_URL}/settings/upload-logo`, formData),
};

// Summary API
export const summaryAPI = {
  getDaily: (branchId, date) => axios.get(`${API_BASE_URL}/summary/daily/${branchId}`, { params: { date } }),
  getRange: (branchId, startDate, endDate) => 
    axios.get(`${API_BASE_URL}/summary/range/${branchId}`, { params: { startDate, endDate } }),
  getDashboard: (branchId) => axios.get(`${API_BASE_URL}/summary/dashboard/${branchId}`),
};

// Backup API
export const backupAPI = {
  getAll: (params = {}) => axios.get(`${API_BASE_URL}/backup`, { params }),
  create: (backupData) => axios.post(`${API_BASE_URL}/backup`, backupData),
  restore: (id) => axios.post(`${API_BASE_URL}/backup/restore/${id}`),
  delete: (id) => axios.delete(`${API_BASE_URL}/backup/${id}`),
  download: (id) => axios.get(`${API_BASE_URL}/backup/download/${id}`, { responseType: 'blob' }),
  eraseData: (branchId, types = []) => axios.delete(`${API_BASE_URL}/backup/erase-data`, {
    params: { branchId, types: Array.isArray(types) ? types.join(',') : types }
  }),
};

// PDF API
export const pdfAPI = {
  getDashboard: async (branchId) => {
    const token = getSessionToken();
    try {
      const response = await axios.get(`${API_BASE_URL}/pdf/dashboard`, {
        params: { branchId },
        responseType: 'blob',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        validateStatus: (status) => {
          // Don't throw error for non-2xx status, we'll handle it manually
          return status >= 200 && status < 500;
        }
      });
      
      // Check if response is actually an error (JSON) masquerading as a blob
      if (response.status !== 200) {
        // Try to parse as JSON to get error message
        try {
          const text = await response.data.text();
          const json = JSON.parse(text);
          throw new Error(json.message || `Server error: ${response.status}`);
        } catch (parseError) {
          // If parsing fails, it might be a real blob error, but unlikely
          throw new Error(`Failed to generate PDF. Server returned status ${response.status}`);
        }
      }
      
      // Check if the blob is actually JSON (error response)
      const contentType = response.headers['content-type'] || '';
      if (contentType.includes('application/json') || !contentType.includes('application/pdf')) {
        try {
          const text = await response.data.text();
          const json = JSON.parse(text);
          throw new Error(json.message || 'Server returned an error instead of PDF');
        } catch (parseError) {
          throw new Error('Server returned an error. Please try again.');
        }
      }
      
      return response;
    } catch (error) {
      // If it's already an Error object with a message, rethrow it
      if (error instanceof Error && error.message) {
        throw error;
      }
      // Otherwise, handle axios errors
      if (error.response) {
        // Try to parse error response as JSON
        if (error.response.data instanceof Blob) {
          try {
            const text = await error.response.data.text();
            const json = JSON.parse(text);
            throw new Error(json.message || 'Failed to generate PDF');
          } catch (parseError) {
            throw new Error('Failed to generate PDF. Please try again.');
          }
        } else if (error.response.data?.message) {
          throw new Error(error.response.data.message);
        }
      }
      throw error;
    }
  },
};

// Export utility functions
export const handleApiError = (error) => {
  if (error.response?.data?.message) {
    return error.response.data.message;
  }
  return error.message || 'An unexpected error occurred';
};

export const downloadFile = (blob, filename) => {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};