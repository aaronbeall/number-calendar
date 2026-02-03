import { describe, expect, it } from 'vitest';
import { convertPeriodUnitWithRounding, countSignificantDigits, roundToClean } from '../friendly-numbers';

describe('convertPeriodValueWithRounding', () => {
  it('rounds to fewer decimals when converting to smaller periods', () => {
    expect(convertPeriodUnitWithRounding('14.25', 'week', 'day')).toBe('99.8');
    expect(convertPeriodUnitWithRounding('15.2', 'week', 'day')).toBe('106');
    expect(convertPeriodUnitWithRounding('15', 'week', 'day')).toBe('105');
  });

  it('preserves more decimals when converting to larger periods', () => {
    expect(convertPeriodUnitWithRounding('10.5', 'day', 'week')).toBe('1.5');
    expect(convertPeriodUnitWithRounding('10', 'day', 'month')).toBe('0.3');
  });

  it('returns null for invalid input', () => {
    expect(convertPeriodUnitWithRounding('', 'day', 'week')).toBeNull();
    expect(convertPeriodUnitWithRounding('abc', 'week', 'day')).toBeNull();
  });
});

describe('countSignificantDigits', () => {
  it('counts significant digits in whole numbers', () => {
    expect(countSignificantDigits(10000)).toBe(1);
    expect(countSignificantDigits(12000)).toBe(2);
    expect(countSignificantDigits(12300)).toBe(3);
    expect(countSignificantDigits(123)).toBe(3);
    expect(countSignificantDigits(5)).toBe(1);
  });

  it('counts significant digits in decimal numbers', () => {
    expect(countSignificantDigits(0.0012300)).toBe(3);
    expect(countSignificantDigits(0.123)).toBe(3);
    expect(countSignificantDigits(0.001)).toBe(1);
    expect(countSignificantDigits(0.00001)).toBe(1);
  });

  it('handles numbers between 0 and 1', () => {
    expect(countSignificantDigits(0.1)).toBe(1);
    expect(countSignificantDigits(0.12)).toBe(2);
    expect(countSignificantDigits(0.123)).toBe(3);
    expect(countSignificantDigits(0.1234)).toBe(4);
  });

  it('returns 0 for zero', () => {
    expect(countSignificantDigits(0)).toBe(0);
  });

  it('handles negative numbers', () => {
    expect(countSignificantDigits(-10000)).toBe(1);
    expect(countSignificantDigits(-12300)).toBe(3);
    expect(countSignificantDigits(-0.0012300)).toBe(3);
  });

  it('handles trailing zeros in decimal numbers', () => {
    expect(countSignificantDigits(0.1200)).toBe(2);
    expect(countSignificantDigits(1.200)).toBe(2);
    expect(countSignificantDigits(123.4500)).toBe(5);
    expect(countSignificantDigits(120.50)).toBe(4);
  });

  it('handles trailing zeros after decimal when passed as string', () => {
    expect(countSignificantDigits('120.50')).toBe(5);
    expect(countSignificantDigits('1.20')).toBe(3);
    expect(countSignificantDigits('100.00')).toBe(5);
  });

  it('handles numbers with no trailing zeros', () => {
    expect(countSignificantDigits(1)).toBe(1);
    expect(countSignificantDigits(12)).toBe(2);
    expect(countSignificantDigits(123)).toBe(3);
  });

  it('handles very large and very small numbers', () => {
    expect(countSignificantDigits(1000000)).toBe(1);
    expect(countSignificantDigits(0.000001)).toBe(1);
  });

  it('accepts string input to preserve trailing zeros', () => {
    expect(countSignificantDigits('50')).toBe(1);
    expect(countSignificantDigits('50.0')).toBe(3);
    expect(countSignificantDigits('0.050')).toBe(2);
  });
});

describe('roundToClean', () => {
  it('returns 0 for zero', () => {
    expect(roundToClean(0)).toBe(0);
  });

  it('rounds with default significantLeadingDigits (2)', () => {
    expect(roundToClean(100)).toBe(100);
    expect(roundToClean(150)).toBe(150);
    expect(roundToClean(1234)).toBe(1200);
    expect(roundToClean(5678)).toBe(5700);
  });

  it('rounds numbers with significant digits in decimal places', () => {
    expect(roundToClean(120.123, 2)).toBe(120);
    expect(roundToClean(120.123, 4)).toBe(120.1);
    expect(roundToClean(5.6789, 2)).toBe(5.7);
    expect(roundToClean(0.12345, 2)).toBe(0.12);
    expect(roundToClean(0.056789, 2)).toBe(0.057);
  });

  it('respects custom significantLeadingDigits', () => {
    expect(roundToClean(1234, 1)).toBe(1000);
    expect(roundToClean(1234, 2)).toBe(1200);
    expect(roundToClean(1234, 3)).toBe(1230);
    expect(roundToClean(1234, 4)).toBe(1234);
  });

  it('handles negative numbers', () => {
    expect(roundToClean(-150)).toBe(-150);
    expect(roundToClean(-1234)).toBe(-1200);
    expect(roundToClean(-120.123, 2)).toBe(-120);
    expect(roundToClean(-5.6789, 2)).toBe(-5.7);
  });

  it('handles very large numbers', () => {
    expect(roundToClean(1234567)).toBe(1200000);
    expect(roundToClean(1234567, 3)).toBe(1230000);
  });

  it('handles very small numbers', () => {
    expect(roundToClean(0.001, 2)).toBe(0.001);
    expect(roundToClean(0.05678, 2)).toBe(0.057);
  });

  it('rounds correctly for numbers less than 1', () => {
    expect(roundToClean(0.5)).toBe(0.5);
    expect(roundToClean(0.123, 1)).toBe(0.1);
  });

  it('handles edge cases with significant figures', () => {
    expect(roundToClean(99.99, 2)).toBe(100);
    expect(roundToClean(0.9999, 2)).toBe(1);
  });
});
