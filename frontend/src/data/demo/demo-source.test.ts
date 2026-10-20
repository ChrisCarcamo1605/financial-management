import { beforeEach, describe, expect, it } from 'vitest';
import type { DataSource } from '../source';
import { createDemoSource } from './demo-source';
import { createDemoSeed } from './seed';
import { createDemoStore } from './store';

const NOW = new Date('2026-10-20T12:00:00');

let source: DataSource;

beforeEach(() => {
  const store = createDemoStore(() => createDemoSeed(NOW, 'es'), false);
  source = createDemoSource(store, { today: () => NOW });
});

const balanceOf = async (name: string) => (await source.accounts.list()).find((a) => a.name === name)!.balance;

describe('seed del demo', () => {
  it('genera seis meses coherentes hasta hoy', async () => {
    const summary = await source.dashboard.summary();
    expect(summary.accounts).toHaveLength(4);
    expect(summary.recent_transactions[0].date <= '2026-10-20').toBe(true);
    const page = await source.transactions.list({ start_date: '2026-04-01', limit: 1 });
    expect(page.total).toBeGreaterThan(150);
    const [loan] = await source.loans.list();
    expect(loan.payments).toHaveLength(48);
    expect(loan.payments.filter((p) => p.status === 'paid').length).toBe(6);
    const overview = await source.quincenas.overview('2026-10');
    expect(overview.totals.income).toBeGreaterThan(1000);
  });
  it('es determinista para el mismo día', () => {
    expect(createDemoSeed(NOW, 'es')).toEqual(createDemoSeed(NOW, 'es'));
  });
});

describe('movimientos', () => {
  it('ajustan el saldo al crear, editar y eliminar', async () => {
    const before = await balanceOf('Efectivo');
    const accounts = await source.accounts.list();
    const categories = await source.categories.list('expense');
    const tx = await source.transactions.create({
      type: 'expense', amount: 12.34, date: '2026-10-20', account_id: accounts.find((a) => a.name === 'Efectivo')!.id,
      category_id: categories[0].id, description: 'Prueba',
    });
    expect(await balanceOf('Efectivo')).toBeCloseTo(before - 12.34, 2);
    await source.transactions.update(tx.id, { ...tx, amount: 20, description: 'Prueba', loan_id: null });
    expect(await balanceOf('Efectivo')).toBeCloseTo(before - 20, 2);
    await source.transactions.remove(tx.id);
    expect(await balanceOf('Efectivo')).toBeCloseTo(before, 2);
  });
  it('rechazan una categoría de otro tipo', async () => {
    const accounts = await source.accounts.list();
    const income = await source.categories.list('income');
    await expect(source.transactions.create({
      type: 'expense', amount: 5, date: '2026-10-20', account_id: accounts[0].id, category_id: income[0].id,
    })).rejects.toThrow(/Category type mismatch/);
  });
});

describe('préstamos', () => {
  it('pagar hasta una cuota salda las anteriores y revertir restaura todo', async () => {
    const before = await balanceOf('Banco Agrícola · Nómina');
    let [loan] = await source.loans.list();
    const pending = loan.payments.filter((p) => p.status === 'pending');
    loan = await source.loans.setPaymentStatus(pending[1].id, 'paid', '2026-10-20');
    expect(loan.payments.filter((p) => p.status === 'paid')).toHaveLength(8);
    expect(await balanceOf('Banco Agrícola · Nómina')).toBeCloseTo(before - pending[0].amount - pending[1].amount, 2);

    const lastPaid = loan.payments.filter((p) => p.status === 'paid').at(-1)!;
    loan = await source.loans.setPaymentStatus(lastPaid.id, 'pending', '2026-10-20');
    expect(loan.payments.filter((p) => p.status === 'paid')).toHaveLength(6);
    expect(await balanceOf('Banco Agrícola · Nómina')).toBeCloseTo(before, 2);
  });
  it('solo revierte la última cuota pagada', async () => {
    const [loan] = await source.loans.list();
    await expect(source.loans.setPaymentStatus(loan.payments[0].id, 'pending', '2026-10-20')).rejects.toThrow(/última cuota/);
  });
});

describe('servicios y ahorro', () => {
  it('registrar el pago de un servicio es idempotente por mes', async () => {
    const services = await source.services.list('2026-11');
    const internet = services.find((s) => s.name === 'Internet · Tigo')!;
    expect(await source.services.generate(internet.id, '2026-11')).toEqual({ status: 'created', amount: 35 });
    expect(await source.services.generate(internet.id, '2026-11')).toEqual({ status: 'already_generated' });
    expect((await source.services.list('2026-11')).find((s) => s.id === internet.id)!.month_status.generated).toBe(true);
  });
  it('los recargos se suman al monto del mes', async () => {
    const [service] = await source.services.list('2026-11');
    await source.services.addSurcharge(service.id, { type: 'mora', amount: 5.5, period: '2026-11' });
    const list = await source.services.surcharges(service.id, '2026-11');
    expect(list.total).toBeCloseTo(service.amount + 5.5, 2);
  });
  it('el aporte automático crea movimiento y no se duplica', async () => {
    const [goal] = await source.savings.list();
    const result = await source.savings.generate(goal.id, '2026-11', 1);
    expect(result.status).toBe('created');
    expect(await source.savings.generate(goal.id, '2026-11', 1)).toEqual({ status: 'already_generated' });
    const updated = (await source.savings.list()).find((g) => g.id === goal.id)!;
    expect(updated.contributions.some((c) => c.quincena_period === '2026-11-Q1')).toBe(true);
  });
});

describe('reservas de tarjeta', () => {
  it('una reserva pasada sin confirmar pasa a la quincena siguiente', async () => {
    const find = async () => {
      const overview = await source.quincenas.overview('2026-10');
      for (const plan of overview.card_plan) {
        const index = plan.schedule.findIndex((s, i) => s.status === 'saved' && s.in_view && plan.schedule[i + 1]?.role === 'reserva');
        if (index >= 0) return { plan, index };
      }
      return null;
    };
    const found = await find();
    expect(found).not.toBeNull();
    const { plan, index } = found!;
    const step = plan.schedule[index];
    const input = { card_id: plan.card_id, payment_due_date: plan.payment_due_date, period: `${step.month}-Q${step.quincena}` };

    await source.quincenas.setCardReserve({ ...input, saved: false });
    const missed = (await source.quincenas.overview('2026-10')).card_plan.find((p) => p.payment_due_date === plan.payment_due_date)!;
    expect(missed.schedule[index].status).toBe('missed');
    expect(missed.schedule[index + 1].amount).toBeCloseTo(plan.schedule[index + 1].amount + step.amount, 2);

    await source.quincenas.setCardReserve({ ...input, saved: true });
    const restored = (await source.quincenas.overview('2026-10')).card_plan.find((p) => p.payment_due_date === plan.payment_due_date)!;
    expect(restored.schedule).toEqual(plan.schedule);
  });
});
