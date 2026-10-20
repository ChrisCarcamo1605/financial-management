import { ApiError } from '../http/client';
import type { DataSource } from '../source';
import type {
  AccountInput, BudgetInput, CategoryInput, GenerateResult, IncomeSourceInput, LoanInput, MonthKey,
  RecurringServiceInput, SavingsGoalInput, Session, SurchargeInput, Transaction, TransactionInput,
  TransactionQuery, TransferInput,
} from '../types';
import { cashFlow, dashboardSummary, spendingByCategory } from './logic/analytics';
import { clampDay, parse, toISO, type ISO } from './logic/dates';
import { applyPaidTotal, buildSchedule } from './logic/loan-schedule';
import { cents, pyRound, pySum } from './logic/numbers';
import { quincenaOverview } from './logic/quincena';
import { calculateDeductions } from './logic/salary';
import type {
  AccountRow, DemoState, LoanRow, SavingsGoalRow, TransactionRow,
} from './schema';
import type { DemoStore } from './store';
import {
  accountView, budgetView, byId, categoryView, incomeSourceView, loanView, savingsGoalView, serviceView,
  transactionView, transferView,
} from './views';

/**
 * DataSource que corre por completo en el navegador. Cada operación replica la
 * ruta equivalente de la API Flask (validaciones, efectos en saldos y
 * recálculo de préstamos); la lógica compartida vive en ./logic y se verifica
 * contra la API real en parity.test.ts.
 */
const SESSION_KEY = 'caudal:demo:signed-out';

const fail = (status: number, message: string): never => {
  throw new ApiError(status, message, { error: message });
};

const now = () => new Date().toISOString();

function mustFind<T extends { id: number }>(rows: T[], id: number | null | undefined, what: string): T {
  return byId(rows, id) ?? fail(404, `${what} not found`);
}

function parseMonth(value: MonthKey | undefined, today: ISO): [number, number] {
  const [y, m] = (value || today.slice(0, 7)).split('-').map(Number);
  if (!y || !m || m < 1 || m > 12) fail(400, 'Invalid month. Use YYYY-MM');
  return [y, m];
}

/** Saldo: los ingresos suman y los gastos restan. */
function applyToBalance(account: AccountRow | undefined, tx: Pick<TransactionRow, 'type' | 'amount'>, sign: 1 | -1) {
  if (!account) return;
  const delta = tx.type === 'income' ? tx.amount : -tx.amount;
  account.balance = cents(account.balance + sign * delta);
}

/** Port de sync_loan_from_transactions: recalcula las cuotas desde lo abonado. */
function syncLoan(state: DemoState, loan: LoanRow, today: ISO, nextId: () => number) {
  const paidTotal = pyRound(pySum(state.transactions.filter((t) => t.loan_id === loan.id).map((t) => t.amount)));
  const schedule = buildSchedule(loan);
  const { payments, loanStatus } = applyPaidTotal(schedule, paidTotal, today);
  state.loanPayments = state.loanPayments.filter((p) => p.loan_id !== loan.id).concat(payments.map((p) => ({
    id: nextId(), loan_id: loan.id, installment_number: p.installment_number, due_date: p.due_date, amount: p.amount,
    paid_amount: p.paid_amount, status: p.status, paid_date: p.paid_date, transaction_id: null,
  })));
  loan.status = loanStatus;
}

export interface DemoSourceOptions {
  /** Reloj inyectable para pruebas. */
  today?: () => Date;
}

export function createDemoSource(store: DemoStore, options: DemoSourceOptions = {}): DataSource {
  const today = () => toISO(options.today?.() ?? new Date());
  const read = () => store.read();
  const nextId = () => store.read().nextId++;
  const session = (): Session => ({ access_token: 'demo', user: read().user });
  /** Respuesta asíncrona, como la de la API, sin exponer el estado mutable. */
  const respond = async <T>(fn: () => T): Promise<T> => structuredClone(fn());
  const mutate = async <T>(fn: (state: DemoState) => T): Promise<T> => structuredClone(store.write(fn));

  const signedOut = () => {
    try {
      return window.sessionStorage.getItem(SESSION_KEY) === '1';
    } catch {
      return false;
    }
  };
  const setSignedOut = (value: boolean) => {
    try {
      if (value) window.sessionStorage.setItem(SESSION_KEY, '1');
      else window.sessionStorage.removeItem(SESSION_KEY);
    } catch {
      /* sin sessionStorage: la sesión demo siempre está abierta */
    }
  };

  function signIn() {
    setSignedOut(false);
    return Promise.resolve(session());
  }

  /* ── Transacciones (compartido con préstamos, servicios y ahorro) ───────── */

  function insertTransaction(state: DemoState, input: Omit<TransactionRow, 'id' | 'created_at'>) {
    const row: TransactionRow = { ...input, amount: cents(input.amount), id: nextId(), created_at: now() };
    state.transactions.push(row);
    applyToBalance(byId(state.accounts, row.account_id), row, 1);
    return row;
  }

  function validateTransaction(state: DemoState, input: TransactionInput) {
    if (input.type !== 'income' && input.type !== 'expense') fail(400, 'Transaction type must be "income" or "expense"');
    if (input.loan_id && input.type !== 'expense') fail(400, 'A loan payment must be an expense');
    mustFind(state.accounts, input.account_id, 'Account');
    const category = mustFind(state.categories, input.category_id, 'Category');
    if (category.type !== input.type) fail(400, `Category type mismatch. Expected: ${category.type}`);
    if (input.loan_id) mustFind(state.loans, input.loan_id, 'Loan');
    if (!(Number(input.amount) > 0)) fail(400, 'amount must be greater than 0');
  }

  function listTransactions(state: DemoState, query: TransactionQuery) {
    const search = query.search?.trim().toLowerCase();
    const rows = state.transactions.filter((t) => {
      if (query.type && t.type !== query.type) return false;
      if (query.account_id && t.account_id !== Number(query.account_id)) return false;
      if (query.category_id && t.category_id !== Number(query.category_id)) return false;
      if (query.start_date && t.date < query.start_date) return false;
      if (query.end_date && t.date > query.end_date) return false;
      if (search) {
        const haystack = [t.description, byId(state.categories, t.category_id)?.name, byId(state.accounts, t.account_id)?.name];
        if (!haystack.some((v) => v?.toLowerCase().includes(search))) return false;
      }
      return true;
    });
    const summary = { income: 0, expense: 0 };
    for (const t of rows) summary[t.type] += t.amount;

    const key = query.sort ?? 'date';
    const direction = query.order === 'asc' ? 1 : -1;
    rows.sort((a, b) => {
      const av = a[key] ?? '';
      const bv = b[key] ?? '';
      const cmp = av < bv ? -1 : av > bv ? 1 : 0;
      return cmp * direction || (a.id - b.id) * direction;
    });
    const limit = Math.min(Math.max(Number(query.limit ?? 100), 1), 500);
    const offset = Math.max(Number(query.offset ?? 0), 0);
    return {
      data: rows.slice(offset, offset + limit).map((t) => transactionView(state, t)),
      total: rows.length,
      limit,
      offset,
      summary: { income: pyRound(summary.income), expense: pyRound(summary.expense) },
    };
  }

  /* ── Ahorro ───────────────────────────────────────────────────────────── */

  function savingsCategory(state: DemoState) {
    let category = state.categories.find((c) => c.name === 'Ahorro' && c.type === 'expense');
    if (!category) {
      category = { id: nextId(), name: 'Ahorro', type: 'expense', color: '#8b5cf6', icon: 'savings', icon_type: 'registry', created_at: now() };
      state.categories.push(category);
    }
    return category;
  }

  function goalFields(goal: SavingsGoalRow, data: Partial<SavingsGoalInput>) {
    if (data.name !== undefined) goal.name = data.name;
    if (data.target_amount !== undefined) goal.target_amount = cents(Number(data.target_amount));
    if (data.current_amount !== undefined) goal.current_amount = cents(Number(data.current_amount));
    if (data.per_quincena !== undefined) goal.per_quincena = cents(Number(data.per_quincena || 0));
    if (data.per_quincena_q1 !== undefined) goal.per_quincena_q1 = data.per_quincena_q1 == null ? null : cents(Number(data.per_quincena_q1));
    if (data.account_id !== undefined) goal.account_id = data.account_id ? Number(data.account_id) : null;
    if (data.day_q1 !== undefined) goal.day_q1 = data.day_q1 ? Number(data.day_q1) : null;
    if (data.day_q2 !== undefined) goal.day_q2 = data.day_q2 ? Number(data.day_q2) : null;
    if (data.color !== undefined) goal.color = data.color;
    if (data.icon !== undefined) goal.icon = data.icon;
    if (data.iconType !== undefined) goal.icon_type = data.iconType;
    if (data.active !== undefined) goal.active = Boolean(data.active);
  }

  /* ── Servicios ────────────────────────────────────────────────────────── */

  function surchargeTotal(state: DemoState, serviceId: number, period: string) {
    return pySum(state.surcharges.filter((r) => r.recurring_service_id === serviceId && (r.period === period || r.period == null)).map((r) => r.amount));
  }

  function generateService(state: DemoState, serviceId: number, month: MonthKey): GenerateResult {
    const [y, m] = parseMonth(month, today());
    const service = mustFind(state.services, serviceId, 'Service');
    if (!service.category_id || !service.account_id) {
      return { status: 'missing_config', reason: 'El servicio necesita categoría y cuenta para generar una transacción' };
    }
    const period = `${y}-${String(m).padStart(2, '0')}`;
    if (state.transactions.some((t) => t.recurring_service_id === service.id && t.date.startsWith(`${period}-`))) {
      return { status: 'already_generated' };
    }
    if (!byId(state.accounts, service.account_id)) return { status: 'missing_config', reason: 'Cuenta no encontrada' };
    const total = cents(service.amount + surchargeTotal(state, service.id, period));
    insertTransaction(state, {
      account_id: service.account_id, category_id: service.category_id, amount: total, type: 'expense',
      description: service.name, date: clampDay(y, m, service.day_of_month), loan_id: null, recurring_service_id: service.id,
    });
    return { status: 'created', amount: total };
  }

  return {
    auth: {
      restore: () => Promise.resolve(signedOut() ? null : session()),
      login: signIn,
      register: signIn,
      async logout() {
        setSignedOut(true);
      },
      onExpired: () => () => undefined,
    },

    preferences: {
      get: () => respond(() => read().preferences),
      update: (patch) => mutate((state) => {
        state.preferences = { ...state.preferences, ...patch };
        return state.preferences;
      }),
    },

    dashboard: {
      summary: () => respond(() => dashboardSummary(read(), today())),
    },

    accounts: {
      list: () => respond(() => [...read().accounts].sort((a, b) => b.created_at.localeCompare(a.created_at) || b.id - a.id).map(accountView)),
      create: (input: AccountInput) => mutate((state) => {
        if (!input.name?.trim()) fail(400, 'Account name is required');
        const card = input.type === 'tarjeta_credito';
        const row: AccountRow = {
          id: nextId(),
          name: input.name.trim(),
          balance: card ? 0 : cents(Number(input.balance ?? 0)),
          currency: input.currency || 'USD',
          type: card ? 'tarjeta_credito' : 'normal',
          credit_limit: card ? cents(Number(input.credit_limit ?? 0)) : null,
          cutoff_day: card ? Number(input.cutoff_day) : null,
          payment_due_day: card ? Number(input.payment_due_day) : null,
          start_date: card ? input.start_date || null : null,
          created_at: now(),
        };
        state.accounts.push(row);
        return accountView(row);
      }),
      update: (id, input) => mutate((state) => {
        const account = mustFind(state.accounts, id, 'Account');
        const card = (input.type ?? account.type) === 'tarjeta_credito';
        if (input.name !== undefined) account.name = input.name;
        if (input.balance !== undefined && !card) account.balance = cents(Number(input.balance));
        if (input.currency !== undefined) account.currency = input.currency;
        if (input.type !== undefined) account.type = input.type;
        if (card) {
          if (input.credit_limit !== undefined) account.credit_limit = cents(Number(input.credit_limit));
          if (input.cutoff_day !== undefined) account.cutoff_day = Number(input.cutoff_day);
          if (input.payment_due_day !== undefined) account.payment_due_day = Number(input.payment_due_day);
          if (input.start_date !== undefined) account.start_date = input.start_date || null;
        } else {
          Object.assign(account, { credit_limit: null, cutoff_day: null, payment_due_day: null, start_date: null });
        }
        return accountView(account);
      }),
      remove: (id) => mutate((state) => {
        mustFind(state.accounts, id, 'Account');
        state.transactions = state.transactions.filter((t) => t.account_id !== id);
        state.transfers = state.transfers.filter((t) => t.from_account_id !== id && t.to_account_id !== id);
        state.cardReserves = state.cardReserves.filter((r) => r.card_id !== id);
        for (const rows of [state.loans, state.services, state.savingsGoals, state.incomeSources]) {
          for (const row of rows) if (row.account_id === id) row.account_id = null;
        }
        state.accounts = state.accounts.filter((a) => a.id !== id);
      }),
    },

    transfers: {
      list: (limit = 20) => respond(() => [...read().transfers]
        .sort((a, b) => b.date.localeCompare(a.date) || b.created_at.localeCompare(a.created_at))
        .slice(0, limit)
        .map((t) => transferView(read(), t))),
      create: (input: TransferInput) => mutate((state) => {
        if (input.from_account_id === input.to_account_id) fail(400, 'from_account_id and to_account_id must be different');
        const amount = cents(Number(input.amount));
        if (!(amount > 0)) fail(400, 'amount must be greater than 0');
        const from = mustFind(state.accounts, input.from_account_id, 'from_account');
        const to = mustFind(state.accounts, input.to_account_id, 'to_account');
        const row = { id: nextId(), from_account_id: from.id, to_account_id: to.id, amount, date: input.date, description: input.description ?? null, created_at: now() };
        from.balance = cents(from.balance - amount);
        to.balance = cents(to.balance + amount);
        state.transfers.push(row);
        return transferView(state, row);
      }),
      remove: (id) => mutate((state) => {
        const transfer = mustFind(state.transfers, id, 'Transfer');
        const from = byId(state.accounts, transfer.from_account_id);
        const to = byId(state.accounts, transfer.to_account_id);
        if (from) from.balance = cents(from.balance + transfer.amount);
        if (to) to.balance = cents(to.balance - transfer.amount);
        state.transfers = state.transfers.filter((t) => t.id !== id);
      }),
    },

    categories: {
      list: (type) => respond(() => read().categories
        .filter((c) => !type || c.type === type)
        .sort((a, b) => a.name.localeCompare(b.name))
        .map(categoryView)),
      create: (input: CategoryInput) => mutate((state) => {
        if (!input.name?.trim()) fail(400, 'Category name is required');
        if (state.categories.some((c) => c.name === input.name && c.type === input.type)) fail(400, 'Category with this name already exists');
        const row = { id: nextId(), name: input.name, type: input.type, color: input.color, icon: input.icon, icon_type: input.iconType || 'registry', created_at: now() };
        state.categories.push(row);
        return categoryView(row);
      }),
      update: (id, input) => mutate((state) => {
        const category = mustFind(state.categories, id, 'Category');
        Object.assign(category, { name: input.name, type: input.type, color: input.color, icon: input.icon, icon_type: input.iconType || category.icon_type });
        return categoryView(category);
      }),
      remove: (id) => mutate((state) => {
        mustFind(state.categories, id, 'Category');
        if (state.budgets.some((b) => b.category_id === id)) fail(400, 'Cannot delete category with associated budgets');
        if (state.transactions.some((t) => t.category_id === id)) fail(400, 'No se puede eliminar: la categoría tiene movimientos');
        for (const rows of [state.loans, state.services, state.incomeSources]) {
          for (const row of rows) if (row.category_id === id) row.category_id = null;
        }
        state.categories = state.categories.filter((c) => c.id !== id);
      }),
    },

    transactions: {
      list: (query) => respond(() => listTransactions(read(), query)),
      create: (input) => mutate((state) => {
        validateTransaction(state, input);
        const row = insertTransaction(state, {
          account_id: input.account_id, category_id: input.category_id, amount: Number(input.amount), type: input.type,
          description: input.description ?? null, date: input.date, loan_id: input.loan_id || null, recurring_service_id: null,
        });
        const loan = byId(state.loans, row.loan_id);
        if (loan) syncLoan(state, loan, today(), nextId);
        return transactionView(state, row);
      }),
      update: (id, input) => mutate((state): Transaction => {
        const tx = mustFind(state.transactions, id, 'Transaction');
        validateTransaction(state, { ...input, loan_id: input.loan_id ?? tx.loan_id });
        const affectedLoans = new Set([tx.loan_id, input.loan_id ?? tx.loan_id].filter((v): v is number => v != null));
        applyToBalance(byId(state.accounts, tx.account_id), tx, -1);
        Object.assign(tx, {
          account_id: input.account_id, category_id: input.category_id, amount: cents(Number(input.amount)), type: input.type,
          description: input.description ?? null, date: input.date, loan_id: input.loan_id ?? tx.loan_id,
        });
        applyToBalance(byId(state.accounts, tx.account_id), tx, 1);
        for (const loanId of affectedLoans) {
          const loan = byId(state.loans, loanId);
          if (loan) syncLoan(state, loan, today(), nextId);
        }
        return transactionView(state, tx);
      }),
      remove: (id) => mutate((state) => {
        const tx = mustFind(state.transactions, id, 'Transaction');
        applyToBalance(byId(state.accounts, tx.account_id), tx, -1);
        state.transactions = state.transactions.filter((t) => t.id !== id);
        const loan = byId(state.loans, tx.loan_id);
        if (loan) syncLoan(state, loan, today(), nextId);
      }),
    },

    budgets: {
      list: () => respond(() => [...read().budgets]
        .sort((a, b) => b.created_at.localeCompare(a.created_at) || b.id - a.id)
        .map((b) => budgetView(read(), b, today()))),
      create: (input: BudgetInput) => mutate((state) => {
        const category = mustFind(state.categories, input.category_id, 'Category');
        if (category.type !== 'expense') fail(400, 'Can only create budgets for expense categories');
        const t = today();
        const duplicate = state.budgets.some((b) => b.category_id === input.category_id && b.period === input.period && (!b.end_date || b.end_date >= t));
        if (duplicate) fail(400, 'Ya existe un presupuesto activo para esta categoría y periodo');
        const row = {
          id: nextId(), category_id: input.category_id, amount: cents(Number(input.amount)), period: input.period,
          start_day: input.period === 'biweekly' ? null : input.start_day, start_date: t, end_date: input.end_date || null, created_at: now(),
        };
        state.budgets.push(row);
        return budgetView(state, row, t);
      }),
      update: (id, input) => mutate((state) => {
        const budget = mustFind(state.budgets, id, 'Budget');
        mustFind(state.categories, input.category_id, 'Category');
        Object.assign(budget, {
          category_id: input.category_id, amount: cents(Number(input.amount)), period: input.period,
          start_day: input.period === 'biweekly' ? null : input.start_day, end_date: input.end_date || null,
        });
        return budgetView(state, budget, today());
      }),
      remove: (id) => mutate((state) => {
        mustFind(state.budgets, id, 'Budget');
        state.budgets = state.budgets.filter((b) => b.id !== id);
      }),
    },

    incomeSources: {
      list: () => respond(() => [...read().incomeSources]
        .sort((a, b) => b.created_at.localeCompare(a.created_at) || b.id - a.id)
        .map((s) => incomeSourceView(read(), s))),
      preview: (gross, modality) => respond(() => calculateDeductions(gross, modality)),
      create: (input: IncomeSourceInput) => mutate((state) => {
        if (!input.name?.trim()) fail(400, 'Required fields: name, gross_amount');
        if (input.account_id) mustFind(state.accounts, input.account_id, 'Account');
        if (input.category_id && mustFind(state.categories, input.category_id, 'Category').type !== 'income') {
          fail(400, 'La categoría de una fuente de ingreso debe ser de tipo ingreso');
        }
        const row = { ...input, id: nextId(), gross_amount: cents(Number(input.gross_amount)), account_id: input.account_id || null, category_id: input.category_id || null, created_at: now() };
        state.incomeSources.push(row);
        return incomeSourceView(state, row);
      }),
      update: (id, input) => mutate((state) => {
        const source = mustFind(state.incomeSources, id, 'Income source');
        if (input.category_id && mustFind(state.categories, input.category_id, 'Category').type !== 'income') {
          fail(400, 'La categoría de una fuente de ingreso debe ser de tipo ingreso');
        }
        Object.assign(source, { ...input, gross_amount: cents(Number(input.gross_amount)), account_id: input.account_id || null, category_id: input.category_id || null });
        return incomeSourceView(state, source);
      }),
      remove: (id) => mutate((state) => {
        mustFind(state.incomeSources, id, 'Income source');
        if (state.loans.some((l) => l.income_source_id === id)) fail(400, 'No se puede eliminar: tiene préstamos asociados');
        state.incomeSources = state.incomeSources.filter((s) => s.id !== id);
      }),
    },

    loans: {
      list: () => respond(() => [...read().loans]
        .sort((a, b) => b.created_at.localeCompare(a.created_at) || b.id - a.id)
        .map((l) => loanView(read(), l, today()))),
      create: (input: LoanInput) => mutate((state) => {
        mustFind(state.incomeSources, input.income_source_id, 'Income source');
        if (input.category_id) mustFind(state.categories, input.category_id, 'Category');
        if (input.account_id) mustFind(state.accounts, input.account_id, 'Account');
        const installments = input.payment_type === 'single' ? 1 : Number(input.installments);
        if (input.payment_type !== 'single' && !(installments >= 1)) fail(400, `installments is required for ${input.payment_type} loans`);
        const loan: LoanRow = {
          ...input, id: nextId(), principal: cents(Number(input.principal)), interest_rate: Number(input.interest_rate || 0),
          installments, category_id: input.category_id || null, account_id: input.account_id || null, status: 'active', created_at: now(),
        };
        state.loans.push(loan);
        syncLoan(state, loan, today(), nextId);
        return loanView(state, loan, today());
      }),
      update: (id, input) => mutate((state) => {
        const loan = mustFind(state.loans, id, 'Loan');
        mustFind(state.incomeSources, input.income_source_id, 'Income source');
        Object.assign(loan, {
          ...input, principal: cents(Number(input.principal)), interest_rate: Number(input.interest_rate || 0),
          installments: input.payment_type === 'single' ? 1 : Number(input.installments) || 1,
          category_id: input.category_id || null, account_id: input.account_id || null,
        });
        syncLoan(state, loan, today(), nextId);
        return loanView(state, loan, today());
      }),
      remove: (id) => mutate((state) => {
        mustFind(state.loans, id, 'Loan');
        state.loanPayments = state.loanPayments.filter((p) => p.loan_id !== id);
        for (const t of state.transactions) if (t.loan_id === id) t.loan_id = null;
        state.loans = state.loans.filter((l) => l.id !== id);
      }),
      setPaymentStatus: (paymentId, status, paidDate) => mutate((state) => {
        const payment = mustFind(state.loanPayments, paymentId, 'Payment');
        const loan = mustFind(state.loans, payment.loan_id, 'Loan');
        const payments = state.loanPayments.filter((p) => p.loan_id === loan.id);
        if (status === 'paid') {
          if (payment.status === 'paid') return loanView(state, loan, today());
          if (!loan.account_id || !loan.category_id) fail(400, 'Asigna una cuenta y una categoría al préstamo para registrar el pago');
          const pending = payments.filter((p) => p.status === 'pending' && p.installment_number <= payment.installment_number);
          const amount = cents(pySum(pending.map((p) => p.amount - p.paid_amount)));
          const numbers = pending.map((p) => p.installment_number).sort((a, b) => a - b);
          const label = numbers.length === 1 ? `cuota ${numbers[0]}` : `cuotas ${numbers[0]}–${numbers[numbers.length - 1]}`;
          insertTransaction(state, {
            account_id: loan.account_id!, category_id: loan.category_id!, amount, type: 'expense',
            description: `${loan.name} · ${label}`, date: paidDate || today(), loan_id: loan.id, recurring_service_id: null,
          });
        } else {
          const lastPaid = Math.max(...payments.filter((p) => p.status === 'paid').map((p) => p.installment_number));
          if (payment.status !== 'paid' || payment.installment_number !== lastPaid) fail(400, 'Solo se puede revertir la última cuota pagada');
          const latest = state.transactions
            .filter((t) => t.loan_id === loan.id)
            .sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id)[0];
          if (latest) {
            applyToBalance(byId(state.accounts, latest.account_id), latest, -1);
            state.transactions = state.transactions.filter((t) => t.id !== latest.id);
          }
        }
        syncLoan(state, loan, today(), nextId);
        return loanView(state, loan, today());
      }),
    },

    services: {
      list: (month) => respond(() => {
        const [y, m] = parseMonth(month, today());
        const period = `${y}-${String(m).padStart(2, '0')}`;
        return [...read().services]
          .sort((a, b) => a.day_of_month - b.day_of_month || a.name.localeCompare(b.name))
          .map((s) => serviceView(read(), s, { period, y, m }));
      }),
      create: (input: RecurringServiceInput) => mutate((state) => {
        if (!input.name?.trim()) fail(400, 'name is required');
        if (input.category_id) mustFind(state.categories, input.category_id, 'Category');
        if (input.account_id) mustFind(state.accounts, input.account_id, 'Account');
        const row = {
          id: nextId(), name: input.name, amount: cents(Number(input.amount)), category_id: input.category_id || null,
          account_id: input.account_id || null, day_of_month: Number(input.day_of_month) || 1, active: input.active,
          icon: input.icon, icon_type: input.iconType || 'registry', created_at: now(),
        };
        state.services.push(row);
        return serviceView(state, row, { period: today().slice(0, 7), ...parse(today()) });
      }),
      update: (id, input) => mutate((state) => {
        const service = mustFind(state.services, id, 'Recurring service');
        Object.assign(service, {
          name: input.name, amount: cents(Number(input.amount)), day_of_month: Number(input.day_of_month) || 1, active: input.active,
          icon: input.icon, icon_type: input.iconType || service.icon_type, category_id: input.category_id || null, account_id: input.account_id || null,
        });
        return serviceView(state, service, { period: today().slice(0, 7), ...parse(today()) });
      }),
      remove: (id) => mutate((state) => {
        mustFind(state.services, id, 'Recurring service');
        for (const t of state.transactions) if (t.recurring_service_id === id) t.recurring_service_id = null;
        state.surcharges = state.surcharges.filter((r) => r.recurring_service_id !== id);
        state.services = state.services.filter((s) => s.id !== id);
      }),
      generate: (id, month) => mutate((state) => generateService(state, id, month)),
      surcharges: (id, month) => respond(() => {
        const state = read();
        const service = mustFind(state.services, id, 'Recurring service');
        const rows = state.surcharges.filter((r) => r.recurring_service_id === id && (!month || r.period === month || r.period == null));
        const extra = pySum(rows.map((r) => r.amount));
        return {
          data: rows.map(({ created_at: _created, ...r }) => ({ ...r })),
          base_amount: service.amount,
          surcharge_total: extra,
          total: service.amount + extra,
        };
      }),
      addSurcharge: (id, input: SurchargeInput) => mutate((state) => {
        mustFind(state.services, id, 'Recurring service');
        state.surcharges.push({
          id: nextId(), recurring_service_id: id, type: input.type || 'otro', amount: cents(Number(input.amount)),
          note: input.note ?? null, period: input.period || null, created_at: now(),
        });
      }),
      removeSurcharge: (surchargeId) => mutate((state) => {
        mustFind(state.surcharges, surchargeId, 'Surcharge');
        state.surcharges = state.surcharges.filter((r) => r.id !== surchargeId);
      }),
    },

    savings: {
      list: () => respond(() => [...read().savingsGoals]
        .sort((a, b) => Number(b.active) - Number(a.active) || a.name.localeCompare(b.name))
        .map((g) => savingsGoalView(read(), g))),
      create: (input) => mutate((state) => {
        if (!input.name?.trim()) fail(400, 'name is required');
        const goal: SavingsGoalRow = {
          id: nextId(), name: '', target_amount: 0, current_amount: 0, per_quincena: 0, per_quincena_q1: null, account_id: null,
          day_q1: null, day_q2: null, color: null, icon: null, icon_type: 'registry', active: true, created_at: now(),
        };
        goalFields(goal, { current_amount: 0, ...input });
        state.savingsGoals.push(goal);
        return savingsGoalView(state, goal);
      }),
      update: (id, input) => mutate((state) => {
        const goal = mustFind(state.savingsGoals, id, 'Savings goal');
        goalFields(goal, input);
        return savingsGoalView(state, goal);
      }),
      remove: (id) => mutate((state) => {
        mustFind(state.savingsGoals, id, 'Savings goal');
        state.contributions = state.contributions.filter((c) => c.savings_goal_id !== id);
        state.savingsGoals = state.savingsGoals.filter((g) => g.id !== id);
      }),
      contribute: (id, input) => mutate((state) => {
        const goal = mustFind(state.savingsGoals, id, 'Savings goal');
        const amount = cents(Number(input.amount));
        state.contributions.push({
          id: nextId(), savings_goal_id: id, amount, date: input.date || today(), source: input.source ?? 'manual',
          quincena_period: null, created_at: now(),
        });
        goal.current_amount = cents(goal.current_amount + amount);
        return savingsGoalView(state, goal);
      }),
      removeContribution: (contributionId) => mutate((state) => {
        const contribution = mustFind(state.contributions, contributionId, 'Contribution');
        const goal = byId(state.savingsGoals, contribution.savings_goal_id);
        if (goal) goal.current_amount = cents(Math.max(0, goal.current_amount - contribution.amount));
        state.contributions = state.contributions.filter((c) => c.id !== contributionId);
      }),
      generate: (id, month, quincena) => mutate((state): GenerateResult => {
        const [y, m] = parseMonth(month, today());
        const periodKey = `${y}-${String(m).padStart(2, '0')}-Q${quincena}`;
        const goal = mustFind(state.savingsGoals, id, 'Savings goal');
        if (!goal.account_id) return { status: 'missing_config', reason: 'Asigna una cuenta a la meta para generar automáticamente' };
        const q1 = goal.per_quincena_q1 != null ? goal.per_quincena_q1 : goal.per_quincena / 2;
        const amount = quincena === 1 ? q1 : goal.per_quincena - q1;
        if (amount <= 0) return { status: 'missing_config', reason: `El monto de Q${quincena} es 0. Configura el aporte en la meta.` };
        if (state.contributions.some((c) => c.savings_goal_id === id && c.quincena_period === periodKey)) return { status: 'already_generated' };
        if (!byId(state.accounts, goal.account_id)) return { status: 'missing_config', reason: 'Cuenta no encontrada' };
        const day = (quincena === 1 ? goal.day_q1 : goal.day_q2) || (quincena === 1 ? 15 : 30);
        const date = clampDay(y, m, day);
        insertTransaction(state, {
          account_id: goal.account_id, category_id: savingsCategory(state).id, amount, type: 'expense',
          description: `Ahorro · ${goal.name}`, date, loan_id: null, recurring_service_id: null,
        });
        state.contributions.push({
          id: nextId(), savings_goal_id: id, amount: cents(amount), date, source: 'auto', quincena_period: periodKey, created_at: now(),
        });
        goal.current_amount = cents(goal.current_amount + amount);
        return { status: 'created', amount };
      }),
    },

    quincenas: {
      overview: (month) => respond(() => {
        const [y, m] = parseMonth(month, today());
        return quincenaOverview(read(), y, m, today());
      }),
      setCardReserve: (input) => mutate((state) => {
        const card = state.accounts.find((a) => a.id === input.card_id && a.type === 'tarjeta_credito') ?? fail(404, 'Credit card not found');
        const matches = (r: DemoState['cardReserves'][number]) =>
          r.card_id === card.id && r.payment_due_date === input.payment_due_date && r.quincena_period === input.period;
        const existing = state.cardReserves.some(matches);
        if (input.saved && !existing) {
          state.cardReserves.push({ id: nextId(), card_id: card.id, payment_due_date: input.payment_due_date, quincena_period: input.period });
        } else if (!input.saved) {
          state.cardReserves = state.cardReserves.filter((r) => !matches(r));
        }
      }),
    },

    analytics: {
      cashFlow: (range) => respond(() => cashFlow(read(), range)),
      spendingByCategory: (range) => respond(() => spendingByCategory(read(), range)),
    },
  };
}
