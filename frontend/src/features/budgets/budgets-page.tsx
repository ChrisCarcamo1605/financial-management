import { useRef, useState } from 'react';
import { Pencil, Plus, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { IconBadge } from '@/components/shared/category-icon';
import { Money } from '@/components/shared/money';
import { Page, PageHeader } from '@/components/shared/page-header';
import { Panel, Stat } from '@/components/shared/section';
import { EmptyState, ErrorState, ListSkeleton } from '@/components/shared/states';
import { useBudgets, useTransactions } from '@/data/queries';
import type { Budget } from '@/data/types';
import { useQuickActions } from '@/app/quick-actions';
import { useIsDesktop } from '@/hooks/use-media-query';
import { cn } from '@/lib/utils';
import { useFormat, useT } from '@/features/preferences/preferences-provider';
import { BudgetForm } from './budget-form';
import { budgetState, type BudgetState } from './budget-labels';

const BAR_COLORS: Record<BudgetState, string> = {
  ok: 'bg-primary',
  near: 'bg-viz-loan',
  over: 'bg-viz-outflow',
};

const STATE_TEXT: Record<BudgetState, string> = {
  ok: 'text-muted-foreground',
  near: 'text-loan',
  over: 'text-outflow font-medium',
};

export default function BudgetsPage() {
  const budgets = useBudgets();
  const t = useT().budgets;
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Budget | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const detailRef = useRef<HTMLDivElement>(null);
  const isDesktop = useIsDesktop();

  const openForm = (budget: Budget | null) => {
    setEditing(budget);
    setFormOpen(true);
  };

  const list = budgets.data ?? [];
  // Sin selección explícita se muestra el presupuesto más consumido.
  const selected = list.find((b) => b.id === selectedId)
    ?? list.reduce<Budget | null>((top, b) => (!top || b.percentage > top.percentage ? b : top), null);

  const select = (id: number) => {
    setSelectedId(id);
    // En móvil el detalle queda debajo de la lista: llevar la vista hasta él.
    if (!isDesktop) requestAnimationFrame(() => detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  };
  const active = list.filter((b) => b.active);
  const totalBudgeted = active.reduce((sum, b) => sum + b.amount, 0);
  const totalSpent = active.reduce((sum, b) => sum + b.spent, 0);
  const overCount = active.filter((b) => budgetState(b) === 'over').length;

  return (
    <Page>
      <PageHeader
        title={t.title}
        description={t.description}
        actions={<Button onClick={() => openForm(null)}><Plus /> {t.new}</Button>}
      />

      {budgets.isPending ? <ListSkeleton rows={4} /> : budgets.isError ? (
        <ErrorState error={budgets.error} onRetry={() => budgets.refetch()} />
      ) : list.length === 0 ? (
        <EmptyState
          icon={Target}
          title={t.empty.title}
          description={t.empty.description}
          action={<Button onClick={() => openForm(null)}><Plus /> {t.new}</Button>}
        />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 rounded-lg border bg-card p-4 md:grid-cols-3 md:p-5">
            <Stat label={t.stats.budgeted} value={<Money value={totalBudgeted} />} hint={t.stats.budgetedHint} />
            <Stat label={t.stats.spent} value={<Money value={totalSpent} />} />
            <Stat
              className="col-span-2 md:col-span-1"
              label={t.stats.over}
              value={<span className={cn(overCount > 0 && 'text-outflow')}>{t.stats.overValue(overCount, active.length)}</span>}
            />
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] xl:grid-cols-[minmax(0,1fr)_26rem]">
            <ul className="grid grid-cols-1 content-start gap-3 sm:grid-cols-2" aria-label={t.listLabel}>
              {list.map((budget) => (
                <li key={budget.id} className="min-w-0">
                  <BudgetCard
                    budget={budget}
                    selected={selected?.id === budget.id}
                    onSelect={() => select(budget.id)}
                    onEdit={() => openForm(budget)}
                  />
                </li>
              ))}
            </ul>
            {selected && <div ref={detailRef} className="min-w-0 scroll-mt-20"><CycleTransactions budget={selected} /></div>}
          </div>
        </>
      )}

      <BudgetForm open={formOpen} onOpenChange={setFormOpen} budget={editing} />
    </Page>
  );
}

function BudgetCard({ budget, selected, onSelect, onEdit }: {
  budget: Budget;
  selected: boolean;
  onSelect(): void;
  onEdit(): void;
}) {
  const fmt = useFormat();
  const t = useT().budgets;
  const state = budgetState(budget);
  const name = budget.category_name ?? t.card.fallbackCategory;

  return (
    <article
      className={cn(
        'relative flex h-full flex-col gap-4 rounded-lg border bg-card p-4 transition-colors',
        selected ? 'border-primary ring-1 ring-primary' : 'hover:border-primary/40',
        !budget.active && 'opacity-70',
      )}
    >
      <header className="flex items-start gap-3">
        <IconBadge icon={budget.category_icon} color={budget.category_color} />
        <div className="min-w-0 flex-1">
          {/* El botón principal cubre la tarjeta: toda el área selecciona el presupuesto. */}
          <button
            type="button"
            onClick={onSelect}
            aria-pressed={selected}
            className="block w-full truncate text-left font-medium after:absolute after:inset-0 after:rounded-lg focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-ring"
          >
            {name}
          </button>
          <p className="text-xs text-muted-foreground">
            {t.periods[budget.period]}{!budget.active && `, ${t.card.expired}`}
          </p>
        </div>
        <Button variant="ghost" size="icon-sm" className="relative z-10 -mt-1 -mr-2" onClick={onEdit} aria-label={t.card.edit(name)}>
          <Pencil />
        </Button>
      </header>

      <div>
        <p className="flex items-baseline gap-1.5">
          <Money value={budget.spent} className="text-xl font-semibold" />
          <span className="text-sm text-muted-foreground">{t.card.of} <Money value={budget.amount} /></span>
        </p>
        <div
          className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-viz-track"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(Math.min(budget.percentage, 100))}
          aria-label={t.card.usage(name, Math.round(budget.percentage))}
        >
          <div className={cn('h-full rounded-full', BAR_COLORS[state])} style={{ width: `${Math.min(budget.percentage, 100)}%` }} />
        </div>
        <p className="mt-2 flex items-center justify-between gap-2 text-xs">
          <span className={STATE_TEXT[state]}>
            {state === 'over'
              ? <>{t.card.overBy} <Money value={-budget.remaining} /></>
              : <>{t.states[state]}, {t.card.remaining} <Money value={budget.remaining} /></>}
          </span>
          <span className="shrink-0 text-muted-foreground tabular">{fmt.percent(budget.percentage)}</span>
        </p>
      </div>

      <p className="mt-auto text-xs text-muted-foreground">
        {t.card.cycle(fmt.dayMonth(budget.cycle_start), fmt.dayMonth(budget.cycle_end))}
      </p>
    </article>
  );
}

function CycleTransactions({ budget }: { budget: Budget }) {
  const fmt = useFormat();
  const t = useT().budgets;
  const actions = useQuickActions();
  const transactions = useTransactions({
    category_id: budget.category_id,
    type: 'expense',
    start_date: budget.cycle_start,
    end_date: budget.cycle_end,
    limit: 100,
  });
  const items = transactions.data?.data ?? [];

  return (
    <Panel
      className="lg:sticky lg:top-20"
      title={t.cycle.title(budget.category_name)}
      description={t.card.cycle(fmt.dayMonth(budget.cycle_start), fmt.dayMonth(budget.cycle_end))}
      bodyClassName="p-0 md:p-0"
    >
      {transactions.isPending ? <ListSkeleton rows={3} className="p-4" /> : transactions.isError ? (
        <ErrorState error={transactions.error} onRetry={() => transactions.refetch()} className="m-4" />
      ) : items.length === 0 ? (
        <p className="px-4 pt-2 pb-5 text-sm text-muted-foreground md:px-5">
          {t.cycle.empty}
        </p>
      ) : (
        <>
          <ul className="mt-2 max-h-[28rem] divide-y overflow-y-auto border-t">
            {items.map((tx) => (
              <li key={tx.id}>
                <button
                  type="button"
                  onClick={() => actions.editTransaction(tx)}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-accent focus-visible:bg-accent focus-visible:outline-none md:px-5"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{tx.description || tx.category_name || t.cycle.fallbackExpense}</span>
                    <span className="block truncate text-xs text-muted-foreground">{fmt.dayMonth(tx.date)}, {tx.account_name}</span>
                  </span>
                  <Money value={-tx.amount} signed tone="outflow" className="text-sm font-medium" />
                </button>
              </li>
            ))}
          </ul>
          <p className="flex justify-between border-t px-4 py-3 text-sm md:px-5">
            <span className="text-muted-foreground">{t.cycle.count(items.length)}</span>
            <Money value={budget.spent} className="font-medium" />
          </p>
        </>
      )}
    </Panel>
  );
}
