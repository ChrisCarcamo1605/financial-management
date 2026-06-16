from datetime import datetime
from . import db


class RecurringService(db.Model):
    """Servicio que se paga mensualmente (suscripciones, luz, agua, internet...).

    No mueve dinero por sí mismo: define un gasto fijo mensual que se materializa
    como transacción cada mes (manual o vía el endpoint de generación) y que la
    vista por quincena considera como gasto programado según su día de cobro.
    """

    __tablename__ = 'recurring_services'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.String(36), nullable=False, index=True)
    name = db.Column(db.String(100), nullable=False)
    amount = db.Column(db.Numeric(15, 2), nullable=False)
    # Categoría de gasto y cuenta de la que sale el pago (opcionales).
    category_id = db.Column(db.Integer, db.ForeignKey('categories.id'), nullable=True, index=True)
    account_id = db.Column(db.Integer, db.ForeignKey('accounts.id'), nullable=True, index=True)
    # Día del mes en que se cobra (1-31; se ajusta al último día si el mes es más corto).
    day_of_month = db.Column(db.Integer, nullable=False, default=1)
    active = db.Column(db.Boolean, nullable=False, default=True)
    # Icono propio (mismo esquema que Category): 'bootstrap' (nombre bi-*) o 'svg' (markup).
    icon = db.Column(db.Text, nullable=True)
    icon_type = db.Column(db.String(10), nullable=False, default='bootstrap')
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    transactions = db.relationship('Transaction', backref='recurring_service', lazy=True)
    category = db.relationship('Category')
    account = db.relationship('Account')

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'name': self.name,
            'amount': float(self.amount),
            'category_id': self.category_id,
            'category_name': self.category.name if self.category else None,
            'account_id': self.account_id,
            'account_name': self.account.name if self.account else None,
            'day_of_month': self.day_of_month,
            'active': self.active,
            'icon': self.icon,
            'iconType': self.icon_type,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat(),
        }

    def __repr__(self):
        return f'<RecurringService {self.name} - {self.amount} (día {self.day_of_month})>'
