import type { BudgetPeriod } from '../../types';
import { addDays, addMonthsYM, clampDay, daysInMonth, iso, isoWeekday, minISO, parse, type ISO } from './dates';

/** Port de services/budget_period.py: ciclo actual de un presupuesto recurrente. */
function monthlyCycle(anchorDay: number, today: ISO): [ISO, ISO] {
  const t = parse(today);
  const thisStart = clampDay(t.y, t.m, anchorDay);
  if (today >= thisStart) {
    const [ny, nm] = addMonthsYM(t.y, t.m, 1);
    return [thisStart, addDays(clampDay(ny, nm, anchorDay), -1)];
  }
  const [py, pm] = addMonthsYM(t.y, t.m, -1);
  return [clampDay(py, pm, anchorDay), addDays(thisStart, -1)];
}

function weeklyCycle(anchorWeekday: number, today: ISO): [ISO, ISO] {
  const delta = (((isoWeekday(today) - anchorWeekday) % 7) + 7) % 7;
  const start = addDays(today, -delta);
  return [start, addDays(start, 6)];
}

function biweeklyCycle(today: ISO): [ISO, ISO] {
  const { y, m, d } = parse(today);
  const last = daysInMonth(y, m);
  if (d >= 15 && d <= 29) return [iso(y, m, 15), iso(y, m, Math.min(29, last))];
  if (d >= 30) {
    const [ny, nm] = addMonthsYM(y, m, 1);
    return [iso(y, m, Math.min(30, last)), iso(ny, nm, 14)];
  }
  const [py, pm] = addMonthsYM(y, m, -1);
  return [iso(py, pm, Math.min(30, daysInMonth(py, pm))), iso(y, m, 14)];
}

export function currentPeriod(
  period: BudgetPeriod, startDate: ISO, startDay: number | null, endDate: ISO | null, today: ISO,
): { cycle_start: ISO; cycle_end: ISO; active: boolean } {
  const ref = endDate ? minISO(today, endDate) : today;
  let cycle: [ISO, ISO];
  if (period === 'weekly') cycle = weeklyCycle(startDay || isoWeekday(startDate), ref);
  else if (period === 'biweekly') cycle = biweeklyCycle(ref);
  else cycle = monthlyCycle(startDay || parse(startDate).d, ref);
  const [cycleStart, cycleEnd] = cycle;
  const end = endDate && cycleEnd > endDate ? endDate : cycleEnd;
  return { cycle_start: cycleStart, cycle_end: end, active: !endDate || today <= endDate };
}
