-- Frontend v2: preferencias extendidas (apariencia, formato regional y layout del dashboard).
-- Idempotente: se puede ejecutar más de una vez.

ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS density VARCHAR(20) NOT NULL DEFAULT 'comfortable';
ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS radius VARCHAR(10) NOT NULL DEFAULT 'md';
ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS font VARCHAR(20) NOT NULL DEFAULT 'geist';
ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS locale VARCHAR(10) NOT NULL DEFAULT 'es-SV';
ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS dashboard_layout JSON;

ALTER TABLE user_preferences ALTER COLUMN theme SET DEFAULT 'system';
ALTER TABLE user_preferences ALTER COLUMN date_format SET DEFAULT 'd MMM yyyy';

-- El formato antiguo usaba tokens estilo moment ('YYYY-MM-DD'); el nuevo usa date-fns.
UPDATE user_preferences SET date_format = 'yyyy-MM-dd' WHERE date_format = 'YYYY-MM-DD';
UPDATE user_preferences SET date_format = 'd MMM yyyy'
WHERE date_format NOT IN ('d MMM yyyy', 'dd/MM/yyyy', 'yyyy-MM-dd', 'MM/dd/yyyy');
ALTER TABLE user_preferences ALTER COLUMN accent_color SET DEFAULT '#0e7c86';
