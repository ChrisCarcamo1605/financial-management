import uuid
from datetime import datetime, timezone
from models import db


class User(db.Model):
    __tablename__ = 'users'

    id = db.Column(db.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = db.Column(db.String(255), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    created_at = db.Column(
        db.DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    refresh_tokens = db.relationship(
        'RefreshToken',
        back_populates='user',
        lazy='dynamic',
        cascade='all, delete-orphan',
    )

    def to_dict(self):
        return {
            'id': str(self.id),
            'email': self.email,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }
