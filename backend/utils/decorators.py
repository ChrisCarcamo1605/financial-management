from functools import wraps
from flask import request, jsonify, current_app, make_response
from services.supabase_auth import SupabaseAuthService


def token_required(f):
    """
    Decorador para verificar el token JWT de Supabase en cada petición.
    Extrae el user_id del token y lo inyecta en los argumentos de la función.
    """
    @wraps(f)
    def decorated(*args, **kwargs):
        # Return empty 200 response for OPTIONS requests (CORS preflight)
        if request.method == 'OPTIONS':
            resp = make_response('', 200)
            return resp

        token = None

        # Obtener token del header Authorization
        if 'Authorization' in request.headers:
            auth_header = request.headers['Authorization']
            try:
                # Formato: "Bearer <token>"
                token = auth_header.split(" ")[1]
            except IndexError:
                return jsonify({'error': 'Invalid token format. Use: Bearer <token>'}), 401

        if not token:
            return jsonify({'error': 'Authentication token is required'}), 401

        # Verificar el token
        user = SupabaseAuthService.verify_token(token)

        if not user:
            return jsonify({'error': 'Invalid or expired token'}), 401

        # Inyectar user_id en los kwargs para usar en la ruta
        kwargs['user_id'] = user['id']
        kwargs['user_email'] = user.get('email')

        return f(*args, **kwargs)

    return decorated


def optional_token(f):
    """
    Decorador para rutas donde el token es opcional.
    Si hay token, lo verifica y agrega user_id. Si no, continúa sin error.
    """
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None

        if 'Authorization' in request.headers:
            auth_header = request.headers['Authorization']
            try:
                token = auth_header.split(" ")[1]
                user = SupabaseAuthService.verify_token(token)

                if user:
                    kwargs['user_id'] = user['id']
                    kwargs['user_email'] = user.get('email')
            except Exception:
                # Si hay error con el token, continuar sin user_id
                pass

        return f(*args, **kwargs)

    return decorated
