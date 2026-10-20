import type { ReserveStatus } from '../../types';
import { pyRound } from './numbers';

/** Port de services/card_reserves.py (ver allí la explicación de la regla). */
export interface ReserveStep {
  own: number;
  carried_in: number;
  need: number;
  amount: number;
  status: ReserveStatus;
}

export function reserveFlow(
  byQuincena: Map<number, number>, dueIndex: number, currentIndex: number, savedIndexes: Set<number>,
): { entries: Map<number, ReserveStep>; reservedPrior: number; carriedToPayment: number } {
  const beforeDue = [...byQuincena.keys()].filter((i) => i < dueIndex);
  const entries = new Map<number, ReserveStep>();
  if (!beforeDue.length) return { entries, reservedPrior: 0, carriedToPayment: 0 };

  let reserved = 0;
  let carry = 0;
  for (let index = Math.min(...beforeDue); index < dueIndex; index++) {
    const own = pyRound(byQuincena.get(index) ?? 0);
    const need = pyRound(own + carry);
    if (need <= 0) continue;
    let status: ReserveStatus;
    let amount: number;
    let nextCarry: number;
    if (savedIndexes.has(index)) [status, amount, nextCarry] = ['saved', need, 0];
    else if (index < currentIndex) [status, amount, nextCarry] = ['missed', 0, need];
    else [status, amount, nextCarry] = ['pending', need, 0];
    entries.set(index, { own, carried_in: pyRound(carry), need, amount, status });
    reserved += amount;
    carry = nextCarry;
  }
  return { entries, reservedPrior: pyRound(reserved), carriedToPayment: pyRound(carry) };
}
