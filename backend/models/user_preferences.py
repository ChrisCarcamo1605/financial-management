from datetime import datetime
from . import db


class UserPreferences(db.Model):
    """Modelo para las preferencias de la app de cada usuario (un registro por usuario)."""

    __tablename__ = 'user_preferences'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.String(36), nullable=False, index=True, unique=True)
    theme = db.Column(db.String(20), nullable=False, default='dark')
    accent_color = db.Column(db.String(7), nullable=False, default='#10b981')
    currency = db.Column(db.String(3), nullable=False, default='USD')
    date_format = db.Column(db.String(20), nullable=False, default='YYYY-MM-DD')
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        """Convertir el modelo a diccionario."""
        return {
            'id': self.id,
            'user_id': self.user_id,
            'theme': self.theme,
            'accent_color': self.accent_color,
            'currency': self.currency,
            'date_format': self.date_format,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }

    def __repr__(self):
        return f'<UserPreferences {self.user_id} - {self.theme} {self.accent_color}>'
