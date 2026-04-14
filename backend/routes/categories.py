from flask import Blueprint, request, jsonify
from models.category import Category
from models.budget import Budget
from models import db
from utils.decorators import token_required

categories_bp = Blueprint('categories', __name__)


@categories_bp.route('/api/categories', methods=['GET'])
@token_required
def get_categories(user_id, user_email):
    """
    Obtener todas las categorías del usuario con paginación.
    Opcional: filtrar por tipo (income/expense).

    Query params:
        - type: income|expense
        - page: int (default 1)
        - per_page: int (default 50, max 200)

    Response: { "data": [...], "total": X, "page": Y, "per_page": Z, "total_pages": N }
    """
    try:
        from utils.pagination import paginate_query
        
        query = Category.query.filter_by(user_id=user_id)

        # Filtrar por tipo si se proporciona
        category_type = request.args.get('type')
        if category_type in ['income', 'expense']:
            query = query.filter_by(type=category_type)

        page = int(request.args.get('page', 1))
        per_page = int(request.args.get('per_page', 50))
        
        query = query.order_by(Category.name)
        
        return paginate_query(
            query=query,
            model_to_dict_fn=lambda cat: cat.to_dict(),
            page=page,
            per_page=per_page,
            max_per_page=200
        )
    except Exception as e:
        return jsonify({'error': f'Error fetching categories: {str(e)}'}), 500


@categories_bp.route('/api/categories', methods=['POST'])
@token_required
def create_category(user_id, user_email):
    """
    Crear una nueva categoría.
    
    Body: { "name", "type": "income|expense", "color", "icon" }
    Response: { "id", "name", "type", "color", "icon", "created_at" }
    """
    data = request.get_json()
    
    # Validaciones
    if not data or 'name' not in data:
        return jsonify({'error': 'Category name is required'}), 400
    
    if 'type' not in data or data['type'] not in ['income', 'expense']:
        return jsonify({'error': 'Category type must be "income" or "expense"'}), 400
    
    try:
        # Verificar que no exista una categoría con el mismo nombre
        existing = Category.query.filter_by(
            user_id=user_id,
            name=data['name'],
            type=data['type']
        ).first()
        
        if existing:
            return jsonify({'error': 'Category with this name already exists'}), 400
        
        category = Category(
            user_id=user_id,
            name=data['name'],
            type=data['type'],
            color=data.get('color'),
            icon=data.get('icon')
        )
        
        db.session.add(category)
        db.session.commit()
        
        return jsonify(category.to_dict()), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Error creating category: {str(e)}'}), 500


@categories_bp.route('/api/categories/<int:category_id>', methods=['PUT'])
@token_required
def update_category(user_id, user_email, category_id):
    """
    Actualizar una categoría existente.
    
    Body: { "name", "type", "color", "icon" }
    Response: { "id", "name", "type", "color", "icon", "created_at" }
    """
    data = request.get_json()
    
    try:
        category = Category.query.filter_by(id=category_id, user_id=user_id).first()
        
        if not category:
            return jsonify({'error': 'Category not found'}), 404
        
        # Validar tipo si se proporciona
        if 'type' in data and data['type'] not in ['income', 'expense']:
            return jsonify({'error': 'Category type must be "income" or "expense"'}), 400
        
        # Actualizar campos
        if 'name' in data:
            category.name = data['name']
        if 'type' in data:
            category.type = data['type']
        if 'color' in data:
            category.color = data['color']
        if 'icon' in data:
            category.icon = data['icon']
        
        db.session.commit()
        
        return jsonify(category.to_dict()), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Error updating category: {str(e)}'}), 500


@categories_bp.route('/api/categories/<int:category_id>', methods=['DELETE'])
@token_required
def delete_category(user_id, user_email, category_id):
    """
    Eliminar una categoría. 
    Error si tiene presupuestos asociados.
    Las transacciones asociadas se establecen con category_id = NULL.
    
    Response: { "message": "Categoría eliminada" }
    """
    try:
        category = Category.query.filter_by(id=category_id, user_id=user_id).first()
        
        if not category:
            return jsonify({'error': 'Category not found'}), 404
        
        # Verificar si tiene presupuestos
        budgets_count = Budget.query.filter_by(category_id=category_id).count()
        if budgets_count > 0:
            return jsonify({'error': 'Cannot delete category with associated budgets'}), 400
        
        # Eliminar categoría (las transacciones se manejan con cascade)
        db.session.delete(category)
        db.session.commit()
        
        return jsonify({'message': 'Categoría eliminada exitosamente'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Error deleting category: {str(e)}'}), 500
