from datetime import datetime, timezone, timedelta

from flask import Blueprint, request, jsonify, make_response, current_app
from models import db
from models.user import User
from models.refresh_token import RefreshToken
from services.auth_service import AuthService
from utils.decorators import token_required

auth_bp = Blueprint('auth', __name__)


def _set_refresh_cookie(response, token: str):
    response.set_cookie(
        'refresh_token',
        value=token,
        httponly=True,
        secure=current_app.config.get('COOKIE_SECURE', False),
        samesite=current_app.config.get('COOKIE_SAMESITE', 'Lax'),
        max_age=current_app.config.get('JWT_REFRESH_TOKEN_EXPIRES', 604800),
        path='/api/auth',
    )


def _clear_refresh_cookie(response):
    response.set_cookie(
        'refresh_token', '', httponly=True,
        secure=current_app.config.get('COOKIE_SECURE', False),
        samesite=current_app.config.get('COOKIE_SAMESITE', 'Lax'),
        max_age=0, path='/api/auth',
    )


def _issue_tokens(user: User):
    """Generate access + refresh tokens, persist refresh to DB, return both."""
    access_token = AuthService.generate_access_token(user.id, user.email)

    raw_refresh = AuthService.generate_refresh_token()
    token_hash = AuthService.hash_refresh_token(raw_refresh)
    expires_at = datetime.now(timezone.utc) + timedelta(
        seconds=current_app.config.get('JWT_REFRESH_TOKEN_EXPIRES', 604800)
    )
    rt = RefreshToken(user_id=user.id, token_hash=token_hash, expires_at=expires_at)
    db.session.add(rt)
    db.session.commit()

    return access_token, raw_refresh


# ── Register ──────────────────────────────────────────────────────────────────

@auth_bp.route('/api/auth/register', methods=['POST'])
def register():
    data = request.get_json(silent=True) or {}
    email = (data.get('email') or '').strip().lower()
    password = data.get('password', '')

    if not email or not password:
        return jsonify({'error': 'Email y contraseña son requeridos'}), 400
    if len(password) < 6:
        return jsonify({'error': 'La contraseña debe tener al menos 6 caracteres'}), 400

    if User.query.filter_by(email=email).first():
        return jsonify({'error': 'Este email ya está registrado'}), 409

    user = User(email=email, password_hash=AuthService.hash_password(password))
    db.session.add(user)
    db.session.flush()  # get user.id before commit

    access_token, raw_refresh = _issue_tokens(user)

    response = make_response(jsonify({
        'access_token': access_token,
        'user': user.to_dict(),
    }), 201)
    _set_refresh_cookie(response, raw_refresh)
    return response


# ── Login ─────────────────────────────────────────────────────────────────────

@auth_bp.route('/api/auth/login', methods=['POST'])
def login():
    data = request.get_json(silent=True) or {}
    email = (data.get('email') or '').strip().lower()
    password = data.get('password', '')

    if not email or not password:
        return jsonify({'error': 'Email y contraseña son requeridos'}), 400

    user = User.query.filter_by(email=email).first()
    if not user or not AuthService.verify_password(password, user.password_hash):
        return jsonify({'error': 'Email o contraseña incorrectos', 'code': 'invalid_credentials'}), 401

    access_token, raw_refresh = _issue_tokens(user)

    response = make_response(jsonify({
        'access_token': access_token,
        'user': user.to_dict(),
    }), 200)
    _set_refresh_cookie(response, raw_refresh)
    return response


# ── Refresh ───────────────────────────────────────────────────────────────────

@auth_bp.route('/api/auth/refresh', methods=['POST'])
def refresh():
    raw_token = request.cookies.get('refresh_token')
    if not raw_token:
        return jsonify({'error': 'No refresh token'}), 401

    token_hash = AuthService.hash_refresh_token(raw_token)
    now = datetime.now(timezone.utc)

    rt = RefreshToken.query.filter_by(token_hash=token_hash, revoked=False).first()
    if not rt or rt.expires_at.replace(tzinfo=timezone.utc) < now:
        return jsonify({'error': 'Refresh token inválido o expirado'}), 401

    # Rotate: revoke old, issue new
    rt.revoked = True
    user = rt.user

    access_token, raw_refresh = _issue_tokens(user)

    response = make_response(jsonify({
        'access_token': access_token,
        'user': user.to_dict(),
    }), 200)
    _set_refresh_cookie(response, raw_refresh)
    return response


# ── Logout ────────────────────────────────────────────────────────────────────

@auth_bp.route('/api/auth/logout', methods=['POST'])
def logout():
    raw_token = request.cookies.get('refresh_token')
    if raw_token:
        token_hash = AuthService.hash_refresh_token(raw_token)
        rt = RefreshToken.query.filter_by(token_hash=token_hash, revoked=False).first()
        if rt:
            rt.revoked = True
            db.session.commit()

    response = make_response(jsonify({'message': 'Sesión cerrada'}), 200)
    _clear_refresh_cookie(response)
    return response


# ── Me ────────────────────────────────────────────────────────────────────────

@auth_bp.route('/api/auth/me', methods=['GET'])
@token_required
def get_current_user(user_id, user_email):
    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'Usuario no encontrado'}), 404
    return jsonify(user.to_dict()), 200
