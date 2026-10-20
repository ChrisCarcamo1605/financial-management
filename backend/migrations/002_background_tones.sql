-- Tonos de fondo seleccionables para el tema claro y el oscuro. Idempotente.

ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS light_tone VARCHAR(20) NOT NULL DEFAULT 'mineral';
ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS dark_tone VARCHAR(20) NOT NULL DEFAULT 'rio';
