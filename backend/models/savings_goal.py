from datetime import datetime
from . import db


class SavingsGoal(db.Model):
    """Meta de ahorro (fondo emergencia, viaje, equipo...).

    No mueve dinero por sí misma: acumula aportes (SavingsContribution) que
    incrementan current_amount. `per_quincena` es el aporte sugerido por quincena
    que la vista de quincenas puede reflejar como gasto programado de tipo ahorro.
    """

    __tablename__ = 'savings_goals'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.String(36), nullable=False, index=True)
    name = db.Column(db.String(100), nullable=False)
    target_amount = db.Column(db.Numeric(15, 2), nullable=False)
    current_amount = db.Column(db.Numeric(15, 2), nullable=False, default=0)
    per_quincena = db.Column(db.Numeric(15, 2), nullable=False, default=0)
    color = db.Column(db.String(7), nullable=True)
    icon = db.Column(db.Text, nullable=True)
    icon_type = db.Column(db.String(10), nullable=False, default='emoji')
    active = db.Column(db.Boolean, nullable=False, default=True)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    contributions = db.relationship(
        'SavingsContribution', backref='goal', lazy=True, cascade='all, delete-orphan'
    )

    def to_dict(self, include_contributions=False):
        target = float(self.target_amount or 0)
        current = float(self.current_amount or 0)
        data = {
            'id': self.id,
            'user_id': self.user_id,
            'name': self.name,
            'target_amount': target,
            'current_amount': current,
            'per_quincena': float(self.per_quincena or 0),
            'percentage': round(current / target * 100, 1) if target else 0,
            'remaining': round(max(target - current, 0), 2),
            'color': self.color,
            'icon': self.icon,
            'iconType': self.icon_type,
            'active': self.active,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat(),
        }
        if include_contributions:
            data['contributions'] = [c.to_dict() for c in self.contributions]
        return data

    def __repr__(self):
        return f'<SavingsGoal {self.name} {self.current_amount}/{self.target_amount}>'
