from flask import Blueprint, request, jsonify
from models.income_source import IncomeSource
from models import db
from utils.decorators import token_required
from services.salary_calc import calculate_deductions
from decimal import Decimal

income_sources_bp = Blueprint('income_sources', __name__)

VALID_MODALITIES = ('planilla', 'servicios_profesionales', 'pension')
VALID_SCHEDULES = ('monthly', 'biweekly')


@income_sources_bp.route('/api/income-sources', methods=['GET'])
@token_required
def get_income_sources(user_id, user_email):
    """Listar fuentes de ingreso del usuario con paginación."""
    try:
        from utils.pagination import paginate_query

        page = int(request.args.get('page', 1))
        per_page = int(request.args.get('per_page', 20))

        query = IncomeSource.query.filter_by(user_id=user_id).order_by(IncomeSource.created_at.desc())

        return paginate_query(
            query=query,
            model_to_dict_fn=lambda src: src.to_dict(),
            page=page,
            per_page=per_page,
            max_per_page=100
        )
    except Exception as e:
        return jsonify({'error': f'Error fetching income sources: {str(e)}'}), 500


@income_sources_bp.route('/api/income-sources/preview', methods=['POST'])
@token_required
def preview_income_source(user_id, user_email):
    """Calcular el desglose de descuentos sin guardar (para el formulario).

    Body: { "gross_amount", "modality" }
    """
    data = request.get_json() or {}
    if 'gross_amount' not in data:
        return jsonify({'error': 'Required field: gross_amount'}), 400

    modality = data.get('modality', 'planilla')
    if modality not in VALID_MODALITIES:
        return jsonify({'error': f'modality must be one of {VALID_MODALITIES}'}), 400

    try:
        breakdown = calculate_deductions(float(data['gross_amount']), modality)
        return jsonify(breakdown), 200
    except (ValueError, TypeError):
        return jsonify({'error': 'gross_amount must be a number'}), 400


@income_sources_bp.route('/api/income-sources', methods=['POST'])
@token_required
def create_income_source(user_id, user_email):
    """Crear una fuente de ingreso.

    Body: { "name", "modality", "gross_amount", "pay_schedule", "pay_day", "currency" }
    """
    data = request.get_json()

    required_fields = ['name', 'gross_amount']
    if not data or not all(field in data for field in required_fields):
        return jsonify({'error': f'Required fields: {", ".join(required_fields)}'}), 400

    modality = data.get('modality', 'planilla')
    if modality not in VALID_MODALITIES:
        return jsonify({'error': f'modality must be one of {VALID_MODALITIES}'}), 400

    pay_schedule = data.get('pay_schedule', 'monthly')
    if pay_schedule not in VALID_SCHEDULES:
        return jsonify({'error': f'pay_schedule must be one of {VALID_SCHEDULES}'}), 400

    try:
        source = IncomeSource(
            user_id=user_id,
            name=data['name'],
            modality=modality,
            gross_amount=Decimal(str(data['gross_amount'])),
            pay_schedule=pay_schedule,
            pay_day=data.get('pay_day'),
            currency=data.get('currency', 'USD'),
        )
        db.session.add(source)
        db.session.commit()
        return jsonify(source.to_dict()), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Error creating income source: {str(e)}'}), 500


@income_sources_bp.route('/api/income-sources/<int:source_id>', methods=['PUT'])
@token_required
def update_income_source(user_id, user_email, source_id):
    """Actualizar una fuente de ingreso."""
    data = request.get_json() or {}

    if 'modality' in data and data['modality'] not in VALID_MODALITIES:
        return jsonify({'error': f'modality must be one of {VALID_MODALITIES}'}), 400
    if 'pay_schedule' in data and data['pay_schedule'] not in VALID_SCHEDULES:
        return jsonify({'error': f'pay_schedule must be one of {VALID_SCHEDULES}'}), 400

    try:
        source = IncomeSource.query.filter_by(id=source_id, user_id=user_id).first()
        if not source:
            return jsonify({'error': 'Income source not found'}), 404

        if 'name' in data:
            source.name = data['name']
        if 'modality' in data:
            source.modality = data['modality']
        if 'gross_amount' in data:
            source.gross_amount = Decimal(str(data['gross_amount']))
        if 'pay_schedule' in data:
            source.pay_schedule = data['pay_schedule']
        if 'pay_day' in data:
            source.pay_day = data['pay_day']
        if 'currency' in data:
            source.currency = data['currency']

        db.session.commit()
        return jsonify(source.to_dict()), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Error updating income source: {str(e)}'}), 500


@income_sources_bp.route('/api/income-sources/<int:source_id>', methods=['DELETE'])
@token_required
def delete_income_source(user_id, user_email, source_id):
    """Eliminar una fuente de ingreso (falla si tiene préstamos asociados)."""
    try:
        source = IncomeSource.query.filter_by(id=source_id, user_id=user_id).first()
        if not source:
            return jsonify({'error': 'Income source not found'}), 404

        if source.loans:
            return jsonify({'error': 'No se puede eliminar: tiene préstamos asociados'}), 400

        db.session.delete(source)
        db.session.commit()
        return jsonify({'message': 'Fuente de ingreso eliminada exitosamente'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Error deleting income source: {str(e)}'}), 500
