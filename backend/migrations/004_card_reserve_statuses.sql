-- Confirmación de reservas de tarjeta por quincena. Sin confirmar, la reserva de
-- una quincena ya terminada pasa a la siguiente. Idempotente.

CREATE TABLE IF NOT EXISTS card_reserve_statuses (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    card_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    payment_due_date DATE NOT NULL,
    quincena_period VARCHAR(12) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_card_reserve_period UNIQUE (card_id, payment_due_date, quincena_period)
);
CREATE INDEX IF NOT EXISTS ix_card_reserve_statuses_user_id ON card_reserve_statuses (user_id);
CREATE INDEX IF NOT EXISTS ix_card_reserve_statuses_card_id ON card_reserve_statuses (card_id);
