from datetime import datetime
from . import db


class UserPreferences(db.Model):
    """Preferencias de la app de cada usuario (un registro por usuario).

    Apariencia (tema, tonos de fondo, acento, densidad, radio, tipografía), formato regional
    (moneda, locale numérico, formato de fecha) y el layout del dashboard
    (lista ordenada de widgets con visibilidad y tamaño).
    """

    __tablename__ = 'user_preferences'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.String(36), nullable=False, index=True, unique=True)
    theme = db.Column(db.String(20), nullable=False, default='system')
    accent_color = db.Column(db.String(7), nullable=False, default='#0e7c86')
    # Tono del fondo para cada tema; 'system' usa uno u otro según el sistema.
    light_tone = db.Column(db.String(20), nullable=False, default='mineral')
    dark_tone = db.Column(db.String(20), nullable=False, default='rio')
    density = db.Column(db.String(20), nullable=False, default='comfortable')
    radius = db.Column(db.String(10), nullable=False, default='md')
    font = db.Column(db.String(20), nullable=False, default='geist')
    # Idioma de la interfaz ('es' | 'en'); el formato numérico/fecha lo define `locale`.
    language = db.Column(db.String(5), nullable=False, default='es')
    currency = db.Column(db.String(3), nullable=False, default='USD')
    locale = db.Column(db.String(10), nullable=False, default='es-SV')
    date_format = db.Column(db.String(20), nullable=False, default='d MMM yyyy')
    # [{ "id": "balance", "visible": true, "size": "full" }, ...]; null = layout por defecto.
    dashboard_layout = db.Column(db.JSON, nullable=True)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            'theme': self.theme,
            'accent_color': self.accent_color,
            'light_tone': self.light_tone,
            'dark_tone': self.dark_tone,
            'density': self.density,
            'radius': self.radius,
            'font': self.font,
            'language': self.language,
            'currency': self.currency,
            'locale': self.locale,
            'date_format': self.date_format,
            'dashboard_layout': self.dashboard_layout,
            'updated_at': self.updated_at.isoformat(),
        }

    def __repr__(self):
        return f'<UserPreferences {self.user_id} - {self.theme} {self.accent_color}>'
