import type {
  Account, Budget, Category, IncomeSource, Loan, LoanPayment, RecurringService, SavingsContribution,
  SavingsGoal, Transaction, Transfer,
} from '../types';
import { currentPeriod } from './logic/budget-period';
import type { ISO } from './logic/dates';
import { pyRound, pySum } from './logic/numbers';
import { calculateDeductions } from './logic/salary';
import type {
  AccountRow, BudgetRow, CategoryRow, ContributionRow, DemoState, IncomeSourceRow, LoanPaymentRow, LoanRow,
  SavingsGoalRow, ServiceRow, TransactionRow, TransferRow,
} from './schema';

/**
 * Equivalentes de los `to_dict` de los modelos del backend: convierten filas
 * del estado en las mismas formas que devuelve la API.
 */
export const byId = <T extends { id: number }>(rows: T[], id: number | null | undefined) =>
  id == null ? undefined : rows.find((row) => row.id === id);

export function accountView(a: AccountRow): Account {
  const card = a.type === 'tarjeta_credito';
  return {
    id: a.id,
    name: a.name,
    balance: a.balance,
    currency: a.currency,
    type: a.type,
    credit_limit: a.credit_limit,
    cutoff_day: a.cutoff_day,
    payment_due_day: a.payment_due_day,
    start_date: a.start_date,
    available: card && a.credit_limit != null ? pyRound(a.credit_limit + a.balance) : null,
    created_at: a.created_at,
  };
}

export function categoryView(c: CategoryRow): Category {
  return { id: c.id, name: c.name, type: c.type, color: c.color, icon: c.icon, iconType: c.icon_type };
}

export function transactionView(state: DemoState, t: TransactionRow): Transaction {
  const account = byId(state.accounts, t.account_id);
  const category = byId(state.categories, t.category_id);
  const loan = byId(state.loans, t.loan_id);
  return {
    id: t.id,
    account_id: t.account_id,
    category_id: t.category_id,
    amount: t.amount,
    type: t.type,
    description: t.description,
    date: t.date,
    loan_id: t.loan_id,
    recurring_service_id: t.recurring_service_id,
    account_name: account?.name ?? null,
    category_name: category?.name ?? null,
    category_color: category?.color ?? null,
    category_icon: category?.icon ?? null,
    category_icon_type: category?.icon_type ?? null,
    loan_name: loan?.name ?? null,
  };
}

export function transferView(state: DemoState, t: TransferRow): Transfer {
  return {
    id: t.id,
    from_account_id: t.from_account_id,
    from_account_name: byId(state.accounts, t.from_account_id)?.name ?? null,
    to_account_id: t.to_account_id,
    to_account_name: byId(state.accounts, t.to_account_id)?.name ?? null,
    amount: t.amount,
    date: t.date,
    description: t.description,
  };
}

/** Budget.get_spent: gasto de la categoría dentro del ciclo. */
function budgetSpent(state: DemoState, b: BudgetRow, start: ISO, end: ISO) {
  return pyRound(pySum(state.transactions
    .filter((t) => t.category_id === b.category_id && t.type === 'expense' && t.date >= start && t.date <= end)
    .map((t) => t.amount)));
}

export function budgetView(state: DemoState, b: BudgetRow, today: ISO): Budget {
  const category = byId(state.categories, b.category_id);
  const cycle = currentPeriod(b.period, b.start_date, b.start_day, b.end_date, today);
  const spent = budgetSpent(state, b, cycle.cycle_start, cycle.cycle_end);
  return {
    id: b.id,
    category_id: b.category_id,
    amount: b.amount,
    period: b.period,
    start_day: b.start_day,
    start_date: b.start_date,
    end_date: b.end_date,
    category_name: category?.name ?? null,
    category_color: category?.color ?? null,
    category_icon: category?.icon ?? null,
    category_icon_type: category?.icon_type ?? null,
    ...cycle,
    spent,
    remaining: pyRound(b.amount - spent),
    percentage: b.amount ? pyRound((spent / b.amount) * 100, 1) : 0,
  };
}

export function incomeSourceView(state: DemoState, s: IncomeSourceRow): IncomeSource {
  const breakdown = calculateDeductions(s.gross_amount, s.modality);
  return {
    id: s.id,
    name: s.name,
    modality: s.modality,
    gross_amount: s.gross_amount,
    pay_schedule: s.pay_schedule,
    pay_day: s.pay_day,
    currency: s.currency,
    isss: breakdown.isss,
    afp: breakdown.afp,
    isr: breakdown.isr,
    net_amount: breakdown.net,
    net_per_payment: s.pay_schedule === 'biweekly' ? pyRound(breakdown.net / 2) : breakdown.net,
    account_id: s.account_id,
    account_name: byId(state.accounts, s.account_id)?.name ?? null,
    category_id: s.category_id,
    category_name: byId(state.categories, s.category_id)?.name ?? null,
  };
}

export function loanPaymentView(p: LoanPaymentRow, today: ISO): LoanPayment {
  return {
    id: p.id,
    loan_id: p.loan_id,
    installment_number: p.installment_number,
    due_date: p.due_date,
    amount: p.amount,
    paid_amount: p.paid_amount,
    status: p.status,
    paid_date: p.paid_date,
    transaction_id: p.transaction_id,
    is_advance: p.status === 'paid' && p.due_date > today,
  };
}

export function loanView(state: DemoState, loan: LoanRow, today: ISO): Loan {
  const payments = state.loanPayments.filter((p) => p.loan_id === loan.id);
  const total = pySum(payments.map((p) => p.amount));
  const paid = pySum(payments.map((p) => p.paid_amount));
  const category = byId(state.categories, loan.category_id);
  const sorted = [...payments].sort((a, b) => a.due_date.localeCompare(b.due_date));
  return {
    id: loan.id,
    name: loan.name,
    principal: loan.principal,
    interest_rate: loan.interest_rate,
    interest_method: loan.interest_method,
    payment_type: loan.payment_type,
    installments: loan.installments,
    payment_day: loan.payment_day,
    start_date: loan.start_date,
    income_source_id: loan.income_source_id,
    category_id: loan.category_id,
    account_id: loan.account_id,
    status: loan.status,
    total_amount: pyRound(total),
    total_paid: pyRound(paid),
    remaining: pyRound(Math.max(total - paid, 0)),
    income_source_name: byId(state.incomeSources, loan.income_source_id)?.name ?? null,
    category_name: category?.name ?? null,
    category_color: category?.color ?? null,
    category_icon: category?.icon ?? null,
    category_icon_type: category?.icon_type ?? null,
    account_name: byId(state.accounts, loan.account_id)?.name ?? null,
    payments: sorted.map((p) => loanPaymentView(p, today)),
    finished_early: loan.status === 'paid' && sorted.some((p) => p.due_date > today),
  };
}

export function serviceView(state: DemoState, s: ServiceRow, month: { period: string; y: number; m: number }): RecurringService {
  const prefix = `${month.period}-`;
  const generated = state.transactions.find((t) => t.recurring_service_id === s.id && t.date.startsWith(prefix));
  const extra = pyRound(pySum(state.surcharges
    .filter((r) => r.recurring_service_id === s.id && (r.period === month.period || r.period == null))
    .map((r) => r.amount)));
  return {
    id: s.id,
    name: s.name,
    amount: s.amount,
    category_id: s.category_id,
    category_name: byId(state.categories, s.category_id)?.name ?? null,
    account_id: s.account_id,
    account_name: byId(state.accounts, s.account_id)?.name ?? null,
    day_of_month: s.day_of_month,
    active: s.active,
    icon: s.icon,
    iconType: s.icon_type,
    month_status: {
      period: month.period,
      generated: Boolean(generated),
      transaction_id: generated?.id ?? null,
      surcharge_total: extra,
      total_amount: pyRound(s.amount + extra),
    },
  };
}

export function contributionView(state: DemoState, c: ContributionRow): SavingsContribution {
  return {
    id: c.id,
    savings_goal_id: c.savings_goal_id,
    goal_name: byId(state.savingsGoals, c.savings_goal_id)?.name ?? null,
    amount: c.amount,
    date: c.date,
    source: c.source,
    quincena_period: c.quincena_period,
  };
}

export function savingsGoalView(state: DemoState, g: SavingsGoalRow): SavingsGoal {
  const q1 = g.per_quincena_q1;
  return {
    id: g.id,
    name: g.name,
    target_amount: g.target_amount,
    current_amount: g.current_amount,
    per_quincena: g.per_quincena,
    per_quincena_q1: q1,
    per_quincena_q2: q1 != null ? pyRound(g.per_quincena - q1) : null,
    account_id: g.account_id,
    account_name: byId(state.accounts, g.account_id)?.name ?? null,
    day_q1: g.day_q1,
    day_q2: g.day_q2,
    percentage: g.target_amount ? pyRound((g.current_amount / g.target_amount) * 100, 1) : 0,
    remaining: pyRound(Math.max(g.target_amount - g.current_amount, 0)),
    color: g.color,
    icon: g.icon,
    iconType: g.icon_type,
    active: g.active,
    contributions: state.contributions.filter((c) => c.savings_goal_id === g.id).map((c) => contributionView(state, c)),
  };
}
