from flask import Blueprint, request, jsonify
from models.loan import Loan
from models.loan_payment import LoanPayment
from models.income_source import IncomeSource
from models.transaction import Transaction
from models.account import Account
from models.category import Category
from models import db
from utils.decorators import token_required
from services.loan_schedule import build_schedule
from services.loan_payment import sync_loan_from_transactions, paid_total_for_loan
from datetime import date, datetime
from decimal import Decimal

loans_bp = Blueprint('loans', __name__)

VALID_METHODS = ('simple', 'french')
VALID_PAYMENT_TYPES = ('monthly', 'biweekly', 'single')
INSTALLMENT_PAYMENT_TYPES = ('monthly', 'biweekly')


def _parse_date(value):
    return date.fromisoformat(value) if isinstance(value, str) else value


def _regenerate_payments(loan):
    """Borrar y reconstruir las cuotas del préstamo a partir de sus parámetros."""
    LoanPayment.query.filter_by(loan_id=loan.id).delete()
    schedule = build_schedule(
        principal=float(loan.principal),
        interest_rate=float(loan.interest_rate),
        interest_method=loan.interest_method,
        payment_type=loan.payment_type,
        installments=loan.installments,
        payment_day=loan.payment_day,
        start_date=loan.start_date,
    )
    for item in schedule:
        db.session.add(LoanPayment(
            loan_id=loan.id,
            user_id=loan.user_id,
            installment_number=item['installment_number'],
            due_date=item['due_date'],
            amount=Decimal(str(item['amount'])),
            status='pending',
        ))


@loans_bp.route('/api/loans', methods=['GET'])
@token_required
def get_loans(user_id, user_email):
    """Listar préstamos del usuario con totales, relaciones y cuotas."""
    try:
        from utils.pagination import paginate_query

        page = int(request.args.get('page', 1))
        per_page = int(request.args.get('per_page', 20))

        query = Loan.query.filter_by(user_id=user_id).order_by(Loan.created_at.desc())

        return paginate_query(
            query=query,
            model_to_dict_fn=lambda loan: loan.to_dict_full(),
            page=page,
            per_page=per_page,
            max_per_page=100
        )
    except Exception as e:
        return jsonify({'error': f'Error fetching loans: {str(e)}'}), 500


@loans_bp.route('/api/loans', methods=['POST'])
@token_required
def create_loan(user_id, user_email):
    """Crear un préstamo y materializar su calendario de pagos.

    Body: { "name", "principal", "interest_rate", "interest_method",
            "payment_type" ('monthly'|'biweekly'|'single'), "installments",
            "payment_day", "start_date", "income_source_id" }
    """
    data = request.get_json()

    required_fields = ['name', 'principal', 'payment_type', 'start_date', 'income_source_id']
    if not data or not all(field in data for field in required_fields):
        return jsonify({'error': f'Required fields: {", ".join(required_fields)}'}), 400

    interest_method = data.get('interest_method', 'simple')
    if interest_method not in VALID_METHODS:
        return jsonify({'error': f'interest_method must be one of {VALID_METHODS}'}), 400

    payment_type = data['payment_type']
    if payment_type not in VALID_PAYMENT_TYPES:
        return jsonify({'error': f'payment_type must be one of {VALID_PAYMENT_TYPES}'}), 400

    installments = data.get('installments')
    if payment_type in INSTALLMENT_PAYMENT_TYPES:
        if not installments or int(installments) < 1:
            return jsonify({'error': f'installments is required for {payment_type} loans'}), 400

    try:
        # Validar la fuente de ingreso
        source = IncomeSource.query.filter_by(id=data['income_source_id'], user_id=user_id).first()
        if not source:
            return jsonify({'error': 'Income source not found'}), 404

        category_id = data.get('category_id')
        if category_id:
            if not Category.query.filter_by(id=category_id, user_id=user_id).first():
                return jsonify({'error': 'Category not found'}), 404

        account_id = data.get('account_id')
        if account_id:
            if not Account.query.filter_by(id=account_id, user_id=user_id).first():
                return jsonify({'error': 'Account not found'}), 404

        loan = Loan(
            user_id=user_id,
            name=data['name'],
            principal=Decimal(str(data['principal'])),
            interest_rate=Decimal(str(data.get('interest_rate', 0))),
            interest_method=interest_method,
            payment_type=payment_type,
            installments=int(installments) if payment_type in INSTALLMENT_PAYMENT_TYPES else 1,
            payment_day=data.get('payment_day'),
            start_date=_parse_date(data['start_date']),
            income_source_id=data['income_source_id'],
            category_id=category_id,
            account_id=account_id,
            status='active',
        )
        db.session.add(loan)
        db.session.flush()  # obtener loan.id antes de crear las cuotas

        _regenerate_payments(loan)
        db.session.commit()

        return jsonify(loan.to_dict_full()), 201
    except ValueError as e:
        db.session.rollback()
        return jsonify({'error': f'Invalid date format. Use YYYY-MM-DD: {str(e)}'}), 400
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Error creating loan: {str(e)}'}), 500


@loans_bp.route('/api/loans/<int:loan_id>', methods=['PUT'])
@token_required
def update_loan(user_id, user_email, loan_id):
    """Actualizar un préstamo. Si cambian parámetros financieros se regenera el calendario."""
    data = request.get_json() or {}

    if 'interest_method' in data and data['interest_method'] not in VALID_METHODS:
        return jsonify({'error': f'interest_method must be one of {VALID_METHODS}'}), 400
    if 'payment_type' in data and data['payment_type'] not in VALID_PAYMENT_TYPES:
        return jsonify({'error': f'payment_type must be one of {VALID_PAYMENT_TYPES}'}), 400

    try:
        loan = Loan.query.filter_by(id=loan_id, user_id=user_id).first()
        if not loan:
            return jsonify({'error': 'Loan not found'}), 404

        # Campos que afectan el calendario de pagos
        schedule_fields = {'principal', 'interest_rate', 'interest_method',
                           'payment_type', 'installments', 'payment_day', 'start_date'}
        needs_regen = any(f in data for f in schedule_fields)

        if 'name' in data:
            loan.name = data['name']
        if 'principal' in data:
            loan.principal = Decimal(str(data['principal']))
        if 'interest_rate' in data:
            loan.interest_rate = Decimal(str(data['interest_rate']))
        if 'interest_method' in data:
            loan.interest_method = data['interest_method']
        if 'payment_type' in data:
            loan.payment_type = data['payment_type']
        if 'installments' in data:
            loan.installments = int(data['installments']) if data['installments'] else 1
        if 'payment_day' in data:
            loan.payment_day = data['payment_day']
        if 'start_date' in data:
            loan.start_date = _parse_date(data['start_date'])
        if 'income_source_id' in data:
            source = IncomeSource.query.filter_by(id=data['income_source_id'], user_id=user_id).first()
            if not source:
                return jsonify({'error': 'Income source not found'}), 404
            loan.income_source_id = data['income_source_id']
        if 'category_id' in data:
            cid = data['category_id']
            if cid and not Category.query.filter_by(id=cid, user_id=user_id).first():
                return jsonify({'error': 'Category not found'}), 404
            loan.category_id = cid or None
        if 'account_id' in data:
            aid = data['account_id']
            if aid and not Account.query.filter_by(id=aid, user_id=user_id).first():
                return jsonify({'error': 'Account not found'}), 404
            loan.account_id = aid or None
        if 'status' in data:
            loan.status = data['status']

        if needs_regen:
            db.session.flush()
            # Reconstruir el calendario reaplicando los abonos ya registrados.
            sync_loan_from_transactions(loan)

        db.session.commit()
        return jsonify(loan.to_dict_full()), 200
    except ValueError as e:
        db.session.rollback()
        return jsonify({'error': f'Invalid date format: {str(e)}'}), 400
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Error updating loan: {str(e)}'}), 500


@loans_bp.route('/api/loans/<int:loan_id>', methods=['DELETE'])
@token_required
def delete_loan(user_id, user_email, loan_id):
    """Eliminar un préstamo y sus cuotas (cascade)."""
    try:
        loan = Loan.query.filter_by(id=loan_id, user_id=user_id).first()
        if not loan:
            return jsonify({'error': 'Loan not found'}), 404

        db.session.delete(loan)
        db.session.commit()
        return jsonify({'message': 'Préstamo eliminado exitosamente'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Error deleting loan: {str(e)}'}), 500


@loans_bp.route('/api/loans/loan-payments/<int:payment_id>/pay', methods=['PATCH'])
@token_required
def toggle_payment(user_id, user_email, payment_id):
    """Marcar/desmarcar una cuota como pagada y generar/eliminar la transacción.

    Body opcional: { "status": "paid|pending", "paid_date": "YYYY-MM-DD" }
    Retorna el préstamo completo actualizado.
    """
    data = request.get_json() or {}
    try:
        payment = LoanPayment.query.filter_by(id=payment_id, user_id=user_id).first()
        if not payment:
            return jsonify({'error': 'Payment not found'}), 404

        loan = payment.loan
        new_status = data.get('status', 'paid' if payment.status == 'pending' else 'pending')
        if new_status not in ('paid', 'pending'):
            return jsonify({'error': 'status must be "paid" or "pending"'}), 400

        paid_date = _parse_date(data['paid_date']) if data.get('paid_date') else date.today()

        if new_status == 'paid':
            payment.paid_amount = payment.amount
            payment.paid_date = paid_date

            # Generar transacción automáticamente si el préstamo tiene cuenta y categoría
            if loan.account_id and loan.category_id:
                account = Account.query.filter_by(id=loan.account_id, user_id=user_id).first()
                tx = Transaction(
                    user_id=user_id,
                    account_id=loan.account_id,
                    category_id=loan.category_id,
                    amount=payment.amount,
                    type='expense',
                    description=f'{loan.name} · cuota {payment.installment_number}',
                    date=paid_date,
                    loan_id=loan.id,
                )
                db.session.add(tx)
                db.session.flush()
                payment.transaction_id = tx.id
                if account:
                    account.balance = Decimal(str(float(account.balance) - float(payment.amount)))
        else:
            # Revertir: eliminar transacción vinculada y restaurar balance
            if payment.transaction_id:
                tx = Transaction.query.filter_by(id=payment.transaction_id, user_id=user_id).first()
                if tx:
                    account = Account.query.filter_by(id=tx.account_id, user_id=user_id).first()
                    if account:
                        account.balance = Decimal(str(float(account.balance) + float(tx.amount)))
                    db.session.delete(tx)
                payment.transaction_id = None

            payment.paid_amount = Decimal('0')
            payment.paid_date = None

        payment.status = new_status

        # Actualizar estado del préstamo
        all_paid = all(p.status == 'paid' for p in loan.payments)
        loan.status = 'paid' if all_paid else 'active'

        db.session.commit()
        return jsonify(loan.to_dict_full()), 200
    except ValueError as e:
        db.session.rollback()
        return jsonify({'error': f'Invalid date format: {str(e)}'}), 400
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Error updating payment: {str(e)}'}), 500
