import re
from datetime import date

from flask import Blueprint, request, jsonify
from utils.decorators import token_required
from models import db
from models.account import Account
from models.card_reserve_status import CardReserveStatus
from services.quincena import get_quincena_overview

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


_PERIOD = re.compile(r'^\d{4}-(0[1-9]|1[0-2])-Q[12]$')


@quincenas_bp.route('/api/quincenas/card-reserves', methods=['PUT'])
@token_required
def set_card_reserve(user_id, user_email):
    """Confirmar (o desmarcar) que se guardó la reserva de una tarjeta en una quincena.

    Body: { "card_id", "payment_due_date": "YYYY-MM-DD", "period": "YYYY-MM-Q1|Q2", "saved": bool }
    Sin confirmar, la reserva de una quincena ya terminada pasa a la siguiente.
    """
    data = request.get_json(silent=True) or {}
    period = str(data.get('period', ''))
    if not _PERIOD.match(period):
        return jsonify({'error': 'period must look like YYYY-MM-Q1'}), 400
    try:
        due_date = date.fromisoformat(str(data.get('payment_due_date', '')))
    except ValueError:
        return jsonify({'error': 'payment_due_date must be YYYY-MM-DD'}), 400

    card = Account.query.filter_by(id=data.get('card_id'), user_id=user_id, type='tarjeta_credito').first()
    if not card:
        return jsonify({'error': 'Credit card not found'}), 404

    existing = CardReserveStatus.query.filter_by(
        user_id=user_id, card_id=card.id, payment_due_date=due_date, quincena_period=period,
    ).first()
    try:
        if data.get('saved', True) and not existing:
            db.session.add(CardReserveStatus(user_id=user_id, card_id=card.id, payment_due_date=due_date, quincena_period=period))
        elif not data.get('saved', True) and existing:
            db.session.delete(existing)
        db.session.commit()
        return jsonify({'card_id': card.id, 'payment_due_date': due_date.isoformat(), 'period': period, 'saved': bool(data.get('saved', True))}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Error updating card reserve: {str(e)}'}), 500
