"""Servicios recurrentes (gastos fijos mensuales).

Un servicio define un gasto mensual (nombre, monto, día de cobro, categoría y
cuenta). El endpoint /generate materializa las transacciones del mes para los
servicios activos, evitando duplicados (una por servicio por mes).
"""
import calendar
from datetime import date
from decimal import Decimal

from flask import Blueprint, request, jsonify
from sqlalchemy import extract

from models import db
from models.recurring_service import RecurringService
from models.service_surcharge import ServiceSurcharge
from models.transaction import Transaction
from models.account import Account
from models.category import Category
from utils.decorators import token_required

recurring_services_bp = Blueprint('recurring_services', __name__)

VALID_ICON_TYPES = ('bootstrap', 'svg', 'emoji')


def _clamp_day(year, month, day):
    last = calendar.monthrange(year, month)[1]
    return date(year, month, min(max(int(day or 1), 1), last))


def _surcharge_total(service_id, period):
    """Suma de recargos de un servicio que aplican a un periodo 'YYYY-MM'.

    Incluye los recargos sin periodo (period NULL = aplican siempre).
    """
    total = Decimal('0')
    rows = ServiceSurcharge.query.filter(
        ServiceSurcharge.recurring_service_id == service_id,
        db.or_(ServiceSurcharge.period == period, ServiceSurcharge.period.is_(None)),
    ).all()
    for r in rows:
        total += r.amount
    return total


@recurring_services_bp.route('/api/recurring-services', methods=['GET'])
@token_required
def get_recurring_services(user_id, user_email):
    """Listar servicios recurrentes del usuario con paginación."""
    try:
        from utils.pagination import paginate_query

        page = int(request.args.get('page', 1))
        per_page = int(request.args.get('per_page', 50))

        query = RecurringService.query.filter_by(user_id=user_id).order_by(
            RecurringService.day_of_month, RecurringService.name
        )
        return paginate_query(
            query=query,
            model_to_dict_fn=lambda s: s.to_dict(),
            page=page,
            per_page=per_page,
            max_per_page=200,
        )
    except Exception as e:
        return jsonify({'error': f'Error fetching recurring services: {str(e)}'}), 500


@recurring_services_bp.route('/api/recurring-services', methods=['POST'])
@token_required
def create_recurring_service(user_id, user_email):
    """Crear un servicio recurrente.

    Body: { name, amount, day_of_month, category_id?, account_id?, active?,
            icon?, iconType? }
    """
    data = request.get_json() or {}

    if not data.get('name'):
        return jsonify({'error': 'name is required'}), 400
    if data.get('amount') is None:
        return jsonify({'error': 'amount is required'}), 400

    icon_type = data.get('iconType', 'bootstrap')
    if icon_type not in VALID_ICON_TYPES:
        icon_type = 'bootstrap'

    try:
        # Validar relaciones opcionales
        if data.get('category_id'):
            if not Category.query.filter_by(id=data['category_id'], user_id=user_id).first():
                return jsonify({'error': 'Category not found'}), 404
        if data.get('account_id'):
            if not Account.query.filter_by(id=data['account_id'], user_id=user_id).first():
                return jsonify({'error': 'Account not found'}), 404

        service = RecurringService(
            user_id=user_id,
            name=data['name'],
            amount=Decimal(str(data['amount'])),
            category_id=data.get('category_id') or None,
            account_id=data.get('account_id') or None,
            day_of_month=int(data.get('day_of_month', 1)),
            active=bool(data.get('active', True)),
            icon=data.get('icon'),
            icon_type=icon_type,
        )
        db.session.add(service)
        db.session.commit()
        return jsonify(service.to_dict()), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Error creating recurring service: {str(e)}'}), 500


@recurring_services_bp.route('/api/recurring-services/<int:service_id>', methods=['PUT'])
@token_required
def update_recurring_service(user_id, user_email, service_id):
    """Actualizar un servicio recurrente."""
    data = request.get_json() or {}
    try:
        service = RecurringService.query.filter_by(id=service_id, user_id=user_id).first()
        if not service:
            return jsonify({'error': 'Recurring service not found'}), 404

        if 'name' in data:
            service.name = data['name']
        if 'amount' in data:
            service.amount = Decimal(str(data['amount']))
        if 'day_of_month' in data:
            service.day_of_month = int(data['day_of_month'])
        if 'active' in data:
            service.active = bool(data['active'])
        if 'icon' in data:
            service.icon = data['icon']
        if 'iconType' in data and data['iconType'] in VALID_ICON_TYPES:
            service.icon_type = data['iconType']
        if 'category_id' in data:
            cid = data['category_id'] or None
            if cid and not Category.query.filter_by(id=cid, user_id=user_id).first():
                return jsonify({'error': 'Category not found'}), 404
            service.category_id = cid
        if 'account_id' in data:
            aid = data['account_id'] or None
            if aid and not Account.query.filter_by(id=aid, user_id=user_id).first():
                return jsonify({'error': 'Account not found'}), 404
            service.account_id = aid

        db.session.commit()
        return jsonify(service.to_dict()), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Error updating recurring service: {str(e)}'}), 500


@recurring_services_bp.route('/api/recurring-services/<int:service_id>', methods=['DELETE'])
@token_required
def delete_recurring_service(user_id, user_email, service_id):
    """Eliminar un servicio recurrente. Las transacciones ya generadas se conservan."""
    try:
        service = RecurringService.query.filter_by(id=service_id, user_id=user_id).first()
        if not service:
            return jsonify({'error': 'Recurring service not found'}), 404

        # Desvincular las transacciones generadas (se conservan como gastos normales).
        Transaction.query.filter_by(recurring_service_id=service_id).update(
            {Transaction.recurring_service_id: None}
        )
        db.session.delete(service)
        db.session.commit()
        return jsonify({'message': 'Servicio recurrente eliminado'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Error deleting recurring service: {str(e)}'}), 500


@recurring_services_bp.route('/api/recurring-services/generate', methods=['POST'])
@token_required
def generate_recurring_transactions(user_id, user_email):
    """Materializar las transacciones del mes para los servicios activos.

    Body: { "month": "YYYY-MM" }  (por defecto, el mes actual)

    Crea un gasto por servicio activo que tenga categoría y cuenta y que no haya
    sido generado ya ese mes. Devuelve { created: [...], skipped: [...] }.
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

    try:
        services = RecurringService.query.filter_by(user_id=user_id, active=True).all()
        created, skipped = [], []

        for s in services:
            # ¿Falta categoría o cuenta? No se puede materializar.
            if not s.category_id or not s.account_id:
                skipped.append({'id': s.id, 'name': s.name, 'reason': 'missing category or account'})
                continue

            # ¿Ya existe una transacción de este servicio ese mes?
            exists = Transaction.query.filter(
                Transaction.user_id == user_id,
                Transaction.recurring_service_id == s.id,
                extract('year', Transaction.date) == year,
                extract('month', Transaction.date) == month,
            ).first()
            if exists:
                skipped.append({'id': s.id, 'name': s.name, 'reason': 'already generated'})
                continue

            account = Account.query.filter_by(id=s.account_id, user_id=user_id).first()
            if not account:
                skipped.append({'id': s.id, 'name': s.name, 'reason': 'account not found'})
                continue

            # El monto del mes = base + recargos del periodo (mora, exceso, IVA...).
            period = f'{year}-{month:02d}'
            total_amount = s.amount + _surcharge_total(s.id, period)

            tx = Transaction(
                user_id=user_id,
                account_id=s.account_id,
                category_id=s.category_id,
                amount=total_amount,
                type='expense',
                description=s.name,
                date=_clamp_day(year, month, s.day_of_month),
                recurring_service_id=s.id,
            )
            account.balance -= total_amount
            db.session.add(tx)
            created.append({'id': s.id, 'name': s.name, 'amount': float(total_amount)})

        db.session.commit()
        return jsonify({'created': created, 'skipped': skipped}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Error generating transactions: {str(e)}'}), 500


# ---------------------------------------------------------------------------
# Generación individual — crea la transacción de UN servicio para el mes.
# ---------------------------------------------------------------------------

@recurring_services_bp.route('/api/recurring-services/<int:service_id>/generate', methods=['POST'])
@token_required
def generate_single(user_id, user_email, service_id):
    """Materializar la transacción de un servicio concreto para un mes.

    Body: { "month": "YYYY-MM" }  (por defecto, el mes actual)

    Respuesta:
      201 → { status: "created", transaction: {...}, amount: float, surcharges: float }
      200 → { status: "already_generated", transaction_id: int }
      422 → { status: "missing_config", reason: str }
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

    try:
        s = RecurringService.query.filter_by(id=service_id, user_id=user_id).first()
        if not s:
            return jsonify({'error': 'Service not found'}), 404

        if not s.category_id or not s.account_id:
            return jsonify({
                'status': 'missing_config',
                'reason': 'El servicio necesita categoría y cuenta para generar una transacción',
            }), 422

        # Already generated this month?
        exists = Transaction.query.filter(
            Transaction.user_id == user_id,
            Transaction.recurring_service_id == s.id,
            extract('year', Transaction.date) == year,
            extract('month', Transaction.date) == month,
        ).first()
        if exists:
            return jsonify({'status': 'already_generated', 'transaction_id': exists.id}), 200

        account = Account.query.filter_by(id=s.account_id, user_id=user_id).first()
        if not account:
            return jsonify({'status': 'missing_config', 'reason': 'Cuenta no encontrada'}), 422

        period = f'{year}-{month:02d}'
        surcharge_total = _surcharge_total(s.id, period)
        total_amount = s.amount + surcharge_total

        tx = Transaction(
            user_id=user_id,
            account_id=s.account_id,
            category_id=s.category_id,
            amount=total_amount,
            type='expense',
            description=s.name,
            date=_clamp_day(year, month, s.day_of_month),
            recurring_service_id=s.id,
        )
        account.balance -= total_amount
        db.session.add(tx)
        db.session.commit()

        return jsonify({
            'status': 'created',
            'transaction': tx.to_dict() if hasattr(tx, 'to_dict') else {'id': tx.id},
            'base_amount': float(s.amount),
            'surcharge_total': float(surcharge_total),
            'total_amount': float(total_amount),
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Error generating transaction: {str(e)}'}), 500


# ---------------------------------------------------------------------------
# Recargos (surcharges): cargos extra de un servicio en un mes dado.
# ---------------------------------------------------------------------------

@recurring_services_bp.route('/api/recurring-services/<int:service_id>/surcharges', methods=['GET'])
@token_required
def list_surcharges(user_id, user_email, service_id):
    """Listar recargos de un servicio. Filtro opcional ?month=YYYY-MM
    (incluye los recargos sin periodo, que aplican siempre)."""
    service = RecurringService.query.filter_by(id=service_id, user_id=user_id).first()
    if not service:
        return jsonify({'error': 'Recurring service not found'}), 404
    try:
        query = ServiceSurcharge.query.filter_by(recurring_service_id=service_id, user_id=user_id)
        month = request.args.get('month')
        if month:
            query = query.filter(
                db.or_(ServiceSurcharge.period == month, ServiceSurcharge.period.is_(None))
            )
        rows = query.order_by(ServiceSurcharge.created_at).all()
        base = float(service.amount)
        extra = sum(float(r.amount) for r in rows)
        return jsonify({
            'data': [r.to_dict() for r in rows],
            'base_amount': base,
            'surcharge_total': extra,
            'total': base + extra,
        }), 200
    except Exception as e:
        return jsonify({'error': f'Error fetching surcharges: {str(e)}'}), 500


@recurring_services_bp.route('/api/recurring-services/<int:service_id>/surcharges', methods=['POST'])
@token_required
def add_surcharge(user_id, user_email, service_id):
    """Agregar recargo. Body: { type, amount, note?, period? ('YYYY-MM') }."""
    service = RecurringService.query.filter_by(id=service_id, user_id=user_id).first()
    if not service:
        return jsonify({'error': 'Recurring service not found'}), 404
    data = request.get_json() or {}
    if data.get('amount') is None:
        return jsonify({'error': 'amount is required'}), 400
    try:
        surcharge = ServiceSurcharge(
            recurring_service_id=service_id,
            user_id=user_id,
            type=data.get('type', 'otro'),
            amount=Decimal(str(data['amount'])),
            note=data.get('note'),
            period=data.get('period') or None,
        )
        db.session.add(surcharge)
        db.session.commit()
        return jsonify(surcharge.to_dict()), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Error adding surcharge: {str(e)}'}), 500


@recurring_services_bp.route('/api/recurring-services/surcharges/<int:surcharge_id>', methods=['DELETE'])
@token_required
def delete_surcharge(user_id, user_email, surcharge_id):
    """Eliminar un recargo."""
    try:
        surcharge = ServiceSurcharge.query.filter_by(id=surcharge_id, user_id=user_id).first()
        if not surcharge:
            return jsonify({'error': 'Surcharge not found'}), 404
        db.session.delete(surcharge)
        db.session.commit()
        return jsonify({'message': 'Recargo eliminado'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Error deleting surcharge: {str(e)}'}), 500
