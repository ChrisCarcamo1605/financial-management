from datetime import datetime, date
from . import db


class LoanPayment(db.Model):
    """Cuota individual (pago programado) de un préstamo.

    Una fila por cuota mensual, o una sola fila para préstamos de pago único.
    Es la fuente de verdad para la vista por quincena (fecha exacta de pago).
    """

    __tablename__ = 'loan_payments'

    id = db.Column(db.Integer, primary_key=True)
    loan_id = db.Column(db.Integer, db.ForeignKey('loans.id'), nullable=False, index=True)
    user_id = db.Column(db.String(36), nullable=False, index=True)
    # Número de cuota (1-indexed)
    installment_number = db.Column(db.Integer, nullable=False, default=1)
    due_date = db.Column(db.Date, nullable=False, index=True)
    amount = db.Column(db.Numeric(15, 2), nullable=False)
    # Monto abonado a esta cuota (soporta abonos parciales). 0 = sin abonar.
    paid_amount = db.Column(db.Numeric(15, 2), nullable=False, default=0)
    status = db.Column(db.String(10), nullable=False, default='pending')  # 'pending' | 'paid'
    paid_date = db.Column(db.Date, nullable=True)
    transaction_id = db.Column(db.Integer, db.ForeignKey('transactions.id'), nullable=True)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        """Convertir el modelo a diccionario."""
        return {
            'id': self.id,
            'loan_id': self.loan_id,
            'user_id': self.user_id,
            'installment_number': self.installment_number,
            'due_date': self.due_date.isoformat() if self.due_date else None,
            'amount': float(self.amount),
            'paid_amount': float(self.paid_amount or 0),
            'status': self.status,
            'paid_date': self.paid_date.isoformat() if self.paid_date else None,
            'transaction_id': self.transaction_id,
            # Saldada antes de su fecha de vencimiento (vía abono) en lugar de en su día normal.
            'is_advance': self.status == 'paid' and self.due_date is not None and self.due_date > date.today(),
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }

    def __repr__(self):
        return f'<LoanPayment loan={self.loan_id} #{self.installment_number} {self.amount} {self.status}>'
