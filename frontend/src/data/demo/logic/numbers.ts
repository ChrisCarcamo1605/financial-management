/**
 * Redondeo idéntico a `round(x, n)` de Python: decide con el valor binario
 * exacto del double y desempata al par. Así los montos del demo coinciden
 * centavo a centavo con los de la API.
 */
export function pyRound(value: number, digits = 2): number {
  if (!Number.isFinite(value)) return value;
  const negative = value < 0 || Object.is(value, -0);
  const { digits: exact, scale } = exactDecimal(Math.abs(value));
  // exact * 10^-scale es el valor exacto; nos quedamos con `digits` decimales.
  if (scale <= digits) return value;
  const cut = scale - digits;
  const kept = exact / 10n ** BigInt(cut);
  const rest = exact % 10n ** BigInt(cut);
  const half = 5n * 10n ** BigInt(cut - 1);
  let rounded = kept;
  if (rest > half || (rest === half && kept % 2n === 1n)) rounded += 1n;
  const result = Number(rounded) / 10 ** digits;
  return negative ? -result : result;
}

/** Expansión decimal exacta de un double positivo: valor = digits / 10^scale. */
function exactDecimal(value: number): { digits: bigint; scale: number } {
  if (value === 0) return { digits: 0n, scale: 0 };
  const view = new DataView(new ArrayBuffer(8));
  view.setFloat64(0, value);
  const bits = view.getBigUint64(0);
  const exponentBits = Number((bits >> 52n) & 0x7ffn);
  let mantissa = bits & 0xfffffffffffffn;
  let exponent: number;
  if (exponentBits === 0) {
    exponent = -1074;
  } else {
    mantissa |= 1n << 52n;
    exponent = exponentBits - 1075;
  }
  if (exponent >= 0) return { digits: mantissa << BigInt(exponent), scale: 0 };
  // mantissa / 2^k = mantissa * 5^k / 10^k
  const k = -exponent;
  return { digits: mantissa * 5n ** BigInt(k), scale: k };
}

/** Suma en orden (como `sum()` de Python) para obtener el mismo resultado flotante. */
export function pySum(values: Iterable<number>): number {
  let total = 0;
  for (const v of values) total += v;
  return total;
}

/** Aritmética de dinero exacta a centavos (equivale a Decimal con 2 decimales). */
export function cents(value: number): number {
  return Math.round(value * 100) / 100;
}
