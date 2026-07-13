from datetime import datetime
from . import db


class Transfer(db.Model):
    """Movimiento de dinero entre dos cuentas propias del usuario.

    No es un ingreso ni un gasto: resta el monto de la cuenta origen y lo
    suma a la cuenta destino. Sirve, entre otros casos, para pagar una
    tarjeta de crédito transfiriendo desde una cuenta normal.
    """

    __tablename__ = 'transfers'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.String(36), nullable=False, index=True)
    from_account_id = db.Column(db.Integer, db.ForeignKey('accounts.id'), nullable=False, index=True)
    to_account_id = db.Column(db.Integer, db.ForeignKey('accounts.id'), nullable=False, index=True)
    amount = db.Column(db.Numeric(15, 2), nullable=False)
    date = db.Column(db.Date, nullable=False, index=True)
    description = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    from_account = db.relationship('Account', foreign_keys=[from_account_id])
    to_account = db.relationship('Account', foreign_keys=[to_account_id])

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'from_account_id': self.from_account_id,
            'from_account_name': self.from_account.name if self.from_account else None,
            'to_account_id': self.to_account_id,
            'to_account_name': self.to_account.name if self.to_account else None,
            'amount': float(self.amount),
            'date': self.date.isoformat() if self.date else None,
            'description': self.description,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat(),
        }

    def __repr__(self):
        return f'<Transfer {self.from_account_id} -> {self.to_account_id}: {self.amount}>'
