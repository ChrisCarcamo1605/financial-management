import type { DataSource } from '../source';
import type {
  Account, Budget, Category, GenerateResult, IncomeSource, Loan, Page, RecurringService, SavingsGoal,
  Session, Transfer,
} from '../types';
import { createHttpClient } from './client';

const LIST_ALL = { page: 1, per_page: 200 };

/** Respuesta de los endpoints /generate: el campo `status` indica el resultado. */
interface GenerateResponse {
  status: 'created' | 'already_generated' | 'missing_config';
  reason?: string;
  amount?: number;
  total_amount?: number;
}

function toGenerateResult(response: GenerateResponse): GenerateResult {
  if (response.status === 'created') {
    return { status: 'created', amount: response.total_amount ?? response.amount ?? 0 };
  }
  if (response.status === 'missing_config') {
    return { status: 'missing_config', reason: response.reason ?? 'Falta configuración' };
  }
  return { status: 'already_generated' };
}

/** DataSource contra la API Flask. `baseUrl` vacío = mismo origen (proxy de Vite). */
export function createHttpSource(baseUrl = ''): DataSource {
  const http = createHttpClient(baseUrl);

  async function startSession(promise: Promise<Session>) {
    const session = await promise;
    http.setAccessToken(session.access_token);
    return session;
  }

  const items = async <T>(promise: Promise<Page<T> | { data: T[] }>) => (await promise).data;

  return {
    auth: {
      restore: () => http.refresh(),
      login: (credentials) => startSession(http.post('/api/auth/login', credentials)),
      register: (credentials) => startSession(http.post('/api/auth/register', credentials)),
      async logout() {
        try {
          await http.post('/api/auth/logout');
        } finally {
          http.setAccessToken(null);
        }
      },
      onExpired: (listener) => http.onExpired(listener),
    },

    preferences: {
      get: () => http.get('/api/preferences'),
      update: (patch) => http.patch('/api/preferences', patch),
    },

    dashboard: {
      summary: () => http.get('/api/dashboard/summary'),
    },

    accounts: {
      list: () => items(http.get<Page<Account>>('/api/accounts', LIST_ALL)),
      create: (input) => http.post('/api/accounts', input),
      update: (id, input) => http.put(`/api/accounts/${id}`, input),
      remove: (id) => http.delete(`/api/accounts/${id}`),
    },

    transfers: {
      list: (limit = 20) => items(http.get<Page<Transfer>>('/api/transfers', { page: 1, per_page: limit })),
      create: (input) => http.post('/api/transfers', input),
      remove: (id) => http.delete(`/api/transfers/${id}`),
    },

    categories: {
      list: (type) => items(http.get<Page<Category>>('/api/categories', { ...LIST_ALL, type })),
      create: (input) => http.post('/api/categories', input),
      update: (id, input) => http.put(`/api/categories/${id}`, input),
      remove: (id) => http.delete(`/api/categories/${id}`),
    },

    transactions: {
      list: (query) => http.get('/api/transactions', { ...query }),
      create: (input) => http.post('/api/transactions', input),
      update: (id, input) => http.put(`/api/transactions/${id}`, input),
      remove: (id) => http.delete(`/api/transactions/${id}`),
    },

    budgets: {
      list: () => items(http.get<Page<Budget>>('/api/budgets', LIST_ALL)),
      create: (input) => http.post('/api/budgets', input),
      update: (id, input) => http.put(`/api/budgets/${id}`, input),
      remove: (id) => http.delete(`/api/budgets/${id}`),
    },

    incomeSources: {
      list: () => items(http.get<Page<IncomeSource>>('/api/income-sources', LIST_ALL)),
      preview: (gross, modality) => http.post('/api/income-sources/preview', { gross_amount: gross, modality }),
      create: (input) => http.post('/api/income-sources', input),
      update: (id, input) => http.put(`/api/income-sources/${id}`, input),
      remove: (id) => http.delete(`/api/income-sources/${id}`),
    },

    loans: {
      list: () => items(http.get<Page<Loan>>('/api/loans', LIST_ALL)),
      create: (input) => http.post('/api/loans', input),
      update: (id, input) => http.put(`/api/loans/${id}`, input),
      remove: (id) => http.delete(`/api/loans/${id}`),
      setPaymentStatus: (paymentId, status, paidDate) =>
        http.patch(`/api/loans/loan-payments/${paymentId}/pay`, { status, paid_date: paidDate }),
    },

    services: {
      list: (month) => items(http.get<Page<RecurringService>>('/api/recurring-services', { ...LIST_ALL, month })),
      create: (input) => http.post('/api/recurring-services', input),
      update: (id, input) => http.put(`/api/recurring-services/${id}`, input),
      remove: (id) => http.delete(`/api/recurring-services/${id}`),
      generate: async (id, month) =>
        toGenerateResult(await http.post(`/api/recurring-services/${id}/generate`, { month }, { acceptStatus: [422] })),
      surcharges: (id, month) => http.get(`/api/recurring-services/${id}/surcharges`, { month }),
      addSurcharge: (id, input) => http.post(`/api/recurring-services/${id}/surcharges`, input),
      removeSurcharge: (surchargeId) => http.delete(`/api/recurring-services/surcharges/${surchargeId}`),
    },

    savings: {
      list: () => items(http.get<{ data: SavingsGoal[] }>('/api/savings-goals')),
      create: (input) => http.post('/api/savings-goals', input),
      update: (id, input) => http.put(`/api/savings-goals/${id}`, input),
      remove: (id) => http.delete(`/api/savings-goals/${id}`),
      contribute: (id, input) => http.post(`/api/savings-goals/${id}/contribute`, input),
      removeContribution: (contributionId) => http.delete(`/api/savings-goals/contributions/${contributionId}`),
      generate: async (id, month, quincena) =>
        toGenerateResult(await http.post(`/api/savings-goals/${id}/generate`, { month, quincena }, { acceptStatus: [422] })),
    },

    quincenas: {
      overview: (month) => http.get('/api/quincenas', { month }),
      setCardReserve: (input) => http.put('/api/quincenas/card-reserves', input),
    },

    analytics: {
      cashFlow: (range) => http.get('/api/analytics/cash-flow', { group_by: 'month', ...range }),
      spendingByCategory: (range) => http.get('/api/analytics/spending-by-category', { ...range }),
    },
  };
}
