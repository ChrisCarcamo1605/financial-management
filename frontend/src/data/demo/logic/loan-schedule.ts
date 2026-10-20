import type { InterestMethod, LoanPaymentType } from '../../types';
import { addMonthsYM, clampDay, daysInMonth, iso, parse, type ISO } from './dates';
import { pyRound } from './numbers';

/** Port de services/loan_schedule.py: calendario de cuotas. */
export interface ScheduleItem {
  installment_number: number;
  due_date: ISO;
  amount: number;
}

export interface ScheduleParams {
  principal: number;
  interest_rate: number;
  interest_method: InterestMethod;
  payment_type: LoanPaymentType;
  installments: number | null;
  payment_day: number | null;
  start_date: ISO;
}

function dueDateFor(baseY: number, baseM: number, offset: number, payDay: number) {
  const [y, m] = addMonthsYM(baseY, baseM, offset);
  return clampDay(y, m, payDay);
}

function biweeklyAnchor(y: number, m: number, half: number) {
  return half === 0 ? iso(y, m, 15) : iso(y, m, Math.min(30, daysInMonth(y, m)));
}

function firstBiweeklyAnchor(start: ISO): [number, number, number] {
  const { y, m } = parse(start);
  for (const half of [0, 1]) if (start <= biweeklyAnchor(y, m, half)) return [y, m, half];
  const [ny, nm] = addMonthsYM(y, m, 1);
  return [ny, nm, 0];
}

function biweeklyDueDate(y: number, m: number, half: number, offset: number) {
  const total = half + offset;
  const [ny, nm] = addMonthsYM(y, m, Math.floor(total / 2));
  return biweeklyAnchor(ny, nm, total % 2);
}

function installmentTotal(principal: number, rateAnnual: number, method: InterestMethod, n: number, periodsPerYear = 12) {
  const rate = rateAnnual / 100;
  if (method === 'french' && rate > 0) {
    const r = rate / periodsPerYear;
    const payment = (principal * r) / (1 - (1 + r) ** -n);
    return pyRound(payment * n);
  }
  return pyRound(principal * (1 + rate * (n / periodsPerYear)));
}

function splitEvenly(total: number, n: number, dueDate: (i: number) => ISO): ScheduleItem[] {
  const per = pyRound(total / n);
  const items: ScheduleItem[] = [];
  let accumulated = 0;
  for (let i = 0; i < n; i++) {
    let amount: number;
    if (i === n - 1) {
      amount = pyRound(total - accumulated);
    } else {
      amount = per;
      accumulated = pyRound(accumulated + per);
    }
    items.push({ installment_number: i + 1, due_date: dueDate(i), amount });
  }
  return items;
}

export function buildSchedule(params: ScheduleParams): ScheduleItem[] {
  const principal = Number(params.principal);
  const rate = Number(params.interest_rate);
  if (params.payment_type === 'single') {
    return [{ installment_number: 1, due_date: params.start_date, amount: pyRound(principal * (1 + rate / 100)) }];
  }
  const n = Math.max(Math.trunc(params.installments || 1), 1);

  if (params.payment_type === 'biweekly') {
    const total = installmentTotal(principal, rate, params.interest_method, n, 24);
    const [y, m, half] = firstBiweeklyAnchor(params.start_date);
    return splitEvenly(total, n, (i) => biweeklyDueDate(y, m, half, i));
  }

  const start = parse(params.start_date);
  const payDay = params.payment_day || start.d;
  const total = installmentTotal(principal, rate, params.interest_method, n);
  let [baseY, baseM] = [start.y, start.m];
  if (clampDay(baseY, baseM, payDay) < params.start_date) {
    const first = parse(dueDateFor(baseY, baseM, 1, payDay));
    [baseY, baseM] = [first.y, first.m];
  }
  return splitEvenly(total, n, (i) => dueDateFor(baseY, baseM, i, payDay));
}

/** Port de rebuild_loan_schedule: reparte lo abonado empezando por las cuotas más antiguas. */
const EPS = 0.005;

export interface RebuiltPayment extends ScheduleItem {
  paid_amount: number;
  status: 'pending' | 'paid';
  paid_date: ISO | null;
}

export function applyPaidTotal(schedule: ScheduleItem[], paidTotal: number, today: ISO) {
  let remaining = pyRound(Number(paidTotal || 0));
  let allPaid = true;
  const payments: RebuiltPayment[] = schedule.map((item) => {
    const amt = item.amount;
    let paid: number;
    let status: 'pending' | 'paid';
    if (remaining >= amt - EPS) {
      paid = amt;
      status = 'paid';
      remaining = pyRound(remaining - amt);
    } else if (remaining > 0) {
      paid = remaining;
      status = 'pending';
      remaining = 0;
      allPaid = false;
    } else {
      paid = 0;
      status = 'pending';
      allPaid = false;
    }
    return { ...item, paid_amount: pyRound(paid), status, paid_date: status === 'paid' ? today : null };
  });
  return { payments, loanStatus: (allPaid ? 'paid' : 'active') as 'paid' | 'active', overpaid: pyRound(remaining) };
}
