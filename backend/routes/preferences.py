from flask import Blueprint, request, jsonify
from models.user_preferences import UserPreferences
from models import db
from utils.decorators import token_required

preferences_bp = Blueprint('preferences', __name__)

# Campos editables vía PUT y valores permitidos para los acotados.
_ALLOWED_THEMES = {'dark', 'light'}


def _get_or_create(user_id):
    """Obtener las preferencias del usuario; crearlas con defaults si no existen."""
    prefs = UserPreferences.query.filter_by(user_id=user_id).first()
    if prefs is None:
        prefs = UserPreferences(user_id=user_id)
        db.session.add(prefs)
        db.session.commit()
    return prefs


@preferences_bp.route('/api/preferences', methods=['GET'])
@token_required
def get_preferences(user_id, user_email):
    """
    Obtener las preferencias del usuario actual.
    Si no existen, se crean con valores por defecto y se devuelven.

    Response: { "id", "user_id", "theme", "accent_color", "currency", "date_format", "created_at", "updated_at" }
    """
    try:
        prefs = _get_or_create(user_id)
        return jsonify(prefs.to_dict()), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Error fetching preferences: {str(e)}'}), 500


@preferences_bp.route('/api/preferences', methods=['PUT'])
@token_required
def update_preferences(user_id, user_email):
    """
    Actualizar (upsert) las preferencias del usuario actual. Body JSON parcial permitido.

    Body: { "theme"?, "accent_color"?, "currency"?, "date_format"? }
    Response: registro actualizado.
    """
    data = request.get_json(silent=True) or {}

    try:
        prefs = _get_or_create(user_id)

        if 'theme' in data:
            theme = str(data['theme'])
            if theme not in _ALLOWED_THEMES:
                return jsonify({'error': "theme must be one of: dark, light"}), 400
            prefs.theme = theme
        if 'accent_color' in data:
            prefs.accent_color = str(data['accent_color'])
        if 'currency' in data:
            prefs.currency = str(data['currency'])
        if 'date_format' in data:
            prefs.date_format = str(data['date_format'])

        db.session.commit()

        return jsonify(prefs.to_dict()), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Error updating preferences: {str(e)}'}), 500
