import type { Dictionary } from '@/i18n';
import type { PendingItem } from './quincena-math';

/** Etiqueta de un pendiente en el idioma del usuario. */
export function pendingLabel(item: PendingItem, t: Dictionary) {
  const p = t.quincenas.pending;
  if (item.kind === 'loan') return p.loan(item.name || t.quincenas.loan.fallbackName, item.installment ?? 0);
  if (item.kind === 'card') return p.card(item.name);
  if (item.kind === 'reserve') return p.reserve(item.name);
  if (item.kind === 'saving') return p.saving(item.name);
  return item.name;
}
