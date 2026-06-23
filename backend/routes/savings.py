"""Metas de ahorro, aportes y generación automática de transacciones.

Al generar, se crea:
  - Transaction (gasto en la cuenta vinculada a la meta)
  - SavingsContribution (incrementa current_amount de la meta)

El quincena_period ("YYYY-MM-Q1" / "YYYY-MM-Q2") en la contribución evita
generar el mismo aporte dos veces en el mismo periodo.
"""
import calendar
from datetime import date, datetime
from decimal import Decimal

from flask import Blueprint, request, jsonify

from models import db
from models.savings_goal import SavingsGoal
from models.savings_contribution import SavingsContribution
from models.account import Account
from models.transaction import Transaction
from models.category import Category
from utils.decorators import token_required

savings_bp = Blueprint('savings', __name__)


def _get_goal(user_id, goal_id):
    return SavingsGoal.query.filter_by(id=goal_id, user_id=user_id).first()


def _clamp_day(year, month, day):
    last = calendar.monthrange(year, month)[1]
    return date(year, month, min(max(int(day or 1), 1), last))


def _get_or_create_savings_category(user_id):
    """Obtener (o crear) la categoría 'Ahorro' para el usuario."""
    cat = Category.query.filter_by(user_id=user_id, name='Ahorro', type='expense').first()
    if not cat:
        cat = Category(
            user_id=user_id,
            name='Ahorro',
            type='expense',
            color='#8b5cf6',
            icon='savings',
            icon_type='registry',
        )
        db.session.add(cat)
        db.session.flush()  # get id without commit
    return cat


def _apply_goal_fields(goal, data):
    """Aplica campos del body a un objeto SavingsGoal (sin commit)."""
    if 'name' in data:
        goal.name = data['name']
    if 'target_amount' in data:
        goal.target_amount = Decimal(str(data['target_amount']))
    if 'current_amount' in data:
        goal.current_amount = Decimal(str(data['current_amount']))
    if 'per_quincena' in data:
        goal.per_quincena = Decimal(str(data['per_quincena'] or 0))
    if 'per_quincena_q1' in data:
        goal.per_quincena_q1 = Decimal(str(data['per_quincena_q1'])) if data['per_quincena_q1'] is not None else None
    if 'account_id' in data:
        goal.account_id = int(data['account_id']) if data['account_id'] else None
    if 'day_q1' in data:
        goal.day_q1 = int(data['day_q1']) if data['day_q1'] else None
    if 'day_q2' in data:
        goal.day_q2 = int(data['day_q2']) if data['day_q2'] else None
    if 'color' in data:
        goal.color = data['color']
    if 'icon' in data:
        goal.icon = data['icon']
    if 'iconType' in data:
        goal.icon_type = data['iconType']
    if 'active' in data:
        goal.active = bool(data['active'])


@savings_bp.route('/api/savings-goals', methods=['GET'])
@token_required
def get_savings_goals(user_id, user_email):
    """Listar metas de ahorro del usuario (incluye sus aportes)."""
    try:
        goals = SavingsGoal.query.filter_by(user_id=user_id).order_by(
            SavingsGoal.active.desc(), SavingsGoal.name
        ).all()
        return jsonify({'data': [g.to_dict(include_contributions=True) for g in goals]}), 200
    except Exception as e:
        return jsonify({'error': f'Error fetching savings goals: {str(e)}'}), 500


@savings_bp.route('/api/savings-goals', methods=['POST'])
@token_required
def create_savings_goal(user_id, user_email):
    """Crear meta."""
    data = request.get_json() or {}
    if not data.get('name'):
        return jsonify({'error': 'name is required'}), 400
    if data.get('target_amount') is None:
        return jsonify({'error': 'target_amount is required'}), 400
    try:
        goal = SavingsGoal(user_id=user_id, name='_', target_amount=0)
        _apply_goal_fields(goal, {
            'name': data['name'],
            'target_amount': data['target_amount'],
            'current_amount': data.get('current_amount', 0),
            'per_quincena': data.get('per_quincena', 0),
            'per_quincena_q1': data.get('per_quincena_q1'),
            'account_id': data.get('account_id'),
            'day_q1': data.get('day_q1'),
            'day_q2': data.get('day_q2'),
            'color': data.get('color'),
            'icon': data.get('icon'),
            'iconType': data.get('iconType', 'registry'),
            'active': data.get('active', True),
        })
        db.session.add(goal)
        db.session.commit()
        return jsonify(goal.to_dict(include_contributions=True)), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Error creating savings goal: {str(e)}'}), 500


@savings_bp.route('/api/savings-goals/<int:goal_id>', methods=['PUT'])
@token_required
def update_savings_goal(user_id, user_email, goal_id):
    """Actualizar meta (campos parciales)."""
    data = request.get_json() or {}
    try:
        goal = _get_goal(user_id, goal_id)
        if not goal:
            return jsonify({'error': 'Savings goal not found'}), 404
        _apply_goal_fields(goal, data)
        db.session.commit()
        return jsonify(goal.to_dict(include_contributions=True)), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Error updating savings goal: {str(e)}'}), 500


@savings_bp.route('/api/savings-goals/<int:goal_id>', methods=['DELETE'])
@token_required
def delete_savings_goal(user_id, user_email, goal_id):
    """Eliminar meta y sus aportes."""
    try:
        goal = _get_goal(user_id, goal_id)
        if not goal:
            return jsonify({'error': 'Savings goal not found'}), 404
        db.session.delete(goal)
        db.session.commit()
        return jsonify({'message': 'Meta de ahorro eliminada'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Error deleting savings goal: {str(e)}'}), 500


@savings_bp.route('/api/savings-goals/<int:goal_id>/generate', methods=['POST'])
@token_required
def generate_saving(user_id, user_email, goal_id):
    """Generar transacción + aporte automático para una quincena.

    Body: { "month": "YYYY-MM", "quincena": 1|2 }
      month    → por defecto mes actual
      quincena → 1 (días 1-15) o 2 (días 16-fin). Por defecto se detecta
                 automáticamente según el día actual.

    Respuesta:
      201 → { status: "created", amount, transaction_id, contribution_id }
      200 → { status: "already_generated", quincena_period }
      422 → { status: "missing_config", reason }
    """
    data = request.get_json() or {}
    month_str = data.get('month')
    try:
        if month_str:
            year, month = (int(x) for x in month_str.split('-')[:2])
        else:
            today = date.today()
            year, month = today.year, today.month
    except (ValueError, TypeError):
        return jsonify({'error': 'Invalid month. Use YYYY-MM'}), 400

    # Detect which quincena
    q_num = data.get('quincena')
    if q_num not in (1, 2):
        q_num = 1 if date.today().day <= 15 else 2
    period_key = f'{year}-{month:02d}-Q{q_num}'

    try:
        goal = _get_goal(user_id, goal_id)
        if not goal:
            return jsonify({'error': 'Savings goal not found'}), 404

        # Config checks
        if not goal.account_id:
            return jsonify({'status': 'missing_config', 'reason': 'Asigna una cuenta a la meta para generar automáticamente'}), 422

        amount_q1 = float(goal.per_quincena_q1) if goal.per_quincena_q1 is not None else float(goal.per_quincena or 0) / 2
        amount_q2 = float(goal.per_quincena or 0) - amount_q1
        amount = amount_q1 if q_num == 1 else amount_q2

        if amount <= 0:
            return jsonify({'status': 'missing_config', 'reason': f'El monto de Q{q_num} es 0. Configura el aporte en la meta.'}), 422

        # Duplicate check
        already = SavingsContribution.query.filter_by(
            savings_goal_id=goal.id,
            user_id=user_id,
            quincena_period=period_key,
        ).first()
        if already:
            return jsonify({'status': 'already_generated', 'quincena_period': period_key}), 200

        account = Account.query.filter_by(id=goal.account_id, user_id=user_id).first()
        if not account:
            return jsonify({'status': 'missing_config', 'reason': 'Cuenta no encontrada'}), 422

        # Day of transaction
        day = goal.day_q1 if q_num == 1 else goal.day_q2
        tx_date = _clamp_day(year, month, day or (15 if q_num == 1 else 30))

        # Categoría "Ahorro" — se crea automáticamente si no existe
        savings_cat = _get_or_create_savings_category(user_id)

        # Create transaction (gasto de la cuenta)
        tx = Transaction(
            user_id=user_id,
            account_id=goal.account_id,
            category_id=savings_cat.id,
            amount=Decimal(str(amount)),
            type='expense',
            description=f'Ahorro · {goal.name}',
            date=tx_date,
        )
        account.balance -= Decimal(str(amount))

        # Create contribution
        contrib = SavingsContribution(
            savings_goal_id=goal.id,
            user_id=user_id,
            amount=Decimal(str(amount)),
            date=tx_date,
            source='auto',
            quincena_period=period_key,
        )
        goal.current_amount = (goal.current_amount or 0) + Decimal(str(amount))

        db.session.add(tx)
        db.session.add(contrib)
        db.session.commit()

        return jsonify({
            'status': 'created',
            'quincena_period': period_key,
            'amount': amount,
            'transaction_id': tx.id,
            'contribution_id': contrib.id,
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Error generating saving: {str(e)}'}), 500


@savings_bp.route('/api/savings-goals/<int:goal_id>/contribute', methods=['POST'])
@token_required
def contribute(user_id, user_email, goal_id):
    """Aporte manual. Body: { amount, date?, source? }."""
    data = request.get_json() or {}
    if data.get('amount') is None:
        return jsonify({'error': 'amount is required'}), 400
    try:
        goal = _get_goal(user_id, goal_id)
        if not goal:
            return jsonify({'error': 'Savings goal not found'}), 404

        amount = Decimal(str(data['amount']))
        contrib_date = date.today()
        if data.get('date'):
            contrib_date = datetime.strptime(data['date'], '%Y-%m-%d').date()

        contribution = SavingsContribution(
            savings_goal_id=goal.id,
            user_id=user_id,
            amount=amount,
            date=contrib_date,
            source=data.get('source', 'manual'),
        )
        goal.current_amount = (goal.current_amount or 0) + amount
        db.session.add(contribution)
        db.session.commit()
        return jsonify(goal.to_dict(include_contributions=True)), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Error adding contribution: {str(e)}'}), 500


@savings_bp.route('/api/savings-goals/contributions/<int:contribution_id>', methods=['DELETE'])
@token_required
def delete_contribution(user_id, user_email, contribution_id):
    """Eliminar un aporte. Descuenta el monto de current_amount de la meta."""
    try:
        contrib = SavingsContribution.query.filter_by(id=contribution_id, user_id=user_id).first()
        if not contrib:
            return jsonify({'error': 'Contribution not found'}), 404
        goal = contrib.goal
        if goal:
            goal.current_amount = max(Decimal('0'), (goal.current_amount or 0) - contrib.amount)
        db.session.delete(contrib)
        db.session.commit()
        return jsonify({'message': 'Aporte eliminado'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Error deleting contribution: {str(e)}'}), 500


@savings_bp.route('/api/savings-goals/contributions', methods=['GET'])
@token_required
def list_contributions(user_id, user_email):
    """Historial de aportes del usuario (todas las metas), más reciente primero."""
    try:
        rows = SavingsContribution.query.filter_by(user_id=user_id).order_by(
            SavingsContribution.date.desc(), SavingsContribution.id.desc()
        ).limit(int(request.args.get('limit', 50))).all()
        return jsonify({'data': [c.to_dict() for c in rows]}), 200
    except Exception as e:
        return jsonify({'error': f'Error fetching contributions: {str(e)}'}), 500
