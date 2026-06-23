import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

export function money(amount, currency = 'USD', opts = {}) {
  const n = Number(amount ?? 0);
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: currency || 'USD',
    minimumFractionDigits: opts.cents === false ? 0 : 2,
    maximumFractionDigits: opts.cents === false ? 0 : 2,
  }).format(n);
}

// signed amount with explicit + / − for transaction rows
export function signedMoney(amount, type, currency = 'USD') {
  const sign = type === 'income' ? '+' : '−';
  return `${sign}${money(Math.abs(Number(amount ?? 0)), currency)}`;
}

export function fmtDate(value, pattern = 'd MMM yyyy') {
  if (!value) return '';
  try {
    const d = typeof value === 'string' ? parseISO(value) : value;
    return format(d, pattern, { locale: es });
  } catch {
    return String(value);
  }
}

export function fmtDateShort(value) {
  return fmtDate(value, 'd MMM');
}

// YYYY-MM-DD for <input type="date"> and API payloads
export function isoDate(value = new Date()) {
  const d = typeof value === 'string' ? parseISO(value) : value;
  return format(d, 'yyyy-MM-dd');
}

export function pct(value) {
  return `${Math.round(Number(value ?? 0))}%`;
}
