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

  it('formats absolute values without sign display', () => {
    expect(formatValue(-45.6, { absolute: true })).toBe('45.6');
    expect(formatValue(-10, { delta: true, absolute: true })).toBe('10');
    expect(formatValue(-5, { percent: true, absolute: true })).toBe('5%');
  });

  describe('decimals option', () => {
    it('uses default of 2 decimal places when decimals is not specified', () => {
      expect(formatValue(1.234)).toBe('1.23');
      expect(formatValue(0.12345)).toBe('0.12');
      expect(formatValue(100.5)).toBe('100.5');
    });

    it('respects explicit decimal place specification', () => {
      expect(formatValue(1.234, { decimals: 0 })).toBe('1');
      expect(formatValue(1.234, { decimals: 1 })).toBe('1.2');
      expect(formatValue(1.234, { decimals: 3 })).toBe('1.234');
      expect(formatValue(0.12345, { decimals: 4 })).toBe('0.1235');
    });

    it('handles decimals: 0 correctly', () => {
      expect(formatValue(1.9, { decimals: 0 })).toBe('2');
      expect(formatValue(100.5, { decimals: 0 })).toBe('101');
      expect(formatValue(0.5, { decimals: 0 })).toBe('1');
    });

    it('uses auto decimals when decimals is "auto"', () => {
      // 0.1234 -> roundToClean(0.1234, 3) = 0.123 (3 sig figs) -> 3 decimal places
      expect(formatValue(0.1234, { decimals: 'auto' })).toBe('0.123');
      
      // 0.056789 -> roundToClean(0.056789, 3) = 0.0568 -> 4 decimal places
      expect(formatValue(0.056789, { decimals: 'auto' })).toBe('0.0568');
      
      // 1.2345 -> roundToClean(1.2345, 3) = 1.23 -> 2 decimal places
      expect(formatValue(1.2345, { decimals: 'auto' })).toBe('1.23');
      
      // 123.456 -> roundToClean(123.456, 3) = 123 -> 0 decimal places
      expect(formatValue(123.456, { decimals: 'auto' })).toBe('123');
      
      // 0.5678 -> roundToClean(0.5678, 3) = 0.568 -> 3 decimal places
      expect(formatValue(0.5678, { decimals: 'auto' })).toBe('0.568');
    });

    it('auto decimals works with negative numbers', () => {
      expect(formatValue(-0.1234, { decimals: 'auto' })).toBe('-0.123');
      expect(formatValue(-1.2345, { decimals: 'auto' })).toBe('-1.23');
      expect(formatValue(-123.456, { decimals: 'auto' })).toBe('-123');
    });

    it('auto decimals with percent formatting', () => {
      // When percent is applied, value becomes num/100, then we apply roundToClean(value, 3)
      // 12.34 -> 0.1234 (for percent) -> roundToClean(0.1234, 3) = 0.123 (3 decimals)
      expect(formatValue(12.34, { percent: true, decimals: 'auto' })).toBe('12.34%');
      
      // 5.6789 -> 0.056789 -> roundToClean(0.056789, 3) = 0.0568 (4 decimals) -> 5.68%
      expect(formatValue(5.6789, { percent: true, decimals: 'auto' })).toBe('5.6789%');
      
      // 0.5678 -> 0.0056789 -> rounds to 0.00568 (5 decimals) -> 0.568%
      expect(formatValue(0.5678, { percent: true, decimals: 'auto' })).toBe('0.5678%');
    });

    it('auto decimals with delta formatting', () => {
      expect(formatValue(10.1234, { delta: true, decimals: 'auto' })).toBe('+10.1');
      expect(formatValue(-0.1234, { delta: true, decimals: 'auto' })).toBe('-0.123');
      expect(formatValue(0.1234, { delta: true, decimals: 'auto' })).toBe('+0.123');
    });

    it('auto decimals with percent and delta formatting', () => {
      expect(formatValue(12.34, { percent: true, delta: true, decimals: 'auto' })).toBe('+12.34%');
      expect(formatValue(-5.6789, { percent: true, delta: true, decimals: 'auto' })).toBe('-5.6789%');
    });

    it('short notation ignores decimals option', () => {
      // Short format has its own maximumFractionDigits: 1
      expect(formatValue(1500, { short: true, decimals: 3 })).toBe('1.5K');
      expect(formatValue(1234, { short: true, decimals: 'auto' })).toBe('1.2K');
    });

    it('auto decimals handles zero', () => {
      expect(formatValue(0, { decimals: 'auto' })).toBe('0');
    });

    it('auto decimals handles very large numbers', () => {
      // 1234567 -> roundToClean(1234567, 3) = 1230000 -> 0 decimal places
      // Note: The rounding only affects decimal places displayed, not the number itself
      expect(formatValue(1234567, { decimals: 'auto' })).toBe('1,234,567');
    });

    it('auto decimals handles very small numbers', () => {
      // 0.0001234 -> roundToClean(0.0001234, 3) = 0.000123 -> 6 decimal places
      expect(formatValue(0.0001234, { decimals: 'auto' })).toBe('0.000123');
    });

    it('decimals option works in combination with delta', () => {
      expect(formatValue(10, { delta: true, decimals: 2 })).toBe('+10');
      expect(formatValue(10.567, { delta: true, decimals: 2 })).toBe('+10.57');
      expect(formatValue(-0.1, { delta: true, decimals: 1 })).toBe('-0.1');
    });

    it('decimals option works in combination with percent', () => {
      expect(formatValue(50.556, { percent: true, decimals: 1 })).toBe('50.6%');
      expect(formatValue(0.1234, { percent: true, decimals: 0 })).toBe('0%');
    });

    it('decimals option works in combination with short and percent', () => {
      // Short format takes precedence for max fraction digits, and both use compact notation
      // 1234.567 as percent -> 12.34567 (for formatting) -> with compact notation = 1.23K%
      expect(formatValue(1234.567, { short: true, percent: true })).toBe('1.2K%');
    });
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
