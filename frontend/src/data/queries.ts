import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useDataSource } from './provider';
import { queryKeys } from './query-keys';
import type { DateRange, MonthKey, TransactionQuery, TxType } from './types';

/* Hooks de lectura. Cada uno delega en el DataSource activo (HTTP o demo). */

export function useDashboardSummary() {
  const source = useDataSource();
  return useQuery({ queryKey: queryKeys.dashboard, queryFn: () => source.dashboard.summary() });
}

export function useAccounts() {
  const source = useDataSource();
  return useQuery({ queryKey: queryKeys.accounts, queryFn: () => source.accounts.list() });
}

export function useTransfers(limit = 20) {
  const source = useDataSource();
  return useQuery({ queryKey: queryKeys.transfers(limit), queryFn: () => source.transfers.list(limit) });
}

export function useCategories(type?: TxType) {
  const source = useDataSource();
  return useQuery({ queryKey: queryKeys.categories(type), queryFn: () => source.categories.list(type) });
}

export function useTransactions(query: TransactionQuery) {
  const source = useDataSource();
  return useQuery({
    queryKey: queryKeys.transactions(query),
    queryFn: () => source.transactions.list(query),
    placeholderData: keepPreviousData,
  });
}

export function useBudgets() {
  const source = useDataSource();
  return useQuery({ queryKey: queryKeys.budgets, queryFn: () => source.budgets.list() });
}

export function useIncomeSources() {
  const source = useDataSource();
  return useQuery({ queryKey: queryKeys.incomeSources, queryFn: () => source.incomeSources.list() });
}

export function useLoans() {
  const source = useDataSource();
  return useQuery({ queryKey: queryKeys.loans, queryFn: () => source.loans.list() });
}

export function useServices(month: MonthKey) {
  const source = useDataSource();
  return useQuery({ queryKey: queryKeys.services(month), queryFn: () => source.services.list(month) });
}

export function useSurcharges(serviceId: number, month: MonthKey) {
  const source = useDataSource();
  return useQuery({
    queryKey: queryKeys.surcharges(serviceId, month),
    queryFn: () => source.services.surcharges(serviceId, month),
  });
}

export function useSavingsGoals() {
  const source = useDataSource();
  return useQuery({ queryKey: queryKeys.savings, queryFn: () => source.savings.list() });
}

export function useQuincenas(month: MonthKey) {
  const source = useDataSource();
  return useQuery({
    queryKey: queryKeys.quincenas(month),
    queryFn: () => source.quincenas.overview(month),
    placeholderData: keepPreviousData,
  });
}

export function useCashFlow(range: DateRange) {
  const source = useDataSource();
  return useQuery({ queryKey: queryKeys.cashFlow(range), queryFn: () => source.analytics.cashFlow(range) });
}

export function useSpendingByCategory(range: DateRange) {
  const source = useDataSource();
  return useQuery({ queryKey: queryKeys.spending(range), queryFn: () => source.analytics.spendingByCategory(range) });
}
