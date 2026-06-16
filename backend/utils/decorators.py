from functools import wraps
from flask import request, jsonify, make_response
from services.auth_service import AuthService


def token_required(f):
    """Valida el JWT de acceso propio e inyecta user_id / user_email en la ruta."""
    @wraps(f)
    def decorated(*args, **kwargs):
        if request.method == 'OPTIONS':
            return make_response('', 200)

        auth_header = request.headers.get('Authorization', '')
        parts = auth_header.split(' ')
        if len(parts) != 2 or parts[0].lower() != 'bearer':
            return jsonify({'error': 'Token de autenticación requerido'}), 401

        payload = AuthService.decode_access_token(parts[1])
        if not payload:
            return jsonify({'error': 'Token inválido o expirado'}), 401

        kwargs['user_id'] = payload['sub']
        kwargs['user_email'] = payload.get('email')
        return f(*args, **kwargs)

    return decorated


def optional_token(f):
    """Como token_required pero no falla si no hay token."""
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get('Authorization', '')
        parts = auth_header.split(' ')
        if len(parts) == 2 and parts[0].lower() == 'bearer':
            payload = AuthService.decode_access_token(parts[1])
            if payload:
                kwargs['user_id'] = payload['sub']
                kwargs['user_email'] = payload.get('email')
        return f(*args, **kwargs)

    return decorated
