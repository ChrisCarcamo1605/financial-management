/** Comparación profunda tolerante para las pruebas de paridad con la API. */
const IGNORED_KEYS = new Set(['user_id', 'created_at', 'updated_at']);
const TOLERANCE = 1e-6;

export function diff(actual: unknown, expected: unknown, path = '$', out: string[] = []): string[] {
  if (out.length > 40) return out;
  if (typeof expected === 'number' && typeof actual === 'number') {
    if (Math.abs(actual - expected) > TOLERANCE) out.push(`${path}: ${actual} ≠ ${expected}`);
    return out;
  }
  if (Array.isArray(expected)) {
    if (!Array.isArray(actual)) return [...out, `${path}: no es arreglo`];
    if (actual.length !== expected.length) out.push(`${path}: largo ${actual.length} ≠ ${expected.length}`);
    expected.forEach((item, i) => diff(actual[i], item, `${path}[${i}]`, out));
    return out;
  }
  if (expected && typeof expected === 'object') {
    if (!actual || typeof actual !== 'object') return [...out, `${path}: falta objeto`];
    for (const [key, value] of Object.entries(expected)) {
      if (IGNORED_KEYS.has(key)) continue;
      if (!(key in (actual as object))) {
        out.push(`${path}.${key}: falta`);
        continue;
      }
      diff((actual as Record<string, unknown>)[key], value, `${path}.${key}`, out);
    }
    return out;
  }
  if (actual !== expected) out.push(`${path}: ${JSON.stringify(actual)} ≠ ${JSON.stringify(expected)}`);
  return out;
}

/** Ordena arreglos cuyo orden la base de datos no garantiza (empates por fecha). */
export function normalizeQuincenas<T>(overview: T): T {
  const copy = JSON.parse(JSON.stringify(overview));
  const byDateId = (a: { date: string; id: number | string }, b: typeof a) =>
    a.date.localeCompare(b.date) || String(a.id).localeCompare(String(b.id), undefined, { numeric: true });
  for (const q of copy.quincenas) {
    q.transactions.sort(byDateId);
    q.income_sources.sort((a: { id: number }, b: { id: number }) => a.id - b.id);
    for (const c of q.credit_cards) c.charges.sort(byDateId);
    for (const r of q.card_reserves) r.charges.sort(byDateId);
  }
  for (const p of copy.card_plan) p.charges.sort(byDateId);
  return copy;
}
