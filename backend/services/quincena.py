"""Vista general por quincena.

Q1: día 30 del mes anterior → día 14 del mes actual
Q2: día 15 → día 29 del mes actual
"""
import calendar
from datetime import date, timedelta


def _clamp_day(year, month, day):
    last = calendar.monthrange(year, month)[1]
    return date(year, month, min(max(int(day or 1), 1), last))


def _build_quincena(label, start, end, payments, income, services,
                    income_sources=None, transactions=None, credit_cards=None,
                    card_reserves=None):
    in_range = [p for p in payments if start <= p.due_date <= end]
    loan_expenses = sum(float(p.amount) for p in in_range)
    # Los servicios cargados a tarjeta no salen de efectivo en esta quincena:
    # su monto viaja al pago de la tarjeta (entrada en credit_cards del tramo
    # donde cae la fecha límite), así que no se suma aquí para no duplicar.
    services_expenses = sum(float(s['amount']) for s in services if not s.get('deferred'))
    credit_cards = credit_cards or []
    card_reserves = card_reserves or []
    # El pago de la tarjeta solo consume efectivo del tramo por la parte que no
    # se guardó antes; lo reservado ya salió como gasto en su propia quincena.
    credit_cards_expenses = sum(float(c['cash_needed']) for c in credit_cards)
    reserves_expenses = sum(float(r['amount']) for r in card_reserves)
    expenses = round(loan_expenses + services_expenses + credit_cards_expenses + reserves_expenses, 2)
    return {
        'label': label,
        'start': start.isoformat(),
        'end': end.isoformat(),
        'income': round(income, 2),
        'expenses': expenses,
        'available': round(income - expenses, 2),
        'credit_cards': sorted(credit_cards, key=lambda x: x['payment_due_date']),
        'card_reserves': sorted(card_reserves, key=lambda x: x['payment_due_date']),
        'card_payment_total': round(sum(float(c['amount']) for c in credit_cards), 2),
        'card_reserved_prior': round(sum(float(c['reserved_prior']) for c in credit_cards), 2),
        'card_reserve_total': round(reserves_expenses, 2),
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


def _qindex(qnum, year, month):
    """Índice absoluto y ordenable de una quincena."""
    return (year * 12 + (month - 1)) * 2 + (qnum - 1)


def _qindex_of(d):
    return _qindex(*_quincena_of(d))


def _qparts(idx):
    """Inverso de _qindex: (número de quincena, año, mes)."""
    qnum = idx % 2 + 1
    months = idx // 2
    return qnum, months // 12, months % 12 + 1


def _card_cycle_bounds(card, due_date):
    """(corte anterior, corte) del ciclo que se paga en due_date."""
    cutoff_day = int(card.cutoff_day or 1)
    cutoff = _clamp_day(due_date.year, due_date.month, cutoff_day)
    if cutoff > due_date:
        cy, cm = _prev_month(due_date.year, due_date.month)
        cutoff = _clamp_day(cy, cm, cutoff_day)
    py, pm = _prev_month(cutoff.year, cutoff.month)
    return _clamp_day(py, pm, cutoff_day), cutoff


def _card_statement(user_id, card, due_date, card_services):
    """Estado de cuenta de la tarjeta que vence en due_date.

    Incluye todos los cargos del ciclo —transacciones reales (sean de un
    servicio recurrente o no) y servicios aún no materializados— con la
    quincena en la que se hizo cada uno, que es donde se debe guardar el
    dinero para pagarlos.

    Devuelve None si el ciclo cerró antes de que existiera la tarjeta o si no
    hay nada que pagar.
    """
    from models.transaction import Transaction

    prev_cutoff, cutoff = _card_cycle_bounds(card, due_date)
    start = card.start_date
    if start and cutoff < start:
        return None

    q = Transaction.query.filter(
        Transaction.user_id == user_id,
        Transaction.account_id == card.id,
        Transaction.type == 'expense',
        Transaction.date > prev_cutoff,
        Transaction.date <= cutoff,
    )
    if start:
        q = q.filter(Transaction.date >= start)
    cycle_txs = q.order_by(Transaction.date).all()
    cycle_amount = sum(float(t.amount) for t in cycle_txs)
    charged_service_ids = {t.recurring_service_id for t in cycle_txs if t.recurring_service_id}

    charges = [
        {
            'kind': 'service' if t.recurring_service_id else 'transaction',
            'id': f't{t.id}',
            'name': t.description or (t.category.name if t.category else None) or 'Gasto',
            'amount': float(t.amount),
            'date': t.date.isoformat(),
            'icon': t.category.icon if t.category else None,
            'iconType': t.category.icon_type if t.category else None,
            'category_name': t.category.name if t.category else None,
            'projected': False,
            'quincena_index': _qindex_of(t.date),
        }
        for t in cycle_txs
    ]

    # Servicios de esta tarjeta cuyo cargo cae en el ciclo pero aún no se
    # materializó como transacción: se proyectan sobre el pago del ciclo.
    projected_services = []
    for s in card_services:
        if s.id in charged_service_ids:
            continue
        day = int(s.day_of_month or 1)
        months = {
            (prev_cutoff.year, prev_cutoff.month),
            (cutoff.year, cutoff.month),
        }
        for cy, cm in sorted(months):
            charge_date = _clamp_day(cy, cm, day)
            if not (prev_cutoff < charge_date <= cutoff):
                continue
            if start and charge_date < start:
                continue
            projected_services.append({
                'id': s.id,
                'name': s.name,
                'amount': float(s.amount),
                'date': charge_date.isoformat(),
                'icon': s.icon,
                'iconType': s.icon_type,
            })
            charges.append({
                'kind': 'service',
                'id': f's{s.id}',
                'name': s.name,
                'amount': float(s.amount),
                'date': charge_date.isoformat(),
                'icon': s.icon,
                'iconType': s.icon_type,
                'category_name': None,
                'projected': True,
                'quincena_index': _qindex_of(charge_date),
            })
            break

    projected_amount = sum(x['amount'] for x in projected_services)
    total_due = cycle_amount + projected_amount
    if total_due <= 0:
        return None

    charges.sort(key=lambda x: x['date'])
    by_quincena = {}
    for c in charges:
        by_quincena[c['quincena_index']] = by_quincena.get(c['quincena_index'], 0.0) + c['amount']

    return {
        'id': card.id,
        'name': card.name,
        'amount': round(total_due, 2),
        'charged_amount': round(cycle_amount, 2),
        'projected_amount': round(projected_amount, 2),
        'services': sorted(projected_services, key=lambda x: x['date']),
        'charges': charges,
        'by_quincena': by_quincena,
        'cycle_start': (prev_cutoff + timedelta(days=1)).isoformat(),
        'cutoff_date': cutoff.isoformat(),
        'payment_due_date': due_date.isoformat(),
        'available': float(card.credit_limit + card.balance) if card.credit_limit is not None else None,
    }


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
        # Antes de tener la tarjeta el servicio se pagaba en efectivo.
        if card is not None and card.start_date and charge_date < card.start_date:
            card = None
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
    # (entre el corte anterior y el corte actual). El dinero se guarda en la
    # quincena en la que se hizo cada cargo —que es cuando se habría gastado
    # de haber pagado en efectivo— y en la quincena del pagón solo sale lo que
    # se cargó dentro de ella misma.
    services_by_card = {}
    for s in services:
        if s.account_id in cards_by_id:
            services_by_card.setdefault(s.account_id, []).append(s)

    idx_q1 = _qindex(1, year, month)
    idx_q2 = idx_q1 + 1
    in_view = (idx_q1, idx_q2)
    n1_year, n1_month = _next_month(year, month)
    n2_year, n2_month = _next_month(n1_year, n1_month)
    # Un cargo hecho en el mes visible puede caer en un corte del mes siguiente
    # y vencer un mes después de ése, de ahí la ventana de cuatro meses.
    candidate_months = [
        (prev_year, prev_month), (year, month), (n1_year, n1_month), (n2_year, n2_month),
    ]

    credit_cards_q1, credit_cards_q2 = [], []
    reserves_q1, reserves_q2 = [], []
    card_plan = []

    for card in cards:
        due_day = int(card.payment_due_day or 1)
        seen_dues = set()
        for dy, dm in candidate_months:
            payment_due_date = _clamp_day(dy, dm, due_day)
            if payment_due_date in seen_dues:
                continue
            seen_dues.add(payment_due_date)

            idx_due = _qindex_of(payment_due_date)
            if idx_due < idx_q1:
                continue

            statement = _card_statement(user_id, card, payment_due_date, services_by_card.get(card.id, []))
            if statement is None:
                continue

            by_q = statement['by_quincena']
            # Lo cargado en quincenas anteriores a la del pago ya se guardó;
            # solo el resto sale de efectivo el día del pagón.
            reserved_prior = round(sum(v for i, v in by_q.items() if i < idx_due), 2)
            cash_needed = round(statement['amount'] - reserved_prior, 2)
            due_qnum, due_qyear, due_qmonth = _qparts(idx_due)
            due_month_label = f'{due_qyear}-{due_qmonth:02d}'

            touches_view = idx_due in in_view or any(i in in_view for i in by_q)
            if not touches_view:
                continue

            if idx_due in in_view:
                entry = {
                    **statement,
                    'reserved_prior': reserved_prior,
                    'cash_needed': cash_needed,
                }
                (credit_cards_q1 if idx_due == idx_q1 else credit_cards_q2).append(entry)

            for i in sorted(by_q):
                if i >= idx_due or i not in in_view:
                    continue
                reserve = {
                    'card_id': card.id,
                    'card_name': card.name,
                    'amount': round(by_q[i], 2),
                    'total': statement['amount'],
                    'charges': [c for c in statement['charges'] if c['quincena_index'] == i],
                    'cutoff_date': statement['cutoff_date'],
                    'payment_due_date': statement['payment_due_date'],
                    'payment_quincena': due_qnum,
                    'payment_month': due_month_label,
                }
                (reserves_q1 if i == idx_q1 else reserves_q2).append(reserve)

            schedule = []
            for i in sorted(set(by_q) | {idx_due}):
                qn, qy, qm = _qparts(i)
                is_payment = i == idx_due
                amount = cash_needed if is_payment else round(by_q[i], 2)
                if not is_payment and amount <= 0:
                    continue
                schedule.append({
                    'quincena': qn,
                    'month': f'{qy}-{qm:02d}',
                    'amount': amount,
                    'role': 'pago' if is_payment else 'reserva',
                    'in_view': i in in_view,
                })
            card_plan.append({
                'card_id': card.id,
                'card_name': card.name,
                'total': statement['amount'],
                'charges': statement['charges'],
                'cycle_start': statement['cycle_start'],
                'cutoff_date': statement['cutoff_date'],
                'payment_due_date': statement['payment_due_date'],
                'payment_quincena': due_qnum,
                'payment_month': due_month_label,
                'reserved_prior': reserved_prior,
                'cash_needed': cash_needed,
                'reserve_in_view': round(sum(
                    s['amount'] for s in schedule if s['role'] == 'reserva' and s['in_view']
                ), 2),
                'schedule': schedule,
            })

    card_plan.sort(key=lambda x: x['payment_due_date'])

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
        credit_cards_q1, reserves_q1,
    )
    q2 = _build_quincena(
        f'Q2 ({q2_start.strftime("%-d %b")} – {q2_end.strftime("%-d %b")})',
        q2_start, q2_end, payments, income_q2, services_q2, income_sources_q2, txs_q2,
        credit_cards_q2, reserves_q2,
    )

    return {
        'year': year,
        'month': month,
        'quincenas': [q1, q2],
        'card_plan': card_plan,
        'totals': {
            'income': round(income_q1 + income_q2, 2),
            'expenses': round(q1['expenses'] + q2['expenses'], 2),
            'available': round(q1['available'] + q2['available'], 2),
            'card_reserve': round(q1['card_reserve_total'] + q2['card_reserve_total'], 2),
            'card_payment': round(q1['card_payment_total'] + q2['card_payment_total'], 2),
        },
    }
