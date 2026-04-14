import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para agregar el token de autenticación
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor para manejar errores de autenticación
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth
export const verifyToken = (token) => api.post('/api/auth/verify', { token });
export const getMe = () => api.get('/api/auth/me');

// Accounts
export const getAccounts = (params = {}) => {
  const { page = 1, per_page = 20, ...otherParams } = params;
  return api.get('/api/accounts', { 
    params: { page, per_page, ...otherParams } 
  });
};
export const createAccount = (data) => api.post('/api/accounts', data);
export const updateAccount = (id, data) => api.put(`/api/accounts/${id}`, data);
export const deleteAccount = (id) => api.delete(`/api/accounts/${id}`);

// Categories
export const getCategories = (params = {}) => {
  const { type, page = 1, per_page = 50, ...otherParams } = typeof params === 'string' 
    ? { type: params } 
    : params;
  const queryParams = {};
  if (type) queryParams.type = type;
  queryParams.page = page;
  queryParams.per_page = per_page;
  return api.get('/api/categories', { 
    params: { ...queryParams, ...otherParams } 
  });
};
export const createCategory = (data) => api.post('/api/categories', data);
export const updateCategory = (id, data) => api.put(`/api/categories/${id}`, data);
export const deleteCategory = (id) => api.delete(`/api/categories/${id}`);

// Transactions
export const getTransactions = (params = {}) => {
  const { 
    type, 
    category_id, 
    account_id, 
    start_date, 
    end_date, 
    limit = 100, 
    offset = 0,
    ...otherParams 
  } = params;
  const queryParams = {};
  if (type) queryParams.type = type;
  if (category_id) queryParams.category_id = category_id;
  if (account_id) queryParams.account_id = account_id;
  if (start_date) queryParams.start_date = start_date;
  if (end_date) queryParams.end_date = end_date;
  queryParams.limit = limit;
  queryParams.offset = offset;
  return api.get('/api/transactions', { 
    params: { ...queryParams, ...otherParams } 
  });
};
export const createTransaction = (data) => api.post('/api/transactions', data);
export const updateTransaction = (id, data) => api.put(`/api/transactions/${id}`, data);
export const deleteTransaction = (id) => api.delete(`/api/transactions/${id}`);

// Budgets
export const getBudgets = (params = {}) => {
  const { page = 1, per_page = 20, ...otherParams } = params;
  return api.get('/api/budgets', { 
    params: { page, per_page, ...otherParams } 
  });
};
export const createBudget = (data) => api.post('/api/budgets', data);
export const updateBudget = (id, data) => api.put(`/api/budgets/${id}`, data);
export const deleteBudget = (id) => api.delete(`/api/budgets/${id}`);

// Dashboard
export const getDashboardSummary = () => api.get('/api/dashboard/summary');

// Analytics
export const getSpendingByCategory = (params) => api.get('/api/analytics/spending-by-category', { params });
export const getCashFlowAnalysis = (params) => api.get('/api/analytics/cash-flow', { params });
export const getTrendAnalysis = (params) => api.get('/api/analytics/trends', { params });
export const getCategoryComparison = (params) => api.get('/api/analytics/category-comparison', { params });
export const getAccountPerformance = (params) => api.get('/api/analytics/account-performance', { params });
export const getSpendingHeatmap = (params) => api.get('/api/analytics/spending-heatmap', { params });

export default api;
