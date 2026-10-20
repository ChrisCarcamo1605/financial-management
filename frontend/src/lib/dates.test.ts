import { describe, expect, it } from 'vitest';
import { daysBetween, lastMonthsRange, quincenaOf, savingsQuincenaOf, shiftMonth } from './dates';

describe('quincenaOf', () => {
  it('assigns days 1-14 to Q1 of the same month', () => {
    expect(quincenaOf(new Date(2026, 9, 1))).toEqual({ month: '2026-10', quincena: 1 });
    expect(quincenaOf(new Date(2026, 9, 14))).toEqual({ month: '2026-10', quincena: 1 });
  });
  it('assigns days 15-29 to Q2', () => {
    expect(quincenaOf(new Date(2026, 9, 15))).toEqual({ month: '2026-10', quincena: 2 });
    expect(quincenaOf(new Date(2026, 9, 29))).toEqual({ month: '2026-10', quincena: 2 });
  });
  it('rolls days 30-31 into Q1 of the next month, across years', () => {
    expect(quincenaOf(new Date(2026, 9, 30))).toEqual({ month: '2026-11', quincena: 1 });
    expect(quincenaOf(new Date(2026, 11, 31))).toEqual({ month: '2027-01', quincena: 1 });
  });
});

describe('helpers', () => {
  it('shifts months across year boundaries', () => {
    expect(shiftMonth('2026-12', 1)).toBe('2027-01');
    expect(shiftMonth('2026-01', -1)).toBe('2025-12');
  });
  it('uses 1-15 / 16-end for savings quincenas', () => {
    expect(savingsQuincenaOf(new Date(2026, 9, 15))).toBe(1);
    expect(savingsQuincenaOf(new Date(2026, 9, 16))).toBe(2);
  });
  it('builds a range of whole months', () => {
    expect(lastMonthsRange(3, new Date(2026, 9, 19))).toEqual({ start_date: '2026-08-01', end_date: '2026-10-19' });
  });
  it('counts calendar days', () => {
    expect(daysBetween(new Date(2026, 9, 19, 23), new Date(2026, 9, 30, 1))).toBe(11);
  });
});

import { nextDayOfMonth } from './dates';

describe('nextDayOfMonth', () => {
  it('returns this month when the day has not passed', () => {
    expect(nextDayOfMonth(20, new Date(2026, 9, 19))).toEqual(new Date(2026, 9, 20));
    expect(nextDayOfMonth(19, new Date(2026, 9, 19))).toEqual(new Date(2026, 9, 19));
  });
  it('rolls to next month and clamps short months', () => {
    expect(nextDayOfMonth(5, new Date(2026, 9, 19))).toEqual(new Date(2026, 10, 5));
    expect(nextDayOfMonth(31, new Date(2027, 1, 1))).toEqual(new Date(2027, 1, 28));
  });
});
