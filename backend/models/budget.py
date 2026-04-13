from datetime import datetime, date
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()


class Budget(db.Model):
    """Modelo para presupuestos por categoría."""

    __tablename__ = 'budgets'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.String(36), nullable=False, index=True)
    category_id = db.Column(db.Integer, db.ForeignKey('categories.id'), nullable=False, index=True)
    amount = db.Column(db.Numeric(15, 2), nullable=False)
    period = db.Column(db.String(20), nullable=False, default='monthly')  # 'monthly', 'weekly'
    start_date = db.Column(db.Date, nullable=False)
    end_date = db.Column(db.Date, nullable=False)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        """Convertir el modelo a diccionario."""
        return {
            'id': self.id,
            'user_id': self.user_id,
            'category_id': self.category_id,
            'amount': float(self.amount),
            'period': self.period,
            'start_date': self.start_date.isoformat() if self.start_date else None,
            'end_date': self.end_date.isoformat() if self.end_date else None,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }

    def to_dict_with_relations(self):
        """Convertir a diccionario incluyendo relaciones."""
        data = self.to_dict()
        data['category_name'] = self.category.name if self.category else None
        return data

    def get_spent(self):
        """Calcular cuánto se ha gastado en este presupuesto."""
        from models.transaction import Transaction
        
        spent = db.session.query(db.func.sum(Transaction.amount))\
            .filter(
                Transaction.user_id == self.user_id,
                Transaction.category_id == self.category_id,
                Transaction.type == 'expense',
                Transaction.date >= self.start_date,
                Transaction.date <= self.end_date
            ).scalar()
        
        return float(spent or 0)

    def get_remaining(self):
        """Calcular cuánto queda del presupuesto."""
        return float(self.amount) - self.get_spent()

    def to_dict_full(self):
        """Convertir a diccionario con información completa del presupuesto."""
        data = self.to_dict_with_relations()
        spent = self.get_spent()
        data['spent'] = spent
        data['remaining'] = float(self.amount) - spent
        data['percentage'] = (spent / float(self.amount) * 100) if float(self.amount) > 0 else 0
        return data

    def __repr__(self):
        return f'<Budget {self.category_id} - {self.amount} ({self.period})>'
