"""Exporta el usuario demo y las respuestas reales de la API para las pruebas
de paridad del modo demo del frontend (frontend/src/data/demo/parity.test.ts).

Usage (desde backend/):
    DATABASE_URL=postgresql://caudal:caudal@localhost:5433/caudal \\
        .venv/bin/python scripts/export_demo_parity.py

Solo corre contra una base local. Marca temporalmente una reserva de tarjeta
como guardada para cubrir ese caso y la elimina al terminar.
"""
import json
import os
import sys
from datetime import date, datetime
from decimal import Decimal
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from sqlalchemy.engine import make_url  # noqa: E402

from app import create_app  # noqa: E402
from models import db  # noqa: E402
from models.account import Account  # noqa: E402
from models.budget import Budget  # noqa: E402
from models.card_reserve_status import CardReserveStatus  # noqa: E402
from models.category import Category  # noqa: E402
from models.income_source import IncomeSource  # noqa: E402
from models.loan import Loan  # noqa: E402
from models.loan_payment import LoanPayment  # noqa: E402
from models.recurring_service import RecurringService  # noqa: E402
from models.savings_contribution import SavingsContribution  # noqa: E402
from models.savings_goal import SavingsGoal  # noqa: E402
from models.service_surcharge import ServiceSurcharge  # noqa: E402
from models.transaction import Transaction  # noqa: E402
from models.transfer import Transfer  # noqa: E402
from models.user import User  # noqa: E402
from services.auth_service import AuthService  # noqa: E402
from services.budget_period import current_period  # noqa: E402
from services.loan_schedule import build_schedule  # noqa: E402
from services.salary_calc import calculate_deductions  # noqa: E402

OUT = Path(__file__).resolve().parents[2] / 'frontend/src/data/demo/__fixtures__/parity.json'
LOCAL_HOSTS = {'localhost', '127.0.0.1', 'db'}
DEMO_EMAIL = 'demo@caudal.app'


def plain(value):
    if isinstance(value, Decimal):
        return float(value)
    if isinstance(value, datetime):
        return value.isoformat()
    if isinstance(value, date):
        return value.isoformat()
    return value


def rows(model, user_id, columns, **filters):
    query = model.query.filter_by(**filters) if filters else model.query.filter_by(user_id=user_id)
    return [{c: plain(getattr(r, c)) for c in columns} for r in query.order_by(model.id).all()]


def month_key(year, month, offset):
    m = month - 1 + offset
    return f'{year + m // 12}-{m % 12 + 1:02d}'


def main():
    app = create_app()
    host = make_url(app.config['SQLALCHEMY_DATABASE_URI']).host or ''
    if host not in LOCAL_HOSTS:
        raise SystemExit(f'Solo contra una base local (actual: {host})')

    with app.app_context():
        user = User.query.filter_by(email=DEMO_EMAIL).first()
        if not user:
            raise SystemExit('Falta el usuario demo: corre seed.py --reset')
        uid = str(user.id)
        today = date.today()
        token = AuthService.generate_access_token(user.id, user.email)
        client = app.test_client()
        headers = {'Authorization': f'Bearer {token}'}

        def get(path):
            response = client.get(path, headers=headers)
            assert response.status_code == 200, (path, response.status_code, response.get_json())
            return response.get_json()

        # Una reserva confirmada para cubrir el estado 'saved' (se elimina al final).
        card = Account.query.filter_by(user_id=uid, type='tarjeta_credito').first()
        months = [month_key(today.year, today.month, o) for o in (-1, 0, 1)]
        probe = get(f'/api/quincenas?month={months[1]}')
        marked = None
        for plan in probe['card_plan']:
            missed = [s for s in plan['schedule'] if s.get('status') == 'missed']
            if missed:
                step = missed[0]
                marked = CardReserveStatus(user_id=uid, card_id=card.id,
                                           payment_due_date=date.fromisoformat(plan['payment_due_date']),
                                           quincena_period=f"{step['month']}-Q{step['quincena']}")
                db.session.add(marked)
                db.session.commit()
                break

        try:
            start12 = f'{month_key(today.year, today.month, -11)}-01'
            data = {
                'today': today.isoformat(),
                'state': {
                    'accounts': rows(Account, uid, ['id', 'name', 'balance', 'currency', 'type', 'credit_limit', 'cutoff_day', 'payment_due_day', 'start_date', 'created_at']),
                    'categories': rows(Category, uid, ['id', 'name', 'type', 'color', 'icon', 'icon_type', 'created_at']),
                    'transactions': rows(Transaction, uid, ['id', 'account_id', 'category_id', 'amount', 'type', 'description', 'date', 'loan_id', 'recurring_service_id', 'created_at']),
                    'transfers': rows(Transfer, uid, ['id', 'from_account_id', 'to_account_id', 'amount', 'date', 'description', 'created_at']),
                    'budgets': rows(Budget, uid, ['id', 'category_id', 'amount', 'period', 'start_day', 'start_date', 'end_date', 'created_at']),
                    'incomeSources': rows(IncomeSource, uid, ['id', 'name', 'modality', 'gross_amount', 'pay_schedule', 'pay_day', 'currency', 'account_id', 'category_id', 'created_at']),
                    'loans': rows(Loan, uid, ['id', 'name', 'principal', 'interest_rate', 'interest_method', 'payment_type', 'installments', 'payment_day', 'start_date', 'income_source_id', 'category_id', 'account_id', 'status', 'created_at']),
                    'loanPayments': rows(LoanPayment, uid, ['id', 'loan_id', 'installment_number', 'due_date', 'amount', 'paid_amount', 'status', 'paid_date', 'transaction_id']),
                    'services': rows(RecurringService, uid, ['id', 'name', 'amount', 'category_id', 'account_id', 'day_of_month', 'active', 'icon', 'icon_type', 'created_at']),
                    'surcharges': rows(ServiceSurcharge, uid, ['id', 'recurring_service_id', 'type', 'amount', 'note', 'period', 'created_at']),
                    'savingsGoals': rows(SavingsGoal, uid, ['id', 'name', 'target_amount', 'current_amount', 'per_quincena', 'per_quincena_q1', 'account_id', 'day_q1', 'day_q2', 'color', 'icon', 'icon_type', 'active', 'created_at']),
                    'contributions': rows(SavingsContribution, uid, ['id', 'savings_goal_id', 'amount', 'date', 'source', 'quincena_period', 'created_at']),
                    'cardReserves': rows(CardReserveStatus, uid, ['id', 'card_id', 'payment_due_date', 'quincena_period']),
                },
                'api': {
                    'quincenas': {m: get(f'/api/quincenas?month={m}') for m in months},
                    'dashboard': get('/api/dashboard/summary'),
                    'accounts': get('/api/accounts?per_page=200')['data'],
                    'budgets': get('/api/budgets?per_page=200')['data'],
                    'loans': get('/api/loans?per_page=200')['data'],
                    'services': get(f'/api/recurring-services?per_page=200&month={months[1]}')['data'],
                    'savings': get('/api/savings-goals')['data'],
                    'incomeSources': get('/api/income-sources?per_page=200')['data'],
                    'cashFlow': get(f'/api/analytics/cash-flow?start_date={start12}&end_date={today.isoformat()}&group_by=month'),
                    'spending': get(f'/api/analytics/spending-by-category?start_date={months[1]}-01&end_date={today.isoformat()}'),
                    'transactionsSearch': get('/api/transactions?search=super&sort=amount&order=desc&limit=20'),
                    'transactionsPage': get(f'/api/transactions?type=expense&start_date={start12}&limit=15&offset=15'),
                },
                'pure': {
                    'deductions': [
                        {'gross': g, 'modality': m, 'result': calculate_deductions(g, m)}
                        for g in (300, 550, 550.01, 725, 895.24, 1000, 1450, 2038.1, 3200.55, 9999.99)
                        for m in ('planilla', 'servicios_profesionales', 'pension')
                    ],
                    'schedules': [
                        {'params': p, 'result': [{**i, 'due_date': i['due_date'].isoformat()} for i in build_schedule(**{**p, 'start_date': date.fromisoformat(p['start_date'])})]}
                        for p in (
                            dict(principal=9000, interest_rate=9.5, interest_method='french', payment_type='monthly', installments=48, payment_day=25, start_date='2026-04-01'),
                            dict(principal=1200, interest_rate=0, interest_method='simple', payment_type='monthly', installments=7, payment_day=31, start_date='2026-01-31'),
                            dict(principal=2500, interest_rate=12, interest_method='simple', payment_type='biweekly', installments=9, payment_day=None, start_date='2026-10-16'),
                            dict(principal=3000, interest_rate=18.75, interest_method='french', payment_type='biweekly', installments=24, payment_day=None, start_date='2026-12-31'),
                            dict(principal=800, interest_rate=5, interest_method='simple', payment_type='single', installments=None, payment_day=None, start_date='2027-02-28'),
                        )
                    ],
                    'periods': [
                        {'args': [period, start, day, end, ref], 'result': [x.isoformat() if hasattr(x, 'isoformat') else x for x in current_period(period, date.fromisoformat(start), day, date.fromisoformat(end) if end else None, date.fromisoformat(ref))]}
                        for period, start, day, end, ref in (
                            ('monthly', '2026-01-10', 1, None, '2026-10-20'),
                            ('monthly', '2026-01-31', 31, None, '2026-02-15'),
                            ('monthly', '2026-03-05', None, None, '2026-10-02'),
                            ('weekly', '2026-04-01', 1, None, '2026-10-20'),
                            ('weekly', '2026-04-01', None, None, '2026-10-25'),
                            ('biweekly', '2026-04-01', None, None, '2026-10-14'),
                            ('biweekly', '2026-04-01', None, None, '2026-10-30'),
                            ('biweekly', '2026-04-01', None, None, '2027-03-02'),
                            ('monthly', '2026-04-01', 15, '2026-09-20', '2026-10-20'),
                        )
                    ],
                },
            }
        finally:
            if marked is not None:
                db.session.delete(marked)
                db.session.commit()

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(data, ensure_ascii=False, indent=1))
    print(f'Fixture: {OUT} ({OUT.stat().st_size // 1024} KB), marcado={bool(marked)}')


if __name__ == '__main__':
    main()
