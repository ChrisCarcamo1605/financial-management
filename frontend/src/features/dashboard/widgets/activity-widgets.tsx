import { Progress } from '@/components/ui/progress';
import { CashFlowChart } from '@/components/charts/cash-flow-chart';
import { CategoryBars } from '@/components/charts/category-bars';
import { IconBadge } from '@/components/shared/category-icon';
import { Money } from '@/components/shared/money';
import {
  useBudgets, useCashFlow, useDashboardSummary, useSavingsGoals, useSpendingByCategory,
} from '@/data/queries';
import { useQuickActions } from '@/app/quick-actions';
import { lastMonthsRange, monthRange, toMonthKey } from '@/lib/dates';
import { cn } from '@/lib/utils';
import { useFormat, useT } from '@/features/preferences/preferences-provider';
import { TransactionRow } from '@/features/transactions/transaction-row';
import { WidgetBody, WidgetCard, WidgetEmpty } from './widget-card';

const CASH_FLOW_MONTHS = 6;

export function CashFlowWidget() {
  const range = lastMonthsRange(CASH_FLOW_MONTHS);
  const flow = useCashFlow(range);
  const t = useT().dashboard;
  return (
    <WidgetCard title={t.widgets.cashflow.title} to="/analisis" linkLabel={t.cashflow.link}>
      <WidgetBody query={flow} rows={5}>
        {() => flow.data!.cash_flow.length === 0
          ? <WidgetEmpty>{t.cashflow.empty}</WidgetEmpty>
          : <CashFlowChart data={flow.data!.cash_flow} height={220} />}
      </WidgetBody>
    </WidgetCard>
  );
}

export function SpendingWidget() {
  const spending = useSpendingByCategory(monthRange(toMonthKey()));
  const t = useT().dashboard;
  return (
    <WidgetCard title={t.spending.title} to="/movimientos?tipo=expense" linkLabel={t.spending.link}>
      <WidgetBody query={spending} rows={5}>
        {() => spending.data!.categories.length === 0
          ? <WidgetEmpty>{t.spending.empty}</WidgetEmpty>
          : <CategoryBars items={spending.data!.categories} limit={5} />}
      </WidgetBody>
    </WidgetCard>
  );
}

export function BudgetsWidget() {
  const budgets = useBudgets();
  const fmt = useFormat();
  const t = useT().dashboard;
  return (
    <WidgetCard title={t.widgets.budgets.title} to="/presupuestos">
      <WidgetBody query={budgets}>
        {() => {
          const active = (budgets.data ?? []).filter((b) => b.active).sort((a, b) => b.percentage - a.percentage);
          if (active.length === 0) return <WidgetEmpty>{t.budgets.empty}</WidgetEmpty>;
          return (
            <ul className="grid gap-4">
              {active.slice(0, 5).map((budget) => {
                const over = budget.percentage >= 100;
                const near = !over && budget.percentage >= 85;
                return (
                  <li key={budget.id} className="grid gap-1.5">
                    <div className="flex items-center gap-2 text-sm">
                      <IconBadge icon={budget.category_icon} color={budget.category_color} badgeSize="sm" />
                      <span className="min-w-0 flex-1 truncate">{budget.category_name}</span>
                      <span className={cn('text-xs', over ? 'font-medium text-outflow' : 'text-muted-foreground')}>
                        {over ? t.budgets.over : near ? t.budgets.near : t.budgets.left(fmt.money(budget.remaining))}
                      </span>
                    </div>
                    <Progress
                      value={Math.min(budget.percentage, 100)}
                      aria-label={t.budgets.usedAria(budget.category_name ?? '', Math.round(budget.percentage))}
                      className={cn('h-1.5', over && '[&>[data-slot=progress-indicator]]:bg-viz-outflow', near && '[&>[data-slot=progress-indicator]]:bg-viz-loan')}
                    />
                  </li>
                );
              })}
            </ul>
          );
        }}
      </WidgetBody>
    </WidgetCard>
  );
}

export function RecentWidget() {
  const summary = useDashboardSummary();
  const actions = useQuickActions();
  const fmt = useFormat();
  const t = useT().dashboard;
  return (
    <WidgetCard title={t.widgets.recent.title} to="/movimientos">
      <WidgetBody query={summary} rows={5}>
        {() => summary.data!.recent_transactions.length === 0
          ? <WidgetEmpty>{t.recent.empty}</WidgetEmpty>
          : (
            <ul className="-mx-4 divide-y md:-mx-5">
              {summary.data!.recent_transactions.slice(0, 6).map((tx) => (
                <li key={tx.id}>
                  <TransactionRow transaction={tx} onSelect={actions.editTransaction} meta={`${fmt.dayMonth(tx.date)}, ${tx.account_name ?? ''}`} />
                </li>
              ))}
            </ul>
          )}
      </WidgetBody>
    </WidgetCard>
  );
}

export function SavingsWidget() {
  const goals = useSavingsGoals();
  const t = useT().dashboard;
  return (
    <WidgetCard title={t.widgets.savings.title} to="/ahorro">
      <WidgetBody query={goals}>
        {() => {
          const active = (goals.data ?? []).filter((g) => g.active);
          if (active.length === 0) return <WidgetEmpty>{t.savings.empty}</WidgetEmpty>;
          return (
            <ul className="grid gap-4">
              {active.slice(0, 4).map((goal) => (
                <li key={goal.id} className="grid gap-1.5">
                  <div className="flex items-center gap-2 text-sm">
                    <IconBadge icon={goal.icon} color={goal.color} badgeSize="sm" />
                    <span className="min-w-0 flex-1 truncate">{goal.name}</span>
                    <span className="text-xs text-muted-foreground"><Money value={goal.current_amount} whole /> {t.savings.of} <Money value={goal.target_amount} whole /></span>
                  </div>
                  <Progress value={Math.min(goal.percentage, 100)} aria-label={`${goal.name}: ${Math.round(goal.percentage)}%`} className="h-1.5 [&>[data-slot=progress-indicator]]:bg-viz-saving" />
                </li>
              ))}
            </ul>
          );
        }}
      </WidgetBody>
    </WidgetCard>
  );
}
