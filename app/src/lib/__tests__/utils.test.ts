import { describe, expect, it } from "vitest";
import { convertPeriodValueWithRounding, titleCase } from '../utils';

describe('titleCase', () => {
  it('should convert strings to Title Case', () => {
    expect(titleCase('hello world')).toBe('Hello World');
    expect(titleCase('my-name_is here')).toBe('My Name Is Here');
    expect(titleCase('SINGLE')).toBe('Single');
    expect(titleCase('mixed CASE_string')).toBe('Mixed Case String');
    expect(titleCase('  leading and trailing  ')).toBe('Leading And Trailing');
    expect(titleCase('multiple   spaces--and__delims')).toBe('Multiple Spaces And Delims');
  });
});

describe('convertPeriodValueWithRounding', () => {
  it('rounds to fewer decimals when converting to smaller periods', () => {
    expect(convertPeriodValueWithRounding('14.25', 'week', 'day')).toBe('99.8');
    expect(convertPeriodValueWithRounding('15.2', 'week', 'day')).toBe('106');
    expect(convertPeriodValueWithRounding('15', 'week', 'day')).toBe('105');
  });

  it('preserves more decimals when converting to larger periods', () => {
    expect(convertPeriodValueWithRounding('10.5', 'day', 'week')).toBe('1.5');
    expect(convertPeriodValueWithRounding('10', 'day', 'month')).toBe('0.3');
  });

  it('returns null for invalid input', () => {
    expect(convertPeriodValueWithRounding('', 'day', 'week')).toBeNull();
    expect(convertPeriodValueWithRounding('abc', 'week', 'day')).toBeNull();
  });
});