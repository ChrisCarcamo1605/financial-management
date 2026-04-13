from datetime import datetime
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()


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
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

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
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }

    def to_dict_with_relations(self):
        """Convertir a diccionario incluyendo relaciones."""
        data = self.to_dict()
        data['account_name'] = self.account.name if self.account else None
        data['category_name'] = self.category.name if self.category else None
        return data

    def __repr__(self):
        return f'<Transaction {self.type} {self.amount} - {self.date}>'
