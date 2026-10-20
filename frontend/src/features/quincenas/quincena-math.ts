import type { MonthKey, Quincena, SavingsGoal } from '@/data/types';
import type { QuincenaNumber } from '@/lib/dates';

export interface SavingsRow {
  id: number;
  name: string;
  amount: number;
  icon: string | null;
  color: string | null;
  /** Aporte automático de esta quincena registrado, o algún aporte fechado dentro de ella. */
  paid: boolean;
}

/** Aporte planificado de cada meta activa en la quincena indicada. */
export function savingsForQuincena(
  goals: SavingsGoal[],
  quincena: Pick<Quincena, 'start' | 'end'>,
  number: QuincenaNumber,
  month: MonthKey,
): SavingsRow[] {
  const period = `${month}-Q${number}`;
  return goals
    .filter((goal) => goal.active)
    .map((goal) => {
      const half = goal.per_quincena / 2;
      const amount = number === 1 ? goal.per_quincena_q1 ?? half : goal.per_quincena_q2 ?? half;
      return {
        id: goal.id,
        name: goal.name,
        amount,
        icon: goal.icon,
        color: goal.color,
        paid: goal.contributions.some((c) => c.quincena_period === period || (c.date >= quincena.start && c.date <= quincena.end)),
      };
    })
    .filter((row) => row.amount > 0);
}

export interface QuincenaBreakdown {
  income: number;
  services: number;
  loans: number;
  /** Pago de tarjeta (lo que falta en efectivo) + lo que se guarda para pagarla. */
  cards: number;
  savings: number;
  committed: number;
  /** Ingreso menos todo lo comprometido; negativo si no alcanza. */
  free: number;
}

/** Cómo se reparte el ingreso de una quincena entre compromisos y dinero libre. */
export function quincenaBreakdown(quincena: Quincena, savings: SavingsRow[]): QuincenaBreakdown {
  const sum = (values: number[]) => Math.round(values.reduce((a, b) => a + b, 0) * 100) / 100;
  const services = sum(quincena.services.filter((s) => !s.deferred).map((s) => s.amount));
  const loans = sum(quincena.payments.map((p) => p.amount));
  const cards = sum([...quincena.credit_cards.map((c) => c.cash_needed), ...quincena.card_reserves.map((r) => r.amount)]);
  const savingsTotal = sum(savings.map((s) => s.amount));
  const committed = sum([services, loans, cards, savingsTotal]);
  return {
    income: quincena.income,
    services,
    loans,
    cards,
    savings: savingsTotal,
    committed,
    free: Math.round((quincena.income - committed) * 100) / 100,
  };
}

/** Servicios que ya tienen su movimiento registrado dentro de la quincena. */
export function paidServiceIds(quincena: Quincena) {
  return new Set(quincena.transactions.flatMap((t) => (t.recurring_service_id ? [t.recurring_service_id] : [])));
}

export interface PendingItem {
  key: string;
  kind: 'service' | 'loan' | 'card' | 'reserve' | 'saving';
  /** Nombre del servicio, préstamo, tarjeta o meta (la UI arma la etiqueta). */
  name: string;
  /** Número de cuota (solo préstamos). */
  installment?: number;
  amount: number;
  date: string | null;
  icon: string | null;
}

/** Compromisos de la quincena que aún no se han pagado, ordenados por fecha. */
export function pendingItems(quincena: Quincena, savings: SavingsRow[]): PendingItem[] {
  const paidServices = paidServiceIds(quincena);
  const items: PendingItem[] = [
    ...quincena.services
      .filter((s) => !s.deferred && !paidServices.has(s.id))
      .map((s) => ({ key: `s${s.id}`, kind: 'service' as const, name: s.name, amount: s.amount, date: s.charge_date, icon: s.icon })),
    ...quincena.payments
      .filter((p) => p.status === 'pending')
      .map((p) => ({ key: `p${p.id}`, kind: 'loan' as const, name: p.loan_name ?? '', installment: p.installment_number, amount: p.amount - p.paid_amount, date: p.due_date, icon: 'bank' })),
    ...quincena.credit_cards
      .filter((c) => c.cash_needed > 0.005)
      .map((c) => ({ key: `c${c.id}-${c.payment_due_date}`, kind: 'card' as const, name: c.name, amount: c.cash_needed, date: c.payment_due_date, icon: 'card' })),
    ...quincena.card_reserves
      .filter((r) => r.status === 'pending' && r.amount > 0.005)
      .map((r) => ({ key: `r${r.card_id}-${r.payment_due_date}`, kind: 'reserve' as const, name: r.card_name, amount: r.amount, date: null, icon: 'savings' })),
    ...savings
      .filter((s) => !s.paid)
      .map((s) => ({ key: `g${s.id}`, kind: 'saving' as const, name: s.name, amount: s.amount, date: null, icon: s.icon })),
  ];
  return items.sort((a, b) => (a.date ?? '9999').localeCompare(b.date ?? '9999'));
}
