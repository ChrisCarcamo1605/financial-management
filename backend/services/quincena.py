"""Vista general por quincena (1-15 y 16-fin de mes).

Agrupa los pagos de préstamos por su fecha exacta dentro de la quincena
correspondiente y calcula la disponibilidad (ingreso neto - pagos) de cada una.
"""
import calendar
from datetime import date


def _build_quincena(label, start, end, payments, income, services):
    """Armar el resumen de una quincena (cuotas de préstamo + servicios fijos)."""
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
    }


def get_quincena_overview(user_id, year, month):
    """Resumen de las dos quincenas de un mes para un usuario."""
    from models.loan_payment import LoanPayment
    from models.income_source import IncomeSource
    from models.recurring_service import RecurringService

    last_day = calendar.monthrange(year, month)[1]
    q1_start, q1_end = date(year, month, 1), date(year, month, 15)
    q2_start, q2_end = date(year, month, 16), date(year, month, last_day)

    payments = LoanPayment.query.filter(
        LoanPayment.user_id == user_id,
        LoanPayment.due_date >= q1_start,
        LoanPayment.due_date <= q2_end,
    ).all()

    # Servicios recurrentes activos → gasto fijo en la quincena de su día de cobro.
    services = RecurringService.query.filter_by(user_id=user_id, active=True).all()
    services_q1, services_q2 = [], []
    for s in services:
        day = min(max(int(s.day_of_month or 1), 1), last_day)
        entry = {
            'id': s.id,
            'name': s.name,
            'amount': float(s.amount),
            'day': day,
            'icon': s.icon,
            'iconType': s.icon_type,
        }
        (services_q1 if day <= 15 else services_q2).append(entry)

    # Distribuir el ingreso neto de cada fuente entre las quincenas.
    sources = IncomeSource.query.filter_by(user_id=user_id).all()
    income_q1 = income_q2 = 0.0
    for s in sources:
        net = s.to_dict()['net_amount']
        if s.pay_schedule == 'biweekly':
            income_q1 += net / 2.0
            income_q2 += net / 2.0
        else:  # monthly: cae completo en la quincena del día de cobro
            pay_day = s.pay_day or 30
            if pay_day <= 15:
                income_q1 += net
            else:
                income_q2 += net

    q1 = _build_quincena('Quincena 1 (1-15)', q1_start, q1_end, payments, income_q1, services_q1)
    q2 = _build_quincena('Quincena 2 (16-fin)', q2_start, q2_end, payments, income_q2, services_q2)

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
