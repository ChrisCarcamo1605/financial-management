-- Cuenta de depósito y categoría por fuente de ingreso, para registrar cobros en un clic. Idempotente.

ALTER TABLE income_sources ADD COLUMN IF NOT EXISTS account_id INTEGER REFERENCES accounts(id) ON DELETE SET NULL;
ALTER TABLE income_sources ADD COLUMN IF NOT EXISTS category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS ix_income_sources_account_id ON income_sources (account_id);
CREATE INDEX IF NOT EXISTS ix_income_sources_category_id ON income_sources (category_id);
