from datetime import datetime, date
from . import db


class SavingsContribution(db.Model):
    """Aporte individual a una meta de ahorro. Incrementa current_amount de la meta."""

    __tablename__ = 'savings_contributions'

    id = db.Column(db.Integer, primary_key=True)
    savings_goal_id = db.Column(
        db.Integer, db.ForeignKey('savings_goals.id', ondelete='CASCADE'), nullable=False, index=True
    )
    user_id = db.Column(db.String(36), nullable=False, index=True)
    amount = db.Column(db.Numeric(15, 2), nullable=False)
    date = db.Column(db.Date, nullable=False, default=date.today, index=True)
    # Origen del aporte: 'manual', 'quincena', 'extra'...
    source = db.Column(db.String(50), nullable=True)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'savings_goal_id': self.savings_goal_id,
            'goal_name': self.goal.name if self.goal else None,
            'user_id': self.user_id,
            'amount': float(self.amount),
            'date': self.date.isoformat() if self.date else None,
            'source': self.source,
            'created_at': self.created_at.isoformat(),
        }

    def __repr__(self):
        return f'<SavingsContribution {self.amount} -> goal {self.savings_goal_id}>'
