"""Generación del calendario de pagos (cuotas) de un préstamo.

Soporta dos métodos de interés seleccionables:
- 'simple': interés simple sobre el plazo.
- 'french': cuota fija (amortización francesa, interés compuesto mensual).

La tasa de interés se interpreta como tasa ANUAL en porcentaje. Tasa 0 = sin
interés en ambos métodos.
"""
import calendar
from datetime import date


def _clamp_day(year, month, day):
    """Devolver una fecha válida ajustando el día al último del mes si excede."""
    last_day = calendar.monthrange(year, month)[1]
    return date(year, month, min(day, last_day))


def _due_date_for(base_year, base_month, offset, pay_day):
    """Fecha de la cuota `offset` meses después del mes base, en el día pay_day."""
    m = base_month - 1 + offset
    year = base_year + m // 12
    month = m % 12 + 1
    return _clamp_day(year, month, pay_day)


def _add_months(year, month, offset):
    m = month - 1 + offset
    return year + m // 12, m % 12 + 1


def _biweekly_anchor_date(year, month, half):
    """Fecha de la quincena `half` (0 = día 15, 1 = fin de mes) del mes dado."""
    if half == 0:
        return date(year, month, 15)
    last_day = calendar.monthrange(year, month)[1]
    return date(year, month, min(30, last_day))


def _first_biweekly_anchor(start_date):
    """Primera quincena (year, month, half) que cae en o después de start_date."""
    year, month = start_date.year, start_date.month
    for half in (0, 1):
        if start_date <= _biweekly_anchor_date(year, month, half):
            return year, month, half
    year, month = _add_months(year, month, 1)
    return year, month, 0


def _biweekly_due_date(year, month, half, offset):
    """Fecha de la cuota quincenal `offset` quincenas después de (year, month, half)."""
    total = half + offset
    year, month = _add_months(year, month, total // 2)
    return _biweekly_anchor_date(year, month, total % 2)


def _installment_amount(principal, rate_annual, method, n, periods_per_year=12):
    """Monto total del préstamo y de cada cuota."""
    principal = float(principal)
    rate = float(rate_annual) / 100.0

    if method == 'french' and rate > 0:
        r = rate / periods_per_year  # tasa por periodo
        payment = principal * r / (1 - (1 + r) ** (-n))
        total = payment * n
    else:  # interés simple (o tasa cero)
        total = principal * (1 + rate * (n / periods_per_year))

    return round(total, 2)


def _single_total(principal, rate_annual):
    """Total de un préstamo de pago único (interés aplicado una vez)."""
    return round(float(principal) * (1 + float(rate_annual) / 100.0), 2)


def build_schedule(principal, interest_rate, interest_method, payment_type,
                   installments, payment_day, start_date):
    """Construir la lista de cuotas.

    Returns:
        list de dicts: { installment_number, due_date (date), amount (float) }
    """
    if payment_type == 'single':
        total = _single_total(principal, interest_rate)
        return [{'installment_number': 1, 'due_date': start_date, 'amount': total}]

    n = max(int(installments or 1), 1)

    if payment_type == 'biweekly':
        # 24 quincenas/año. Cuotas el día 15 y el fin de mes.
        total = _installment_amount(principal, interest_rate, interest_method, n, periods_per_year=24)
        per = round(total / n, 2)
        year, month, half = _first_biweekly_anchor(start_date)

        schedule = []
        accumulated = 0.0
        for i in range(n):
            if i == n - 1:
                amount = round(total - accumulated, 2)
            else:
                amount = per
                accumulated = round(accumulated + per, 2)
            schedule.append({
                'installment_number': i + 1,
                'due_date': _biweekly_due_date(year, month, half, i),
                'amount': amount,
            })
        return schedule

    pay_day = payment_day or start_date.day
    total = _installment_amount(principal, interest_rate, interest_method, n)

    # Cuota base redondeada; la última absorbe el residuo de redondeo.
    per = round(total / n, 2)

    # Primera cuota: en pay_day del mes de inicio, o del mes siguiente si ya pasó.
    base_year, base_month = start_date.year, start_date.month
    if _clamp_day(base_year, base_month, pay_day) < start_date:
        first = _due_date_for(base_year, base_month, 1, pay_day)
        base_year, base_month = first.year, first.month

    schedule = []
    accumulated = 0.0
    for i in range(n):
        if i == n - 1:
            amount = round(total - accumulated, 2)
        else:
            amount = per
            accumulated = round(accumulated + per, 2)
        schedule.append({
            'installment_number': i + 1,
            'due_date': _due_date_for(base_year, base_month, i, pay_day),
            'amount': amount,
        })
    return schedule
