import type { SurchargeType } from '@/data/types';
import type { Dictionary } from '@/i18n';

const SURCHARGE_TYPES: SurchargeType[] = ['exceso', 'mora', 'reconexion', 'iva', 'ajuste', 'otro'];

/** Nombre legible de un tipo de recargo (los desconocidos se muestran tal cual). */
export function surchargeLabel(t: Dictionary, type: string) {
  return t.services.surcharges.types[type as SurchargeType] ?? type;
}

export function surchargeOptions(t: Dictionary) {
  return SURCHARGE_TYPES.map((value) => ({ value, label: t.services.surcharges.types[value] }));
}
