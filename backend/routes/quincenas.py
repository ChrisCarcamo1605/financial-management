from flask import Blueprint, request, jsonify
from utils.decorators import token_required
from services.quincena import get_quincena_overview
from datetime import date

quincenas_bp = Blueprint('quincenas', __name__)


@quincenas_bp.route('/api/quincenas', methods=['GET'])
@token_required
def get_quincenas(user_id, user_email):
    """Resumen de gastos y disponibilidad por quincena de un mes.

    Query params:
        - month: YYYY-MM (default: mes actual)

    Response: { year, month, quincenas: [...], totals: {...} }
    """
    month_param = request.args.get('month')
    try:
        if month_param:
            year, month = map(int, month_param.split('-')[:2])
        else:
            today = date.today()
            year, month = today.year, today.month

        if not (1 <= month <= 12):
            return jsonify({'error': 'month must be between 1 and 12'}), 400

        return jsonify(get_quincena_overview(user_id, year, month)), 200
    except ValueError:
        return jsonify({'error': 'Invalid month format. Use YYYY-MM'}), 400
    except Exception as e:
        return jsonify({'error': f'Error fetching quincenas: {str(e)}'}), 500
