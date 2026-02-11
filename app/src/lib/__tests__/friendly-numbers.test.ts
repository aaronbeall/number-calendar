import { describe, expect, it } from 'vitest';
import { convertPeriodLengthWithRounding, convertPeriodUnitWithRounding, countSignificantDigits, formatRange, formatValue, roundToClean } from '../friendly-numbers';

describe('convertPeriodUnitWithRounding', () => {
  it('adds precision when converting to smaller periods', () => {
    expect(convertPeriodUnitWithRounding('14.25', 'week', 'day')).toBe('2.036');
    expect(convertPeriodUnitWithRounding('15.2', 'week', 'day')).toBe('2.17');
    expect(convertPeriodUnitWithRounding('15', 'week', 'day')).toBe('2.1');
  });

  it('reduces precision when converting to larger periods', () => {
    expect(convertPeriodUnitWithRounding('10.5', 'day', 'week')).toBe('74');
    expect(convertPeriodUnitWithRounding('10', 'day', 'month')).toBe('300');
  });

  it('returns null for invalid input', () => {
    expect(convertPeriodUnitWithRounding('', 'day', 'week')).toBeNull();
    expect(convertPeriodUnitWithRounding('abc', 'week', 'day')).toBeNull();
  });
});

describe('convertPeriodLengthWithRounding', () => {
  it('converts period length values correctly', () => {
    expect(convertPeriodLengthWithRounding('500', 'week', 3, 'day')).toBe('24');
    expect(convertPeriodLengthWithRounding('1200', 'month', 2, 'week')).toBe('140');
  });

  it('returns null for invalid input', () => {
    expect(convertPeriodLengthWithRounding('', 'day', 3, 'week')).toBeNull();
    expect(convertPeriodLengthWithRounding('abc', 'week', 2, 'day')).toBeNull();
    expect(convertPeriodLengthWithRounding('100', 'day', 0, 'week')).toBeNull();
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

describe('formatValue', () => {
  it('returns empty string for invalid input', () => {
    expect(formatValue(undefined)).toBe('');
    expect(formatValue(NaN)).toBe('');
  });

  it('formats plain numbers', () => {
    expect(formatValue(1234)).toBe('1,234');
    expect(formatValue(-45.6)).toBe('-45.6');
  });

  it('formats short values with compact notation', () => {
    expect(formatValue(1500, { short: true })).toBe('1.5K');
  });

  it('formats percent values', () => {
    expect(formatValue(12.5, { percent: true })).toBe('12.5%');
    expect(formatValue(-5, { percent: true })).toBe('-5%');
  });

  it('formats deltas with sign display', () => {
    expect(formatValue(10, { delta: true })).toBe('+10');
    expect(formatValue(-10, { delta: true })).toBe('-10');
    expect(formatValue(0, { delta: true })).toBe('0');
  });
});

describe('formatRange', () => {
  it('returns empty string for missing range', () => {
    expect(formatRange(undefined)).toBe('');
  });

  it('uses en dash for simple ranges', () => {
    expect(formatRange([5, 10])).toBe('5–10');
  });

  it('uses arrow for delta ranges', () => {
    expect(formatRange([1, 3], { delta: true })).toBe('+1→+3');
  });

  it('uses arrow for percent ranges with negatives', () => {
    expect(formatRange([-5, 10], { percent: true })).toBe('-5%→10%');
  });

  it('omits the leading percent on the min value when using en dash', () => {
    expect(formatRange([5, 10], { percent: true })).toBe('5–10%');
  });

  it('uses arrow for negative non-percent ranges', () => {
    expect(formatRange([-5, 10])).toBe('-5→10');
  });
});
