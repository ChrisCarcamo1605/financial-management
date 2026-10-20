import type { DateRange, MonthKey, TransactionQuery, TxType } from './types';

/** Claves de TanStack Query centralizadas: un solo lugar para invalidar. */
export const queryKeys = {
  preferences: ['preferences'] as const,
  dashboard: ['dashboard'] as const,
  accounts: ['accounts'] as const,
  transfers: (limit: number) => ['transfers', limit] as const,
  categories: (type?: TxType) => ['categories', type ?? 'all'] as const,
  transactions: (query: TransactionQuery) => ['transactions', query] as const,
  budgets: ['budgets'] as const,
  incomeSources: ['income-sources'] as const,
  deductions: (gross: number, modality: string) => ['deductions', gross, modality] as const,
  loans: ['loans'] as const,
  services: (month: MonthKey) => ['services', month] as const,
  surcharges: (id: number, month: MonthKey) => ['surcharges', id, month] as const,
  savings: ['savings'] as const,
  quincenas: (month: MonthKey) => ['quincenas', month] as const,
  cashFlow: (range: DateRange) => ['analytics', 'cash-flow', range] as const,
  spending: (range: DateRange) => ['analytics', 'spending', range] as const,
};
