-- Idioma de la interfaz, separado del formato regional (locale). Idempotente.

ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS language VARCHAR(5) NOT NULL DEFAULT 'es';
