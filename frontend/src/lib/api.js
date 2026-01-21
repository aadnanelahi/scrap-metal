import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('scrapos_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('scrapos_token');
      localStorage.removeItem('scrapos_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth
export const authAPI = {
  login: (data) => api.post('/auth/login', data),
  register: (data) => api.post('/auth/register', data),
  me: () => api.get('/auth/me'),
  changePassword: (data) => api.put('/auth/change-password', data),
};

// Users
export const usersAPI = {
  list: () => api.get('/users'),
  create: (data) => api.post('/users', data),
  update: (id, data) => api.put(`/users/${id}`, data),
  delete: (id) => api.delete(`/users/${id}`),
};

// Companies
export const companiesAPI = {
  list: () => api.get('/companies'),
  get: (id) => api.get(`/companies/${id}`),
  create: (data) => api.post('/companies', data),
  update: (id, data) => api.put(`/companies/${id}`, data),
  delete: (id) => api.delete(`/companies/${id}`),
};

// Branches
export const branchesAPI = {
  list: (companyId) => api.get('/branches', { params: { company_id: companyId } }),
  get: (id) => api.get(`/branches/${id}`),
  create: (data) => api.post('/branches', data),
  update: (id, data) => api.put(`/branches/${id}`, data),
  delete: (id) => api.delete(`/branches/${id}`),
};

// Customers
export const customersAPI = {
  list: (type) => api.get('/customers', { params: { type } }),
  get: (id) => api.get(`/customers/${id}`),
  create: (data) => api.post('/customers', data),
  update: (id, data) => api.put(`/customers/${id}`, data),
  delete: (id) => api.delete(`/customers/${id}`),
};

// Suppliers
export const suppliersAPI = {
  list: (type) => api.get('/suppliers', { params: { type } }),
  get: (id) => api.get(`/suppliers/${id}`),
  create: (data) => api.post('/suppliers', data),
  update: (id, data) => api.put(`/suppliers/${id}`, data),
  delete: (id) => api.delete(`/suppliers/${id}`),
};

// Brokers
export const brokersAPI = {
  list: () => api.get('/brokers'),
  get: (id) => api.get(`/brokers/${id}`),
  create: (data) => api.post('/brokers', data),
  update: (id, data) => api.put(`/brokers/${id}`, data),
  delete: (id) => api.delete(`/brokers/${id}`),
};

// Scrap Categories
export const scrapCategoriesAPI = {
  list: () => api.get('/scrap-categories'),
  create: (data) => api.post('/scrap-categories', data),
  update: (id, data) => api.put(`/scrap-categories/${id}`, data),
  delete: (id) => api.delete(`/scrap-categories/${id}`),
};

// Scrap Items
export const scrapItemsAPI = {
  list: (categoryId) => api.get('/scrap-items', { params: { category_id: categoryId } }),
  get: (id) => api.get(`/scrap-items/${id}`),
  create: (data) => api.post('/scrap-items', data),
  update: (id, data) => api.put(`/scrap-items/${id}`, data),
  delete: (id) => api.delete(`/scrap-items/${id}`),
};

// VAT Codes
export const vatCodesAPI = {
  list: () => api.get('/vat-codes'),
  create: (data) => api.post('/vat-codes', data),
  update: (id, data) => api.put(`/vat-codes/${id}`, data),
  delete: (id) => api.delete(`/vat-codes/${id}`),
};

// Currencies
export const currenciesAPI = {
  list: () => api.get('/currencies'),
  create: (data) => api.post('/currencies', data),
  update: (id, data) => api.put(`/currencies/${id}`, data),
};

// Payment Terms
export const paymentTermsAPI = {
  list: () => api.get('/payment-terms'),
  create: (data) => api.post('/payment-terms', data),
  update: (id, data) => api.put(`/payment-terms/${id}`, data),
};

// Incoterms
export const incotermsAPI = {
  list: () => api.get('/incoterms'),
  create: (data) => api.post('/incoterms', data),
  update: (id, data) => api.put(`/incoterms/${id}`, data),
};

// Ports
export const portsAPI = {
  list: () => api.get('/ports'),
  create: (data) => api.post('/ports', data),
  update: (id, data) => api.put(`/ports/${id}`, data),
};

// Weighbridges
export const weighbridgesAPI = {
  list: (branchId) => api.get('/weighbridges', { params: { branch_id: branchId } }),
  create: (data) => api.post('/weighbridges', data),
  update: (id, data) => api.put(`/weighbridges/${id}`, data),
};

// Weighbridge Entries
export const weighbridgeEntriesAPI = {
  list: (params) => api.get('/weighbridge-entries', { params }),
  get: (id) => api.get(`/weighbridge-entries/${id}`),
  create: (data) => api.post('/weighbridge-entries', data),
  recordSecondWeight: (id, tareWeight) => api.put(`/weighbridge-entries/${id}/second-weight`, null, { params: { tare_weight: tareWeight } }),
  lock: (id) => api.put(`/weighbridge-entries/${id}/lock`),
};

// Local Purchases
export const localPurchasesAPI = {
  list: (params) => api.get('/local-purchases', { params }),
  get: (id) => api.get(`/local-purchases/${id}`),
  create: (data) => api.post('/local-purchases', data),
  update: (id, data) => api.put(`/local-purchases/${id}`, data),
  post: (id) => api.post(`/local-purchases/${id}/post`),
};

// International Purchases
export const intlPurchasesAPI = {
  list: (params) => api.get('/intl-purchases', { params }),
  get: (id) => api.get(`/intl-purchases/${id}`),
  create: (data) => api.post('/intl-purchases', data),
  update: (id, data) => api.put(`/intl-purchases/${id}`, data),
  post: (id) => api.post(`/intl-purchases/${id}/post`),
};

// Local Sales
export const localSalesAPI = {
  list: (params) => api.get('/local-sales', { params }),
  get: (id) => api.get(`/local-sales/${id}`),
  create: (data) => api.post('/local-sales', data),
  update: (id, data) => api.put(`/local-sales/${id}`, data),
  post: (id) => api.post(`/local-sales/${id}/post`),
};

// Export Sales
export const exportSalesAPI = {
  list: (params) => api.get('/export-sales', { params }),
  get: (id) => api.get(`/export-sales/${id}`),
  create: (data) => api.post('/export-sales', data),
  update: (id, data) => api.put(`/export-sales/${id}`, data),
  post: (id) => api.post(`/export-sales/${id}/post`),
};

// Inventory
export const inventoryAPI = {
  stock: (params) => api.get('/inventory/stock', { params }),
  movements: (params) => api.get('/inventory/movements', { params }),
};

// Accounts
export const accountsAPI = {
  list: () => api.get('/accounts'),
  create: (data) => api.post('/accounts', data),
};

// Journal Entries
export const journalEntriesAPI = {
  list: (params) => api.get('/journal-entries', { params }),
};

// Audit Logs
export const auditLogsAPI = {
  list: (params) => api.get('/audit-logs', { params }),
};

// Dashboard
export const dashboardAPI = {
  kpis: () => api.get('/dashboard/kpis'),
};

// Reports
export const reportsAPI = {
  purchaseRegister: (params) => api.get('/reports/purchase-register', { params }),
  salesRegister: (params) => api.get('/reports/sales-register', { params }),
  vatReport: (params) => api.get('/reports/vat-report', { params }),
  stockAging: () => api.get('/reports/stock-aging'),
  brokerCommission: (params) => api.get('/reports/broker-commission', { params }),
};

// Seed Data
export const seedDataAPI = {
  seed: () => api.post('/seed-data'),
};

export default api;
