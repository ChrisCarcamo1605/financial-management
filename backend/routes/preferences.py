import re

from flask import Blueprint, request, jsonify
from models.user_preferences import UserPreferences
from models import db
from utils.decorators import token_required

preferences_bp = Blueprint('preferences', __name__)

_HEX_COLOR = re.compile(r'^#[0-9a-fA-F]{6}$')

# Campos con valores acotados: nombre → valores permitidos.
_CHOICES = {
    'theme': {'dark', 'light', 'system'},
    'light_tone': {'mineral', 'nieve', 'papel', 'salvia'},
    'dark_tone': {'rio', 'grafito', 'medianoche', 'carbon'},
    'density': {'compact', 'comfortable'},
    'radius': {'none', 'sm', 'md', 'lg'},
    'font': {'geist', 'inter', 'system', 'serif'},
    'language': {'es', 'en'},
    'locale': {'es-SV', 'es-MX', 'es-ES', 'en-US'},
    'date_format': {'d MMM yyyy', 'dd/MM/yyyy', 'yyyy-MM-dd', 'MM/dd/yyyy'},
}
_WIDGET_SIZES = {'half', 'full'}
_MAX_WIDGETS = 30


def _get_or_create(user_id):
    """Obtener las preferencias del usuario; crearlas con defaults si no existen."""
    prefs = UserPreferences.query.filter_by(user_id=user_id).first()
    if prefs is None:
        prefs = UserPreferences(user_id=user_id)
        db.session.add(prefs)
        db.session.commit()
    return prefs


def _validate_layout(layout):
    """Valida el layout del dashboard. Devuelve (layout_normalizado, error)."""
    if layout is None:
        return None, None
    if not isinstance(layout, list) or len(layout) > _MAX_WIDGETS:
        return None, 'dashboard_layout must be a list of widgets'
    normalized, seen = [], set()
    for item in layout:
        if not isinstance(item, dict) or not isinstance(item.get('id'), str):
            return None, 'each widget needs a string id'
        widget_id = item['id'][:40]
        if widget_id in seen:
            continue
        seen.add(widget_id)
        size = item.get('size', 'half')
        normalized.append({
            'id': widget_id,
            'visible': bool(item.get('visible', True)),
            'size': size if size in _WIDGET_SIZES else 'half',
        })
    return normalized, None


def _apply(prefs, data):
    """Aplica un patch parcial. Devuelve un mensaje de error o None."""
    for field, allowed in _CHOICES.items():
        if field in data:
            value = str(data[field])
            if value not in allowed:
                return f'{field} must be one of: {", ".join(sorted(allowed))}'
            setattr(prefs, field, value)

    if 'accent_color' in data:
        color = str(data['accent_color'])
        if not _HEX_COLOR.match(color):
            return 'accent_color must be a hex color like #10b981'
        prefs.accent_color = color.lower()

    if 'currency' in data:
        currency = str(data['currency']).upper()
        if not re.match(r'^[A-Z]{3}$', currency):
            return 'currency must be an ISO 4217 code'
        prefs.currency = currency

    if 'dashboard_layout' in data:
        layout, error = _validate_layout(data['dashboard_layout'])
        if error:
            return error
        prefs.dashboard_layout = layout
    return None


@preferences_bp.route('/api/preferences', methods=['GET'])
@token_required
def get_preferences(user_id, user_email):
    """Preferencias del usuario actual (se crean con defaults si no existen)."""
    try:
        return jsonify(_get_or_create(user_id).to_dict()), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Error fetching preferences: {str(e)}'}), 500


@preferences_bp.route('/api/preferences', methods=['PUT', 'PATCH'])
@token_required
def update_preferences(user_id, user_email):
    """Actualizar (upsert) preferencias. Body JSON parcial."""
    data = request.get_json(silent=True) or {}
    try:
        prefs = _get_or_create(user_id)
        error = _apply(prefs, data)
        if error:
            db.session.rollback()
            return jsonify({'error': error}), 400
        db.session.commit()
        return jsonify(prefs.to_dict()), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Error updating preferences: {str(e)}'}), 500
