from datetime import datetime
from . import db


class Account(db.Model):
    """Modelo para cuentas bancarias del usuario."""

    __tablename__ = 'accounts'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.String(36), nullable=False, index=True)
    name = db.Column(db.String(100), nullable=False)
    balance = db.Column(db.Numeric(15, 2), nullable=False, default=0.00)
    currency = db.Column(db.String(3), nullable=False, default='USD')
    # 'normal' (cuenta de efectivo/banco) o 'tarjeta_credito'.
    type = db.Column(db.String(20), nullable=False, default='normal')
    # Solo aplican a tarjetas de crédito.
    credit_limit = db.Column(db.Numeric(15, 2), nullable=True)
    cutoff_day = db.Column(db.Integer, nullable=True)
    payment_due_day = db.Column(db.Integer, nullable=True)
    # Fecha desde la que la tarjeta existe: ciclos y cargos anteriores se
    # ignoran, para no ensuciar quincenas previas a tenerla.
    start_date = db.Column(db.Date, nullable=True)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relaciones
    transactions = db.relationship('Transaction', backref='account', lazy=True, cascade='all, delete-orphan')

    def to_dict(self):
        """Convertir el modelo a diccionario."""
        is_credit_card = self.type == 'tarjeta_credito'
        return {
            'id': self.id,
            'user_id': self.user_id,
            'name': self.name,
            'balance': float(self.balance),
            'currency': self.currency,
            'type': self.type,
            'credit_limit': float(self.credit_limit) if self.credit_limit is not None else None,
            'cutoff_day': self.cutoff_day,
            'payment_due_day': self.payment_due_day,
            'start_date': self.start_date.isoformat() if self.start_date else None,
            'available': float(self.credit_limit + self.balance) if is_credit_card and self.credit_limit is not None else None,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }

    def __repr__(self):
        return f'<Account {self.name} - {self.balance} {self.currency}>'
