import type {
  AccountType, BudgetPeriod, IconType, InterestMethod, LoanPaymentType, Modality, PaySchedule,
  Preferences, SurchargeType, TxType,
} from '../types';
import type { ISO } from './logic/dates';

/**
 * Estado del modo demo: las mismas tablas y columnas que la base de datos de
 * la API. Los montos son números con 2 decimales (Decimal en el backend).
 */
export interface AccountRow {
  id: number;
  name: string;
  balance: number;
  currency: string;
  type: AccountType;
  credit_limit: number | null;
  cutoff_day: number | null;
  payment_due_day: number | null;
  start_date: ISO | null;
  created_at: string;
}

export interface CategoryRow {
  id: number;
  name: string;
  type: TxType;
  color: string | null;
  icon: string | null;
  icon_type: IconType;
  created_at: string;
}

export interface TransactionRow {
  id: number;
  account_id: number;
  category_id: number;
  amount: number;
  type: TxType;
  description: string | null;
  date: ISO;
  loan_id: number | null;
  recurring_service_id: number | null;
  created_at: string;
}

export interface TransferRow {
  id: number;
  from_account_id: number;
  to_account_id: number;
  amount: number;
  date: ISO;
  description: string | null;
  created_at: string;
}

export interface BudgetRow {
  id: number;
  category_id: number;
  amount: number;
  period: BudgetPeriod;
  start_day: number | null;
  start_date: ISO;
  end_date: ISO | null;
  created_at: string;
}

export interface IncomeSourceRow {
  id: number;
  name: string;
  modality: Modality;
  gross_amount: number;
  pay_schedule: PaySchedule;
  pay_day: number | null;
  currency: string;
  account_id: number | null;
  category_id: number | null;
  created_at: string;
}

export interface LoanRow {
  id: number;
  name: string;
  principal: number;
  interest_rate: number;
  interest_method: InterestMethod;
  payment_type: LoanPaymentType;
  installments: number | null;
  payment_day: number | null;
  start_date: ISO;
  income_source_id: number;
  category_id: number | null;
  account_id: number | null;
  status: 'active' | 'paid';
  created_at: string;
}

export interface LoanPaymentRow {
  id: number;
  loan_id: number;
  installment_number: number;
  due_date: ISO;
  amount: number;
  paid_amount: number;
  status: 'pending' | 'paid';
  paid_date: ISO | null;
  transaction_id: number | null;
}

export interface ServiceRow {
  id: number;
  name: string;
  amount: number;
  category_id: number | null;
  account_id: number | null;
  day_of_month: number;
  active: boolean;
  icon: string | null;
  icon_type: IconType;
  created_at: string;
}

export interface SurchargeRow {
  id: number;
  recurring_service_id: number;
  type: SurchargeType;
  amount: number;
  note: string | null;
  period: string | null;
  created_at: string;
}

export interface SavingsGoalRow {
  id: number;
  name: string;
  target_amount: number;
  current_amount: number;
  per_quincena: number;
  per_quincena_q1: number | null;
  account_id: number | null;
  day_q1: number | null;
  day_q2: number | null;
  color: string | null;
  icon: string | null;
  icon_type: IconType;
  active: boolean;
  created_at: string;
}

export interface ContributionRow {
  id: number;
  savings_goal_id: number;
  amount: number;
  date: ISO;
  source: string | null;
  quincena_period: string | null;
  created_at: string;
}

export interface CardReserveRow {
  id: number;
  card_id: number;
  payment_due_date: ISO;
  quincena_period: string;
}

export interface DemoState {
  version: number;
  nextId: number;
  user: { id: string; email: string; created_at: string };
  preferences: Preferences;
  accounts: AccountRow[];
  categories: CategoryRow[];
  transactions: TransactionRow[];
  transfers: TransferRow[];
  budgets: BudgetRow[];
  incomeSources: IncomeSourceRow[];
  loans: LoanRow[];
  loanPayments: LoanPaymentRow[];
  services: ServiceRow[];
  surcharges: SurchargeRow[];
  savingsGoals: SavingsGoalRow[];
  contributions: ContributionRow[];
  cardReserves: CardReserveRow[];
}

export const DEMO_STATE_VERSION = 1;
