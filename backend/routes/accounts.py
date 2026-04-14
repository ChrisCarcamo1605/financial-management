from flask import Blueprint, request, jsonify
from models.account import Account
from models.transaction import Transaction
from models import db
from utils.decorators import token_required
from sqlalchemy import func
from decimal import Decimal

accounts_bp = Blueprint('accounts', __name__)


@accounts_bp.route('/api/accounts', methods=['GET'])
@token_required
def get_accounts(user_id, user_email):
    """
    Obtener todas las cuentas del usuario con paginación.

    Query params:
        - page: int (default 1)
        - per_page: int (default 20, max 100)

    Response: { "data": [...], "total": X, "page": Y, "per_page": Z, "total_pages": N }
    """
    try:
        from utils.pagination import paginate_query
        
        page = int(request.args.get('page', 1))
        per_page = int(request.args.get('per_page', 20))
        
        query = Account.query.filter_by(user_id=user_id).order_by(Account.created_at.desc())
        
        return paginate_query(
            query=query,
            model_to_dict_fn=lambda acc: acc.to_dict(),
            page=page,
            per_page=per_page,
            max_per_page=100
        )
    except Exception as e:
        return jsonify({'error': f'Error fetching accounts: {str(e)}'}), 500


@accounts_bp.route('/api/accounts', methods=['POST'])
@token_required
def create_account(user_id, user_email):
    """
    Crear una nueva cuenta.
    
    Body: { "name", "balance", "currency": "USD" }
    Response: { "id", "name", "balance", "currency", "created_at" }
    """
    data = request.get_json()
    
    # Validaciones
    if not data or 'name' not in data:
        return jsonify({'error': 'Account name is required'}), 400
    
    try:
        account = Account(
            user_id=user_id,
            name=data['name'],
            balance=Decimal(str(data.get('balance', 0))),
            currency=data.get('currency', 'USD')
        )
        
        db.session.add(account)
        db.session.commit()
        
        return jsonify(account.to_dict()), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Error creating account: {str(e)}'}), 500


@accounts_bp.route('/api/accounts/<int:account_id>', methods=['PUT'])
@token_required
def update_account(user_id, user_email, account_id):
    """
    Actualizar una cuenta existente.
    
    Body: { "name", "balance" }
    Response: { "id", "name", "balance", "currency", "created_at" }
    """
    data = request.get_json()
    
    try:
        account = Account.query.filter_by(id=account_id, user_id=user_id).first()
        
        if not account:
            return jsonify({'error': 'Account not found'}), 404
        
        # Actualizar campos
        if 'name' in data:
            account.name = data['name']
        if 'balance' in data:
            account.balance = Decimal(str(data['balance']))
        if 'currency' in data:
            account.currency = data['currency']
        
        db.session.commit()
        
        return jsonify(account.to_dict()), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Error updating account: {str(e)}'}), 500


@accounts_bp.route('/api/accounts/<int:account_id>', methods=['DELETE'])
@token_required
def delete_account(user_id, user_email, account_id):
    """
    Eliminar una cuenta. Elimina también todas las transacciones asociadas.
    
    Response: { "message": "Cuenta eliminada" }
    """
    try:
        account = Account.query.filter_by(id=account_id, user_id=user_id).first()
        
        if not account:
            return jsonify({'error': 'Account not found'}), 404
        
        # Eliminar transacciones asociadas
        Transaction.query.filter_by(account_id=account_id, user_id=user_id).delete()
        
        db.session.delete(account)
        db.session.commit()
        
        return jsonify({'message': 'Cuenta eliminada exitosamente'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Error deleting account: {str(e)}'}), 500
