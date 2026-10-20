from datetime import datetime
from . import db
from services.salary_calc import calculate_deductions


class IncomeSource(db.Model):
    """Fuente de ingreso del usuario (salario por planilla o servicios profesionales).

    El salario neto, ISSS, AFP e ISR se calculan dinámicamente a partir del
    salario bruto y la modalidad; no se almacenan para evitar datos obsoletos
    si cambian las tasas legales.
    """

    __tablename__ = 'income_sources'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.String(36), nullable=False, index=True)
    name = db.Column(db.String(100), nullable=False)
    # 'planilla' (sujeto a ISSS/AFP/ISR), 'servicios_profesionales' (solo retención ISR) o 'pension' (sin descuentos)
    modality = db.Column(db.String(30), nullable=False, default='planilla')
    gross_amount = db.Column(db.Numeric(15, 2), nullable=False)
    # 'monthly' (un pago al mes) o 'biweekly' (quincenal, dividido entre las dos quincenas)
    pay_schedule = db.Column(db.String(20), nullable=False, default='monthly')
    # Día del mes en que se cobra (solo aplica a pay_schedule='monthly')
    pay_day = db.Column(db.Integer, nullable=True)
    currency = db.Column(db.String(3), nullable=False, default='USD')
    # Dónde se deposita y cómo se categoriza al registrar un cobro (opcionales).
    account_id = db.Column(db.Integer, db.ForeignKey('accounts.id', ondelete='SET NULL'), nullable=True, index=True)
    category_id = db.Column(db.Integer, db.ForeignKey('categories.id', ondelete='SET NULL'), nullable=True, index=True)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    loans = db.relationship('Loan', backref='income_source', lazy=True)
    account = db.relationship('Account')
    category = db.relationship('Category')

    def net_per_payment(self, net):
        """Neto de cada cobro: la mitad si es quincenal, completo si es mensual."""
        return round(net / 2, 2) if self.pay_schedule == 'biweekly' else net

    def to_dict(self):
        """Convertir el modelo a diccionario con el desglose de descuentos."""
        gross = float(self.gross_amount)
        breakdown = calculate_deductions(gross, self.modality)
        return {
            'id': self.id,
            'user_id': self.user_id,
            'name': self.name,
            'modality': self.modality,
            'gross_amount': gross,
            'pay_schedule': self.pay_schedule,
            'pay_day': self.pay_day,
            'currency': self.currency,
            'isss': breakdown['isss'],
            'afp': breakdown['afp'],
            'isr': breakdown['isr'],
            'net_amount': breakdown['net'],
            'net_per_payment': self.net_per_payment(breakdown['net']),
            'account_id': self.account_id,
            'account_name': self.account.name if self.account else None,
            'category_id': self.category_id,
            'category_name': self.category.name if self.category else None,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }

    def __repr__(self):
        return f'<IncomeSource {self.name} ({self.modality}) - {self.gross_amount}>'
