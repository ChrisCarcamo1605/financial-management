/**
 * Fechas de calendario como strings ISO 'YYYY-MM-DD', sin zona horaria,
 * replicando `date` de Python. Comparar strings ISO equivale a comparar fechas.
 */
export type ISO = string;

export interface YMD {
  y: number;
  m: number;
  d: number;
}

export const pad = (n: number, width = 2) => String(n).padStart(width, '0');

export function iso(y: number, m: number, d: number): ISO {
  return `${pad(y, 4)}-${pad(m)}-${pad(d)}`;
}

export function parse(value: ISO): YMD {
  const [y, m, d] = value.slice(0, 10).split('-').map(Number);
  return { y, m, d };
}

export function daysInMonth(y: number, m: number): number {
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

/** `_clamp_day` del backend: día acotado a [1, último día del mes]. */
export function clampDay(y: number, m: number, day: number | null | undefined): ISO {
  const d = Math.min(Math.max(Math.trunc(day || 1), 1), daysInMonth(y, m));
  return iso(y, m, d);
}

export function prevMonth(y: number, m: number): [number, number] {
  return m > 1 ? [y, m - 1] : [y - 1, 12];
}

export function nextMonth(y: number, m: number): [number, number] {
  return m < 12 ? [y, m + 1] : [y + 1, 1];
}

export function addMonthsYM(y: number, m: number, offset: number): [number, number] {
  const total = m - 1 + offset;
  return [y + Math.floor(total / 12), ((total % 12) + 12) % 12 + 1];
}

export function addDays(value: ISO, days: number): ISO {
  const { y, m, d } = parse(value);
  const date = new Date(Date.UTC(y, m - 1, d + days));
  return iso(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
}

/** Días entre dos fechas (b - a). */
export function diffDays(a: ISO, b: ISO): number {
  const pa = parse(a);
  const pb = parse(b);
  return Math.round((Date.UTC(pb.y, pb.m - 1, pb.d) - Date.UTC(pa.y, pa.m - 1, pa.d)) / 86_400_000);
}

/** Día ISO de la semana: 1 = lunes … 7 = domingo. */
export function isoWeekday(value: ISO): number {
  const { y, m, d } = parse(value);
  const day = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return day === 0 ? 7 : day;
}

/** Fecha local de un Date como ISO (para "hoy"). */
export function toISO(date: Date): ISO {
  return iso(date.getFullYear(), date.getMonth() + 1, date.getDate());
}

export const minISO = (a: ISO, b: ISO) => (a < b ? a : b);

/** Último día del mes de una fecha (como el `resample('ME')` de pandas). */
export function monthEnd(value: ISO): ISO {
  const { y, m } = parse(value);
  return iso(y, m, daysInMonth(y, m));
}

const MONTH_ABBR = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** `strftime('%-d %b')` en locale C. */
export function dayMonthAbbr(value: ISO): string {
  const { m, d } = parse(value);
  return `${d} ${MONTH_ABBR[m - 1]}`;
}
