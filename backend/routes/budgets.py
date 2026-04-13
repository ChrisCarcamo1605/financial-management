from flask import Blueprint, request, jsonify
from models.budget import Budget
from models.category import Category
from models import db
from utils.decorators import token_required
from datetime import date, datetime

budgets_bp = Blueprint('budgets', __name__)


@budgets_bp.route('/api/budgets', methods=['GET'])
@token_required
def get_budgets(user_id, user_email):
    """
    Obtener todos los presupuestos del usuario.
    Incluye información de gastos y porcentaje usado.
    
    Response: [{ "id", "category_id", "amount", "period", "start_date", "end_date", "category_name", "spent", "remaining", "percentage" }]
    """
    try:
        budgets = Budget.query.filter_by(user_id=user_id).order_by(Budget.start_date.desc()).all()
        return jsonify([budget.to_dict_full() for budget in budgets]), 200
    except Exception as e:
        return jsonify({'error': f'Error fetching budgets: {str(e)}'}), 500


@budgets_bp.route('/api/budgets', methods=['POST'])
@token_required
def create_budget(user_id, user_email):
    """
    Crear un nuevo presupuesto.
    
    Body: { "category_id", "amount", "period": "monthly|weekly", "start_date", "end_date" }
    Response: { "id", "category_id", "amount", "period", "start_date", "end_date", "category_name" }
    """
    data = request.get_json()
    
    # Validaciones
    required_fields = ['category_id', 'amount', 'period', 'start_date', 'end_date']
    if not data or not all(field in data for field in required_fields):
        return jsonify({'error': f'Required fields: {", ".join(required_fields)}'}), 400
    
    if data['period'] not in ['monthly', 'weekly']:
        return jsonify({'error': 'Period must be "monthly" or "weekly"'}), 400
    
    try:
        # Verificar que la categoría existe y pertenece al usuario
        category = Category.query.filter_by(id=data['category_id'], user_id=user_id).first()
        if not category:
            return jsonify({'error': 'Category not found'}), 404
        
        if category.type != 'expense':
            return jsonify({'error': 'Can only create budgets for expense categories'}), 400
        
        # Verificar que no exista un presupuesto para el mismo período
        start_date = date.fromisoformat(data['start_date']) if isinstance(data['start_date'], str) else data['start_date']
        end_date = date.fromisoformat(data['end_date']) if isinstance(data['end_date'], str) else data['end_date']
        
        existing = Budget.query.filter_by(
            user_id=user_id,
            category_id=data['category_id'],
            period=data['period'],
            start_date=start_date
        ).first()
        
        if existing:
            return jsonify({'error': 'Budget already exists for this period'}), 400
        
        budget = Budget(
            user_id=user_id,
            category_id=data['category_id'],
            amount=float(data['amount']),
            period=data['period'],
            start_date=start_date,
            end_date=end_date
        )
        
        db.session.add(budget)
        db.session.commit()
        
        return jsonify(budget.to_dict_with_relations()), 201
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
    
    Body: { "category_id", "amount", "period", "start_date", "end_date" }
    Response: { "id", "category_id", "amount", "period", "start_date", "end_date", "category_name", "spent", "remaining", "percentage" }
    """
    data = request.get_json()
    
    try:
        budget = Budget.query.filter_by(id=budget_id, user_id=user_id).first()
        
        if not budget:
            return jsonify({'error': 'Budget not found'}), 404
        
        # Validar período si se proporciona
        if 'period' in data and data['period'] not in ['monthly', 'weekly']:
            return jsonify({'error': 'Period must be "monthly" or "weekly"'}), 400
        
        # Actualizar campos
        if 'category_id' in data:
            category = Category.query.filter_by(id=data['category_id'], user_id=user_id).first()
            if not category:
                return jsonify({'error': 'Category not found'}), 404
            budget.category_id = data['category_id']
        
        if 'amount' in data:
            budget.amount = float(data['amount'])
        
        if 'period' in data:
            budget.period = data['period']
        
        if 'start_date' in data:
            budget.start_date = date.fromisoformat(data['start_date']) if isinstance(data['start_date'], str) else data['start_date']
        
        if 'end_date' in data:
            budget.end_date = date.fromisoformat(data['end_date']) if isinstance(data['end_date'], str) else data['end_date']
        
        db.session.commit()
        
        return jsonify(budget.to_dict_full()), 200
    except ValueError as e:
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
