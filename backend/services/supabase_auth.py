import jwt
import requests
from datetime import datetime
from flask import current_app


class SupabaseAuthService:
    """Servicio para verificar tokens JWT de Supabase Auth."""

    @staticmethod
    def verify_token(token):
        """
        Verificar un token JWT de Supabase.

        Args:
            token: JWT token de Supabase Auth

        Returns:
            dict: Información del usuario si el token es válido
            None: Si el token es inválido
        """
        try:
            # Obtener la clave secreta de Supabase para verificar el token
            jwt_secret = current_app.config.get('SUPABASE_JWT_SECRET')

            if jwt_secret and jwt_secret != 'your-jwt-secret':
                # Decodificar el token usando el secreto (solo si está configurado correctamente)
                try:
                    payload = jwt.decode(
                        token,
                        jwt_secret,
                        algorithms=['HS256'],
                        audience='authenticated'
                    )

                    return {
                        'id': payload.get('sub'),
                        'email': payload.get('email'),
                        'exp': payload.get('exp')
                    }
                except jwt.InvalidTokenError:
                    # Si falla JWT, intentar con API de Supabase
                    pass

            # Fallback: usar la API de Supabase para verificar
            return SupabaseAuthService._verify_via_api(token)

        except Exception as e:
            current_app.logger.error(f"Error verifying token: {str(e)}")
            return None

    @staticmethod
    def _verify_via_api(token):
        """
        Verificar el token llamando a la API de Supabase.
        Método alternativo cuando no se tiene el JWT_SECRET.
        """
        try:
            supabase_url = current_app.config.get('SUPABASE_URL')
            api_key = current_app.config.get('SUPABASE_KEY')
            
            if not supabase_url or not api_key:
                return None
            
            # Llamar al endpoint de auth para verificar el usuario
            response = requests.get(
                f"{supabase_url}/auth/v1/user",
                headers={
                    'Authorization': f'Bearer {token}',
                    'apikey': api_key
                }
            )
            
            if response.status_code == 200:
                user_data = response.json()
                return {
                    'id': user_data.get('id'),
                    'email': user_data.get('email'),
                    'exp': user_data.get('exp')
                }
            
            return None
            
        except Exception as e:
            current_app.logger.error(f"Error verifying token via API: {str(e)}")
            return None

    @staticmethod
    def get_user_profile(token):
        """
        Obtener el perfil completo del usuario.
        
        Args:
            token: JWT token de Supabase Auth
            
        Returns:
            dict: Perfil del usuario o None
        """
        try:
            supabase_url = current_app.config.get('SUPABASE_URL')
            api_key = current_app.config.get('SUPABASE_KEY')
            
            response = requests.get(
                f"{supabase_url}/auth/v1/user",
                headers={
                    'Authorization': f'Bearer {token}',
                    'apikey': api_key
                }
            )
            
            if response.status_code == 200:
                return response.json()
            
            return None
            
        except Exception as e:
            current_app.logger.error(f"Error getting user profile: {str(e)}")
            return None
