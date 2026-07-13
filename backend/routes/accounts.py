from flask import Blueprint, request, jsonify
from models.account import Account
from models.transaction import Transaction
from models.transfer import Transfer
from models import db
from utils.decorators import token_required
from sqlalchemy import func
from decimal import Decimal

accounts_bp = Blueprint('accounts', __name__)

VALID_ACCOUNT_TYPES = ('normal', 'tarjeta_credito')


def _validate_credit_card_fields(data):
    """Valida cutoff_day/payment_due_day/credit_limit para type == 'tarjeta_credito'.

    Devuelve un mensaje de error, o None si todo está bien.
    """
    for field in ('cutoff_day', 'payment_due_day'):
        if data.get(field) is None:
            return f'{field} is required for tarjeta_credito accounts'
        try:
            day = int(data[field])
        except (TypeError, ValueError):
            return f'{field} must be an integer between 1 and 31'
        if not (1 <= day <= 31):
            return f'{field} must be between 1 and 31'
    if data.get('credit_limit') is None:
        return 'credit_limit is required for tarjeta_credito accounts'
    if Decimal(str(data['credit_limit'])) < 0:
        return 'credit_limit must be >= 0'
    return None


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

    account_type = data.get('type', 'normal')
    if account_type not in VALID_ACCOUNT_TYPES:
        return jsonify({'error': f'type must be one of {VALID_ACCOUNT_TYPES}'}), 400

    if account_type == 'tarjeta_credito':
        error = _validate_credit_card_fields(data)
        if error:
            return jsonify({'error': error}), 400

    try:
        account = Account(
            user_id=user_id,
            name=data['name'],
            # Una tarjeta de crédito nueva siempre arranca en 0 (sin deuda).
            balance=Decimal('0') if account_type == 'tarjeta_credito' else Decimal(str(data.get('balance', 0))),
            currency=data.get('currency', 'USD'),
            type=account_type,
            credit_limit=Decimal(str(data['credit_limit'])) if account_type == 'tarjeta_credito' else None,
            cutoff_day=int(data['cutoff_day']) if account_type == 'tarjeta_credito' else None,
            payment_due_day=int(data['payment_due_day']) if account_type == 'tarjeta_credito' else None,
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

        new_type = data.get('type', account.type)
        if new_type not in VALID_ACCOUNT_TYPES:
            return jsonify({'error': f'type must be one of {VALID_ACCOUNT_TYPES}'}), 400

        if new_type == 'tarjeta_credito':
            merged = {
                'cutoff_day': data.get('cutoff_day', account.cutoff_day),
                'payment_due_day': data.get('payment_due_day', account.payment_due_day),
                'credit_limit': data.get('credit_limit', account.credit_limit),
            }
            error = _validate_credit_card_fields(merged)
            if error:
                return jsonify({'error': error}), 400

        # Actualizar campos
        if 'name' in data:
            account.name = data['name']
        if 'balance' in data and new_type != 'tarjeta_credito':
            account.balance = Decimal(str(data['balance']))
        if 'currency' in data:
            account.currency = data['currency']
        if 'type' in data:
            account.type = new_type
        if new_type == 'tarjeta_credito':
            if 'credit_limit' in data:
                account.credit_limit = Decimal(str(data['credit_limit']))
            if 'cutoff_day' in data:
                account.cutoff_day = int(data['cutoff_day'])
            if 'payment_due_day' in data:
                account.payment_due_day = int(data['payment_due_day'])
        else:
            account.credit_limit = None
            account.cutoff_day = None
            account.payment_due_day = None

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
        
        # Eliminar transacciones y transferencias asociadas
        Transaction.query.filter_by(account_id=account_id, user_id=user_id).delete()
        Transfer.query.filter(
            Transfer.user_id == user_id,
            db.or_(Transfer.from_account_id == account_id, Transfer.to_account_id == account_id),
        ).delete(synchronize_session=False)

        db.session.delete(account)
        db.session.commit()
        
        return jsonify({'message': 'Cuenta eliminada exitosamente'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Error deleting account: {str(e)}'}), 500
