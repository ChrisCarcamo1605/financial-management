from datetime import datetime
from . import db


class Loan(db.Model):
    """Préstamo / crédito del usuario.

    Puede pagarse en cuotas mensuales o en un solo pago. La tasa de interés
    puede ser cero. El calendario de pagos se materializa en la tabla
    loan_payments al crear el préstamo.
    """

    __tablename__ = 'loans'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.String(36), nullable=False, index=True)
    name = db.Column(db.String(100), nullable=False)
    principal = db.Column(db.Numeric(15, 2), nullable=False)
    # Tasa de interés anual en porcentaje (0 = tasa cero)
    interest_rate = db.Column(db.Numeric(5, 2), nullable=False, default=0)
    # 'simple' (interés simple) o 'french' (cuota fija / amortización francesa)
    interest_method = db.Column(db.String(10), nullable=False, default='simple')
    # 'monthly' (cuotas mensuales) o 'single' (un solo pago)
    payment_type = db.Column(db.String(10), nullable=False, default='monthly')
    # Número de cuotas (NULL/1 para pago único)
    installments = db.Column(db.Integer, nullable=True)
    # Día del mes para las cuotas mensuales
    payment_day = db.Column(db.Integer, nullable=True)
    # Fecha de origen del préstamo (ancla del calendario) / fecha de pago si es único
    start_date = db.Column(db.Date, nullable=False)
    income_source_id = db.Column(db.Integer, db.ForeignKey('income_sources.id'), nullable=False, index=True)
    category_id = db.Column(db.Integer, db.ForeignKey('categories.id'), nullable=True, index=True)
    account_id = db.Column(db.Integer, db.ForeignKey('accounts.id'), nullable=True, index=True)
    status = db.Column(db.String(10), nullable=False, default='active')  # 'active' | 'paid'
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    payments = db.relationship(
        'LoanPayment', backref='loan', lazy=True, cascade='all, delete-orphan'
    )
    category = db.relationship('Category', foreign_keys=[category_id])
    account = db.relationship('Account', foreign_keys=[account_id])

    def get_totals(self):
        """Calcular totales a partir de las cuotas materializadas.

        total_paid suma los abonos (paid_amount), no solo las cuotas marcadas
        pagadas, para reflejar abonos parciales / de monto variable.
        """
        total = sum(float(p.amount) for p in self.payments)
        paid = sum(float(p.paid_amount or 0) for p in self.payments)
        return {
            'total_amount': round(total, 2),
            'total_paid': round(paid, 2),
            'remaining': round(max(total - paid, 0), 2),
        }

    def to_dict(self):
        """Convertir el modelo a diccionario."""
        return {
            'id': self.id,
            'user_id': self.user_id,
            'name': self.name,
            'principal': float(self.principal),
            'interest_rate': float(self.interest_rate),
            'interest_method': self.interest_method,
            'payment_type': self.payment_type,
            'installments': self.installments,
            'payment_day': self.payment_day,
            'start_date': self.start_date.isoformat() if self.start_date else None,
            'income_source_id': self.income_source_id,
            'category_id': self.category_id,
            'account_id': self.account_id,
            'status': self.status,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }

    def to_dict_full(self):
        """Diccionario con totales, relaciones y cuotas."""
        data = self.to_dict()
        data.update(self.get_totals())
        data['income_source_name'] = self.income_source.name if self.income_source else None
        data['category_name'] = self.category.name if self.category else None
        data['category_color'] = self.category.color if self.category else None
        data['category_icon'] = self.category.icon if self.category else None
        data['category_icon_type'] = self.category.icon_type if self.category else None
        data['account_name'] = self.account.name if self.account else None
        data['payments'] = [p.to_dict() for p in sorted(self.payments, key=lambda x: x.due_date)]
        return data

    def __repr__(self):
        return f'<Loan {self.name} - {self.principal} ({self.payment_type})>'
