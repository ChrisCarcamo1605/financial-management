import type { InterestMethod, LoanPaymentType } from '@/data/types';

interface EstimateInput {
  principal: number;
  /** Tasa anual en porcentaje. */
  rate: number;
  method: InterestMethod;
  paymentType: LoanPaymentType;
  installments: number;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Estimado de la cuota y el total, con la misma fórmula que la API
 * (services/loan_schedule.py). La API es la fuente de verdad del calendario.
 */
export function estimateLoan({ principal, rate, method, paymentType, installments }: EstimateInput) {
  if (!(principal > 0)) return null;
  const annual = Math.max(rate, 0) / 100;

  if (paymentType === 'single') {
    const total = round2(principal * (1 + annual));
    return { total, installment: total, count: 1 };
  }

  const n = Math.max(Math.trunc(installments) || 0, 1);
  const periodsPerYear = paymentType === 'biweekly' ? 24 : 12;
  let total: number;
  if (method === 'french' && annual > 0) {
    const r = annual / periodsPerYear;
    total = ((principal * r) / (1 - (1 + r) ** -n)) * n;
  } else {
    total = principal * (1 + annual * (n / periodsPerYear));
  }
  total = round2(total);
  return { total, installment: round2(total / n), count: n };
}
