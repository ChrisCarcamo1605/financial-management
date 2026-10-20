"""Resumen del dashboard: saldos, flujo del mes (vs mes anterior), presupuestos y actividad."""
import calendar
from datetime import date

from flask import Blueprint, jsonify
from sqlalchemy import func

from models import db
from models.account import Account
from models.budget import Budget
from models.transaction import Transaction
from utils.decorators import token_required

dashboard_bp = Blueprint('dashboard', __name__)

RECENT_LIMIT = 10


def _month_bounds(year, month):
    return date(year, month, 1), date(year, month, calendar.monthrange(year, month)[1])


def _previous_month(year, month):
    return (year, month - 1) if month > 1 else (year - 1, 12)


def _totals_between(user_id, start, end):
    """{'income': x, 'expense': y} sumando transacciones en [start, end]."""
    rows = (
        db.session.query(Transaction.type, func.sum(Transaction.amount))
        .filter(Transaction.user_id == user_id, Transaction.date >= start, Transaction.date <= end)
        .group_by(Transaction.type)
        .all()
    )
    totals = {'income': 0.0, 'expense': 0.0}
    for tx_type, amount in rows:
        totals[tx_type] = round(float(amount or 0), 2)
    return totals


@dashboard_bp.route('/api/dashboard/summary', methods=['GET'])
@token_required
def dashboard_summary(user_id, user_email):
    """
    Response: {
      total_balance, credit_card_debt, monthly_income, monthly_expense, monthly_net,
      previous_month: { income, expense, net },
      accounts: [...], budgets_status: [...], recent_transactions: [...]
    }
    """
    try:
        today = date.today()
        accounts = Account.query.filter_by(user_id=user_id).order_by(Account.created_at).all()
        cash_accounts = [a for a in accounts if a.type != 'tarjeta_credito']
        cards = [a for a in accounts if a.type == 'tarjeta_credito']

        current = _totals_between(user_id, *_month_bounds(today.year, today.month))
        previous = _totals_between(user_id, *_month_bounds(*_previous_month(today.year, today.month)))

        recent = (
            Transaction.query.filter_by(user_id=user_id)
            .order_by(Transaction.date.desc(), Transaction.id.desc())
            .limit(RECENT_LIMIT)
            .all()
        )
        budgets = Budget.query.filter(
            Budget.user_id == user_id,
            db.or_(Budget.end_date.is_(None), Budget.end_date >= today),
        ).all()

        return jsonify({
            'total_balance': round(sum(float(a.balance) for a in cash_accounts), 2),
            # El saldo de una tarjeta es negativo cuando hay deuda.
            'credit_card_debt': round(sum(max(-float(a.balance), 0) for a in cards), 2),
            'monthly_income': current['income'],
            'monthly_expense': current['expense'],
            'monthly_net': round(current['income'] - current['expense'], 2),
            'previous_month': {
                **previous,
                'net': round(previous['income'] - previous['expense'], 2),
            },
            'accounts': [a.to_dict() for a in accounts],
            'budgets_status': [b.to_dict_full() for b in budgets],
            'recent_transactions': [t.to_dict_with_relations() for t in recent],
        }), 200
    except Exception as e:
        return jsonify({'error': f'Dashboard error: {str(e)}'}), 500
