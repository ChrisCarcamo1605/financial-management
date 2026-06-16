import axios from 'axios';
import authStore from './authStore';
import { apiRefresh } from './auth';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true, // required for refresh_token cookie on cross-origin requests
  headers: { 'Content-Type': 'application/json' },
});

// ── Request interceptor ───────────────────────────────────────────────────────
// Attach the in-memory access token to every request.
api.interceptors.request.use((config) => {
  if (authStore.accessToken) {
    config.headers.Authorization = `Bearer ${authStore.accessToken}`;
  }
  return config;
});

// ── Response interceptor — refresh on 401 ────────────────────────────────────
// Uses a queue so that concurrent requests failing with 401 don't all trigger
// a refresh simultaneously — only the first one refreshes; the rest wait.

let isRefreshing = false;
let pendingQueue = [];

function resolveQueue(newToken) {
  pendingQueue.forEach((cb) => cb(newToken));
  pendingQueue = [];
}

function rejectQueue(error) {
  pendingQueue.forEach((cb) => cb(null, error));
  pendingQueue = [];
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;

    // Only intercept 401s that haven't already been retried.
    if (error.response?.status !== 401 || original._retried) {
      return Promise.reject(error);
    }

    if (isRefreshing) {
      // Queue this request until the ongoing refresh completes.
      return new Promise((resolve, reject) => {
        pendingQueue.push((token, err) => {
          if (err) return reject(err);
          original.headers.Authorization = `Bearer ${token}`;
          resolve(api(original));
        });
      });
    }

    original._retried = true;
    isRefreshing = true;

    try {
      const data = await apiRefresh();
      authStore.accessToken = data.access_token;
      resolveQueue(data.access_token);
      original.headers.Authorization = `Bearer ${data.access_token}`;
      return api(original);
    } catch (refreshError) {
      authStore.accessToken = null;
      rejectQueue(refreshError);
      window.dispatchEvent(new CustomEvent('auth:logout'));
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);

// ── Auth ──────────────────────────────────────────────────────────────────────
export const getMe = () => api.get('/api/auth/me');

// ── Accounts ──────────────────────────────────────────────────────────────────
export const getAccounts = (params = {}) => {
  const { page = 1, per_page = 20, ...rest } = params;
  return api.get('/api/accounts', { params: { page, per_page, ...rest } });
};
export const createAccount = (data) => api.post('/api/accounts', data);
export const updateAccount = (id, data) => api.put(`/api/accounts/${id}`, data);
export const deleteAccount = (id) => api.delete(`/api/accounts/${id}`);

// ── Categories ────────────────────────────────────────────────────────────────
export const getCategories = (params = {}) => {
  const { type, page = 1, per_page = 50, ...rest } =
    typeof params === 'string' ? { type: params } : params;
  const q = { page, per_page, ...rest };
  if (type) q.type = type;
  return api.get('/api/categories', { params: q });
};
export const createCategory = (data) => api.post('/api/categories', data);
export const updateCategory = (id, data) => api.put(`/api/categories/${id}`, data);
export const deleteCategory = (id) => api.delete(`/api/categories/${id}`);

// ── Transactions ──────────────────────────────────────────────────────────────
export const getTransactions = (params = {}) => {
  const { type, category_id, account_id, start_date, end_date, limit = 100, offset = 0, ...rest } = params;
  const q = { limit, offset, ...rest };
  if (type) q.type = type;
  if (category_id) q.category_id = category_id;
  if (account_id) q.account_id = account_id;
  if (start_date) q.start_date = start_date;
  if (end_date) q.end_date = end_date;
  return api.get('/api/transactions', { params: q });
};
export const createTransaction = (data) => api.post('/api/transactions', data);
export const updateTransaction = (id, data) => api.put(`/api/transactions/${id}`, data);
export const deleteTransaction = (id) => api.delete(`/api/transactions/${id}`);

// ── Budgets ───────────────────────────────────────────────────────────────────
export const getBudgets = (params = {}) => {
  const { page = 1, per_page = 20, ...rest } = params;
  return api.get('/api/budgets', { params: { page, per_page, ...rest } });
};
export const createBudget = (data) => api.post('/api/budgets', data);
export const updateBudget = (id, data) => api.put(`/api/budgets/${id}`, data);
export const deleteBudget = (id) => api.delete(`/api/budgets/${id}`);

// ── Dashboard ─────────────────────────────────────────────────────────────────
export const getDashboardSummary = () => api.get('/api/dashboard/summary');

// ── Analytics ─────────────────────────────────────────────────────────────────
export const getSpendingByCategory = (params) => api.get('/api/analytics/spending-by-category', { params });
export const getCashFlowAnalysis = (params) => api.get('/api/analytics/cash-flow', { params });
export const getTrendAnalysis = (params) => api.get('/api/analytics/trends', { params });
export const getCategoryComparison = (params) => api.get('/api/analytics/category-comparison', { params });
export const getAccountPerformance = (params) => api.get('/api/analytics/account-performance', { params });
export const getSpendingHeatmap = (params) => api.get('/api/analytics/spending-heatmap', { params });

// ── Income Sources ────────────────────────────────────────────────────────────
export const getIncomeSources = (params = {}) => {
  const { page = 1, per_page = 100, ...rest } = params;
  return api.get('/api/income-sources', { params: { page, per_page, ...rest } });
};
export const previewIncomeSource = (data) => api.post('/api/income-sources/preview', data);
export const createIncomeSource = (data) => api.post('/api/income-sources', data);
export const updateIncomeSource = (id, data) => api.put(`/api/income-sources/${id}`, data);
export const deleteIncomeSource = (id) => api.delete(`/api/income-sources/${id}`);

// ── Loans ─────────────────────────────────────────────────────────────────────
export const getLoans = (params = {}) => {
  const { page = 1, per_page = 50, ...rest } = params;
  return api.get('/api/loans', { params: { page, per_page, ...rest } });
};
export const createLoan = (data) => api.post('/api/loans', data);
export const updateLoan = (id, data) => api.put(`/api/loans/${id}`, data);
export const deleteLoan = (id) => api.delete(`/api/loans/${id}`);
export const toggleLoanPayment = (paymentId, data = {}) =>
  api.patch(`/api/loan-payments/${paymentId}/pay`, data);

// ── Quincenas ─────────────────────────────────────────────────────────────────
export const getQuincenas = (params = {}) => api.get('/api/quincenas', { params });

// ── Recurring Services ──────────────────────────────────────────────────────────
export const getRecurringServices = (params = {}) => {
  const { page = 1, per_page = 100, ...rest } = params;
  return api.get('/api/recurring-services', { params: { page, per_page, ...rest } });
};
export const createRecurringService = (data) => api.post('/api/recurring-services', data);
export const updateRecurringService = (id, data) => api.put(`/api/recurring-services/${id}`, data);
export const deleteRecurringService = (id) => api.delete(`/api/recurring-services/${id}`);
export const generateRecurringTransactions = (data = {}) =>
  api.post('/api/recurring-services/generate', data);

export default api;
