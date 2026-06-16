import hashlib
import secrets
from datetime import datetime, timezone, timedelta

import jwt
from flask import current_app
from werkzeug.security import generate_password_hash, check_password_hash


class AuthService:

    @staticmethod
    def hash_password(plain: str) -> str:
        return generate_password_hash(plain)

    @staticmethod
    def verify_password(plain: str, hashed: str) -> bool:
        return check_password_hash(hashed, plain)

    @staticmethod
    def generate_access_token(user_id: str, email: str) -> str:
        expires = current_app.config.get('JWT_ACCESS_TOKEN_EXPIRES', 900)
        payload = {
            'sub': str(user_id),
            'email': email,
            'type': 'access',
            'iat': datetime.now(timezone.utc),
            'exp': datetime.now(timezone.utc) + timedelta(seconds=expires),
        }
        return jwt.encode(
            payload,
            current_app.config['JWT_SECRET_KEY'],
            algorithm='HS256',
        )

    @staticmethod
    def decode_access_token(token: str) -> dict | None:
        try:
            payload = jwt.decode(
                token,
                current_app.config['JWT_SECRET_KEY'],
                algorithms=['HS256'],
            )
            if payload.get('type') != 'access':
                return None
            return payload
        except jwt.ExpiredSignatureError:
            return None
        except jwt.InvalidTokenError:
            return None

    @staticmethod
    def generate_refresh_token() -> str:
        """Return a cryptographically random 64-byte URL-safe token."""
        return secrets.token_urlsafe(64)

    @staticmethod
    def hash_refresh_token(raw: str) -> str:
        """SHA-256 hex digest — sufficient for 512-bit random tokens."""
        return hashlib.sha256(raw.encode()).hexdigest()
