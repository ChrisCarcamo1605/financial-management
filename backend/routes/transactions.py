from flask import Blueprint, request, jsonify
from models.transaction import Transaction
from models.account import Account
from models.category import Category
from models.loan import Loan
from models import db
from utils.decorators import token_required
from services.loan_payment import sync_loan_from_transactions
from datetime import datetime, date
from sqlalchemy import func
from decimal import Decimal

transactions_bp = Blueprint('transactions', __name__)


@transactions_bp.route('/api/transactions', methods=['GET'])
@token_required
def get_transactions(user_id, user_email):
    """
    Obtener todas las transacciones del usuario con filtros opcionales y paginación.

    Query params:
        - type: income|expense
        - category_id: int
        - account_id: int
        - start_date: YYYY-MM-DD
        - end_date: YYYY-MM-DD
        - limit: int (default 100, max 500)
        - offset: int (default 0)

    Response: { "data": [...], "total": X, "limit": Y, "offset": Z }
    """
    try:
        query = Transaction.query.filter_by(user_id=user_id)

        # Aplicar filtros
        transaction_type = request.args.get('type')
        if transaction_type in ['income', 'expense']:
            query = query.filter_by(type=transaction_type)

        category_id = request.args.get('category_id')
        if category_id:
            query = query.filter_by(category_id=int(category_id))

        account_id = request.args.get('account_id')
        if account_id:
            query = query.filter_by(account_id=int(account_id))

        start_date = request.args.get('start_date')
        if start_date:
            query = query.filter(Transaction.date >= date.fromisoformat(start_date))

        end_date = request.args.get('end_date')
        if end_date:
            query = query.filter(Transaction.date <= date.fromisoformat(end_date))

        # Obtener total antes de paginación
        total = query.count()

        # Ordenar y paginar
        limit = min(int(request.args.get('limit', 100)), 500)  # Max 500
        offset = int(request.args.get('offset', 0))

        transactions = query\
            .order_by(Transaction.date.desc())\
            .limit(limit)\
            .offset(offset)\
            .all()

        return jsonify({
            'data': [t.to_dict_with_relations() for t in transactions],
            'total': total,
            'limit': limit,
            'offset': offset
        }), 200
    except ValueError as e:
        return jsonify({'error': 'Invalid date format. Use YYYY-MM-DD'}), 400
    except Exception as e:
        return jsonify({'error': f'Error fetching transactions: {str(e)}'}), 500


@transactions_bp.route('/api/transactions', methods=['POST'])
@token_required
def create_transaction(user_id, user_email):
    """
    Crear una nueva transacción.
    Actualiza automáticamente el balance de la cuenta.
    
    Body: { "account_id", "category_id", "amount", "type", "description", "date" }
    Response: { "id", "account_id", "category_id", "amount", "type", "description", "date", "created_at" }
    """
    data = request.get_json()
    
    # Validaciones
    required_fields = ['account_id', 'category_id', 'amount', 'type', 'date']
    if not data or not all(field in data for field in required_fields):
        return jsonify({'error': f'Required fields: {", ".join(required_fields)}'}), 400
    
    if data['type'] not in ['income', 'expense']:
        return jsonify({'error': 'Transaction type must be "income" or "expense"'}), 400

    # Un abono a préstamo es siempre un gasto.
    loan_id = data.get('loan_id')
    if loan_id and data['type'] != 'expense':
        return jsonify({'error': 'A loan payment must be an expense'}), 400

    try:
        # Verificar que la cuenta existe y pertenece al usuario
        account = Account.query.filter_by(id=data['account_id'], user_id=user_id).first()
        if not account:
            return jsonify({'error': 'Account not found'}), 404

        # Verificar que la categoría existe y pertenece al usuario
        category = Category.query.filter_by(id=data['category_id'], user_id=user_id).first()
        if not category:
            return jsonify({'error': 'Category not found'}), 404

        # Verificar que la categoría coincide con el tipo de transacción
        if category.type != data['type']:
            return jsonify({'error': f'Category type mismatch. Expected: {category.type}'}), 400

        # Validar el préstamo si la transacción es un abono
        loan = None
        if loan_id:
            loan = Loan.query.filter_by(id=loan_id, user_id=user_id).first()
            if not loan:
                return jsonify({'error': 'Loan not found'}), 404

        # Crear transacción
        transaction = Transaction(
            user_id=user_id,
            account_id=data['account_id'],
            category_id=data['category_id'],
            amount=Decimal(str(data['amount'])),
            type=data['type'],
            description=data.get('description'),
            date=date.fromisoformat(data['date']) if isinstance(data['date'], str) else data['date'],
            loan_id=loan_id or None,
            recurring_service_id=data.get('recurring_service_id') or None,
        )

        # Actualizar balance de la cuenta
        amount = Decimal(str(data['amount']))
        if data['type'] == 'income':
            account.balance += amount
        else:
            account.balance -= amount

        db.session.add(transaction)
        db.session.flush()

        # Aplicar el abono al préstamo (recalcula sus cuotas).
        if loan:
            sync_loan_from_transactions(loan)

        db.session.commit()

        return jsonify(transaction.to_dict_with_relations()), 201
    except ValueError as e:
        return jsonify({'error': f'Invalid date format. Use YYYY-MM-DD: {str(e)}'}), 400
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Error creating transaction: {str(e)}'}), 500


@transactions_bp.route('/api/transactions/<int:transaction_id>', methods=['PUT'])
@token_required
def update_transaction(user_id, user_email, transaction_id):
    """
    Actualizar una transacción existente.
    Ajusta el balance de la cuenta si cambia el monto o tipo.
    
    Body: { "account_id", "category_id", "amount", "type", "description", "date" }
    Response: { "id", "account_id", "category_id", "amount", "type", "description", "date", "created_at" }
    """
    data = request.get_json()
    
    try:
        transaction = Transaction.query.filter_by(id=transaction_id, user_id=user_id).first()

        if not transaction:
            return jsonify({'error': 'Transaction not found'}), 404

        # Validar tipo si se proporciona
        if 'type' in data and data['type'] not in ['income', 'expense']:
            return jsonify({'error': 'Transaction type must be "income" or "expense"'}), 400

        # Préstamos afectados (para recalcular sus cuotas al final).
        affected_loan_ids = set()
        if transaction.loan_id:
            affected_loan_ids.add(transaction.loan_id)

        # Revertir el balance anterior
        old_account = Account.query.filter_by(id=transaction.account_id, user_id=user_id).first()
        if old_account:
            if transaction.type == 'income':
                old_account.balance -= transaction.amount
            else:
                old_account.balance += transaction.amount

        # Actualizar campos
        if 'account_id' in data:
            account = Account.query.filter_by(id=data['account_id'], user_id=user_id).first()
            if not account:
                return jsonify({'error': 'Account not found'}), 404
            transaction.account_id = data['account_id']

        if 'category_id' in data:
            category = Category.query.filter_by(id=data['category_id'], user_id=user_id).first()
            if not category:
                return jsonify({'error': 'Category not found'}), 404
            transaction.category_id = data['category_id']

        if 'amount' in data:
            transaction.amount = Decimal(str(data['amount']))

        if 'type' in data:
            transaction.type = data['type']

        if 'description' in data:
            transaction.description = data['description']

        if 'date' in data:
            transaction.date = date.fromisoformat(data['date']) if isinstance(data['date'], str) else data['date']

        if 'loan_id' in data:
            new_loan_id = data['loan_id'] or None
            if new_loan_id:
                loan = Loan.query.filter_by(id=new_loan_id, user_id=user_id).first()
                if not loan:
                    return jsonify({'error': 'Loan not found'}), 404
                if transaction.type != 'expense':
                    return jsonify({'error': 'A loan payment must be an expense'}), 400
            transaction.loan_id = new_loan_id
            if new_loan_id:
                affected_loan_ids.add(new_loan_id)

        # Aplicar nuevo balance
        current_account = Account.query.filter_by(id=transaction.account_id, user_id=user_id).first()
        if current_account:
            if transaction.type == 'income':
                current_account.balance += transaction.amount
            else:
                current_account.balance -= transaction.amount

        db.session.flush()

        # Recalcular las cuotas de los préstamos afectados (vínculo viejo y nuevo).
        for lid in affected_loan_ids:
            loan = Loan.query.filter_by(id=lid, user_id=user_id).first()
            if loan:
                sync_loan_from_transactions(loan)

        db.session.commit()

        return jsonify(transaction.to_dict_with_relations()), 200
    except ValueError as e:
        return jsonify({'error': f'Invalid date format: {str(e)}'}), 400
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Error updating transaction: {str(e)}'}), 500


@transactions_bp.route('/api/transactions/<int:transaction_id>', methods=['DELETE'])
@token_required
def delete_transaction(user_id, user_email, transaction_id):
    """
    Eliminar una transacción.
    Revierte el balance de la cuenta.
    
    Response: { "message": "Transacción eliminada" }
    """
    try:
        transaction = Transaction.query.filter_by(id=transaction_id, user_id=user_id).first()
        
        if not transaction:
            return jsonify({'error': 'Transaction not found'}), 404
        
        # Revertir el balance de la cuenta
        account = Account.query.filter_by(id=transaction.account_id, user_id=user_id).first()
        if account:
            if transaction.type == 'income':
                account.balance -= transaction.amount
            else:
                account.balance += transaction.amount

        loan_id = transaction.loan_id

        db.session.delete(transaction)
        db.session.flush()

        # Recalcular las cuotas del préstamo tras quitar el abono.
        if loan_id:
            loan = Loan.query.filter_by(id=loan_id, user_id=user_id).first()
            if loan:
                sync_loan_from_transactions(loan)

        db.session.commit()

        return jsonify({'message': 'Transacción eliminada exitosamente'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Error deleting transaction: {str(e)}'}), 500
