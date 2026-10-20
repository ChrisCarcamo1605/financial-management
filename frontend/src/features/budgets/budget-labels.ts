import type { Budget, BudgetPeriod } from '@/data/types';
import type { Dictionary } from '@/i18n';

export const BUDGET_PERIODS: BudgetPeriod[] = ['weekly', 'biweekly', 'monthly'];

/** Días ISO 1 (lunes) a 7 (domingo) con su nombre en el idioma activo. */
export function weekdayOptions(t: Dictionary) {
  return t.budgets.weekdays.map((label, i) => ({ value: String(i + 1), label }));
}

export type BudgetState = 'ok' | 'near' | 'over';

/** Estado de consumo: cerca desde el 85 %, excedido desde el 100 %. */
export function budgetState(budget: Pick<Budget, 'percentage'>): BudgetState {
  if (budget.percentage >= 100) return 'over';
  if (budget.percentage >= 85) return 'near';
  return 'ok';
}
