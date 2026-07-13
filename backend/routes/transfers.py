from flask import Blueprint, request, jsonify
from models.transfer import Transfer
from models.account import Account
from models import db
from utils.decorators import token_required
from datetime import date
from decimal import Decimal

transfers_bp = Blueprint('transfers', __name__)


@transfers_bp.route('/api/transfers', methods=['GET'])
@token_required
def get_transfers(user_id, user_email):
    """Listar transferencias del usuario con paginación.

    Query params: page, per_page (default 20, max 100)
    """
    try:
        from utils.pagination import paginate_query

        page = int(request.args.get('page', 1))
        per_page = int(request.args.get('per_page', 20))

        query = Transfer.query.filter_by(user_id=user_id).order_by(Transfer.date.desc(), Transfer.created_at.desc())

        return paginate_query(
            query=query,
            model_to_dict_fn=lambda t: t.to_dict(),
            page=page,
            per_page=per_page,
            max_per_page=100,
        )
    except Exception as e:
        return jsonify({'error': f'Error fetching transfers: {str(e)}'}), 500


@transfers_bp.route('/api/transfers', methods=['POST'])
@token_required
def create_transfer(user_id, user_email):
    """Crear una transferencia entre dos cuentas propias.

    Body: { "from_account_id", "to_account_id", "amount", "date", "description" }
    Resta el monto de la cuenta origen y lo suma a la cuenta destino.
    """
    data = request.get_json() or {}

    required_fields = ['from_account_id', 'to_account_id', 'amount', 'date']
    if not all(field in data for field in required_fields):
        return jsonify({'error': f'Required fields: {", ".join(required_fields)}'}), 400

    if data['from_account_id'] == data['to_account_id']:
        return jsonify({'error': 'from_account_id and to_account_id must be different'}), 400

    try:
        amount = Decimal(str(data['amount']))
        if amount <= 0:
            return jsonify({'error': 'amount must be greater than 0'}), 400

        from_account = Account.query.filter_by(id=data['from_account_id'], user_id=user_id).first()
        if not from_account:
            return jsonify({'error': 'from_account not found'}), 404

        to_account = Account.query.filter_by(id=data['to_account_id'], user_id=user_id).first()
        if not to_account:
            return jsonify({'error': 'to_account not found'}), 404

        transfer = Transfer(
            user_id=user_id,
            from_account_id=from_account.id,
            to_account_id=to_account.id,
            amount=amount,
            date=date.fromisoformat(data['date']) if isinstance(data['date'], str) else data['date'],
            description=data.get('description'),
        )

        from_account.balance -= amount
        to_account.balance += amount

        db.session.add(transfer)
        db.session.commit()

        return jsonify(transfer.to_dict()), 201
    except ValueError as e:
        return jsonify({'error': f'Invalid date format. Use YYYY-MM-DD: {str(e)}'}), 400
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Error creating transfer: {str(e)}'}), 500


@transfers_bp.route('/api/transfers/<int:transfer_id>', methods=['DELETE'])
@token_required
def delete_transfer(user_id, user_email, transfer_id):
    """Eliminar una transferencia. Revierte el balance de ambas cuentas."""
    try:
        transfer = Transfer.query.filter_by(id=transfer_id, user_id=user_id).first()
        if not transfer:
            return jsonify({'error': 'Transfer not found'}), 404

        from_account = Account.query.filter_by(id=transfer.from_account_id, user_id=user_id).first()
        if from_account:
            from_account.balance += transfer.amount

        to_account = Account.query.filter_by(id=transfer.to_account_id, user_id=user_id).first()
        if to_account:
            to_account.balance -= transfer.amount

        db.session.delete(transfer)
        db.session.commit()

        return jsonify({'message': 'Transferencia eliminada exitosamente'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Error deleting transfer: {str(e)}'}), 500
