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


def _installment_amount(principal, rate_annual, method, n):
    """Monto total del préstamo y de cada cuota mensual."""
    principal = float(principal)
    rate = float(rate_annual) / 100.0

    if method == 'french' and rate > 0:
        r = rate / 12.0  # tasa mensual
        payment = principal * r / (1 - (1 + r) ** (-n))
        total = payment * n
    else:  # interés simple (o tasa cero)
        total = principal * (1 + rate * (n / 12.0))

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
