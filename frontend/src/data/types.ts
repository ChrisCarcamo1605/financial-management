/**
 * Contrato de datos de Caudal. Refleja las respuestas de la API Flask; cualquier
 * DataSource (HTTP o demo local) debe producir exactamente estas formas.
 */

export type ISODate = string; // 'YYYY-MM-DD'
export type MonthKey = string; // 'YYYY-MM'
export type TxType = 'income' | 'expense';
export type IconType = 'registry' | 'emoji' | 'bootstrap' | 'svg';

export interface User {
  id: string;
  email: string;
  created_at: string | null;
}

export interface Session {
  access_token: string;
  user: User;
}

export interface Credentials {
  email: string;
  password: string;
}

export interface Page<T> {
  data: T[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

/* ── Preferencias ─────────────────────────────────────────────────────── */

export type ThemeMode = 'light' | 'dark' | 'system';
export type LightTone = 'mineral' | 'nieve' | 'papel' | 'salvia';
export type DarkTone = 'rio' | 'grafito' | 'medianoche' | 'carbon';
export type Density = 'compact' | 'comfortable';
export type Radius = 'none' | 'sm' | 'md' | 'lg';
export type FontChoice = 'geist' | 'inter' | 'system' | 'serif';
export type LocaleChoice = 'es-SV' | 'es-MX' | 'es-ES' | 'en-US';
export type LanguageChoice = 'es' | 'en';
export type DateFormatChoice = 'd MMM yyyy' | 'dd/MM/yyyy' | 'yyyy-MM-dd' | 'MM/dd/yyyy';
export type WidgetSize = 'half' | 'full';

export interface WidgetLayoutItem {
  id: string;
  visible: boolean;
  size: WidgetSize;
}

export interface Preferences {
  theme: ThemeMode;
  light_tone: LightTone;
  dark_tone: DarkTone;
  accent_color: string;
  density: Density;
  radius: Radius;
  font: FontChoice;
  /** Idioma de la interfaz. */
  language: LanguageChoice;
  currency: string;
  /** Formato numérico y de fecha. */
  locale: LocaleChoice;
  date_format: DateFormatChoice;
  dashboard_layout: WidgetLayoutItem[] | null;
}

/* ── Catálogos ────────────────────────────────────────────────────────── */

export type AccountType = 'normal' | 'tarjeta_credito';

export interface Account {
  id: number;
  name: string;
  balance: number;
  currency: string;
  type: AccountType;
  credit_limit: number | null;
  cutoff_day: number | null;
  payment_due_day: number | null;
  start_date: ISODate | null;
  /** Disponible de una tarjeta (límite + saldo); null en cuentas normales. */
  available: number | null;
  created_at: string;
}

export interface AccountInput {
  name: string;
  currency: string;
  type: AccountType;
  balance?: number;
  credit_limit?: number;
  cutoff_day?: number;
  payment_due_day?: number;
  start_date?: ISODate | null;
}

export interface Category {
  id: number;
  name: string;
  type: TxType;
  color: string | null;
  icon: string | null;
  iconType: IconType;
}

export interface CategoryInput {
  name: string;
  type: TxType;
  color: string;
  icon: string;
  iconType: IconType;
}

/* ── Movimientos ──────────────────────────────────────────────────────── */

export interface Transaction {
  id: number;
  account_id: number;
  category_id: number;
  amount: number;
  type: TxType;
  description: string | null;
  date: ISODate;
  loan_id: number | null;
  recurring_service_id: number | null;
  account_name: string | null;
  category_name: string | null;
  category_color: string | null;
  category_icon: string | null;
  category_icon_type: IconType | null;
  loan_name: string | null;
}

export interface TransactionInput {
  type: TxType;
  amount: number;
  date: ISODate;
  description?: string | null;
  account_id: number;
  category_id: number;
  loan_id?: number | null;
}

export type TransactionSort = 'date' | 'amount' | 'description';

export interface TransactionQuery {
  type?: TxType;
  account_id?: number;
  category_id?: number;
  start_date?: ISODate;
  end_date?: ISODate;
  search?: string;
  sort?: TransactionSort;
  order?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

export interface TransactionPage {
  data: Transaction[];
  total: number;
  limit: number;
  offset: number;
  summary: { income: number; expense: number };
}

export interface Transfer {
  id: number;
  from_account_id: number;
  from_account_name: string | null;
  to_account_id: number;
  to_account_name: string | null;
  amount: number;
  date: ISODate;
  description: string | null;
}

export interface TransferInput {
  from_account_id: number;
  to_account_id: number;
  amount: number;
  date: ISODate;
  description?: string | null;
}

/* ── Presupuestos ─────────────────────────────────────────────────────── */

export type BudgetPeriod = 'weekly' | 'biweekly' | 'monthly';

export interface Budget {
  id: number;
  category_id: number;
  amount: number;
  period: BudgetPeriod;
  start_day: number | null;
  start_date: ISODate;
  end_date: ISODate | null;
  category_name: string | null;
  category_color: string | null;
  category_icon: string | null;
  category_icon_type: IconType | null;
  cycle_start: ISODate;
  cycle_end: ISODate;
  active: boolean;
  spent: number;
  remaining: number;
  percentage: number;
}

export interface BudgetInput {
  category_id: number;
  amount: number;
  period: BudgetPeriod;
  start_day: number | null;
  end_date: ISODate | null;
}

/* ── Ingresos ─────────────────────────────────────────────────────────── */

export type Modality = 'planilla' | 'servicios_profesionales' | 'pension';
export type PaySchedule = 'monthly' | 'biweekly';

export interface Deductions {
  isss: number;
  afp: number;
  isr: number;
  base: number;
  net: number;
}

export interface IncomeSource {
  id: number;
  name: string;
  modality: Modality;
  gross_amount: number;
  pay_schedule: PaySchedule;
  pay_day: number | null;
  currency: string;
  isss: number;
  afp: number;
  isr: number;
  net_amount: number;
  /** Neto de cada cobro: la mitad del mensual si es quincenal. */
  net_per_payment: number;
  /** Cuenta donde se deposita y categoría con que se registra el cobro. */
  account_id: number | null;
  account_name: string | null;
  category_id: number | null;
  category_name: string | null;
}

export interface IncomeSourceInput {
  name: string;
  modality: Modality;
  gross_amount: number;
  pay_schedule: PaySchedule;
  pay_day: number | null;
  currency: string;
  account_id: number | null;
  category_id: number | null;
}

/* ── Préstamos ────────────────────────────────────────────────────────── */

export type InterestMethod = 'simple' | 'french';
export type LoanPaymentType = 'monthly' | 'biweekly' | 'single';

export interface LoanPayment {
  id: number;
  loan_id: number;
  installment_number: number;
  due_date: ISODate;
  amount: number;
  paid_amount: number;
  status: 'pending' | 'paid';
  paid_date: ISODate | null;
  transaction_id: number | null;
  is_advance: boolean;
}

export interface Loan {
  id: number;
  name: string;
  principal: number;
  interest_rate: number;
  interest_method: InterestMethod;
  payment_type: LoanPaymentType;
  installments: number | null;
  payment_day: number | null;
  start_date: ISODate;
  income_source_id: number;
  category_id: number | null;
  account_id: number | null;
  status: 'active' | 'paid';
  total_amount: number;
  total_paid: number;
  remaining: number;
  income_source_name: string | null;
  category_name: string | null;
  category_color: string | null;
  category_icon: string | null;
  account_name: string | null;
  payments: LoanPayment[];
  finished_early: boolean;
}

export interface LoanInput {
  name: string;
  principal: number;
  interest_rate: number;
  interest_method: InterestMethod;
  payment_type: LoanPaymentType;
  installments: number | null;
  payment_day: number | null;
  start_date: ISODate;
  income_source_id: number;
  category_id: number | null;
  account_id: number | null;
}

/* ── Servicios recurrentes ────────────────────────────────────────────── */

export interface ServiceMonthStatus {
  period: MonthKey;
  generated: boolean;
  transaction_id: number | null;
  surcharge_total: number;
  total_amount: number;
}

export interface RecurringService {
  id: number;
  name: string;
  amount: number;
  category_id: number | null;
  category_name: string | null;
  account_id: number | null;
  account_name: string | null;
  day_of_month: number;
  active: boolean;
  icon: string | null;
  iconType: IconType;
  month_status: ServiceMonthStatus;
}

export interface RecurringServiceInput {
  name: string;
  amount: number;
  day_of_month: number;
  category_id: number | null;
  account_id: number | null;
  active: boolean;
  icon: string;
  iconType: IconType;
}

export type SurchargeType = 'exceso' | 'mora' | 'reconexion' | 'iva' | 'ajuste' | 'otro';

export interface Surcharge {
  id: number;
  recurring_service_id: number;
  type: SurchargeType;
  amount: number;
  note: string | null;
  period: MonthKey | null;
}

export interface SurchargeList {
  data: Surcharge[];
  base_amount: number;
  surcharge_total: number;
  total: number;
}

export interface SurchargeInput {
  type: SurchargeType;
  amount: number;
  note?: string | null;
  period: MonthKey | null;
}

export type GenerateResult =
  | { status: 'created'; amount: number }
  | { status: 'already_generated' }
  | { status: 'missing_config'; reason: string };

/* ── Ahorro ───────────────────────────────────────────────────────────── */

export interface SavingsContribution {
  id: number;
  savings_goal_id: number;
  goal_name: string | null;
  amount: number;
  date: ISODate;
  source: string | null;
  quincena_period: string | null;
}

export interface SavingsGoal {
  id: number;
  name: string;
  target_amount: number;
  current_amount: number;
  per_quincena: number;
  per_quincena_q1: number | null;
  per_quincena_q2: number | null;
  account_id: number | null;
  account_name: string | null;
  day_q1: number | null;
  day_q2: number | null;
  percentage: number;
  remaining: number;
  color: string | null;
  icon: string | null;
  iconType: IconType;
  active: boolean;
  contributions: SavingsContribution[];
}

export interface SavingsGoalInput {
  name: string;
  target_amount: number;
  current_amount?: number;
  per_quincena: number;
  per_quincena_q1: number | null;
  account_id: number | null;
  day_q1: number | null;
  day_q2: number | null;
  color: string;
  icon: string;
  iconType: IconType;
  active: boolean;
}

export interface ContributionInput {
  amount: number;
  date: ISODate;
  source?: string;
}

/* ── Dashboard / analítica ────────────────────────────────────────────── */

export interface MonthTotals {
  income: number;
  expense: number;
  net: number;
}

export interface DashboardSummary {
  total_balance: number;
  credit_card_debt: number;
  monthly_income: number;
  monthly_expense: number;
  monthly_net: number;
  previous_month: MonthTotals;
  accounts: Account[];
  budgets_status: Budget[];
  recent_transactions: Transaction[];
}

export interface DateRange {
  start_date?: ISODate;
  end_date?: ISODate;
}

export interface CashFlowPoint {
  date: string;
  income: number;
  expense: number;
  net: number;
  cumulative: number;
}

export interface CashFlow {
  cash_flow: CashFlowPoint[];
  summary: {
    total_income?: number;
    total_expense?: number;
    net_flow?: number;
    savings_rate?: number;
  };
}

export interface CategorySpending {
  category_name: string;
  total_amount: number;
  transaction_count: number;
  avg_amount: number;
  percentage: number;
  color: string | null;
  icon: string | null;
  icon_type: IconType | null;
}

export interface SpendingByCategory {
  categories: CategorySpending[];
  total: number;
}

/* ── Quincenas ────────────────────────────────────────────────────────── */

export interface CardReserveInput {
  card_id: number;
  payment_due_date: ISODate;
  period: string;
  saved: boolean;
}

export interface QuincenaIncomeSource {
  id: number;
  name: string;
  modality: Modality;
  pay_schedule: PaySchedule;
  gross_amount: number;
  isss: number;
  afp: number;
  isr: number;
  net_amount: number;
  pay_day: number | null;
}

export interface QuincenaService {
  id: number;
  name: string;
  amount: number;
  day: number;
  icon: string | null;
  iconType: IconType;
  charge_date: ISODate;
  account_id: number | null;
  account_name: string | null;
  deferred?: boolean;
  card_id?: number;
  card_name?: string;
  card_cutoff_date?: ISODate;
  card_payment_due_date?: ISODate;
  card_payment_quincena?: 1 | 2;
  card_payment_month?: MonthKey;
}

export interface QuincenaLoanPayment {
  id: number;
  loan_id: number;
  loan_name: string | null;
  installment_number: number;
  amount: number;
  paid_amount: number;
  due_date: ISODate;
  status: 'pending' | 'paid';
  is_advance: boolean;
}

export interface CardCharge {
  kind: 'service' | 'transaction';
  id: string;
  name: string;
  amount: number;
  date: ISODate;
  icon: string | null;
  iconType: IconType | null;
  category_name: string | null;
  projected: boolean;
  quincena_index: number;
}

export interface CardStatement {
  id: number;
  name: string;
  amount: number;
  charged_amount: number;
  projected_amount: number;
  charges: CardCharge[];
  cycle_start: ISODate;
  cutoff_date: ISODate;
  payment_due_date: ISODate;
  available: number | null;
  reserved_prior: number;
  /** Lo no guardado en quincenas anteriores que llega al día del pago. */
  carried_in: number;
  cash_needed: number;
}

/** saved: confirmado · pending: quincena en curso o futura · missed: terminó sin guardarse. */
export type ReserveStatus = 'saved' | 'pending' | 'missed';

export interface CardReserve {
  card_id: number;
  card_name: string;
  /** Lo que esta quincena aparta (0 si terminó sin guardarse). */
  amount: number;
  own_amount: number;
  /** Arrastrado de quincenas anteriores sin guardar. */
  carried_in: number;
  /** own_amount + carried_in: lo que había que guardar. */
  need: number;
  status: ReserveStatus;
  /** 'YYYY-MM-Q1' | 'YYYY-MM-Q2'. */
  period: string;
  total: number;
  charges: CardCharge[];
  cutoff_date: ISODate;
  payment_due_date: ISODate;
  payment_quincena: 1 | 2;
  payment_month: MonthKey;
}

export interface CardPlanStep {
  quincena: 1 | 2;
  month: MonthKey;
  amount: number;
  role: 'pago' | 'reserva';
  status: ReserveStatus | null;
  in_view: boolean;
}

export interface CardPlan {
  card_id: number;
  card_name: string;
  total: number;
  charges: CardCharge[];
  cycle_start: ISODate;
  cutoff_date: ISODate;
  payment_due_date: ISODate;
  payment_quincena: 1 | 2;
  payment_month: MonthKey;
  reserved_prior: number;
  carried_in: number;
  cash_needed: number;
  reserve_in_view: number;
  schedule: CardPlanStep[];
}

export interface Quincena {
  label: string;
  start: ISODate;
  end: ISODate;
  income: number;
  expenses: number;
  available: number;
  credit_cards: CardStatement[];
  card_reserves: CardReserve[];
  card_payment_total: number;
  card_reserved_prior: number;
  card_reserve_total: number;
  payments: QuincenaLoanPayment[];
  services: QuincenaService[];
  income_sources: QuincenaIncomeSource[];
  transactions: Transaction[];
}

export interface QuincenaOverview {
  year: number;
  month: number;
  quincenas: [Quincena, Quincena];
  card_plan: CardPlan[];
  totals: {
    income: number;
    expenses: number;
    available: number;
    card_reserve: number;
    card_payment: number;
  };
}
