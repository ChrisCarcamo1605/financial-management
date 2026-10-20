import type { InterestMethod, Loan, LoanPayment, LoanPaymentType } from '@/data/types';
import type { Dictionary } from '@/i18n';

export function methodOptions(t: Dictionary): { value: InterestMethod; label: string }[] {
  return [
    { value: 'french', label: t.loans.methodOptions.french },
    { value: 'simple', label: t.loans.methodOptions.simple },
  ];
}

export function paymentTypeOptions(t: Dictionary): { value: LoanPaymentType; label: string }[] {
  return (['monthly', 'biweekly', 'single'] as const).map((value) => ({ value, label: t.loans.paymentTypes[value] }));
}

export function loanStatusLabel(t: Dictionary, loan: Pick<Loan, 'status' | 'finished_early'>) {
  if (loan.status === 'active') return t.loans.status.active;
  return loan.finished_early ? t.loans.status.paidEarly : t.loans.status.paid;
}

export function nextPendingPayment(loan: Pick<Loan, 'payments'>): LoanPayment | undefined {
  return loan.payments.find((p) => p.status === 'pending');
}
