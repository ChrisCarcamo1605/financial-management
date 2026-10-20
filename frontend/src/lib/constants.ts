/** Opciones 1-31 para selects de día del mes. */
export const DAYS_OF_MONTH = Array.from({ length: 31 }, (_, i) => ({ value: String(i + 1), label: String(i + 1) }));

/** Colores sugeridos para categorías, metas y servicios. */
export const CATEGORY_COLORS = [
  '#10b981', '#1f8a5b', '#0e7c86', '#06b6d4', '#2563eb', '#6366f1', '#7c5cc4', '#a855f7',
  '#db2777', '#f43f5e', '#c2413a', '#f97316', '#f59e0b', '#b7791f', '#64748b',
];
