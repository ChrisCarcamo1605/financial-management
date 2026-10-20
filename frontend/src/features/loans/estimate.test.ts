import { describe, expect, it } from 'vitest';
import { estimateLoan } from './estimate';

describe('estimateLoan', () => {
  it('uses the french annuity formula for monthly loans with interest', () => {
    const result = estimateLoan({ principal: 9000, rate: 9.5, method: 'french', paymentType: 'monthly', installments: 48 });
    expect(result?.installment).toBeCloseTo(226.11, 1);
  });
  it('splits principal evenly at zero interest', () => {
    expect(estimateLoan({ principal: 1200, rate: 0, method: 'french', paymentType: 'monthly', installments: 12 }))
      .toEqual({ total: 1200, installment: 100, count: 12 });
  });
  it('applies simple interest over the term in years', () => {
    expect(estimateLoan({ principal: 1000, rate: 12, method: 'simple', paymentType: 'biweekly', installments: 24 })?.total).toBe(1120);
  });
  it('charges interest once for single payment loans', () => {
    expect(estimateLoan({ principal: 500, rate: 10, method: 'simple', paymentType: 'single', installments: 1 }))
      .toEqual({ total: 550, installment: 550, count: 1 });
  });
  it('returns null without principal', () => {
    expect(estimateLoan({ principal: Number.NaN, rate: 5, method: 'simple', paymentType: 'monthly', installments: 3 })).toBeNull();
  });
});
