from datetime import datetime
from . import db


class Budget(db.Model):
    """Presupuesto recurrente por categoría.

    No fija manualmente el inicio/fin de cada periodo: se reinicia solo
    cada semana, quincena o mes según `period`, anclado en `start_day`
    (día del mes 1-31 para 'monthly', día ISO de la semana 1-7 para
    'weekly'; 'biweekly' ignora `start_day` y usa la quincena fija de la
    app). `start_date` es la fecha desde la que el presupuesto aplica;
    `end_date` (opcional) es cuándo deja de renovarse, no el fin del
    periodo actual — ese se calcula dinámicamente en `current_cycle()`.
    """

    __tablename__ = 'budgets'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.String(36), nullable=False, index=True)
    category_id = db.Column(db.Integer, db.ForeignKey('categories.id'), nullable=False, index=True)
    amount = db.Column(db.Numeric(15, 2), nullable=False)
    period = db.Column(db.String(20), nullable=False, default='monthly')  # 'monthly' | 'weekly' | 'biweekly'
    start_day = db.Column(db.Integer, nullable=True)
    start_date = db.Column(db.Date, nullable=False)
    end_date = db.Column(db.Date, nullable=True)
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
            'start_day': self.start_day,
            'start_date': self.start_date.isoformat() if self.start_date else None,
            'end_date': self.end_date.isoformat() if self.end_date else None,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }

    def to_dict_with_relations(self):
        """Convertir a diccionario incluyendo relaciones."""
        data = self.to_dict()
        data['category_name'] = self.category.name if self.category else None
        data['category_color'] = self.category.color if self.category else None
        data['category_icon'] = self.category.icon if self.category else None
        data['category_icon_type'] = self.category.icon_type if self.category else None
        return data

    def current_cycle(self):
        """(cycle_start, cycle_end, active) del periodo que contiene hoy."""
        from services.budget_period import current_period
        return current_period(self.period, self.start_date, self.start_day, self.end_date)

    def get_spent(self, cycle_start, cycle_end):
        """Calcular cuánto se ha gastado dentro de [cycle_start, cycle_end]."""
        from models.transaction import Transaction

        spent = db.session.query(db.func.sum(Transaction.amount))\
            .filter(
                Transaction.user_id == self.user_id,
                Transaction.category_id == self.category_id,
                Transaction.type == 'expense',
                Transaction.date >= cycle_start,
                Transaction.date <= cycle_end,
            ).scalar()

        return round(float(spent or 0), 2)

    def to_dict_full(self):
        """Diccionario con el ciclo actual, gastado, restante y porcentaje."""
        data = self.to_dict_with_relations()
        cycle_start, cycle_end, active = self.current_cycle()
        spent = self.get_spent(cycle_start, cycle_end)
        amount = float(self.amount)
        data['cycle_start'] = cycle_start.isoformat()
        data['cycle_end'] = cycle_end.isoformat()
        data['active'] = active
        data['spent'] = spent
        data['remaining'] = round(amount - spent, 2)
        data['percentage'] = round(spent / amount * 100, 1) if amount else 0
        return data

    def __repr__(self):
        return f'<Budget {self.category_id} - {self.amount} ({self.period})>'
