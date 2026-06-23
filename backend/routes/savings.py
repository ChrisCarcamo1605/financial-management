"""Metas de ahorro y sus aportes.

Una meta acumula aportes que incrementan su current_amount. No mueve dinero de
cuentas por sí misma (igual que los servicios recurrentes); modela el progreso
hacia un objetivo y el aporte sugerido por quincena.
"""
from datetime import date, datetime
from decimal import Decimal

from flask import Blueprint, request, jsonify

from models import db
from models.savings_goal import SavingsGoal
from models.savings_contribution import SavingsContribution
from utils.decorators import token_required

savings_bp = Blueprint('savings', __name__)


def _get_goal(user_id, goal_id):
    return SavingsGoal.query.filter_by(id=goal_id, user_id=user_id).first()


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
    """Crear meta. Body: { name, target_amount, per_quincena?, current_amount?,
    color?, icon?, iconType?, active? }"""
    data = request.get_json() or {}
    if not data.get('name'):
        return jsonify({'error': 'name is required'}), 400
    if data.get('target_amount') is None:
        return jsonify({'error': 'target_amount is required'}), 400
    try:
        goal = SavingsGoal(
            user_id=user_id,
            name=data['name'],
            target_amount=Decimal(str(data['target_amount'])),
            current_amount=Decimal(str(data.get('current_amount', 0) or 0)),
            per_quincena=Decimal(str(data.get('per_quincena', 0) or 0)),
            color=data.get('color'),
            icon=data.get('icon'),
            icon_type=data.get('iconType', 'emoji'),
            active=bool(data.get('active', True)),
        )
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

        if 'name' in data:
            goal.name = data['name']
        if 'target_amount' in data:
            goal.target_amount = Decimal(str(data['target_amount']))
        if 'current_amount' in data:
            goal.current_amount = Decimal(str(data['current_amount']))
        if 'per_quincena' in data:
            goal.per_quincena = Decimal(str(data['per_quincena'] or 0))
        if 'color' in data:
            goal.color = data['color']
        if 'icon' in data:
            goal.icon = data['icon']
        if 'iconType' in data:
            goal.icon_type = data['iconType']
        if 'active' in data:
            goal.active = bool(data['active'])

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


@savings_bp.route('/api/savings-goals/<int:goal_id>/contribute', methods=['POST'])
@token_required
def contribute(user_id, user_email, goal_id):
    """Registrar un aporte. Body: { amount, date?, source? }.
    Incrementa current_amount y devuelve la meta actualizada."""
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
