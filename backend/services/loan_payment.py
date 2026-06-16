"""Aplicación de abonos a un préstamo (pagos de monto variable).

El total abonado a un préstamo es la suma de las transacciones (gastos)
vinculadas a él (Transaction.loan_id). A partir de ese total se reconstruye el
calendario de cuotas: las cuotas más antiguas se saldan primero y, si un abono
supera el monto de una cuota, el excedente salda cuotas siguientes — de modo que
abonar de más salda el préstamo más rápido.

`rebuild_loan_schedule` es una función pura de (parámetros del préstamo,
paid_total): idempotente y trivialmente reversible (basta recomputar con el
nuevo total cuando una transacción cambia o se elimina).
"""
from decimal import Decimal
from datetime import date

from models import db
from models.loan_payment import LoanPayment
from services.loan_schedule import build_schedule

# Tolerancia de centavos al comparar montos (redondeos de la amortización).
_EPS = 0.005


def paid_total_for_loan(loan_id, exclude_transaction_id=None):
    """Sumar el monto de las transacciones vinculadas a un préstamo."""
    from models.transaction import Transaction

    query = Transaction.query.filter_by(loan_id=loan_id)
    if exclude_transaction_id is not None:
        query = query.filter(Transaction.id != exclude_transaction_id)
    return round(sum(float(t.amount) for t in query.all()), 2)


def rebuild_loan_schedule(loan, paid_total):
    """Borrar y recrear las cuotas del préstamo según el total abonado.

    Args:
        loan: instancia Loan (ya en la sesión).
        paid_total: total abonado al préstamo (float).

    Returns:
        Excedente sin aplicar (sobrepago). Normalmente 0.
    """
    schedule = build_schedule(
        principal=float(loan.principal),
        interest_rate=float(loan.interest_rate),
        interest_method=loan.interest_method,
        payment_type=loan.payment_type,
        installments=loan.installments,
        payment_day=loan.payment_day,
        start_date=loan.start_date,
    )

    LoanPayment.query.filter_by(loan_id=loan.id).delete()

    remaining = round(float(paid_total or 0), 2)
    all_paid = True

    for item in schedule:
        amt = item['amount']
        if remaining >= amt - _EPS:          # cuota saldada por completo
            paid_amount = amt
            status = 'paid'
            remaining = round(remaining - amt, 2)
        elif remaining > 0:                  # abono parcial
            paid_amount = remaining
            status = 'pending'
            remaining = 0.0
            all_paid = False
        else:                                # sin abonar
            paid_amount = 0.0
            status = 'pending'
            all_paid = False

        db.session.add(LoanPayment(
            loan_id=loan.id,
            user_id=loan.user_id,
            installment_number=item['installment_number'],
            due_date=item['due_date'],
            amount=Decimal(str(amt)),
            paid_amount=Decimal(str(round(paid_amount, 2))),
            status=status,
            paid_date=date.today() if status == 'paid' else None,
        ))

    loan.status = 'paid' if all_paid else 'active'
    return round(remaining, 2)


def sync_loan_from_transactions(loan, exclude_transaction_id=None):
    """Recalcular el calendario de un préstamo desde sus transacciones vinculadas."""
    total = paid_total_for_loan(loan.id, exclude_transaction_id=exclude_transaction_id)
    return rebuild_loan_schedule(loan, total)
