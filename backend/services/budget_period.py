"""Cálculo del ciclo (periodo) actual de un presupuesto recurrente.

Un presupuesto no fija manualmente el inicio/fin de cada periodo: se
reinicia solo cada semana, quincena o mes según `period`, anclado en
`start_day` (día del mes 1-31 para 'monthly', día ISO de la semana 1-7
para 'weekly'; 'biweekly' ignora `start_day` y usa la quincena fija de la
app: 1-14 / 15-fin de mes, igual que en services/quincena.py).

`end_date`, si se define, es cuándo el presupuesto deja de renovarse — no
el fin del periodo actual.
"""
import calendar
from datetime import date, timedelta


def _clamp_day(year, month, day):
    last = calendar.monthrange(year, month)[1]
    return date(year, month, min(day, last))


def _add_months(year, month, offset):
    m = month - 1 + offset
    return year + m // 12, m % 12 + 1


def _monthly_cycle(anchor_day, today):
    this_start = _clamp_day(today.year, today.month, anchor_day)
    if today >= this_start:
        ny, nm = _add_months(today.year, today.month, 1)
        return this_start, _clamp_day(ny, nm, anchor_day) - timedelta(days=1)
    py, pm = _add_months(today.year, today.month, -1)
    return _clamp_day(py, pm, anchor_day), this_start - timedelta(days=1)


def _weekly_cycle(anchor_weekday, today):
    """anchor_weekday: 1 (lunes) .. 7 (domingo), formato ISO."""
    delta = (today.isoweekday() - anchor_weekday) % 7
    start = today - timedelta(days=delta)
    return start, start + timedelta(days=6)


def _biweekly_cycle(today):
    year, month, day = today.year, today.month, today.day
    last_day = calendar.monthrange(year, month)[1]
    if 15 <= day <= 29:
        return date(year, month, 15), date(year, month, min(29, last_day))
    if day >= 30:
        ny, nm = _add_months(year, month, 1)
        return date(year, month, min(30, last_day)), date(ny, nm, 14)
    py, pm = _add_months(year, month, -1)
    prev_last = calendar.monthrange(py, pm)[1]
    return date(py, pm, min(30, prev_last)), date(year, month, 14)


def current_period(period, start_date, start_day, end_date, today=None):
    """Devolver (cycle_start, cycle_end, active) para `today`.

    Si `end_date` ya pasó, se devuelve el último ciclo válido (el que
    contiene `end_date`) y `active=False`, en vez de seguir avanzando.
    """
    today = today or date.today()
    ref = min(today, end_date) if end_date else today

    if period == 'weekly':
        anchor = start_day or start_date.isoweekday()
        cycle_start, cycle_end = _weekly_cycle(anchor, ref)
    elif period == 'biweekly':
        cycle_start, cycle_end = _biweekly_cycle(ref)
    else:  # monthly
        anchor = start_day or start_date.day
        cycle_start, cycle_end = _monthly_cycle(anchor, ref)

    if end_date and cycle_end > end_date:
        cycle_end = end_date

    active = not end_date or today <= end_date
    return cycle_start, cycle_end, active
