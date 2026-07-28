"""Vista general por quincena.

Q1: día 30 del mes anterior → día 14 del mes actual
Q2: día 15 → día 29 del mes actual
"""
import calendar
from datetime import date


def _clamp_day(year, month, day):
    last = calendar.monthrange(year, month)[1]
    return date(year, month, min(max(int(day or 1), 1), last))


def _build_quincena(label, start, end, payments, income, services,
                    income_sources=None, transactions=None, credit_cards=None):
    in_range = [p for p in payments if start <= p.due_date <= end]
    loan_expenses = sum(float(p.amount) for p in in_range)
    # Los servicios cargados a tarjeta no salen de efectivo en esta quincena:
    # su monto viaja al pago de la tarjeta (entrada en credit_cards del tramo
    # donde cae la fecha límite), así que no se suma aquí para no duplicar.
    services_expenses = sum(float(s['amount']) for s in services if not s.get('deferred'))
    credit_cards = credit_cards or []
    credit_cards_expenses = sum(float(c['amount']) for c in credit_cards)
    expenses = round(loan_expenses + services_expenses + credit_cards_expenses, 2)
    return {
        'label': label,
        'start': start.isoformat(),
        'end': end.isoformat(),
        'income': round(income, 2),
        'expenses': expenses,
        'available': round(income - expenses, 2),
        'credit_cards': sorted(credit_cards, key=lambda x: x['payment_due_date']),
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
                'is_advance': p.status == 'paid' and p.due_date > date.today(),
            }
            for p in sorted(in_range, key=lambda x: x.due_date)
        ],
        'services': sorted(services, key=lambda x: x['day']),
        'income_sources': income_sources or [],
        'transactions': transactions or [],
    }


def _prev_month(year, month):
    return (year, month - 1) if month > 1 else (year - 1, 12)


def _next_month(year, month):
    return (year, month + 1) if month < 12 else (year + 1, 1)


def _in_q1(day):
    """día 1-14 o 30-31 pertenece a Q1; día 15-29 a Q2."""
    return day <= 14 or day >= 30


def _quincena_of(d):
    """Quincena (número, año, mes) a la que pertenece una fecha.

    Los días 30-31 abren la Q1 del mes siguiente.
    """
    if d.day >= 30:
        y, m = _next_month(d.year, d.month)
        return 1, y, m
    return (1 if d.day <= 14 else 2), d.year, d.month


def _card_cycle_for_charge(card, charge_date):
    """(corte, fecha límite de pago) del ciclo en el que cae un cargo.

    El corte es el primer día de corte >= charge_date; la fecha límite es el
    primer día de pago posterior a ese corte (mismo mes o el siguiente).
    """
    cutoff_day = int(card.cutoff_day or 1)
    due_day = int(card.payment_due_day or 1)

    cutoff = _clamp_day(charge_date.year, charge_date.month, cutoff_day)
    if cutoff < charge_date:
        ny, nm = _next_month(charge_date.year, charge_date.month)
        cutoff = _clamp_day(ny, nm, cutoff_day)

    due = _clamp_day(cutoff.year, cutoff.month, due_day)
    if due <= cutoff:
        ny, nm = _next_month(cutoff.year, cutoff.month)
        due = _clamp_day(ny, nm, due_day)
    return cutoff, due


def get_quincena_overview(user_id, year, month):
    from models.loan_payment import LoanPayment
    from models.income_source import IncomeSource
    from models.recurring_service import RecurringService
    from models.transaction import Transaction
    from models.account import Account

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

    cards = Account.query.filter_by(user_id=user_id, type='tarjeta_credito').all()
    cards_by_id = {c.id: c for c in cards}

    services = RecurringService.query.filter_by(user_id=user_id, active=True).all()
    services_q1, services_q2 = [], []
    for s in services:
        day = int(s.day_of_month or 1)
        is_q1 = _in_q1(day)
        # Los días 30-31 de Q1 caen en el mes anterior al del tramo.
        charge_year, charge_month = (prev_year, prev_month) if (is_q1 and day >= 30) else (year, month)
        charge_date = _clamp_day(charge_year, charge_month, day)

        card = cards_by_id.get(s.account_id)
        entry = {
            'id': s.id,
            'name': s.name,
            'amount': float(s.amount),
            'day': day,
            'icon': s.icon,
            'iconType': s.icon_type,
            'charge_date': charge_date.isoformat(),
            'account_id': s.account_id,
            'account_name': s.account.name if s.account else None,
        }
        if card is not None:
            # Cargo a tarjeta: no es salida de efectivo en este tramo, se paga
            # con el estado de cuenta cuyo límite cae en el tramo indicado.
            cutoff, due = _card_cycle_for_charge(card, charge_date)
            qnum, qyear, qmonth = _quincena_of(due)
            entry.update({
                'deferred': True,
                'card_id': card.id,
                'card_name': card.name,
                'card_cutoff_date': cutoff.isoformat(),
                'card_payment_due_date': due.isoformat(),
                'card_payment_quincena': qnum,
                'card_payment_month': f'{qyear}-{qmonth:02d}',
            })
        (services_q1 if is_q1 else services_q2).append(entry)

    # Tarjetas de crédito: el monto a pagar es solo lo cargado en el ciclo
    # (entre el corte anterior y el corte actual), asignado a la quincena
    # donde cae la fecha límite de pago.
    services_by_card = {}
    for s in services:
        if s.account_id in cards_by_id:
            services_by_card.setdefault(s.account_id, []).append(s)

    credit_cards_q1, credit_cards_q2 = [], []
    for card in cards:
        due_day = int(card.payment_due_day or 1)
        if _in_q1(due_day) and due_day >= 30:
            due_year, due_month = prev_year, prev_month
        else:
            due_year, due_month = year, month
        payment_due_date = _clamp_day(due_year, due_month, due_day)

        cutoff_day = int(card.cutoff_day or 1)
        cutoff_date = _clamp_day(due_year, due_month, cutoff_day)
        if cutoff_date > payment_due_date:
            co_year, co_month = _prev_month(due_year, due_month)
            cutoff_date = _clamp_day(co_year, co_month, cutoff_day)
        pco_year, pco_month = _prev_month(cutoff_date.year, cutoff_date.month)
        prev_cutoff_date = _clamp_day(pco_year, pco_month, cutoff_day)

        cycle_txs = Transaction.query.filter(
            Transaction.user_id == user_id,
            Transaction.account_id == card.id,
            Transaction.type == 'expense',
            Transaction.date > prev_cutoff_date,
            Transaction.date <= cutoff_date,
        ).all()
        cycle_amount = sum(float(t.amount) for t in cycle_txs)
        charged_service_ids = {t.recurring_service_id for t in cycle_txs if t.recurring_service_id}

        # Servicios de esta tarjeta cuyo cargo cae en el ciclo pero aún no se
        # materializó como transacción: se proyectan sobre el pago del ciclo.
        projected_services = []
        for s in services_by_card.get(card.id, []):
            if s.id in charged_service_ids:
                continue
            day = int(s.day_of_month or 1)
            months = {
                (prev_cutoff_date.year, prev_cutoff_date.month),
                (cutoff_date.year, cutoff_date.month),
            }
            for cy, cm in sorted(months):
                charge_date = _clamp_day(cy, cm, day)
                if prev_cutoff_date < charge_date <= cutoff_date:
                    projected_services.append({
                        'id': s.id,
                        'name': s.name,
                        'amount': float(s.amount),
                        'date': charge_date.isoformat(),
                        'icon': s.icon,
                        'iconType': s.icon_type,
                    })
                    break

        projected_amount = sum(x['amount'] for x in projected_services)
        total_due = cycle_amount + projected_amount
        if total_due <= 0:
            continue

        entry = {
            'id': card.id,
            'name': card.name,
            'amount': round(total_due, 2),
            'charged_amount': round(cycle_amount, 2),
            'projected_amount': round(projected_amount, 2),
            'services': sorted(projected_services, key=lambda x: x['date']),
            'cutoff_date': cutoff_date.isoformat(),
            'payment_due_date': payment_due_date.isoformat(),
            'available': float(card.credit_limit + card.balance) if card.credit_limit is not None else None,
        }
        (credit_cards_q1 if _in_q1(due_day) else credit_cards_q2).append(entry)

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
        q1_start, q1_end, payments, income_q1, services_q1, income_sources_q1, txs_q1, credit_cards_q1,
    )
    q2 = _build_quincena(
        f'Q2 ({q2_start.strftime("%-d %b")} – {q2_end.strftime("%-d %b")})',
        q2_start, q2_end, payments, income_q2, services_q2, income_sources_q2, txs_q2, credit_cards_q2,
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
