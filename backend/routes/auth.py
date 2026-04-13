from flask import Blueprint, request, jsonify
from services.supabase_auth import SupabaseAuthService
from utils.decorators import token_required

auth_bp = Blueprint('auth', __name__)


@auth_bp.route('/api/auth/verify', methods=['POST'])
def verify_token():
    """
    Verificar token JWT de Supabase.
    
    Body: { "token": "supabase_jwt_token" }
    Response: { "user": { "id", "email" } }
    """
    data = request.get_json()
    
    if not data or 'token' not in data:
        return jsonify({'error': 'Token is required'}), 400
    
    token = data['token']
    user = SupabaseAuthService.verify_token(token)
    
    if not user:
        return jsonify({'error': 'Invalid or expired token'}), 401
    
    return jsonify({
        'user': {
            'id': user['id'],
            'email': user.get('email')
        }
    }), 200


@auth_bp.route('/api/auth/me', methods=['GET'])
@token_required
def get_current_user(user_id, user_email):
    """
    Obtener información del usuario autenticado.
    
    Headers: Authorization: Bearer <token>
    Response: { "id", "email" }
    """
    return jsonify({
        'id': user_id,
        'email': user_email
    }), 200
