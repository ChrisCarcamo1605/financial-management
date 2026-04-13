import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

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
export const getAccounts = () => api.get('/api/accounts');
export const createAccount = (data) => api.post('/api/accounts', data);
export const updateAccount = (id, data) => api.put(`/api/accounts/${id}`, data);
export const deleteAccount = (id) => api.delete(`/api/accounts/${id}`);

// Categories
export const getCategories = (type) => {
  const params = type ? { type } : {};
  return api.get('/api/categories', { params });
};
export const createCategory = (data) => api.post('/api/categories', data);
export const updateCategory = (id, data) => api.put(`/api/categories/${id}`, data);
export const deleteCategory = (id) => api.delete(`/api/categories/${id}`);

// Transactions
export const getTransactions = (params) => api.get('/api/transactions', { params });
export const createTransaction = (data) => api.post('/api/transactions', data);
export const updateTransaction = (id, data) => api.put(`/api/transactions/${id}`, data);
export const deleteTransaction = (id) => api.delete(`/api/transactions/${id}`);

// Budgets
export const getBudgets = () => api.get('/api/budgets');
export const createBudget = (data) => api.post('/api/budgets', data);
export const updateBudget = (id, data) => api.put(`/api/budgets/${id}`, data);
export const deleteBudget = (id) => api.delete(`/api/budgets/${id}`);

// Dashboard
export const getDashboardSummary = () => api.get('/api/dashboard/summary');

export default api;
