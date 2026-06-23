from datetime import datetime
from . import db


class ServiceSurcharge(db.Model):
    """Recargo aplicado a un servicio recurrente en un mes dado.

    Los servicios variables (luz, agua, gas) cambian de monto cada mes por
    exceso de uso, mora por pago tardío, IVA, reconexión, etc. Cada recargo se
    asocia a un servicio y opcionalmente a un periodo 'YYYY-MM'. Al materializar
    el servicio del mes, sus recargos de ese periodo se suman al monto base.
    """

    __tablename__ = 'service_surcharges'

    # Tipos sugeridos (no se valida en duro, se aceptan otros).
    TYPES = ('exceso', 'mora', 'reconexion', 'iva', 'ajuste', 'otro')

    id = db.Column(db.Integer, primary_key=True)
    recurring_service_id = db.Column(
        db.Integer, db.ForeignKey('recurring_services.id', ondelete='CASCADE'), nullable=False, index=True
    )
    user_id = db.Column(db.String(36), nullable=False, index=True)
    type = db.Column(db.String(20), nullable=False, default='otro')
    amount = db.Column(db.Numeric(15, 2), nullable=False)
    note = db.Column(db.Text, nullable=True)
    # Mes al que aplica el recargo, formato 'YYYY-MM'. Null = aplica siempre.
    period = db.Column(db.String(7), nullable=True, index=True)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'recurring_service_id': self.recurring_service_id,
            'user_id': self.user_id,
            'type': self.type,
            'amount': float(self.amount),
            'note': self.note,
            'period': self.period,
            'created_at': self.created_at.isoformat(),
        }

    def __repr__(self):
        return f'<ServiceSurcharge {self.type} {self.amount} svc={self.recurring_service_id}>'
