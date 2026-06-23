-- Financial Management App - Database Schema for Supabase
-- Run this SQL in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Accounts table
CREATE TABLE IF NOT EXISTS accounts (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL,
    name VARCHAR(100) NOT NULL,
    balance DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Categories table
CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(10) NOT NULL CHECK (type IN ('income', 'expense')),
    color VARCHAR(7),
    icon VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Transactions table
CREATE TABLE IF NOT EXISTS transactions (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL,
    account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE SET NULL,
    amount DECIMAL(15, 2) NOT NULL,
    type VARCHAR(10) NOT NULL CHECK (type IN ('income', 'expense')),
    description TEXT,
    date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Budgets table
CREATE TABLE IF NOT EXISTS budgets (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL,
    category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    amount DECIMAL(15, 2) NOT NULL,
    period VARCHAR(20) NOT NULL DEFAULT 'monthly' CHECK (period IN ('monthly', 'weekly')),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for better performance
CREATE INDEX idx_accounts_user_id ON accounts(user_id);
CREATE INDEX idx_categories_user_id ON categories(user_id);
CREATE INDEX idx_transactions_user_id ON transactions(user_id);
CREATE INDEX idx_transactions_date ON transactions(date);
CREATE INDEX idx_transactions_type ON transactions(type);
CREATE INDEX idx_budgets_user_id ON budgets(user_id);

-- Row Level Security (RLS) Policies
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;

-- Accounts policies
CREATE POLICY "Users can view their own accounts"
    ON accounts FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own accounts"
    ON accounts FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own accounts"
    ON accounts FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own accounts"
    ON accounts FOR DELETE
    USING (auth.uid() = user_id);

-- Categories policies
CREATE POLICY "Users can view their own categories"
    ON categories FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own categories"
    ON categories FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own categories"
    ON categories FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own categories"
    ON categories FOR DELETE
    USING (auth.uid() = user_id);

-- Transactions policies
CREATE POLICY "Users can view their own transactions"
    ON transactions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own transactions"
    ON transactions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own transactions"
    ON transactions FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own transactions"
    ON transactions FOR DELETE
    USING (auth.uid() = user_id);

-- Budgets policies
CREATE POLICY "Users can view their own budgets"
    ON budgets FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own budgets"
    ON budgets FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own budgets"
    ON budgets FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own budgets"
    ON budgets FOR DELETE
    USING (auth.uid() = user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers to auto-update updated_at
CREATE TRIGGER update_accounts_updated_at
    BEFORE UPDATE ON accounts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_categories_updated_at
    BEFORE UPDATE ON categories
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transactions_updated_at
    BEFORE UPDATE ON transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_budgets_updated_at
    BEFORE UPDATE ON budgets
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- Prestamos feature: income_sources, loans, loan_payments
-- ============================================================

-- Income sources table (fuentes de ingreso)
CREATE TABLE IF NOT EXISTS income_sources (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL,
    name VARCHAR(100) NOT NULL,
    modality VARCHAR(30) NOT NULL DEFAULT 'planilla'
        CHECK (modality IN ('planilla', 'servicios_profesionales', 'pension')),
    gross_amount DECIMAL(15, 2) NOT NULL,
    pay_schedule VARCHAR(20) NOT NULL DEFAULT 'monthly'
        CHECK (pay_schedule IN ('monthly', 'biweekly')),
    pay_day INTEGER,
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Loans table (prestamos)
CREATE TABLE IF NOT EXISTS loans (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL,
    name VARCHAR(100) NOT NULL,
    principal DECIMAL(15, 2) NOT NULL,
    interest_rate DECIMAL(5, 2) NOT NULL DEFAULT 0,
    interest_method VARCHAR(10) NOT NULL DEFAULT 'simple'
        CHECK (interest_method IN ('simple', 'french')),
    payment_type VARCHAR(10) NOT NULL DEFAULT 'monthly'
        CHECK (payment_type IN ('monthly', 'single')),
    installments INTEGER,
    payment_day INTEGER,
    start_date DATE NOT NULL,
    income_source_id INTEGER NOT NULL REFERENCES income_sources(id) ON DELETE CASCADE,
    status VARCHAR(10) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paid')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Loan payments table (cuotas)
CREATE TABLE IF NOT EXISTS loan_payments (
    id SERIAL PRIMARY KEY,
    loan_id INTEGER NOT NULL REFERENCES loans(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    installment_number INTEGER NOT NULL DEFAULT 1,
    due_date DATE NOT NULL,
    amount DECIMAL(15, 2) NOT NULL,
    status VARCHAR(10) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid')),
    paid_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_income_sources_user_id ON income_sources(user_id);
CREATE INDEX idx_loans_user_id ON loans(user_id);
CREATE INDEX idx_loans_income_source_id ON loans(income_source_id);
CREATE INDEX idx_loan_payments_user_id ON loan_payments(user_id);
CREATE INDEX idx_loan_payments_loan_id ON loan_payments(loan_id);
CREATE INDEX idx_loan_payments_due_date ON loan_payments(due_date);

-- Row Level Security
ALTER TABLE income_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE loan_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own income_sources"
    ON income_sources FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own income_sources"
    ON income_sources FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own income_sources"
    ON income_sources FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own income_sources"
    ON income_sources FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own loans"
    ON loans FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own loans"
    ON loans FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own loans"
    ON loans FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own loans"
    ON loans FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own loan_payments"
    ON loan_payments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own loan_payments"
    ON loan_payments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own loan_payments"
    ON loan_payments FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own loan_payments"
    ON loan_payments FOR DELETE USING (auth.uid() = user_id);

-- Triggers to auto-update updated_at
CREATE TRIGGER update_income_sources_updated_at
    BEFORE UPDATE ON income_sources
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_loans_updated_at
    BEFORE UPDATE ON loans
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_loan_payments_updated_at
    BEFORE UPDATE ON loan_payments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- Migration: Custom auth (replaces Supabase Auth)
-- Run this in Supabase SQL Editor after the initial schema.
-- ============================================================

-- Users table (replaces Supabase auth.users)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Refresh tokens (stored as SHA-256 hash, never the raw token)
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(64) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    revoked BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_hash ON refresh_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);

-- Disable Supabase RLS on all tables — Flask routes enforce user isolation
-- via WHERE user_id = :user_id in every query.
ALTER TABLE accounts       DISABLE ROW LEVEL SECURITY;
ALTER TABLE categories     DISABLE ROW LEVEL SECURITY;
ALTER TABLE transactions   DISABLE ROW LEVEL SECURITY;
ALTER TABLE budgets        DISABLE ROW LEVEL SECURITY;
ALTER TABLE income_sources DISABLE ROW LEVEL SECURITY;
ALTER TABLE loans          DISABLE ROW LEVEL SECURITY;
ALTER TABLE loan_payments  DISABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Migration (jun 2026): iconos, abonos a préstamos y servicios recurrentes
-- ============================================================================

-- Iconos de categoría: permitir SVG (TEXT) y distinguir el tipo de icono.
ALTER TABLE categories ALTER COLUMN icon TYPE TEXT;
ALTER TABLE categories ADD COLUMN IF NOT EXISTS icon_type VARCHAR(10) NOT NULL DEFAULT 'bootstrap';

-- Abonos parciales / de monto variable a las cuotas.
ALTER TABLE loan_payments ADD COLUMN IF NOT EXISTS paid_amount NUMERIC(15,2) NOT NULL DEFAULT 0;

-- Servicios recurrentes (gastos fijos mensuales).
CREATE TABLE IF NOT EXISTS recurring_services (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    name VARCHAR(100) NOT NULL,
    amount NUMERIC(15,2) NOT NULL,
    category_id INTEGER REFERENCES categories(id),
    account_id INTEGER REFERENCES accounts(id),
    day_of_month INTEGER NOT NULL DEFAULT 1,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    icon TEXT,
    icon_type VARCHAR(10) NOT NULL DEFAULT 'bootstrap',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_recurring_services_user_id ON recurring_services(user_id);

-- Vínculos de transacción: abono a préstamo y origen de servicio recurrente.
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS loan_id INTEGER REFERENCES loans(id);
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS recurring_service_id INTEGER REFERENCES recurring_services(id);
CREATE INDEX IF NOT EXISTS idx_transactions_loan_id ON transactions(loan_id);
CREATE INDEX IF NOT EXISTS idx_transactions_recurring_service_id ON transactions(recurring_service_id);

ALTER TABLE recurring_services DISABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Migration: Preferencias de usuario (tema + color de acento de la app)
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_preferences (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    theme VARCHAR(20) NOT NULL DEFAULT 'dark',
    accent_color VARCHAR(7) NOT NULL DEFAULT '#10b981',
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    date_format VARCHAR(20) NOT NULL DEFAULT 'YYYY-MM-DD',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id);

ALTER TABLE user_preferences DISABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_user_preferences_updated_at
    BEFORE UPDATE ON user_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Migration: Recargos de servicios recurrentes (mora, exceso de uso, IVA...)
-- ============================================================================

CREATE TABLE IF NOT EXISTS service_surcharges (
    id SERIAL PRIMARY KEY,
    recurring_service_id INTEGER NOT NULL REFERENCES recurring_services(id) ON DELETE CASCADE,
    user_id VARCHAR(36) NOT NULL,
    type VARCHAR(20) NOT NULL DEFAULT 'otro',
    amount NUMERIC(15,2) NOT NULL,
    note TEXT,
    period VARCHAR(7),
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_service_surcharges_service ON service_surcharges(recurring_service_id);
CREATE INDEX IF NOT EXISTS idx_service_surcharges_user_id ON service_surcharges(user_id);
CREATE INDEX IF NOT EXISTS idx_service_surcharges_period ON service_surcharges(period);
ALTER TABLE service_surcharges DISABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Migration: Metas de ahorro y aportes
-- ============================================================================

CREATE TABLE IF NOT EXISTS savings_goals (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    name VARCHAR(100) NOT NULL,
    target_amount NUMERIC(15,2) NOT NULL,
    current_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
    per_quincena NUMERIC(15,2) NOT NULL DEFAULT 0,
    color VARCHAR(7),
    icon TEXT,
    icon_type VARCHAR(10) NOT NULL DEFAULT 'emoji',
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_savings_goals_user_id ON savings_goals(user_id);
ALTER TABLE savings_goals DISABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS savings_contributions (
    id SERIAL PRIMARY KEY,
    savings_goal_id INTEGER NOT NULL REFERENCES savings_goals(id) ON DELETE CASCADE,
    user_id VARCHAR(36) NOT NULL,
    amount NUMERIC(15,2) NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    source VARCHAR(50),
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_savings_contributions_goal ON savings_contributions(savings_goal_id);
CREATE INDEX IF NOT EXISTS idx_savings_contributions_user_id ON savings_contributions(user_id);
ALTER TABLE savings_contributions DISABLE ROW LEVEL SECURITY;
