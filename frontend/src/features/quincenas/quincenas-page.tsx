import { useSearchParams } from 'react-router';
import { CalendarRange, ChevronLeft, ChevronRight, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Money } from '@/components/shared/money';
import { Page, PageHeader } from '@/components/shared/page-header';
import { Panel, Stat } from '@/components/shared/section';
import { Segmented } from '@/components/shared/form';
import { EmptyState, ErrorState, ListSkeleton } from '@/components/shared/states';
import { useQuincenas, useSavingsGoals } from '@/data/queries';
import type { CardPlan, MonthKey } from '@/data/types';
import { quincenaOf, shiftMonth } from '@/lib/dates';
import { cn } from '@/lib/utils';
import { useFormat, useT } from '@/features/preferences/preferences-provider';
import { QuincenaColumn, type QuincenaMode } from './quincena-column';
import { quincenaBreakdown, savingsForQuincena } from './quincena-math';

const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

function useQuincenaParams() {
  const [params, setParams] = useSearchParams();
  const current = quincenaOf();
  const rawMonth = params.get('mes') ?? '';
  const month: MonthKey = MONTH_PATTERN.test(rawMonth) ? rawMonth : current.month;
  const mode: QuincenaMode = params.get('vista') === 'real' ? 'real' : 'plan';

  const set = (key: string, value: string | null) => setParams((prev) => {
    const next = new URLSearchParams(prev);
    if (value) next.set(key, value);
    else next.delete(key);
    return next;
  }, { replace: true });

  return {
    month,
    mode,
    current,
    setMonth: (value: MonthKey) => set('mes', value === current.month ? null : value),
    setMode: (value: QuincenaMode) => set('vista', value === 'plan' ? null : value),
  };
}

export default function QuincenasPage() {
  const fmt = useFormat();
  const { quincenas: t, common } = useT();
  const { month, mode, current, setMonth, setMode } = useQuincenaParams();
  const modeOptions = [
    { value: 'plan' as const, label: t.modes.plan },
    { value: 'real' as const, label: t.modes.real },
  ];
  const overview = useQuincenas(month);
  const goals = useSavingsGoals();

  const data = overview.data;
  const columns = data?.quincenas.map((quincena, index) => {
    const number = (index + 1) as 1 | 2;
    const savings = savingsForQuincena(goals.data ?? [], quincena, number, month);
    return { quincena, number, savings, breakdown: quincenaBreakdown(quincena, savings) };
  });
  const totals = columns?.reduce(
    (acc, c) => ({ income: acc.income + c.breakdown.income, committed: acc.committed + c.breakdown.committed, free: acc.free + c.breakdown.free }),
    { income: 0, committed: 0, free: 0 },
  );

  return (
    <Page>
      <PageHeader
        title={t.title}
        description={t.description}
        actions={<Segmented label={t.viewLabel} size="sm" className="h-9 w-40" options={modeOptions} value={mode} onChange={setMode} />}
      />

      <nav aria-label={t.monthNav} className="flex items-center justify-between gap-2 rounded-lg border bg-card p-2">
        <Button variant="ghost" size="icon" onClick={() => setMonth(shiftMonth(month, -1))} aria-label={t.previousMonth}><ChevronLeft /></Button>
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold first-letter:uppercase">{fmt.monthYear(`${month}-01`)}</h2>
          {month !== current.month && <Button variant="outline" size="xs" onClick={() => setMonth(current.month)}>{common.actions.goToday}</Button>}
        </div>
        <Button variant="ghost" size="icon" onClick={() => setMonth(shiftMonth(month, 1))} aria-label={t.nextMonth}><ChevronRight /></Button>
      </nav>

      {overview.isPending ? <ListSkeleton rows={6} /> : overview.isError ? (
        <ErrorState error={overview.error} onRetry={() => overview.refetch()} />
      ) : !columns || totals!.income === 0 && totals!.committed === 0 && mode === 'plan' ? (
        <EmptyState
          icon={CalendarRange}
          title={t.empty.title}
          description={t.empty.description}
        />
      ) : (
        <div className={cn('grid grid-cols-1 gap-6', overview.isPlaceholderData && 'opacity-60 transition-opacity')}>
          {mode === 'plan' && (
            <div className="grid grid-cols-3 gap-4 rounded-lg border bg-card p-4 md:p-5">
              <Stat label={t.totals.income} value={<Money value={totals!.income} />} />
              <Stat label={t.totals.committed} value={<Money value={totals!.committed} />} />
              <Stat label={totals!.free >= 0 ? common.money.free : common.money.shortfall} value={<Money value={totals!.free} tone={totals!.free < 0 ? 'outflow' : 'neutral'} />} />
            </div>
          )}

          {mode === 'plan' && data!.card_plan.length > 0 && <CardPlanPanel plans={data!.card_plan} />}

          <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
            {columns.map((column) => (
              <QuincenaColumn
                key={column.number}
                quincena={column.quincena}
                number={column.number}
                month={month}
                savings={column.savings}
                mode={mode}
                isCurrent={month === current.month && column.number === current.quincena}
              />
            ))}
          </div>
        </div>
      )}
    </Page>
  );
}

/** Cuánto guardar en cada quincena para que el pago de la tarjeta no caiga entero en un solo salario. */
function CardPlanPanel({ plans }: { plans: CardPlan[] }) {
  const fmt = useFormat();
  const { quincenas: { plan: t }, common } = useT();
  return (
    <Panel
      title={t.title}
      description={t.description}
    >
      <ul className="grid gap-5">
        {plans.map((plan) => (
          <li key={`${plan.card_id}-${plan.payment_due_date}`} className="grid gap-2.5">
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <p className="flex items-center gap-2 font-medium">
                <CreditCard className="size-4 text-card-debt" aria-hidden />
                {plan.card_name}
              </p>
              <p className="text-sm text-muted-foreground">
                {t.cycle(fmt.dayMonth(plan.cycle_start), fmt.dayMonth(plan.cutoff_date))} <Money value={plan.total} className="text-foreground" />{t.due(fmt.dayMonth(plan.payment_due_date))}
              </p>
            </div>
            <ol className="flex flex-wrap gap-2">
              {plan.schedule.map((step) => {
                const isPayment = step.role === 'pago';
                const covered = isPayment && step.amount <= 0.005;
                const missed = step.status === 'missed';
                return (
                  <li
                    key={`${step.month}-${step.quincena}-${step.role}`}
                    className={cn('rounded-md border px-3 py-2 text-sm', step.in_view ? 'bg-accent/60' : 'opacity-60')}
                  >
                    <span className="block text-xs text-muted-foreground">
                      {common.quincena.ofMonth(step.quincena, fmt.monthShort(`${step.month}-01`))}
                      {step.status && `, ${t.stepStatus[step.status]}`}
                    </span>
                    <span className={cn('font-medium', missed && 'text-muted-foreground line-through')}>
                      {covered ? t.covered : <>{isPayment ? t.pay : t.save} <Money value={step.amount} /></>}
                    </span>
                  </li>
                );
              })}
            </ol>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
