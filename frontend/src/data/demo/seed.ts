import { DEFAULT_PREFERENCES } from '@/features/preferences/defaults';
import type { Language } from '@/i18n';
import { addDays, addMonthsYM, clampDay, daysInMonth, iso, parse, toISO, type ISO } from './logic/dates';
import { applyPaidTotal, buildSchedule } from './logic/loan-schedule';
import { cents, pyRound, pySum } from './logic/numbers';
import { quincenaOverview } from './logic/quincena';
import { calculateDeductions } from './logic/salary';
import { DEMO_STATE_VERSION, type AccountRow, type CategoryRow, type DemoState, type TransactionRow } from './schema';

/**
 * Datos de ejemplo del demo: el mismo escenario que backend/seed.py (nómina
 * quincenal, freelance, tarjeta con corte, préstamo, servicios y metas),
 * generado con fechas relativas a hoy para que el demo siempre esté al día.
 */
const MONTHS_BACK = 6;

const EXPENSE_CATEGORIES: [string, string, string][] = [
  ['Supermercado', 'cart', '#10b981'], ['Restaurantes', 'food', '#f59e0b'], ['Transporte', 'car', '#3b82f6'],
  ['Combustible', 'fuel', '#6366f1'], ['Servicios', 'zap', '#eab308'], ['Internet y teléfono', 'wifi', '#06b6d4'],
  ['Suscripciones', 'tv', '#ec4899'], ['Salud', 'health', '#f43f5e'], ['Compras', 'bag', '#a855f7'],
  ['Hogar', 'home', '#f97316'], ['Gimnasio', 'gym', '#14b8a6'], ['Préstamos', 'money', '#db2777'],
  ['Ahorro', 'savings', '#8b5cf6'],
];
const INCOME_CATEGORIES: [string, string, string][] = [
  ['Salario', 'work', '#10b981'], ['Freelance', 'laptop', '#06b6d4'], ['Otros ingresos', 'gift', '#22c55e'],
];

/** PRNG determinista (mulberry32): mismo demo en cada reinicio del mismo día. */
function random(seed: number) {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    uniform: (min: number, max: number) => min + (max - min) * next(),
    choice: <T>(items: T[]) => items[Math.floor(next() * items.length)],
  };
}

export function createDemoSeed(now: Date = new Date(), language: Language = DEFAULT_PREFERENCES.language): DemoState {
  const today = toISO(now);
  const t = parse(today);
  const [startY, startM] = addMonthsYM(t.y, t.m, -MONTHS_BACK);
  const start = iso(startY, startM, 1);
  const created = new Date(now.getTime() - MONTHS_BACK * 31 * 86_400_000).toISOString();
  const rng = random(7);

  let nextId = 1;
  const id = () => nextId++;
  const state: DemoState = {
    version: DEMO_STATE_VERSION,
    nextId: 0,
    user: { id: 'demo', email: 'demo@caudal.app', created_at: created },
    preferences: { ...DEFAULT_PREFERENCES, language },
    accounts: [], categories: [], transactions: [], transfers: [], budgets: [], incomeSources: [], loans: [],
    loanPayments: [], services: [], surcharges: [], savingsGoals: [], contributions: [], cardReserves: [],
  };

  const cat: Record<string, CategoryRow> = {};
  for (const [type, list] of [['expense', EXPENSE_CATEGORIES], ['income', INCOME_CATEGORIES]] as const) {
    for (const [name, icon, color] of list) {
      const row: CategoryRow = { id: id(), name, type, color, icon, icon_type: 'registry', created_at: created };
      cat[name] = row;
      state.categories.push(row);
    }
  }

  const account = (row: Omit<AccountRow, 'id' | 'created_at' | 'currency' | 'type' | 'credit_limit' | 'cutoff_day' | 'payment_due_day' | 'start_date'> & Partial<AccountRow>): AccountRow => {
    const full: AccountRow = {
      id: id(), currency: 'USD', type: 'normal', credit_limit: null, cutoff_day: null, payment_due_day: null,
      start_date: null, created_at: created, ...row,
    };
    state.accounts.push(full);
    return full;
  };
  const acc = {
    nomina: account({ name: 'Banco Agrícola · Nómina', balance: 850 }),
    ahorro: account({ name: 'Cuscatlán · Ahorro', balance: 2400 }),
    efectivo: account({ name: 'Efectivo', balance: 120 }),
    visa: account({ name: 'Visa Oro', balance: 0, type: 'tarjeta_credito', credit_limit: 2500, cutoff_day: 20, payment_due_day: 5, start_date: start }),
  };

  const salary = { id: id(), name: 'Salario · Grupo Andino', modality: 'planilla' as const, gross_amount: 1450, pay_schedule: 'biweekly' as const, pay_day: null, currency: 'USD', account_id: acc.nomina.id, category_id: cat.Salario.id, created_at: created };
  const freelance = { id: id(), name: 'Diseño freelance', modality: 'servicios_profesionales' as const, gross_amount: 350, pay_schedule: 'monthly' as const, pay_day: 20, currency: 'USD', account_id: acc.nomina.id, category_id: cat.Freelance.id, created_at: created };
  state.incomeSources.push(salary, freelance);

  const serviceDefs: [string, number, number, string, keyof typeof acc, string][] = [
    ['Luz · CAESS', 38, 8, 'Servicios', 'nomina', 'zap'],
    ['Agua · ANDA', 12, 12, 'Servicios', 'nomina', 'water'],
    ['Internet · Tigo', 35, 18, 'Internet y teléfono', 'visa', 'wifi'],
    ['Netflix', 15.49, 3, 'Suscripciones', 'visa', 'tv'],
    ['Spotify', 11.99, 22, 'Suscripciones', 'visa', 'music'],
    ['Teléfono · Claro', 20, 26, 'Internet y teléfono', 'nomina', 'phone'],
    ['Gimnasio', 30, 1, 'Gimnasio', 'visa', 'gym'],
  ];
  for (const [name, amount, day, category, accountKey, icon] of serviceDefs) {
    state.services.push({
      id: id(), name, amount, category_id: cat[category].id, account_id: acc[accountKey].id, day_of_month: day,
      active: true, icon, icon_type: 'registry', created_at: created,
    });
  }

  const loan = {
    id: id(), name: 'Préstamo vehículo', principal: 9000, interest_rate: 9.5, interest_method: 'french' as const,
    payment_type: 'monthly' as const, installments: 48, payment_day: 25, start_date: start,
    income_source_id: salary.id, category_id: cat['Préstamos'].id, account_id: acc.nomina.id, status: 'active' as 'active' | 'paid',
    created_at: created,
  };
  state.loans.push(loan);

  const goals = {
    emergency: { id: id(), name: 'Fondo de emergencia', target_amount: 3000, current_amount: 600, per_quincena: 100, per_quincena_q1: 50, account_id: acc.nomina.id, day_q1: 15, day_q2: 30, color: '#10b981', icon: 'savings', icon_type: 'registry' as const, active: true, created_at: created },
    trip: { id: id(), name: 'Viaje a Antigua', target_amount: 800, current_amount: 0, per_quincena: 60, per_quincena_q1: 30, account_id: acc.nomina.id, day_q1: 15, day_q2: 30, color: '#06b6d4', icon: 'plane', icon_type: 'registry' as const, active: true, created_at: created },
  };
  state.savingsGoals.push(goals.emergency, goals.trip);

  for (const [category, amount, period, startDay] of [
    ['Supermercado', 280, 'monthly', 1], ['Restaurantes', 70, 'biweekly', null], ['Suscripciones', 45, 'monthly', 1],
    ['Combustible', 30, 'weekly', 1], ['Compras', 120, 'monthly', 1],
  ] as const) {
    state.budgets.push({ id: id(), category_id: cat[category].id, amount, period, start_day: startDay, start_date: start, end_date: null, created_at: created });
  }

  /* ── Movimientos día a día ──────────────────────────────────────────── */
  const tx = (date: ISO, type: 'income' | 'expense', amount: number, category: string, accountRow: AccountRow, description: string, extra: Partial<TransactionRow> = {}) => {
    const value = pyRound(amount);
    accountRow.balance = cents(accountRow.balance + (type === 'income' ? value : -value));
    state.transactions.push({
      id: id(), account_id: accountRow.id, category_id: cat[category].id, amount: value, type, description, date,
      loan_id: null, recurring_service_id: null, created_at: created, ...extra,
    });
  };
  const transfer = (date: ISO, from: AccountRow, to: AccountRow, amount: number, description: string) => {
    const value = pyRound(amount);
    from.balance = cents(from.balance - value);
    to.balance = cents(to.balance + value);
    state.transfers.push({ id: id(), from_account_id: from.id, to_account_id: to.id, amount: value, date, description, created_at: created });
  };
  const contribute = (goal: typeof goals.emergency, date: ISO, amount: number, qnum: 1 | 2) => {
    tx(date, 'expense', amount, 'Ahorro', acc.nomina, `Ahorro · ${goal.name}`);
    goal.current_amount = cents(goal.current_amount + amount);
    const { y, m } = parse(date);
    state.contributions.push({ id: id(), savings_goal_id: goal.id, amount, date, source: 'auto', quincena_period: `${y}-${String(m).padStart(2, '0')}-Q${qnum}`, created_at: created });
  };

  const salaryNet = calculateDeductions(salary.gross_amount, 'planilla').net;
  const freelanceNet = calculateDeductions(freelance.gross_amount, 'servicios_profesionales').net;
  const schedule = new Map(buildSchedule(loan).map((p) => [p.due_date, p]));
  let debtAtCutoff = 0;

  for (let day = start; day <= today; day = addDays(day, 1)) {
    const { y, m, d } = parse(day);
    const last = daysInMonth(y, m);
    const weekday = new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // 0 = domingo
    if (d === 15 || d === Math.min(30, last)) {
      tx(day, 'income', salaryNet / 2, 'Salario', acc.nomina, 'Salario quincenal');
      transfer(day, acc.nomina, acc.efectivo, 60, 'Retiro cajero');
      const qnum = d === 15 ? 1 : 2;
      contribute(goals.emergency, day, 50, qnum);
      contribute(goals.trip, day, 30, qnum);
    }
    if (d === 20) tx(day, 'income', freelanceNet, 'Freelance', acc.nomina, 'Proyecto de diseño');
    for (const s of state.services) {
      if (clampDay(y, m, s.day_of_month) === day) {
        const accountRow = state.accounts.find((a) => a.id === s.account_id)!;
        const category = state.categories.find((c) => c.id === s.category_id)!.name;
        tx(day, 'expense', s.amount, category, accountRow, s.name, { recurring_service_id: s.id });
      }
    }
    const installment = schedule.get(day);
    if (installment) {
      tx(day, 'expense', installment.amount, 'Préstamos', acc.nomina, `Préstamo vehículo · cuota ${installment.installment_number}`, { loan_id: loan.id });
    }
    if (d === acc.visa.cutoff_day) debtAtCutoff = Math.max(-acc.visa.balance, 0);
    if (d === acc.visa.payment_due_day && debtAtCutoff > 0) {
      transfer(day, acc.nomina, acc.visa, debtAtCutoff, 'Pago Visa Oro');
      debtAtCutoff = 0;
    }

    // Vida diaria
    if (weekday === 6) tx(day, 'expense', rng.uniform(45, 85), 'Supermercado', rng.choice([acc.nomina, acc.visa]), rng.choice(['Super Selectos', 'Walmart', 'La Despensa de Don Juan']));
    if (weekday === 1) tx(day, 'expense', rng.uniform(22, 32), 'Combustible', acc.visa, rng.choice(['Puma', 'Texaco', 'Uno']));
    if (rng.next() < 0.28) tx(day, 'expense', rng.uniform(6, 24), 'Restaurantes', rng.choice([acc.visa, acc.efectivo, acc.nomina]), rng.choice(['Pupusería La Ceiba', 'Pollo Campero', 'Café Bariloche', "Wendy's", 'Sushi Itto']));
    if (rng.next() < 0.08) tx(day, 'expense', rng.uniform(3, 12), 'Transporte', acc.efectivo, rng.choice(['Uber', 'Taxi', 'Parqueo']));
    if (rng.next() < 0.05) tx(day, 'expense', rng.uniform(18, 110), 'Compras', acc.visa, rng.choice(['Siman', 'Amazon', 'Librería Cervantes', 'Ferretería Vidrí']));
    if (rng.next() < 0.025) tx(day, 'expense', rng.uniform(12, 60), 'Salud', acc.nomina, rng.choice(['Farmacia San Nicolás', 'Consulta']));
    if (rng.next() < 0.02) tx(day, 'expense', rng.uniform(15, 70), 'Hogar', acc.nomina, rng.choice(['Limpieza', 'Reparación', 'Decoración']));
  }
  tx(addDays(today, -9), 'income', 75, 'Otros ingresos', acc.efectivo, 'Venta de bicicleta');

  // Cuotas del préstamo a partir de lo pagado (sync_loan_from_transactions).
  const paid = pyRound(pySum(state.transactions.filter((row) => row.loan_id === loan.id).map((row) => row.amount)));
  const rebuilt = applyPaidTotal(buildSchedule(loan), paid, today);
  state.loanPayments = rebuilt.payments.map((p) => ({ ...p, id: id(), loan_id: loan.id, transaction_id: null }));
  loan.status = rebuilt.loanStatus;

  // El personaje del demo sí guardó lo de su tarjeta en las quincenas pasadas.
  for (let [y, m] = [startY, startM]; y < t.y || (y === t.y && m <= t.m); [y, m] = addMonthsYM(y, m, 1)) {
    for (const plan of quincenaOverview(state, y, m, today).card_plan) {
      for (const step of plan.schedule) {
        const period = `${step.month}-Q${step.quincena}`;
        const known = state.cardReserves.some((r) => r.card_id === plan.card_id && r.payment_due_date === plan.payment_due_date && r.quincena_period === period);
        if (step.status === 'missed' && !known) {
          state.cardReserves.push({ id: id(), card_id: plan.card_id, payment_due_date: plan.payment_due_date, quincena_period: period });
        }
      }
    }
  }

  state.nextId = nextId;
  return state;
}
