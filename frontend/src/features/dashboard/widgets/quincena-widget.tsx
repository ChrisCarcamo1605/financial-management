import { Link } from 'react-router';
import { CalendarRange } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { CategoryIcon } from '@/components/shared/category-icon';
import { Money } from '@/components/shared/money';
import { ErrorState } from '@/components/shared/states';
import { useQuincenas, useSavingsGoals } from '@/data/queries';
import { daysBetween, parseDate, quincenaOf } from '@/lib/dates';
import { useFormat, useT } from '@/features/preferences/preferences-provider';
import { pendingLabel } from '@/features/quincenas/pending-label';
import { FlowBar } from '@/features/quincenas/flow-bar';
import { pendingItems, quincenaBreakdown, savingsForQuincena } from '@/features/quincenas/quincena-math';

const PENDING_LIMIT = 4;


/** Héroe del inicio: cuánto queda libre en la quincena en curso. */
export function QuincenaWidget() {
  const fmt = useFormat();
  const dictionary = useT();
  const t = dictionary.dashboard.quincena;
  const today = new Date();
  const current = quincenaOf(today);
  const overview = useQuincenas(current.month);
  const goals = useSavingsGoals();

  if (overview.isPending || goals.isPending) return <Skeleton className="h-72 rounded-lg" />;
  if (overview.isError) return <ErrorState error={overview.error} onRetry={() => overview.refetch()} />;

  const quincena = overview.data.quincenas[current.quincena - 1];
  const savings = savingsForQuincena(goals.data ?? [], quincena, current.quincena, current.month);
  const breakdown = quincenaBreakdown(quincena, savings);
  const pending = pendingItems(quincena, savings);
  const daysLeft = daysBetween(today, parseDate(quincena.end));

  return (
    <section className="grid gap-6 rounded-lg border bg-card p-5 md:p-6 lg:grid-cols-[1.6fr_1fr]" aria-label={t.regionLabel}>
      <div className="grid content-start gap-5">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h2 className="font-semibold">
            {t.heading(current.quincena === 1, fmt.date(`${current.month}-01`, 'LLLL'))}
          </h2>
          <p className="text-sm text-muted-foreground">
            {dictionary.common.dates.range(fmt.dayMonth(quincena.start), fmt.dayMonth(quincena.end))}
            {daysLeft >= 0 && ` · ${t.daysLeft(daysLeft)}`}
          </p>
        </div>

        <div>
          <p className="text-sm text-muted-foreground">{breakdown.free >= 0 ? t.freeLabel : t.shortLabel}</p>
          <Money
            value={Math.abs(breakdown.free)}
            tone={breakdown.free < 0 ? 'outflow' : 'neutral'}
            className="block text-4xl font-semibold tracking-tight md:text-5xl"
          />
          <p className="mt-1 text-sm text-muted-foreground">
            {t.incomeOf} <Money value={breakdown.income} /> {t.incomeIn} <Money value={breakdown.committed} /> {t.committed}
          </p>
        </div>

        {breakdown.income > 0 || breakdown.committed > 0 ? (
          <FlowBar breakdown={breakdown} />
        ) : (
          <p className="text-sm text-muted-foreground">
            {t.noIncomeBefore} <Link to="/ingresos" className="text-primary underline-offset-4 hover:underline">{t.noIncomeLink}</Link> {t.noIncomeAfter}
          </p>
        )}
      </div>

      <div className="grid content-start gap-3 border-t pt-5 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-6">
        <h3 className="text-sm font-medium">{t.pendingTitle}</h3>
        {pending.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t.allPaid}</p>
        ) : (
          <ul className="grid gap-2.5">
            {pending.slice(0, PENDING_LIMIT).map((item) => (
              <li key={item.key} className="flex items-center gap-3 text-sm">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                  <CategoryIcon icon={item.icon} size={15} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate">{pendingLabel(item, dictionary)}</span>
                  {item.date && <span className="text-xs text-muted-foreground">{fmt.dayMonth(item.date)}</span>}
                </span>
                <Money value={item.amount} className="font-medium" />
              </li>
            ))}
          </ul>
        )}
        {pending.length > PENDING_LIMIT && (
          <p className="text-xs text-muted-foreground">{t.more(pending.length - PENDING_LIMIT)}</p>
        )}
        <Button asChild variant="outline" size="sm" className="mt-1 justify-self-start">
          <Link to="/quincenas"><CalendarRange /> {t.open}</Link>
        </Button>
      </div>
    </section>
  );
}
