import { describe, expect, it } from 'vitest';
import type { Quincena, SavingsGoal } from '@/data/types';
import { pendingItems, quincenaBreakdown, savingsForQuincena } from './quincena-math';

const quincena = {
  label: 'Q2', start: '2026-10-15', end: '2026-10-29', income: 1000, expenses: 0, available: 0,
  credit_cards: [{ id: 9, name: 'Visa', cash_needed: 40, payment_due_date: '2026-10-20' }],
  card_reserves: [{ card_id: 9, amount: 25 }],
  card_payment_total: 0, card_reserved_prior: 0, card_reserve_total: 25,
  payments: [{ id: 1, loan_id: 1, loan_name: 'Auto', installment_number: 3, amount: 200, paid_amount: 50, due_date: '2026-10-25', status: 'pending', is_advance: false }],
  services: [
    { id: 1, name: 'Luz', amount: 30, day: 18, charge_date: '2026-10-18' },
    { id: 2, name: 'Netflix', amount: 15, day: 22, charge_date: '2026-10-22', deferred: true },
    { id: 3, name: 'Agua', amount: 10, day: 16, charge_date: '2026-10-16' },
  ],
  income_sources: [],
  transactions: [{ id: 7, recurring_service_id: 3 }],
} as unknown as Quincena;

const goal = (overrides: Partial<SavingsGoal>): SavingsGoal => ({
  id: 1, name: 'Meta', target_amount: 100, current_amount: 0, per_quincena: 100, per_quincena_q1: null,
  per_quincena_q2: null, account_id: null, account_name: null, day_q1: null, day_q2: null, percentage: 0,
  remaining: 100, color: null, icon: null, iconType: 'registry', active: true, contributions: [], ...overrides,
});

describe('savingsForQuincena', () => {
  it('splits per_quincena in halves when Q1/Q2 are not configured and skips inactive goals', () => {
    const rows = savingsForQuincena([goal({}), goal({ id: 2, active: false })], quincena, 2, '2026-10');
    expect(rows).toHaveLength(1);
    expect(rows[0].amount).toBe(50);
  });
  it('marks a goal paid when a contribution falls inside the quincena', () => {
    const rows = savingsForQuincena([goal({ per_quincena_q2: 30, contributions: [{ date: '2026-10-29' } as never] })], quincena, 2, '2026-10');
    expect(rows[0]).toMatchObject({ amount: 30, paid: true });
  });
  it('marks a goal paid when its automatic contribution for the period exists, even dated outside the range', () => {
    const rows = savingsForQuincena([goal({ contributions: [{ date: '2026-10-30', quincena_period: '2026-10-Q2' } as never] })], quincena, 2, '2026-10');
    expect(rows[0].paid).toBe(true);
  });
});

describe('quincenaBreakdown', () => {
  it('excludes services charged to a card and adds card payment plus reserve', () => {
    const result = quincenaBreakdown(quincena, [{ id: 1, name: 'Meta', amount: 50, icon: null, color: null, paid: false }]);
    expect(result).toEqual({ income: 1000, services: 40, loans: 200, cards: 65, savings: 50, committed: 355, free: 645 });
  });
});

describe('pendingItems', () => {
  it('lists unpaid commitments by date, with remaining loan balance', () => {
    const items = pendingItems(quincena, [{ id: 1, name: 'Meta', amount: 50, icon: null, color: null, paid: false }]);
    expect(items.map((i) => i.key)).toEqual(['s1', 'c9-2026-10-20', 'p1', 'g1']);
    expect(items.find((i) => i.kind === 'loan')).toMatchObject({ name: 'Auto', installment: 3, amount: 150 });
  });
});

describe('pendingItems with card reserves', () => {
  it('lists reserves still to save, skipping saved or missed ones', () => {
    const withReserves = {
      ...quincena,
      card_reserves: [
        { card_id: 9, card_name: 'Visa', amount: 25, status: 'pending', payment_due_date: '2026-11-05' },
        { card_id: 9, card_name: 'Visa', amount: 30, status: 'saved', payment_due_date: '2026-12-05' },
        { card_id: 8, card_name: 'Master', amount: 0, status: 'missed', payment_due_date: '2026-11-10' },
      ],
    } as unknown as Quincena;
    const reserves = pendingItems(withReserves, []).filter((i) => i.key.startsWith('r'));
    expect(reserves).toEqual([expect.objectContaining({ kind: 'reserve', name: 'Visa', amount: 25 })]);
  });
});
