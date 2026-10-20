import { describe, expect, it } from 'vitest';
import { pyRound } from './numbers';

describe('pyRound (Python round)', () => {
  it('uses the exact binary value', () => {
    expect(pyRound(2.675)).toBe(2.67); // 2.67499999…
    expect(pyRound(1.005)).toBe(1); // 1.00499999…
    expect(pyRound(1.015)).toBe(1.01); // 1.01499999…
  });
  it('breaks exact ties to even', () => {
    expect(pyRound(0.125)).toBe(0.12);
    expect(pyRound(0.375)).toBe(0.38);
    expect(pyRound(2.5, 0)).toBe(2);
    expect(pyRound(3.5, 0)).toBe(4);
  });
  it('handles negatives and plain values', () => {
    expect(pyRound(-0.125)).toBe(-0.12);
    expect(pyRound(585.4799999999)).toBe(585.48);
    expect(pyRound(10)).toBe(10);
  });
});
