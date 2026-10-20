from datetime import datetime
from . import db


class CardReserveStatus(db.Model):
    """Confirmación de que el usuario sí guardó la reserva de una tarjeta en una quincena.

    Solo se guardan las confirmaciones (existir = guardado). Una reserva de una
    quincena ya terminada sin confirmación se considera no guardada y su monto
    pasa a la quincena siguiente (o al pago de la tarjeta).
    """

    __tablename__ = 'card_reserve_statuses'
    __table_args__ = (
        db.UniqueConstraint('card_id', 'payment_due_date', 'quincena_period', name='uq_card_reserve_period'),
    )

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.String(36), nullable=False, index=True)
    card_id = db.Column(db.Integer, db.ForeignKey('accounts.id', ondelete='CASCADE'), nullable=False, index=True)
    # Fecha límite del estado de cuenta al que pertenece la reserva.
    payment_due_date = db.Column(db.Date, nullable=False)
    # Quincena en la que se guardó: 'YYYY-MM-Q1' | 'YYYY-MM-Q2'.
    quincena_period = db.Column(db.String(12), nullable=False)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
