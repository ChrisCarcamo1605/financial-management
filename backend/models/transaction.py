from datetime import datetime
from . import db


class Transaction(db.Model):
    """Modelo para transacciones financieras."""

    __tablename__ = 'transactions'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.String(36), nullable=False, index=True)
    account_id = db.Column(db.Integer, db.ForeignKey('accounts.id'), nullable=False, index=True)
    category_id = db.Column(db.Integer, db.ForeignKey('categories.id'), nullable=False, index=True)
    amount = db.Column(db.Numeric(15, 2), nullable=False)
    type = db.Column(db.String(10), nullable=False)  # 'income' o 'expense'
    description = db.Column(db.Text, nullable=True)
    date = db.Column(db.Date, nullable=False, index=True)
    # Si la transacción es un abono a un préstamo, apunta a éste (gasto vinculado).
    loan_id = db.Column(db.Integer, db.ForeignKey('loans.id'), nullable=True, index=True)
    # Si fue generada por un servicio recurrente, apunta a éste.
    recurring_service_id = db.Column(
        db.Integer, db.ForeignKey('recurring_services.id'), nullable=True, index=True
    )
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Préstamo al que abona la transacción (si loan_id está presente).
    loan = db.relationship('Loan')

    def to_dict(self):
        """Convertir el modelo a diccionario."""
        return {
            'id': self.id,
            'user_id': self.user_id,
            'account_id': self.account_id,
            'category_id': self.category_id,
            'amount': float(self.amount),
            'type': self.type,
            'description': self.description,
            'date': self.date.isoformat() if self.date else None,
            'loan_id': self.loan_id,
            'recurring_service_id': self.recurring_service_id,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }

    def to_dict_with_relations(self):
        """Convertir a diccionario incluyendo relaciones."""
        data = self.to_dict()
        data['account_name'] = self.account.name if self.account else None
        data['category_name'] = self.category.name if self.category else None
        data['loan_name'] = self.loan.name if self.loan else None
        return data

    def __repr__(self):
        return f'<Transaction {self.type} {self.amount} - {self.date}>'
