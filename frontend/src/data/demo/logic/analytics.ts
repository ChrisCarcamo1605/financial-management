import type { CashFlow, CashFlowPoint, CategorySpending, DashboardSummary, DateRange, SpendingByCategory } from '../../types';
import type { DemoState, TransactionRow } from '../schema';
import { accountView, budgetView, byId, transactionView } from '../views';
import { addMonthsYM, daysInMonth, iso, monthEnd, parse, type ISO } from './dates';
import { pyRound, pySum } from './numbers';

/** Port de services/analytics.py (sin pandas) y del resumen del dashboard. */

function inRange(state: DemoState, range: DateRange): TransactionRow[] {
  return state.transactions.filter((t) =>
    (!range.start_date || t.date >= range.start_date) && (!range.end_date || t.date <= range.end_date));
}

/** Entradas/salidas por mes, del primer al último mes con movimientos (resample('ME')). */
export function cashFlow(state: DemoState, range: DateRange): CashFlow {
  const txs = inRange(state, range);
  if (!txs.length) return { cash_flow: [], summary: {} };

  const byMonth = new Map<string, { income: number; expense: number }>();
  for (const t of txs) {
    const key = monthEnd(t.date);
    const bucket = byMonth.get(key) ?? { income: 0, expense: 0 };
    bucket[t.type] += t.amount;
    byMonth.set(key, bucket);
  }
  const months = [...byMonth.keys()].sort();
  const first = parse(months[0]);
  const last = parse(months[months.length - 1]);

  const points: CashFlowPoint[] = [];
  let cumulative = 0;
  for (let [y, m] = [first.y, first.m]; y < last.y || (y === last.y && m <= last.m); [y, m] = addMonthsYM(y, m, 1)) {
    const key = iso(y, m, daysInMonth(y, m));
    const { income, expense } = byMonth.get(key) ?? { income: 0, expense: 0 };
    const net = income - expense;
    cumulative += net;
    points.push({ date: `${key}T00:00:00`, expense, income, net, cumulative });
  }

  const totalIncome = pySum(points.map((p) => p.income));
  const totalExpense = pySum(points.map((p) => p.expense));
  const netFlow = totalIncome - totalExpense;
  return {
    cash_flow: points,
    summary: {
      total_income: totalIncome,
      total_expense: totalExpense,
      net_flow: netFlow,
      savings_rate: pyRound(totalIncome > 0 ? (netFlow / totalIncome) * 100 : 0),
      avg_monthly_income: totalIncome / points.length,
      avg_monthly_expense: totalExpense / points.length,
    } as CashFlow['summary'],
  };
}

export function spendingByCategory(state: DemoState, range: DateRange): SpendingByCategory & { period?: unknown } {
  const expenses = inRange(state, range).filter((t) => t.type === 'expense');
  if (!expenses.length) return { categories: [], total: 0 };

  const groups = new Map<string, TransactionRow[]>();
  for (const t of expenses) {
    const name = byId(state.categories, t.category_id)?.name;
    if (name == null) continue;
    groups.set(name, [...(groups.get(name) ?? []), t]);
  }
  const rows = [...groups.entries()].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)).map(([name, list]) => {
    const amounts = list.map((t) => t.amount);
    const category = byId(state.categories, list[0].category_id);
    const total = pySum(amounts);
    return {
      category_name: name,
      total_amount: total,
      transaction_count: amounts.length,
      avg_amount: total / amounts.length,
      min_amount: Math.min(...amounts),
      max_amount: Math.max(...amounts),
      color: category?.color ?? null,
      icon: category?.icon ?? null,
      icon_type: category?.icon_type ?? null,
      percentage: 0,
    } as CategorySpending & { min_amount: number; max_amount: number };
  });
  const totalExpenses = pySum(rows.map((r) => r.total_amount));
  for (const r of rows) r.percentage = pyRound((r.total_amount / totalExpenses) * 100);
  rows.sort((a, b) => b.total_amount - a.total_amount);
  return {
    categories: rows,
    total: totalExpenses,
    period: { start: range.start_date ?? null, end: range.end_date ?? null },
  };
}

function monthTotals(state: DemoState, y: number, m: number) {
  const start = iso(y, m, 1);
  const end = iso(y, m, daysInMonth(y, m));
  const totals = { income: 0, expense: 0 };
  for (const t of state.transactions) if (t.date >= start && t.date <= end) totals[t.type] += t.amount;
  return { income: pyRound(totals.income), expense: pyRound(totals.expense) };
}

export function dashboardSummary(state: DemoState, today: ISO): DashboardSummary {
  const t = parse(today);
  const accounts = [...state.accounts].sort((a, b) => a.created_at.localeCompare(b.created_at));
  const cash = accounts.filter((a) => a.type !== 'tarjeta_credito');
  const cards = accounts.filter((a) => a.type === 'tarjeta_credito');
  const current = monthTotals(state, t.y, t.m);
  const [py, pm] = addMonthsYM(t.y, t.m, -1);
  const previous = monthTotals(state, py, pm);
  const recent = [...state.transactions]
    .sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id)
    .slice(0, 10);
  return {
    total_balance: pyRound(pySum(cash.map((a) => a.balance))),
    credit_card_debt: pyRound(pySum(cards.map((a) => Math.max(-a.balance, 0)))),
    monthly_income: current.income,
    monthly_expense: current.expense,
    monthly_net: pyRound(current.income - current.expense),
    previous_month: { ...previous, net: pyRound(previous.income - previous.expense) },
    accounts: accounts.map(accountView),
    budgets_status: state.budgets.filter((b) => !b.end_date || b.end_date >= today).map((b) => budgetView(state, b, today)),
    recent_transactions: recent.map((tx) => transactionView(state, tx)),
  };
}
