"""Cálculo de descuentos salariales de El Salvador (ISSS, AFP, ISR).

Constantes basadas en la normativa vigente. Si cambian las tasas o tramos,
ajustar solo este archivo.
"""

# ISSS: 3% del salario, con tope de cotización mensual.
ISSS_RATE = 0.03
ISSS_CAP = 30.00  # máximo descuento mensual (salario tope $1,000)

# AFP: 7.25% aporte del trabajador.
AFP_RATE = 0.0725

# Retención de renta para servicios profesionales (recibo): 10% sobre el monto.
SERVICIOS_ISR_RATE = 0.10

# Tabla de retención mensual del ISR (planilla) — vigente El Salvador.
# (límite_inferior, límite_superior, cuota_fija, tasa, exceso_sobre)
# Tramo 2: ISR = ((base - 550.00) × 0.10) + 17.67
# Tramo 3: ISR = ((base - 895.24) × 0.20) + 60.00
# Tramo 4: ISR = ((base - 2038.10) × 0.30) + 288.57
ISR_BRACKETS = [
    (0.01,    550.00,        0.00, 0.00,  0.00),
    (550.01,  895.24,       17.67, 0.10, 550.00),
    (895.25, 2038.10,       60.00, 0.20, 895.24),
    (2038.11, float('inf'), 288.57, 0.30, 2038.10),
]


def calc_isss(gross):
    """ISSS: 3% del salario con tope mensual."""
    return round(min(gross * ISSS_RATE, ISSS_CAP), 2)


def calc_afp(gross):
    """AFP: 7.25% del salario."""
    return round(gross * AFP_RATE, 2)


def calc_isr(base):
    """ISR mensual progresivo sobre la base (salario - ISSS - AFP)."""
    for lower, upper, fixed, rate, excess_over in ISR_BRACKETS:
        if lower <= base <= upper:
            return round(fixed + (base - excess_over) * rate, 2)
    return 0.00


def calculate_deductions(gross, modality='planilla'):
    """Calcular ISSS, AFP, ISR y salario neto.

    Args:
        gross: salario bruto mensual (float)
        modality: 'planilla', 'servicios_profesionales' o 'pension'

    Returns:
        dict con isss, afp, isr, base, net
    """
    gross = float(gross or 0)

    if modality == 'pension':
        # Pensión: no aplica ISSS, AFP ni ISR.
        isss = 0.00
        afp = 0.00
        isr = 0.00
        base = gross
    elif modality == 'servicios_profesionales':
        # No cotiza ISSS ni AFP; retención de renta del 10%.
        isss = 0.00
        afp = 0.00
        isr = round(gross * SERVICIOS_ISR_RATE, 2)
        base = gross
    else:  # planilla
        isss = calc_isss(gross)
        afp = calc_afp(gross)
        base = round(gross - isss - afp, 2)
        isr = calc_isr(base)

    net = round(gross - isss - afp - isr, 2)
    return {
        'isss': isss,
        'afp': afp,
        'isr': isr,
        'base': base,
        'net': net,
    }
