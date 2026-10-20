import { useMemo } from 'react';
import { useSearchParams } from 'react-router';
import { ChartNoAxesColumn } from 'lucide-react';
import { CashFlowChart, type CashFlowDatum } from '@/components/charts/cash-flow-chart';
import { TrendLineChart } from '@/components/charts/trend-line-chart';
import { CategoryBars } from '@/components/charts/category-bars';
import { Segmented } from '@/components/shared/form';
import { Money } from '@/components/shared/money';
import { Page, PageHeader } from '@/components/shared/page-header';
import { Panel, Stat } from '@/components/shared/section';
import { EmptyState, ErrorState, ListSkeleton } from '@/components/shared/states';
import { useCashFlow, useSpendingByCategory } from '@/data/queries';
import type { CategorySpending } from '@/data/types';
import { lastMonthsRange } from '@/lib/dates';
import { useFormat, useT } from '@/features/preferences/preferences-provider';

type Period = '3' | '6' | '12';

const PERIODS: Period[] = ['3', '6', '12'];

function parsePeriod(value: string | null): Period {
  return value === '3' || value === '12' ? value : '6';
}

export default function AnalyticsPage() {
  const t = useT().analytics;
  const [params, setParams] = useSearchParams();
  const periodOptions = PERIODS.map((value) => ({ value, label: t.months(Number(value)) }));
  const period = parsePeriod(params.get('periodo'));
  const range = useMemo(() => lastMonthsRange(Number(period)), [period]);
  const cashFlow = useCashFlow(range);
  const spending = useSpendingByCategory(range);

  const months: CashFlowDatum[] = useMemo(
    () => (cashFlow.data?.cash_flow ?? []).map((p) => ({ date: p.date, income: p.income, expense: p.expense })),
    [cashFlow.data],
  );
  const categories = spending.data?.categories ?? [];

  return (
    <Page>
      <PageHeader
        title={t.title}
        description={t.description}
        actions={(
          <Segmented
            label={t.period}
            size="sm"
            className="w-auto"
            options={periodOptions}
            value={period}
            onChange={(next: Period) => setParams({ periodo: next }, { replace: true })}
          />
        )}
      />

      {cashFlow.isPending ? <ListSkeleton rows={5} /> : cashFlow.isError ? (
        <ErrorState error={cashFlow.error} onRetry={() => cashFlow.refetch()} />
      ) : months.length === 0 ? (
        <EmptyState
          icon={ChartNoAxesColumn}
          title={t.emptyTitle}
          description={t.emptyDescription}
        />
      ) : (
        <>
          <Summary months={months} />
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
            <Panel title={t.cashFlow.title} description={t.cashFlow.description}>
              <CashFlowChart data={months} height={280} />
            </Panel>
            <Panel title={t.spending.title} description={t.spending.description}>
              {spending.isPending ? <ListSkeleton rows={5} /> : spending.isError ? (
                <ErrorState error={spending.error} onRetry={() => spending.refetch()} />
              ) : categories.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t.spending.empty}</p>
              ) : (
                <CategoryBars items={categories} limit={8} />
              )}
            </Panel>
          </div>
          <Panel title={t.trend.title} description={t.trend.description}>
            <TrendLineChart data={months.map((m) => ({ ...m, net: m.income - m.expense }))} />
          </Panel>
          <Insights months={months} categories={categories} />
          <MonthTable months={months} />
        </>
      )}
    </Page>
  );
}

function totals(months: CashFlowDatum[]) {
  const income = months.reduce((sum, m) => sum + m.income, 0);
  const expense = months.reduce((sum, m) => sum + m.expense, 0);
  return { income, expense, net: income - expense };
}

function Summary({ months }: { months: CashFlowDatum[] }) {
  const fmt = useFormat();
  const { analytics: t, common } = useT();
  const { income, expense, net } = totals(months);
  const savingsRate = income > 0 ? (net / income) * 100 : null;
  return (
    <div className="grid grid-cols-2 gap-4 rounded-lg border bg-card p-4 md:grid-cols-4 md:p-5">
      <Stat label={common.money.income} value={<Money value={income} />} />
      <Stat label={common.money.expense} value={<Money value={expense} />} />
      <Stat label={common.money.net} value={<Money value={net} signed tone="auto" />} />
      <Stat
        label={t.summary.savingsRate}
        value={savingsRate === null ? '—' : fmt.percent(savingsRate, 1)}
        hint={t.summary.savingsRateHint}
      />
    </div>
  );
}

function Insights({ months, categories }: { months: CashFlowDatum[]; categories: CategorySpending[] }) {
  const fmt = useFormat();
  const t = useT().analytics.insights;
  const { expense } = totals(months);
  const peak = months.reduce((max, m) => (m.expense > max.expense ? m : max), months[0]);
  const top = categories[0];
  const average = expense / months.length;

  const sentences = [
    t.average(fmt.money(average)),
    peak.expense > 0 && t.peak(fmt.monthYear(peak.date), fmt.money(peak.expense)),
    top && t.top(top.category_name, fmt.percent(top.percentage)),
  ].filter(Boolean) as string[];

  return (
    <Panel title={t.title}>
      <ul className="grid gap-2 text-sm">
        {sentences.map((sentence) => (
          <li key={sentence} className="flex gap-2">
            <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" aria-hidden />
            {sentence}
          </li>
        ))}
      </ul>
    </Panel>
  );
}

function MonthTable({ months }: { months: CashFlowDatum[] }) {
  const fmt = useFormat();
  const { analytics: t, common } = useT();
  const rows = [...months].reverse();
  return (
    <Panel title={t.table.title} bodyClassName="p-0 md:p-0">
      <table className="w-full text-sm">
        <thead className="hidden text-left text-muted-foreground md:table-header-group">
          <tr className="border-b">
            <th scope="col" className="px-5 py-2.5 font-normal">{common.charts.month}</th>
            <th scope="col" className="px-5 py-2.5 text-right font-normal">{common.money.income}</th>
            <th scope="col" className="px-5 py-2.5 text-right font-normal">{common.money.expense}</th>
            <th scope="col" className="px-5 py-2.5 text-right font-normal">{common.money.net}</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {rows.map((m) => (
            <tr key={m.date} className="grid grid-cols-3 gap-x-3 gap-y-1 px-4 py-3 md:table-row md:p-0">
              <th scope="row" className="col-span-3 text-left font-medium capitalize md:px-5 md:py-3">{fmt.monthYear(m.date)}</th>
              <td className="md:px-5 md:py-3 md:text-right">
                <span className="block text-xs text-muted-foreground md:hidden">{common.money.income}</span>
                <Money value={m.income} />
              </td>
              <td className="md:px-5 md:py-3 md:text-right">
                <span className="block text-xs text-muted-foreground md:hidden">{common.money.expense}</span>
                <Money value={m.expense} />
              </td>
              <td className="md:px-5 md:py-3 md:text-right">
                <span className="block text-xs text-muted-foreground md:hidden">{common.money.net}</span>
                <Money value={m.income - m.expense} signed tone="auto" className="font-medium" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Panel>
  );
}
