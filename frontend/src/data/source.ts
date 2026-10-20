import type {
  Account, AccountInput, Budget, CardReserveInput, BudgetInput, CashFlow, Category, CategoryInput, ContributionInput,
  Credentials, DashboardSummary, DateRange, Deductions, GenerateResult, IncomeSource, IncomeSourceInput,
  Loan, LoanInput, Modality, MonthKey, Preferences, QuincenaOverview, RecurringService,
  RecurringServiceInput, SavingsGoal, SavingsGoalInput, Session, SpendingByCategory, SurchargeInput,
  SurchargeList, Transaction, TransactionInput, TransactionPage, TransactionQuery, Transfer,
  TransferInput, TxType,
} from './types';

/**
 * Puerto de acceso a datos. La UI solo habla con esta interfaz, nunca con fetch:
 * `createHttpSource` la implementa contra la API Flask y el modo demo puede
 * implementarla en el navegador sin cambiar ningún componente.
 */
export interface DataSource {
  auth: {
    /** Recupera la sesión existente (cookie de refresh) o null. */
    restore(): Promise<Session | null>;
    login(credentials: Credentials): Promise<Session>;
    register(credentials: Credentials): Promise<Session>;
    logout(): Promise<void>;
    /** Suscribe a la expiración de la sesión (refresh fallido). */
    onExpired(listener: () => void): () => void;
  };
  preferences: {
    get(): Promise<Preferences>;
    update(patch: Partial<Preferences>): Promise<Preferences>;
  };
  dashboard: {
    summary(): Promise<DashboardSummary>;
  };
  accounts: {
    list(): Promise<Account[]>;
    create(input: AccountInput): Promise<Account>;
    update(id: number, input: AccountInput): Promise<Account>;
    remove(id: number): Promise<void>;
  };
  transfers: {
    list(limit?: number): Promise<Transfer[]>;
    create(input: TransferInput): Promise<Transfer>;
    remove(id: number): Promise<void>;
  };
  categories: {
    list(type?: TxType): Promise<Category[]>;
    create(input: CategoryInput): Promise<Category>;
    update(id: number, input: CategoryInput): Promise<Category>;
    remove(id: number): Promise<void>;
  };
  transactions: {
    list(query: TransactionQuery): Promise<TransactionPage>;
    create(input: TransactionInput): Promise<Transaction>;
    update(id: number, input: TransactionInput): Promise<Transaction>;
    remove(id: number): Promise<void>;
  };
  budgets: {
    list(): Promise<Budget[]>;
    create(input: BudgetInput): Promise<Budget>;
    update(id: number, input: BudgetInput): Promise<Budget>;
    remove(id: number): Promise<void>;
  };
  incomeSources: {
    list(): Promise<IncomeSource[]>;
    preview(gross: number, modality: Modality): Promise<Deductions>;
    create(input: IncomeSourceInput): Promise<IncomeSource>;
    update(id: number, input: IncomeSourceInput): Promise<IncomeSource>;
    remove(id: number): Promise<void>;
  };
  loans: {
    list(): Promise<Loan[]>;
    create(input: LoanInput): Promise<Loan>;
    update(id: number, input: LoanInput): Promise<Loan>;
    remove(id: number): Promise<void>;
    setPaymentStatus(paymentId: number, status: 'paid' | 'pending', paidDate: string): Promise<Loan>;
  };
  services: {
    list(month: MonthKey): Promise<RecurringService[]>;
    create(input: RecurringServiceInput): Promise<RecurringService>;
    update(id: number, input: RecurringServiceInput): Promise<RecurringService>;
    remove(id: number): Promise<void>;
    generate(id: number, month: MonthKey): Promise<GenerateResult>;
    surcharges(id: number, month: MonthKey): Promise<SurchargeList>;
    addSurcharge(id: number, input: SurchargeInput): Promise<void>;
    removeSurcharge(surchargeId: number): Promise<void>;
  };
  savings: {
    list(): Promise<SavingsGoal[]>;
    create(input: SavingsGoalInput): Promise<SavingsGoal>;
    update(id: number, input: Partial<SavingsGoalInput>): Promise<SavingsGoal>;
    remove(id: number): Promise<void>;
    contribute(id: number, input: ContributionInput): Promise<SavingsGoal>;
    removeContribution(contributionId: number): Promise<void>;
    generate(id: number, month: MonthKey, quincena: 1 | 2): Promise<GenerateResult>;
  };
  quincenas: {
    overview(month: MonthKey): Promise<QuincenaOverview>;
    /** Confirma (o desmarca) que se guardó la reserva de una tarjeta en una quincena. */
    setCardReserve(input: CardReserveInput): Promise<void>;
  };
  analytics: {
    cashFlow(range: DateRange & { group_by?: 'day' | 'week' | 'month' }): Promise<CashFlow>;
    spendingByCategory(range: DateRange): Promise<SpendingByCategory>;
  };
}
