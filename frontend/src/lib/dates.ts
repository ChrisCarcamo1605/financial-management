import { addMonths, format, parseISO } from 'date-fns';
import type { ISODate, MonthKey } from '@/data/types';

export type QuincenaNumber = 1 | 2;

export function toISODate(date: Date = new Date()): ISODate {
  return format(date, 'yyyy-MM-dd');
}

export function parseDate(value: ISODate | Date): Date {
  return typeof value === 'string' ? parseISO(value) : value;
}

export function toMonthKey(date: Date = new Date()): MonthKey {
  return format(date, 'yyyy-MM');
}

export function monthKeyToDate(month: MonthKey): Date {
  return parseISO(`${month}-01`);
}

export function shiftMonth(month: MonthKey, delta: number): MonthKey {
  return toMonthKey(addMonths(monthKeyToDate(month), delta));
}

/**
 * Quincena a la que pertenece una fecha, con la convención de la API:
 * Q1 = día 30 del mes anterior → día 14; Q2 = día 15 → día 29.
 * Los días 30-31 abren la Q1 del mes siguiente.
 */
export function quincenaOf(date: Date = new Date()): { month: MonthKey; quincena: QuincenaNumber } {
  const day = date.getDate();
  if (day >= 30) return { month: toMonthKey(addMonths(new Date(date.getFullYear(), date.getMonth(), 1), 1)), quincena: 1 };
  return { month: toMonthKey(date), quincena: day <= 14 ? 1 : 2 };
}

/** Quincena de ahorro (1-15 / 16-fin) usada por las metas: distinta a la del calendario de gastos. */
export function savingsQuincenaOf(date: Date = new Date()): QuincenaNumber {
  return date.getDate() <= 15 ? 1 : 2;
}

/** Rango de los últimos `months` meses completos hasta hoy. */
export function lastMonthsRange(months: number, today: Date = new Date()) {
  const start = new Date(today.getFullYear(), today.getMonth() - (months - 1), 1);
  return { start_date: toISODate(start), end_date: toISODate(today) };
}

export function monthRange(month: MonthKey) {
  const start = monthKeyToDate(month);
  const end = new Date(start.getFullYear(), start.getMonth() + 1, 0);
  return { start_date: toISODate(start), end_date: toISODate(end) };
}

export function daysBetween(from: Date, to: Date) {
  const ms = new Date(to.getFullYear(), to.getMonth(), to.getDate()).getTime()
    - new Date(from.getFullYear(), from.getMonth(), from.getDate()).getTime();
  return Math.round(ms / 86_400_000);
}

/** Próxima fecha (hoy incluido) que cae en `day` del mes, ajustada a meses cortos. */
export function nextDayOfMonth(day: number, today: Date = new Date()): Date {
  const clamp = (year: number, month: number) =>
    new Date(year, month, Math.min(day, new Date(year, month + 1, 0).getDate()));
  const candidate = clamp(today.getFullYear(), today.getMonth());
  const base = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return candidate >= base ? candidate : clamp(today.getFullYear(), today.getMonth() + 1);
}
