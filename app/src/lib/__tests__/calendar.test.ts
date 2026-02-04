import { describe, expect, it } from 'vitest';
import { parseISO } from 'date-fns';
import { getMonthDays, getMonthWeeks, getWeekDays, getYearDays, getYearWeeks } from '../calendar';
import { dateToWeekKey, toWeekKey } from '../friendly-date';

describe('getMonthDays', () => {
  it('should return all days for the month', () => {
    const days = getMonthDays(2024, 2);

    expect(days).toHaveLength(29);
    expect(days[0]).toBe('2024-02-01');
    expect(days[days.length - 1]).toBe('2024-02-29');
  });
});

describe('getYearDays', () => {
  it('should return all days for a non-leap year', () => {
    const days = getYearDays(2025);

    expect(days).toHaveLength(365);
    expect(days[0]).toBe('2025-01-01');
    expect(days[days.length - 1]).toBe('2025-12-31');
  });

  it('should return all days for a leap year', () => {
    const days = getYearDays(2024);

    expect(days).toHaveLength(366);
    expect(days[0]).toBe('2024-01-01');
    expect(days[days.length - 1]).toBe('2024-12-31');
  });
});

describe('getWeekDays', () => {
  it('should return 7 consecutive days that map to the same week key', () => {
    const year = 2024;
    const week = 24;
    const weekKey = toWeekKey(year, week);

    const days = getWeekDays(year, week);

    expect(days).toHaveLength(7);
    for (const dayKey of days) {
      const date = parseISO(dayKey);
      expect(dateToWeekKey(date)).toBe(weekKey);
    }
  });

  it('should start on Sunday for the requested week', () => {
    const days = getWeekDays(2025, 1);
    const firstDate = parseISO(days[0]);

    expect(firstDate.getDay()).toBe(0);
  });
});

describe('getMonthWeeks', () => {
  it('should return unique week keys that cover the month', () => {
    const year = 2024;
    const month = 6;

    const weeks = getMonthWeeks(year, month);
    const days = getMonthDays(year, month);
    const expectedWeeks = Array.from(new Set(days.map(day => dateToWeekKey(parseISO(day))))).sort();

    expect(weeks).toEqual(expectedWeeks);
  });
});

describe('getYearWeeks', () => {
  it('should return unique week keys that cover the year', () => {
    const year = 2024;

    const weeks = getYearWeeks(year);
    const days = getYearDays(year);
    const expectedWeeks = Array.from(new Set(days.map(day => dateToWeekKey(parseISO(day))))).sort();

    expect(weeks).toEqual(expectedWeeks);
  });
});
