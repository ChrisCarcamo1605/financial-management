"""Flujo de reservas para pagar una tarjeta de crédito.

Lo cargado a la tarjeta en una quincena se guarda en esa misma quincena. Una
reserva cuenta como guardada solo si el usuario la confirmó, o si la quincena
todavía no termina (está planificada). Si una quincena termina sin confirmar,
su monto pasa a la siguiente quincena, y así hasta llegar a la del pago, donde
lo pendiente sale en efectivo ese día.
"""

SAVED = 'saved'
PENDING = 'pending'
MISSED = 'missed'


def reserve_flow(by_quincena, due_index, current_index, saved_indexes):
    """Calcula las reservas de un estado de cuenta.

    Args:
        by_quincena: {índice de quincena: monto cargado en ella}.
        due_index: índice de la quincena del pago.
        current_index: índice de la quincena de hoy.
        saved_indexes: índices cuya reserva el usuario confirmó.

    Returns:
        (entries, reserved_prior, carried_to_payment)
        entries: {índice: {own, carried_in, need, amount, status}} para cada
            quincena anterior al pago con algo que reservar. `amount` es lo que
            esa quincena aparta (0 si no se guardó y ya terminó).
        reserved_prior: lo guardado o planificado antes del pago.
        carried_to_payment: lo no guardado que llega al día del pago.
    """
    before_due = [i for i in by_quincena if i < due_index]
    if not before_due:
        return {}, 0.0, 0.0

    entries, reserved, carry = {}, 0.0, 0.0
    for index in range(min(before_due), due_index):
        own = round(by_quincena.get(index, 0.0), 2)
        need = round(own + carry, 2)
        if need <= 0:
            continue
        if index in saved_indexes:
            status, amount, next_carry = SAVED, need, 0.0
        elif index < current_index:
            status, amount, next_carry = MISSED, 0.0, need
        else:
            status, amount, next_carry = PENDING, need, 0.0
        entries[index] = {'own': own, 'carried_in': round(carry, 2), 'need': need, 'amount': amount, 'status': status}
        reserved += amount
        carry = next_carry

    return entries, round(reserved, 2), round(carry, 2)
