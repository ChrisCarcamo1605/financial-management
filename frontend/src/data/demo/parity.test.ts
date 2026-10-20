import { describe, expect, it } from 'vitest';
import fixture from './__fixtures__/parity.json';
import type { DemoState } from './schema';
import { DEMO_STATE_VERSION } from './schema';
import { dashboardSummary, cashFlow, spendingByCategory } from './logic/analytics';
import { currentPeriod } from './logic/budget-period';
import { buildSchedule } from './logic/loan-schedule';
import { quincenaOverview } from './logic/quincena';
import { calculateDeductions } from './logic/salary';
import {
  accountView, budgetView, incomeSourceView, loanView, savingsGoalView, serviceView,
} from './views';
import { diff, normalizeQuincenas } from './parity-utils';
import { createDemoSource } from './demo-source';
import { createDemoStore } from './store';
import { DEFAULT_PREFERENCES } from '@/features/preferences/defaults';

/**
 * Paridad con la API Flask: el fixture lo genera backend/scripts/export_demo_parity.py
 * con el estado real del usuario demo y las respuestas de los endpoints.
 */
const today = fixture.today;
const state = {
  version: DEMO_STATE_VERSION,
  nextId: 1_000_000,
  user: { id: 'demo', email: 'demo@caudal.app', created_at: today },
  preferences: DEFAULT_PREFERENCES,
  ...fixture.state,
} as unknown as DemoState;

const byCreatedDesc = <T extends { created_at: string; id: number }>(rows: T[]) =>
  [...rows].sort((a, b) => b.created_at.localeCompare(a.created_at) || b.id - a.id);

const expectSame = (actual: unknown, expected: unknown) => expect(diff(actual, expected)).toEqual([]);

describe('paridad con la API: funciones puras', () => {
  it('descuentos ISSS/AFP/ISR', () => {
    for (const c of fixture.pure.deductions) {
      expectSame(calculateDeductions(c.gross, c.modality as never), c.result);
    }
  });
  it('calendario de cuotas', () => {
    for (const c of fixture.pure.schedules) expectSame(buildSchedule(c.params as never), c.result);
  });
  it('ciclo de presupuesto', () => {
    for (const c of fixture.pure.periods) {
      const [period, start, day, end, ref] = c.args as [never, string, number | null, string | null, string];
      const r = currentPeriod(period, start, day, end, ref);
      expectSame([r.cycle_start, r.cycle_end, r.active], c.result);
    }
  });
});

describe('paridad con la API: vistas', () => {
  it('quincenas (mes anterior, actual y siguiente)', () => {
    for (const [month, expected] of Object.entries(fixture.api.quincenas)) {
      const [y, m] = month.split('-').map(Number);
      expectSame(normalizeQuincenas(quincenaOverview(state, y, m, today)), normalizeQuincenas(expected));
    }
  });
  it('resumen del dashboard', () => {
    expectSame(dashboardSummary(state, today), fixture.api.dashboard);
  });
  it('cuentas, presupuestos, préstamos e ingresos', () => {
    expectSame(byCreatedDesc(state.accounts).map(accountView), fixture.api.accounts);
    expectSame(byCreatedDesc(state.budgets).map((b) => budgetView(state, b, today)), fixture.api.budgets);
    expectSame(byCreatedDesc(state.loans).map((l) => loanView(state, l, today)), fixture.api.loans);
    expectSame(byCreatedDesc(state.incomeSources).map((s) => incomeSourceView(state, s)), fixture.api.incomeSources);
  });
  it('servicios del mes y metas de ahorro', () => {
    const period = today.slice(0, 7);
    const [y, m] = period.split('-').map(Number);
    const services = [...state.services].sort((a, b) => a.day_of_month - b.day_of_month || a.name.localeCompare(b.name));
    expectSame(services.map((s) => serviceView(state, s, { period, y, m })), fixture.api.services);
    const goals = [...state.savingsGoals].sort((a, b) => Number(b.active) - Number(a.active) || a.name.localeCompare(b.name));
    expectSame(goals.map((g) => savingsGoalView(state, g)), fixture.api.savings);
  });
  it('analítica', () => {
    const range12 = { start_date: `${addMonths(today.slice(0, 7), -11)}-01`, end_date: today };
    expectSame(cashFlow(state, range12), fixture.api.cashFlow);
    expectSame(spendingByCategory(state, { start_date: `${today.slice(0, 7)}-01`, end_date: today }), fixture.api.spending);
  });
});

function addMonths(ym: string, delta: number) {
  const [y, m] = ym.split('-').map(Number);
  const total = m - 1 + delta;
  return `${y + Math.floor(total / 12)}-${String(((total % 12) + 12) % 12 + 1).padStart(2, '0')}`;
}

describe('paridad con la API: fuente demo', () => {
  const source = createDemoSource(createDemoStore(() => structuredClone(state), false), {
    today: () => new Date(`${today}T12:00:00`),
  });

  it('búsqueda y orden de movimientos', async () => {
    expectSame(await source.transactions.list({ search: 'super', sort: 'amount', order: 'desc', limit: 20 }), fixture.api.transactionsSearch);
  });
  it('filtros y paginación de movimientos', async () => {
    const start = `${addMonths(today.slice(0, 7), -11)}-01`;
    expectSame(await source.transactions.list({ type: 'expense', start_date: start, limit: 15, offset: 15 }), fixture.api.transactionsPage);
  });
  it('quincena del mes actual vía la fuente', async () => {
    const month = today.slice(0, 7);
    const expected = (fixture.api.quincenas as Record<string, unknown>)[month];
    expectSame(normalizeQuincenas(await source.quincenas.overview(month)), normalizeQuincenas(expected));
  });
});
