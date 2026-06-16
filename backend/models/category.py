from datetime import datetime
from . import db


class Category(db.Model):
    """Modelo para categorías de transacciones."""

    __tablename__ = 'categories'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.String(36), nullable=False, index=True)
    name = db.Column(db.String(100), nullable=False)
    type = db.Column(db.String(10), nullable=False)  # 'income' o 'expense'
    color = db.Column(db.String(7), nullable=True)  # Hex color (#FF5733)
    # 'bootstrap' guarda el nombre del icono (bi-*); 'svg' guarda el markup SVG completo.
    icon = db.Column(db.Text, nullable=True)
    icon_type = db.Column(db.String(10), nullable=False, default='bootstrap')  # 'bootstrap' | 'svg'
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relaciones
    transactions = db.relationship('Transaction', backref='category', lazy=True)
    budgets = db.relationship('Budget', backref='category', lazy=True, cascade='all, delete-orphan')

    def to_dict(self):
        """Convertir el modelo a diccionario."""
        return {
            'id': self.id,
            'user_id': self.user_id,
            'name': self.name,
            'type': self.type,
            'color': self.color,
            'icon': self.icon,
            'iconType': self.icon_type,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }

    def __repr__(self):
        return f'<Category {self.name} ({self.type})>'
