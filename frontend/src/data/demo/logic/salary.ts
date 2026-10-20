import type { Deductions, Modality } from '../../types';
import { pyRound } from './numbers';

/** Port de services/salary_calc.py (descuentos de El Salvador). */
const ISSS_RATE = 0.03;
const ISSS_CAP = 30.0;
const AFP_RATE = 0.0725;
const SERVICIOS_ISR_RATE = 0.1;

// (límite inferior, límite superior, cuota fija, tasa, exceso sobre)
const ISR_BRACKETS: [number, number, number, number, number][] = [
  [0.01, 550.0, 0.0, 0.0, 0.0],
  [550.01, 895.24, 17.67, 0.1, 550.0],
  [895.25, 2038.1, 60.0, 0.2, 895.24],
  [2038.11, Infinity, 288.57, 0.3, 2038.1],
];

const calcIsss = (gross: number) => pyRound(Math.min(gross * ISSS_RATE, ISSS_CAP));
const calcAfp = (gross: number) => pyRound(gross * AFP_RATE);

function calcIsr(base: number) {
  for (const [lower, upper, fixed, rate, excessOver] of ISR_BRACKETS) {
    if (lower <= base && base <= upper) return pyRound(fixed + (base - excessOver) * rate);
  }
  return 0;
}

export function calculateDeductions(grossInput: number, modality: Modality = 'planilla'): Deductions {
  const gross = Number(grossInput || 0);
  let isss = 0;
  let afp = 0;
  let isr = 0;
  let base = gross;
  if (modality === 'servicios_profesionales') {
    isr = pyRound(gross * SERVICIOS_ISR_RATE);
  } else if (modality === 'planilla') {
    isss = calcIsss(gross);
    afp = calcAfp(gross);
    base = pyRound(gross - isss - afp);
    isr = calcIsr(base);
  }
  return { isss, afp, isr, base, net: pyRound(gross - isss - afp - isr) };
}
