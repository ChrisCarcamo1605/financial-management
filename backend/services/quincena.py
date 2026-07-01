"""Vista general por quincena.

Q1: día 30 del mes anterior → día 14 del mes actual
Q2: día 15 → día 29 del mes actual
"""
import calendar
from datetime import date


def _build_quincena(label, start, end, payments, income, services,
                    income_sources=None, transactions=None):
    in_range = [p for p in payments if start <= p.due_date <= end]
    loan_expenses = sum(float(p.amount) for p in in_range)
    services_expenses = sum(float(s['amount']) for s in services)
    expenses = round(loan_expenses + services_expenses, 2)
    return {
        'label': label,
        'start': start.isoformat(),
        'end': end.isoformat(),
        'income': round(income, 2),
        'expenses': expenses,
        'available': round(income - expenses, 2),
        'payments': [
            {
                'id': p.id,
                'loan_id': p.loan_id,
                'loan_name': p.loan.name if p.loan else None,
                'installment_number': p.installment_number,
                'amount': float(p.amount),
                'paid_amount': float(p.paid_amount or 0),
                'due_date': p.due_date.isoformat(),
                'status': p.status,
            }
            for p in sorted(in_range, key=lambda x: x.due_date)
        ],
        'services': sorted(services, key=lambda x: x['day']),
        'income_sources': income_sources or [],
        'transactions': transactions or [],
    }


def _prev_month(year, month):
    return (year, month - 1) if month > 1 else (year - 1, 12)


def _in_q1(day):
    """día 1-14 o 30-31 pertenece a Q1; día 15-29 a Q2."""
    return day <= 14 or day >= 30


def get_quincena_overview(user_id, year, month):
    from models.loan_payment import LoanPayment
    from models.income_source import IncomeSource
    from models.recurring_service import RecurringService
    from models.transaction import Transaction

    last_day = calendar.monthrange(year, month)[1]
    prev_year, prev_month = _prev_month(year, month)
    prev_last = calendar.monthrange(prev_year, prev_month)[1]

    # Q1: 30 del mes anterior (o último día si < 30) → 14 del mes actual
    # Q2: 15 del mes actual → 29 (o último día si < 29)
    q1_start = date(prev_year, prev_month, min(30, prev_last))
    q1_end   = date(year, month, 14)
    q2_start = date(year, month, 15)
    q2_end   = date(year, month, min(29, last_day))

    payments = LoanPayment.query.filter(
        LoanPayment.user_id == user_id,
        LoanPayment.due_date >= q1_start,
        LoanPayment.due_date <= q2_end,
    ).all()

    services = RecurringService.query.filter_by(user_id=user_id, active=True).all()
    services_q1, services_q2 = [], []
    for s in services:
        day = int(s.day_of_month or 1)
        entry = {
            'id': s.id,
            'name': s.name,
            'amount': float(s.amount),
            'day': day,
            'icon': s.icon,
            'iconType': s.icon_type,
        }
        (services_q1 if _in_q1(day) else services_q2).append(entry)

    sources = IncomeSource.query.filter_by(user_id=user_id).all()
    income_q1 = income_q2 = 0.0
    income_sources_q1, income_sources_q2 = [], []

    for s in sources:
        d = s.to_dict()
        net = d['net_amount']
        base = {
            'id': s.id,
            'name': s.name,
            'modality': s.modality,
            'pay_schedule': s.pay_schedule,
        }
        if s.pay_schedule == 'biweekly':
            income_q1 += net / 2.0
            income_q2 += net / 2.0
            half = {
                **base,
                'gross_amount': round(d['gross_amount'] / 2, 2),
                'isss': round(d['isss'] / 2, 2),
                'afp': round(d['afp'] / 2, 2),
                'isr': round(d['isr'] / 2, 2),
                'net_amount': round(net / 2, 2),
                'pay_day': None,
            }
            income_sources_q1.append(half)
            income_sources_q2.append(half)
        else:
            pay_day = s.pay_day or 30
            entry = {
                **base,
                'gross_amount': d['gross_amount'],
                'isss': d['isss'],
                'afp': d['afp'],
                'isr': d['isr'],
                'net_amount': net,
                'pay_day': pay_day,
            }
            if _in_q1(pay_day):
                income_q1 += net
                income_sources_q1.append(entry)
            else:
                income_q2 += net
                income_sources_q2.append(entry)

    all_txs = (
        Transaction.query
        .filter(
            Transaction.user_id == user_id,
            Transaction.date >= q1_start,
            Transaction.date <= q2_end,
        )
        .order_by(Transaction.date)
        .all()
    )
    txs_q1 = [t.to_dict_with_relations() for t in all_txs if q1_start <= t.date <= q1_end]
    txs_q2 = [t.to_dict_with_relations() for t in all_txs if q2_start <= t.date <= q2_end]

    q1 = _build_quincena(
        f'Q1 ({q1_start.strftime("%-d %b")} – {q1_end.strftime("%-d %b")})',
        q1_start, q1_end, payments, income_q1, services_q1, income_sources_q1, txs_q1,
    )
    q2 = _build_quincena(
        f'Q2 ({q2_start.strftime("%-d %b")} – {q2_end.strftime("%-d %b")})',
        q2_start, q2_end, payments, income_q2, services_q2, income_sources_q2, txs_q2,
    )

    return {
        'year': year,
        'month': month,
        'quincenas': [q1, q2],
        'totals': {
            'income': round(income_q1 + income_q2, 2),
            'expenses': round(q1['expenses'] + q2['expenses'], 2),
            'available': round(q1['available'] + q2['available'], 2),
        },
    }
