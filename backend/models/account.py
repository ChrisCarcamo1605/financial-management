from datetime import datetime
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()


class Account(db.Model):
    """Modelo para cuentas bancarias del usuario."""

    __tablename__ = 'accounts'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.String(36), nullable=False, index=True)
    name = db.Column(db.String(100), nullable=False)
    balance = db.Column(db.Numeric(15, 2), nullable=False, default=0.00)
    currency = db.Column(db.String(3), nullable=False, default='USD')
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relaciones
    transactions = db.relationship('Transaction', backref='account', lazy=True, cascade='all, delete-orphan')

    def to_dict(self):
        """Convertir el modelo a diccionario."""
        return {
            'id': self.id,
            'user_id': self.user_id,
            'name': self.name,
            'balance': float(self.balance),
            'currency': self.currency,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }

    def __repr__(self):
        return f'<Account {self.name} - {self.balance} {self.currency}>'
