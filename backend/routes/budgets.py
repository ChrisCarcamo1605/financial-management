from flask import Blueprint, request, jsonify
from models.budget import Budget
from models.category import Category
from models import db
from utils.decorators import token_required
from datetime import date
from decimal import Decimal

budgets_bp = Blueprint('budgets', __name__)

VALID_PERIODS = ('monthly', 'weekly', 'biweekly')


def _validate_start_day(period, start_day):
    if start_day is None:
        return None, None
    start_day = int(start_day)
    max_day = 7 if period == 'weekly' else 31
    if not (1 <= start_day <= max_day):
        return None, f'start_day must be between 1 and {max_day}'
    return start_day, None


@budgets_bp.route('/api/budgets', methods=['GET'])
@token_required
def get_budgets(user_id, user_email):
    """
    Obtener todos los presupuestos del usuario con paginación.
    Incluye el ciclo (periodo) actual, gasto y porcentaje usado — se
    recalculan en cada consulta, así que un presupuesto recurrente
    "se reinicia solo" al pasar al siguiente periodo.

    Query params:
        - page: int (default 1)
        - per_page: int (default 20, max 100)

    Response: { "data": [...], "total": X, "page": Y, "per_page": Z, "total_pages": N }
    """
    try:
        from utils.pagination import paginate_query

        page = int(request.args.get('page', 1))
        per_page = int(request.args.get('per_page', 20))

        query = Budget.query.filter_by(user_id=user_id).order_by(Budget.created_at.desc())

        return paginate_query(
            query=query,
            model_to_dict_fn=lambda budget: budget.to_dict_full(),
            page=page,
            per_page=per_page,
            max_per_page=100
        )
    except Exception as e:
        return jsonify({'error': f'Error fetching budgets: {str(e)}'}), 500


@budgets_bp.route('/api/budgets', methods=['POST'])
@token_required
def create_budget(user_id, user_email):
    """
    Crear un presupuesto recurrente. Se reinicia solo cada semana, quincena
    o mes (según `period`) sin necesidad de volver a crearlo cada vez.

    Body: {
      "category_id", "amount", "period": "monthly|weekly|biweekly",
      "start_day": opcional (día 1-31 si es mensual, día ISO 1-7 si es semanal;
                   ignorado si es quincenal),
      "end_date": opcional (fecha en que el presupuesto deja de renovarse)
    }
    Response: presupuesto con el ciclo actual, gastado, restante y porcentaje.
    """
    data = request.get_json()

    required_fields = ['category_id', 'amount', 'period']
    if not data or not all(field in data for field in required_fields):
        return jsonify({'error': f'Required fields: {", ".join(required_fields)}'}), 400

    if data['period'] not in VALID_PERIODS:
        return jsonify({'error': f'Period must be one of {VALID_PERIODS}'}), 400

    try:
        category = Category.query.filter_by(id=data['category_id'], user_id=user_id).first()
        if not category:
            return jsonify({'error': 'Category not found'}), 404

        if category.type != 'expense':
            return jsonify({'error': 'Can only create budgets for expense categories'}), 400

        start_day, err = _validate_start_day(data['period'], data.get('start_day'))
        if err:
            return jsonify({'error': err}), 400

        end_date = date.fromisoformat(data['end_date']) if data.get('end_date') else None

        # Un presupuesto activo por categoría + periodo (evita duplicar el mismo reinicio).
        existing = Budget.query.filter_by(
            user_id=user_id, category_id=data['category_id'], period=data['period']
        ).filter(db.or_(Budget.end_date.is_(None), Budget.end_date >= date.today())).first()

        if existing:
            return jsonify({'error': 'Ya existe un presupuesto activo para esta categoría y periodo'}), 400

        budget = Budget(
            user_id=user_id,
            category_id=data['category_id'],
            amount=Decimal(str(data['amount'])),
            period=data['period'],
            start_day=start_day,
            start_date=date.today(),
            end_date=end_date,
        )

        db.session.add(budget)
        db.session.commit()

        return jsonify(budget.to_dict_full()), 201
    except ValueError as e:
        return jsonify({'error': f'Invalid date format. Use YYYY-MM-DD: {str(e)}'}), 400
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Error creating budget: {str(e)}'}), 500


@budgets_bp.route('/api/budgets/<int:budget_id>', methods=['PUT'])
@token_required
def update_budget(user_id, user_email, budget_id):
    """
    Actualizar un presupuesto existente.

    Body: { "category_id", "amount", "period", "start_day", "end_date" }
    Response: presupuesto con el ciclo actual, gastado, restante y porcentaje.
    """
    data = request.get_json() or {}

    try:
        budget = Budget.query.filter_by(id=budget_id, user_id=user_id).first()

        if not budget:
            return jsonify({'error': 'Budget not found'}), 404

        if 'period' in data and data['period'] not in VALID_PERIODS:
            return jsonify({'error': f'Period must be one of {VALID_PERIODS}'}), 400

        if 'category_id' in data:
            category = Category.query.filter_by(id=data['category_id'], user_id=user_id).first()
            if not category:
                return jsonify({'error': 'Category not found'}), 404
            budget.category_id = data['category_id']

        if 'amount' in data:
            budget.amount = Decimal(str(data['amount']))

        if 'period' in data:
            budget.period = data['period']

        if 'start_day' in data:
            effective_period = data.get('period', budget.period)
            start_day, err = _validate_start_day(effective_period, data['start_day'])
            if err:
                return jsonify({'error': err}), 400
            budget.start_day = start_day

        if 'end_date' in data:
            budget.end_date = date.fromisoformat(data['end_date']) if data['end_date'] else None

        db.session.commit()

        return jsonify(budget.to_dict_full()), 200
    except ValueError as e:
        db.session.rollback()
        return jsonify({'error': f'Invalid date format: {str(e)}'}), 400
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Error updating budget: {str(e)}'}), 500


@budgets_bp.route('/api/budgets/<int:budget_id>', methods=['DELETE'])
@token_required
def delete_budget(user_id, user_email, budget_id):
    """
    Eliminar un presupuesto.

    Response: { "message": "Presupuesto eliminado" }
    """
    try:
        budget = Budget.query.filter_by(id=budget_id, user_id=user_id).first()

        if not budget:
            return jsonify({'error': 'Budget not found'}), 404

        db.session.delete(budget)
        db.session.commit()

        return jsonify({'message': 'Presupuesto eliminado exitosamente'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Error deleting budget: {str(e)}'}), 500
