import { useEffect, useEffectEvent, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import { ArrowLeftRight, ChevronLeft, ChevronRight, Plus, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Money } from '@/components/shared/money';
import { Page, PageHeader } from '@/components/shared/page-header';
import { Segmented, SelectInput } from '@/components/shared/form';
import { EmptyState, ErrorState, ListSkeleton } from '@/components/shared/states';
import { useAccounts, useCategories, useTransactions } from '@/data/queries';
import type { Transaction, TransactionQuery, TxType } from '@/data/types';
import { useQuickActions } from '@/app/quick-actions';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { lastMonthsRange, monthRange, shiftMonth, toMonthKey } from '@/lib/dates';
import { useFormat, useT } from '@/features/preferences/preferences-provider';
import { TransactionRow } from './transaction-row';

const PAGE_SIZE = 50;

const PERIODS = {
  mes: { label: 'month', range: () => monthRange(toMonthKey()) },
  'mes-anterior': { label: 'lastMonth', range: () => monthRange(shiftMonth(toMonthKey(), -1)) },
  '3m': { label: 'last3', range: () => lastMonthsRange(3) },
  '12m': { label: 'last12', range: () => lastMonthsRange(12) },
  todo: { label: 'all', range: () => ({}) },
} as const;
type PeriodKey = keyof typeof PERIODS;

const SORTS = {
  'fecha-desc': { label: 'dateDesc', sort: 'date', order: 'desc' },
  'fecha-asc': { label: 'dateAsc', sort: 'date', order: 'asc' },
  'monto-desc': { label: 'amountDesc', sort: 'amount', order: 'desc' },
  'monto-asc': { label: 'amountAsc', sort: 'amount', order: 'asc' },
} as const;
type SortKey = keyof typeof SORTS;

const TYPE_FILTERS = [
  { value: 'todos', label: 'all' },
  { value: 'expense', label: 'expense' },
  { value: 'income', label: 'income' },
] as const;

const ALL = 'todas';

/** Filtros guardados en la URL: se pueden compartir y el botón atrás los respeta. */
function useTransactionFilters() {
  const [params, setParams] = useSearchParams();
  const period = (params.get('periodo') as PeriodKey) in PERIODS ? (params.get('periodo') as PeriodKey) : 'mes';
  const sort = (params.get('orden') as SortKey) in SORTS ? (params.get('orden') as SortKey) : 'fecha-desc';
  const type = params.get('tipo') === 'income' || params.get('tipo') === 'expense' ? (params.get('tipo') as TxType) : undefined;

  const filters = {
    period,
    sort,
    type,
    account: params.get('cuenta') ?? ALL,
    category: params.get('categoria') ?? ALL,
    page: Math.max(Number(params.get('pagina')) || 1, 1),
    search: params.get('q') ?? '',
  };

  function set(patch: Record<string, string | undefined>, resetPage = true) {
    setParams((current) => {
      const next = new URLSearchParams(current);
      for (const [key, value] of Object.entries(patch)) {
        if (value === undefined || value === '' || value === ALL) next.delete(key);
        else next.set(key, value);
      }
      if (resetPage) next.delete('pagina');
      return next;
    }, { replace: true });
  }

  return { filters, set };
}

export default function TransactionsPage() {
  const actions = useQuickActions();
  const { transactions: t, common } = useT();
  const { filters, set } = useTransactionFilters();
  const [searchDraft, setSearchDraft] = useState(filters.search);
  const search = useDebouncedValue(searchDraft.trim(), 300);
  const accounts = useAccounts();
  const categories = useCategories();

  const query = useMemo<TransactionQuery>(() => ({
    ...PERIODS[filters.period].range(),
    type: filters.type,
    account_id: filters.account !== ALL ? Number(filters.account) : undefined,
    category_id: filters.category !== ALL ? Number(filters.category) : undefined,
    search: search || undefined,
    sort: SORTS[filters.sort].sort,
    order: SORTS[filters.sort].order,
    limit: PAGE_SIZE,
    offset: (filters.page - 1) * PAGE_SIZE,
  }), [filters.period, filters.type, filters.account, filters.category, filters.sort, filters.page, search]);

  // La búsqueda se escribe en la URL solo cuando el texto escrito se estabiliza.
  const syncSearch = useEffectEvent((value: string) => {
    if (value !== filters.search) set({ q: value || undefined });
  });
  useEffect(() => syncSearch(search), [search]);

  const transactions = useTransactions(query);
  const page = transactions.data;
  const totalPages = page ? Math.max(Math.ceil(page.total / PAGE_SIZE), 1) : 1;
  const hasFilters = Boolean(filters.type || filters.account !== ALL || filters.category !== ALL || search);

  const categoryOptions = [
    { value: ALL, label: t.allCategories },
    ...(categories.data ?? [])
      .filter((c) => !filters.type || c.type === filters.type)
      .map((c) => ({ value: String(c.id), label: c.name })),
  ];
  const accountOptions = [
    { value: ALL, label: t.allAccounts },
    ...(accounts.data ?? []).map((a) => ({ value: String(a.id), label: a.name })),
  ];

  return (
    <Page>
      <PageHeader
        title={t.title}
        description={t.description}
      />

      <div className="grid gap-3 rounded-lg border bg-card p-3 md:p-4">
        <div className="grid gap-3 lg:grid-cols-[1fr_auto]">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input
              type="search"
              value={searchDraft}
              onChange={(event) => setSearchDraft(event.target.value)}
              placeholder={t.searchPlaceholder}
              aria-label={t.searchAria}
              className="pl-9"
            />
          </div>
          <Segmented
            label={t.typeLabel}
            size="sm"
            className="h-9 lg:w-72"
            options={TYPE_FILTERS.map((o) => ({ value: o.value, label: t.types[o.label] }))}
            value={filters.type ?? 'todos'}
            onChange={(value) => set({ tipo: value === 'todos' ? undefined : value, categoria: undefined })}
          />
        </div>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          <SelectInput
            value={filters.period}
            onChange={(value) => set({ periodo: value === 'mes' ? undefined : value })}
            options={Object.entries(PERIODS).map(([value, p]) => ({ value, label: t.periods[p.label] }))}
            className="h-9"
          />
          <SelectInput value={filters.account} onChange={(value) => set({ cuenta: value })} options={accountOptions} className="h-9" />
          <SelectInput value={filters.category} onChange={(value) => set({ categoria: value })} options={categoryOptions} className="h-9" />
          <SelectInput
            value={filters.sort}
            onChange={(value) => set({ orden: value === 'fecha-desc' ? undefined : value })}
            options={Object.entries(SORTS).map(([value, s]) => ({ value, label: t.sorts[s.label] }))}
            className="h-9"
          />
        </div>
      </div>

      {page && (
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
          <span className="text-muted-foreground">
            {t.count(page.total)}
          </span>
          <span>{common.money.income} <Money value={page.summary.income} tone="inflow" className="font-medium" /></span>
          <span>{common.money.expense} <Money value={page.summary.expense} className="font-medium" /></span>
          <span>{common.money.net} <Money value={page.summary.income - page.summary.expense} signed className="font-medium" /></span>
          {hasFilters && (
            <Button
              variant="ghost"
              size="sm"
              className="ml-auto"
              onClick={() => {
                setSearchDraft('');
                set({ tipo: undefined, cuenta: undefined, categoria: undefined, q: undefined });
              }}
            >
              <X /> {t.clearFilters}
            </Button>
          )}
        </div>
      )}

      {transactions.isPending ? <ListSkeleton rows={8} /> : transactions.isError ? (
        <ErrorState error={transactions.error} onRetry={() => transactions.refetch()} />
      ) : page!.data.length === 0 ? (
        <EmptyState
          icon={ArrowLeftRight}
          title={hasFilters ? t.empty.filteredTitle : t.empty.title}
          description={hasFilters ? t.empty.filteredDescription : t.empty.description}
          action={!hasFilters && <Button onClick={() => actions.newTransaction()}><Plus /> {common.actions.register}</Button>}
        />
      ) : (
        <>
          <GroupedTransactions
            transactions={page!.data}
            groupByDay={SORTS[filters.sort].sort === 'date'}
            onSelect={actions.editTransaction}
            dimmed={transactions.isPlaceholderData}
          />
          {totalPages > 1 && (
            <nav aria-label={common.pagination.label} className="flex items-center justify-between gap-3">
              <Button variant="outline" size="sm" disabled={filters.page <= 1} onClick={() => set({ pagina: String(filters.page - 1) }, false)}>
                <ChevronLeft /> {common.actions.previous}
              </Button>
              <span className="text-sm text-muted-foreground">{common.pagination.page(filters.page, totalPages)}</span>
              <Button variant="outline" size="sm" disabled={filters.page >= totalPages} onClick={() => set({ pagina: String(filters.page + 1) }, false)}>
                {common.actions.next} <ChevronRight />
              </Button>
            </nav>
          )}
        </>
      )}
    </Page>
  );
}

interface GroupedTransactionsProps {
  transactions: Transaction[];
  groupByDay: boolean;
  onSelect(transaction: Transaction): void;
  dimmed?: boolean;
}

/** Lista agrupada por día con el neto de cada día; sin agrupar cuando se ordena por monto. */
function GroupedTransactions({ transactions, groupByDay, onSelect, dimmed }: GroupedTransactionsProps) {
  const fmt = useFormat();
  const t = useT();
  const groups = useMemo(() => {
    if (!groupByDay) return [{ key: 'all', title: null, net: 0, items: transactions }];
    const byDate = new Map<string, Transaction[]>();
    for (const tx of transactions) byDate.set(tx.date, [...(byDate.get(tx.date) ?? []), tx]);
    return [...byDate.entries()].map(([date, items]) => ({
      key: date,
      title: date,
      net: items.reduce((sum, tx) => sum + (tx.type === 'income' ? tx.amount : -tx.amount), 0),
      items,
    }));
  }, [transactions, groupByDay]);

  return (
    <div className={dimmed ? 'opacity-60 transition-opacity' : 'transition-opacity'}>
      <div className="overflow-clip rounded-lg border bg-card">
        {groups.map((group) => (
          <section key={group.key} aria-label={group.title ? fmt.date(group.title) : t.transactions.groupLabel}>
            {group.title && (
              <header className="sticky top-14 z-10 flex items-center justify-between border-b bg-muted/80 px-4 py-1.5 text-xs backdrop-blur md:px-5">
                <span className="font-medium first-letter:uppercase">{fmt.date(group.title, t.common.dates.dayGroup)}</span>
                <Money value={group.net} signed tone="muted" />
              </header>
            )}
            <ul className="divide-y">
              {group.items.map((tx) => (
                <li key={tx.id}><TransactionRow transaction={tx} onSelect={onSelect} /></li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
