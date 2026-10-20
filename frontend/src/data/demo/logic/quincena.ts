import type {
  CardCharge, CardPlan, CardPlanStep, CardReserve, CardStatement, Quincena, QuincenaIncomeSource,
  QuincenaLoanPayment, QuincenaOverview, QuincenaService,
} from '../../types';
import type { AccountRow, DemoState, LoanPaymentRow, ServiceRow } from '../schema';
import { byId, incomeSourceView, transactionView } from '../views';
import { reserveFlow } from './card-reserves';
import {
  addDays, clampDay, dayMonthAbbr, daysInMonth, iso, nextMonth, parse, pad, prevMonth, type ISO,
} from './dates';
import { pyRound, pySum } from './numbers';

/**
 * Port de services/quincena.py.
 * Q1: día 30 del mes anterior → día 14; Q2: día 15 → día 29.
 */

const inQ1 = (day: number) => day <= 14 || day >= 30;

/** Quincena (número, año, mes) de una fecha; los días 30-31 abren la Q1 del mes siguiente. */
function quincenaOf(date: ISO): [1 | 2, number, number] {
  const { y, m, d } = parse(date);
  if (d >= 30) {
    const [ny, nm] = nextMonth(y, m);
    return [1, ny, nm];
  }
  return [d <= 14 ? 1 : 2, y, m];
}

const qindex = (qnum: number, y: number, m: number) => (y * 12 + (m - 1)) * 2 + (qnum - 1);
const qindexOf = (date: ISO) => qindex(...quincenaOf(date));

function qparts(idx: number): [1 | 2, number, number] {
  const qnum = ((idx % 2) + 1) as 1 | 2;
  const months = Math.floor(idx / 2);
  return [qnum, Math.floor(months / 12), (months % 12) + 1];
}

const periodKey = (idx: number) => {
  const [q, y, m] = qparts(idx);
  return `${y}-${pad(m)}-Q${q}`;
};

function periodIndex(period: string) {
  const [y, m, q] = period.split('-');
  return qindex(Number(q[1]), Number(y), Number(m));
}

/** Sort estable por clave (como `sorted` de Python). */
const sortBy = <T>(items: T[], key: (item: T) => string | number) =>
  items.map((item, i) => ({ item, i, k: key(item) }))
    .sort((a, b) => (a.k < b.k ? -1 : a.k > b.k ? 1 : a.i - b.i))
    .map(({ item }) => item);

function cardCycleBounds(card: AccountRow, dueDate: ISO): [ISO, ISO] {
  const cutoffDay = card.cutoff_day || 1;
  const due = parse(dueDate);
  let cutoff = clampDay(due.y, due.m, cutoffDay);
  if (cutoff > dueDate) {
    const [cy, cm] = prevMonth(due.y, due.m);
    cutoff = clampDay(cy, cm, cutoffDay);
  }
  const c = parse(cutoff);
  const [py, pm] = prevMonth(c.y, c.m);
  return [clampDay(py, pm, cutoffDay), cutoff];
}

interface Statement extends Omit<CardStatement, 'reserved_prior' | 'cash_needed' | 'carried_in'> {
  services: { id: number; name: string; amount: number; date: ISO; icon: string | null; iconType: string }[];
  by_quincena: Map<number, number>;
}

function cardStatement(state: DemoState, card: AccountRow, dueDate: ISO, cardServices: ServiceRow[]): Statement | null {
  const [prevCutoff, cutoff] = cardCycleBounds(card, dueDate);
  const start = card.start_date;
  if (start && cutoff < start) return null;

  const cycleTxs = sortBy(
    state.transactions.filter((t) => t.account_id === card.id && t.type === 'expense'
      && t.date > prevCutoff && t.date <= cutoff && (!start || t.date >= start)),
    (t) => t.date,
  );
  const cycleAmount = pySum(cycleTxs.map((t) => t.amount));
  const chargedServiceIds = new Set(cycleTxs.flatMap((t) => (t.recurring_service_id ? [t.recurring_service_id] : [])));

  const charges: CardCharge[] = cycleTxs.map((t) => {
    const category = byId(state.categories, t.category_id);
    return {
      kind: t.recurring_service_id ? 'service' : 'transaction',
      id: `t${t.id}`,
      name: t.description || category?.name || 'Gasto',
      amount: t.amount,
      date: t.date,
      icon: category?.icon ?? null,
      iconType: category?.icon_type ?? null,
      category_name: category?.name ?? null,
      projected: false,
      quincena_index: qindexOf(t.date),
    };
  });

  // Servicios de la tarjeta aún no materializados cuyo cargo cae en el ciclo.
  const projected: Statement['services'] = [];
  const pc = parse(prevCutoff);
  const cc = parse(cutoff);
  const months = [...new Set([`${pc.y}-${pad(pc.m)}`, `${cc.y}-${pad(cc.m)}`])].sort();
  for (const s of cardServices) {
    if (chargedServiceIds.has(s.id)) continue;
    for (const ym of months) {
      const [cy, cm] = ym.split('-').map(Number);
      const chargeDate = clampDay(cy, cm, s.day_of_month || 1);
      if (!(prevCutoff < chargeDate && chargeDate <= cutoff)) continue;
      if (start && chargeDate < start) continue;
      projected.push({ id: s.id, name: s.name, amount: s.amount, date: chargeDate, icon: s.icon, iconType: s.icon_type });
      charges.push({
        kind: 'service', id: `s${s.id}`, name: s.name, amount: s.amount, date: chargeDate, icon: s.icon,
        iconType: s.icon_type, category_name: null, projected: true, quincena_index: qindexOf(chargeDate),
      });
      break;
    }
  }

  const projectedAmount = pySum(projected.map((x) => x.amount));
  const totalDue = cycleAmount + projectedAmount;
  if (totalDue <= 0) return null;

  const sortedCharges = sortBy(charges, (c) => c.date);
  const byQuincena = new Map<number, number>();
  for (const c of sortedCharges) byQuincena.set(c.quincena_index, (byQuincena.get(c.quincena_index) ?? 0) + c.amount);

  return {
    id: card.id,
    name: card.name,
    amount: pyRound(totalDue),
    charged_amount: pyRound(cycleAmount),
    projected_amount: pyRound(projectedAmount),
    services: sortBy(projected, (x) => x.date),
    charges: sortedCharges,
    by_quincena: byQuincena,
    cycle_start: addDays(prevCutoff, 1),
    cutoff_date: cutoff,
    payment_due_date: dueDate,
    available: card.credit_limit != null ? pyRound(card.credit_limit + card.balance) : null,
  };
}

/** (corte, fecha límite) del ciclo en el que cae un cargo. */
function cardCycleForCharge(card: AccountRow, chargeDate: ISO): [ISO, ISO] {
  const cutoffDay = card.cutoff_day || 1;
  const dueDay = card.payment_due_day || 1;
  const c = parse(chargeDate);
  let cutoff = clampDay(c.y, c.m, cutoffDay);
  if (cutoff < chargeDate) {
    const [ny, nm] = nextMonth(c.y, c.m);
    cutoff = clampDay(ny, nm, cutoffDay);
  }
  const k = parse(cutoff);
  let due = clampDay(k.y, k.m, dueDay);
  if (due <= cutoff) {
    const [ny, nm] = nextMonth(k.y, k.m);
    due = clampDay(ny, nm, dueDay);
  }
  return [cutoff, due];
}

type CardEntry = CardStatement & { services: Statement['services']; by_quincena: Record<string, number> };

/** El JSON de la API serializa by_quincena con claves de texto. */
const byQuincenaJson = (map: Map<number, number>) => Object.fromEntries([...map].map(([k, v]) => [String(k), v]));

function buildQuincena(
  label: string, start: ISO, end: ISO, payments: LoanPaymentRow[], income: number, services: QuincenaService[],
  incomeSources: QuincenaIncomeSource[], transactions: Quincena['transactions'], creditCards: CardEntry[],
  cardReserves: CardReserve[], state: DemoState, today: ISO,
): Quincena {
  const inRange = payments.filter((p) => start <= p.due_date && p.due_date <= end);
  const loanExpenses = pySum(inRange.map((p) => p.amount));
  const servicesExpenses = pySum(services.filter((s) => !s.deferred).map((s) => s.amount));
  const cardsExpenses = pySum(creditCards.map((c) => c.cash_needed));
  const reservesExpenses = pySum(cardReserves.map((r) => r.amount));
  const expenses = pyRound(loanExpenses + servicesExpenses + cardsExpenses + reservesExpenses);
  return {
    label,
    start,
    end,
    income: pyRound(income),
    expenses,
    available: pyRound(income - expenses),
    credit_cards: sortBy(creditCards, (c) => c.payment_due_date),
    card_reserves: sortBy(cardReserves, (r) => r.payment_due_date),
    card_payment_total: pyRound(pySum(creditCards.map((c) => c.amount))),
    card_reserved_prior: pyRound(pySum(creditCards.map((c) => c.reserved_prior))),
    card_reserve_total: pyRound(reservesExpenses),
    payments: sortBy(inRange, (p) => p.due_date).map<QuincenaLoanPayment>((p) => ({
      id: p.id,
      loan_id: p.loan_id,
      loan_name: byId(state.loans, p.loan_id)?.name ?? null,
      installment_number: p.installment_number,
      amount: p.amount,
      paid_amount: p.paid_amount,
      due_date: p.due_date,
      status: p.status,
      is_advance: p.status === 'paid' && p.due_date > today,
    })),
    services: sortBy(services, (s) => s.day),
    income_sources: incomeSources,
    transactions,
  };
}

export function quincenaOverview(state: DemoState, year: number, month: number, today: ISO): QuincenaOverview {
  const [prevY, prevM] = prevMonth(year, month);
  const q1Start = iso(prevY, prevM, Math.min(30, daysInMonth(prevY, prevM)));
  const q1End = iso(year, month, 14);
  const q2Start = iso(year, month, 15);
  const q2End = iso(year, month, Math.min(29, daysInMonth(year, month)));

  const payments = state.loanPayments.filter((p) => p.due_date >= q1Start && p.due_date <= q2End);
  const cards = state.accounts.filter((a) => a.type === 'tarjeta_credito');
  const cardsById = new Map(cards.map((c) => [c.id, c]));
  const services = state.services.filter((s) => s.active);

  const servicesQ1: QuincenaService[] = [];
  const servicesQ2: QuincenaService[] = [];
  for (const s of services) {
    const day = s.day_of_month || 1;
    const isQ1 = inQ1(day);
    const [cy, cm] = isQ1 && day >= 30 ? [prevY, prevM] : [year, month];
    const chargeDate = clampDay(cy, cm, day);
    let card = s.account_id != null ? cardsById.get(s.account_id) : undefined;
    if (card && card.start_date && chargeDate < card.start_date) card = undefined;
    const entry: QuincenaService = {
      id: s.id,
      name: s.name,
      amount: s.amount,
      day,
      icon: s.icon,
      iconType: s.icon_type,
      charge_date: chargeDate,
      account_id: s.account_id,
      account_name: byId(state.accounts, s.account_id)?.name ?? null,
    };
    if (card) {
      const [cutoff, due] = cardCycleForCharge(card, chargeDate);
      const [qnum, qy, qm] = quincenaOf(due);
      Object.assign(entry, {
        deferred: true,
        card_id: card.id,
        card_name: card.name,
        card_cutoff_date: cutoff,
        card_payment_due_date: due,
        card_payment_quincena: qnum,
        card_payment_month: `${qy}-${pad(qm)}`,
      });
    }
    (isQ1 ? servicesQ1 : servicesQ2).push(entry);
  }

  const servicesByCard = new Map<number, ServiceRow[]>();
  for (const s of services) {
    if (s.account_id != null && cardsById.has(s.account_id)) {
      servicesByCard.set(s.account_id, [...(servicesByCard.get(s.account_id) ?? []), s]);
    }
  }

  const idxQ1 = qindex(1, year, month);
  const idxQ2 = idxQ1 + 1;
  const inView = (i: number) => i === idxQ1 || i === idxQ2;
  const [n1y, n1m] = nextMonth(year, month);
  const [n2y, n2m] = nextMonth(n1y, n1m);
  const candidateMonths: [number, number][] = [[prevY, prevM], [year, month], [n1y, n1m], [n2y, n2m]];

  const currentIdx = qindexOf(today);
  const savedByStatement = new Map<string, Set<number>>();
  for (const row of state.cardReserves) {
    const key = `${row.card_id}|${row.payment_due_date}`;
    savedByStatement.set(key, (savedByStatement.get(key) ?? new Set()).add(periodIndex(row.quincena_period)));
  }

  const cardsQ1: CardEntry[] = [];
  const cardsQ2: CardEntry[] = [];
  const reservesQ1: CardReserve[] = [];
  const reservesQ2: CardReserve[] = [];
  const cardPlan: CardPlan[] = [];

  for (const card of cards) {
    const dueDay = card.payment_due_day || 1;
    const seenDues = new Set<ISO>();
    for (const [dy, dm] of candidateMonths) {
      const dueDate = clampDay(dy, dm, dueDay);
      if (seenDues.has(dueDate)) continue;
      seenDues.add(dueDate);
      const idxDue = qindexOf(dueDate);
      if (idxDue < idxQ1) continue;

      const statement = cardStatement(state, card, dueDate, servicesByCard.get(card.id) ?? []);
      if (!statement) continue;

      const byQ = statement.by_quincena;
      const flow = reserveFlow(byQ, idxDue, currentIdx, savedByStatement.get(`${card.id}|${dueDate}`) ?? new Set());
      const cashNeeded = pyRound(statement.amount - flow.reservedPrior);
      const [dueQnum, dueQy, dueQm] = qparts(idxDue);
      const dueMonth = `${dueQy}-${pad(dueQm)}`;

      const touchesView = inView(idxDue) || [...flow.entries.keys()].some(inView) || [...byQ.keys()].some(inView);
      if (!touchesView) continue;

      if (inView(idxDue)) {
        const entry: CardEntry = {
          ...statement,
          by_quincena: byQuincenaJson(byQ),
          reserved_prior: flow.reservedPrior,
          carried_in: flow.carriedToPayment,
          cash_needed: cashNeeded,
        };
        (idxDue === idxQ1 ? cardsQ1 : cardsQ2).push(entry);
      }

      for (const [i, step] of [...flow.entries].sort((a, b) => a[0] - b[0])) {
        if (!inView(i)) continue;
        const reserve: CardReserve = {
          card_id: card.id,
          card_name: card.name,
          amount: step.amount,
          own_amount: step.own,
          carried_in: step.carried_in,
          need: step.need,
          status: step.status,
          period: periodKey(i),
          total: statement.amount,
          charges: statement.charges.filter((c) => c.quincena_index === i),
          cutoff_date: statement.cutoff_date,
          payment_due_date: statement.payment_due_date,
          payment_quincena: dueQnum,
          payment_month: dueMonth,
        };
        (i === idxQ1 ? reservesQ1 : reservesQ2).push(reserve);
      }

      const schedule: CardPlanStep[] = [...new Set([...flow.entries.keys(), idxDue])].sort((a, b) => a - b).map((i) => {
        const [qn, qy, qm] = qparts(i);
        const isPayment = i === idxDue;
        return {
          quincena: qn,
          month: `${qy}-${pad(qm)}`,
          amount: isPayment ? cashNeeded : flow.entries.get(i)!.need,
          role: isPayment ? 'pago' : 'reserva',
          status: isPayment ? null : flow.entries.get(i)!.status,
          in_view: inView(i),
        };
      });
      cardPlan.push({
        card_id: card.id,
        card_name: card.name,
        total: statement.amount,
        charges: statement.charges,
        cycle_start: statement.cycle_start,
        cutoff_date: statement.cutoff_date,
        payment_due_date: statement.payment_due_date,
        payment_quincena: dueQnum,
        payment_month: dueMonth,
        reserved_prior: flow.reservedPrior,
        carried_in: flow.carriedToPayment,
        cash_needed: cashNeeded,
        reserve_in_view: pyRound(pySum([...flow.entries].filter(([i]) => inView(i)).map(([, s]) => s.amount))),
        schedule,
      });
    }
  }

  let incomeQ1 = 0;
  let incomeQ2 = 0;
  const sourcesQ1: QuincenaIncomeSource[] = [];
  const sourcesQ2: QuincenaIncomeSource[] = [];
  for (const s of state.incomeSources) {
    const d = incomeSourceView(state, s);
    const net = d.net_amount;
    const base = { id: s.id, name: s.name, modality: s.modality, pay_schedule: s.pay_schedule };
    if (s.pay_schedule === 'biweekly') {
      incomeQ1 += net / 2;
      incomeQ2 += net / 2;
      const half: QuincenaIncomeSource = {
        ...base,
        gross_amount: pyRound(d.gross_amount / 2),
        isss: pyRound(d.isss / 2),
        afp: pyRound(d.afp / 2),
        isr: pyRound(d.isr / 2),
        net_amount: pyRound(net / 2),
        pay_day: null,
      };
      sourcesQ1.push(half);
      sourcesQ2.push(half);
    } else {
      const payDay = s.pay_day || 30;
      const entry: QuincenaIncomeSource = {
        ...base, gross_amount: d.gross_amount, isss: d.isss, afp: d.afp, isr: d.isr, net_amount: net, pay_day: payDay,
      };
      if (inQ1(payDay)) {
        incomeQ1 += net;
        sourcesQ1.push(entry);
      } else {
        incomeQ2 += net;
        sourcesQ2.push(entry);
      }
    }
  }

  const txs = sortBy(state.transactions.filter((t) => t.date >= q1Start && t.date <= q2End), (t) => t.date);
  const txsQ1 = txs.filter((t) => t.date >= q1Start && t.date <= q1End).map((t) => transactionView(state, t));
  const txsQ2 = txs.filter((t) => t.date >= q2Start && t.date <= q2End).map((t) => transactionView(state, t));

  const q1 = buildQuincena(
    `Q1 (${dayMonthAbbr(q1Start)} – ${dayMonthAbbr(q1End)})`, q1Start, q1End, payments, incomeQ1, servicesQ1,
    sourcesQ1, txsQ1, cardsQ1, reservesQ1, state, today,
  );
  const q2 = buildQuincena(
    `Q2 (${dayMonthAbbr(q2Start)} – ${dayMonthAbbr(q2End)})`, q2Start, q2End, payments, incomeQ2, servicesQ2,
    sourcesQ2, txsQ2, cardsQ2, reservesQ2, state, today,
  );

  return {
    year,
    month,
    quincenas: [q1, q2],
    card_plan: sortBy(cardPlan, (p) => p.payment_due_date),
    totals: {
      income: pyRound(incomeQ1 + incomeQ2),
      expenses: pyRound(q1.expenses + q2.expenses),
      available: pyRound(q1.available + q2.available),
      card_reserve: pyRound(q1.card_reserve_total + q2.card_reserve_total),
      card_payment: pyRound(q1.card_payment_total + q2.card_payment_total),
    },
  };
}
