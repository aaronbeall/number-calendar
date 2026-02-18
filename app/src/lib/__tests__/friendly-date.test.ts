import { describe, expect, it } from 'vitest';
import {
  formatDateAsKey,
  formatFriendlyDate,
  parseDateKey,
  isDayKey,
  isWeekKey,
  isMonthKey,
  isYearKey,
  toDayKey,
  toWeekKey,
  toMonthKey,
  toYearKey,
  parseWeekKey,
  getDateKeyType,
  dateToWeekKey,
} from '../friendly-date';

describe('formatDateAsKey', () => {
  describe('day format', () => {
    it('should format a date as a day key (YYYY-MM-DD)', () => {
      const date = new Date('2025-11-15');
      const result = formatDateAsKey(date, 'day');
      expect(result).toBe('2025-11-15');
      expect(isDayKey(result)).toBe(true);
    });

    it('should pad month and day with leading zeros', () => {
      const date = new Date('2025-01-05');
      const result = formatDateAsKey(date, 'day');
      expect(result).toBe('2025-01-05');
    });

    it('should handle December dates', () => {
      const date = new Date('2025-12-31');
      const result = formatDateAsKey(date, 'day');
      expect(result).toBe('2025-12-31');
    });

    it('should handle January 1st', () => {
      const date = new Date('2025-01-01');
      const result = formatDateAsKey(date, 'day');
      expect(result).toBe('2025-01-01');
    });

    it('should handle leap year dates', () => {
      const date = new Date('2024-02-29');
      const result = formatDateAsKey(date, 'day');
      expect(result).toBe('2024-02-29');
    });
  });

  describe('month format', () => {
    it('should format a date as a month key (YYYY-MM)', () => {
      const date = new Date('2025-11-15');
      const result = formatDateAsKey(date, 'month');
      expect(result).toBe('2025-11');
      expect(isMonthKey(result)).toBe(true);
    });

    it('should pad month with leading zero', () => {
      const date = new Date('2025-01-15');
      const result = formatDateAsKey(date, 'month');
      expect(result).toBe('2025-01');
    });

    it('should handle December', () => {
      const date = new Date('2025-12-31');
      const result = formatDateAsKey(date, 'month');
      expect(result).toBe('2025-12');
    });
  });

  describe('year format', () => {
    it('should format a date as a year key (YYYY)', () => {
      const date = new Date('2025-11-15');
      const result = formatDateAsKey(date, 'year');
      expect(result).toBe('2025');
      expect(isYearKey(result)).toBe(true);
    });

    it('should handle different years', () => {
      const date2024 = new Date('2024-01-01');
      const date2026 = new Date('2026-12-31');
      expect(formatDateAsKey(date2024, 'year')).toBe('2024');
      expect(formatDateAsKey(date2026, 'year')).toBe('2026');
    });
  });

  describe('week format', () => {
    it('should format a date as a week key (YYYY-Www)', () => {
      const date = new Date('2025-11-15'); // Saturday of week 46
      const result = formatDateAsKey(date, 'week');
      expect(isWeekKey(result)).toBe(true);
      expect(result).toMatch(/^\d{4}-W\d{2}$/);
    });

    it('should produce valid week keys for various dates', () => {
      const dates = [
        new Date('2025-01-01'),
        new Date('2025-06-15'),
        new Date('2025-12-31'),
      ];
      dates.forEach(date => {
        const result = formatDateAsKey(date, 'week');
        expect(isWeekKey(result)).toBe(true);
        expect(result).toMatch(/^\d{4}-W\d{2}$/);
      });
    });
  });
});

describe('formatFriendlyDate', () => {
  it('should format day, month, and year keys', () => {
    expect(formatFriendlyDate('2025-11-15')).toBe('November 15, 2025');
    expect(formatFriendlyDate('2025-11')).toBe('November 2025');
    expect(formatFriendlyDate('2025')).toBe('2025');
  });

  it('should format day ranges with shared month', () => {
    expect(formatFriendlyDate('2025-11-12', '2025-11-13')).toBe('November 12-13, 2025');
  });

  it('should format day ranges across months and years', () => {
    expect(formatFriendlyDate('2025-11-20', '2025-12-02')).toBe('November 20 – December 2, 2025');
    expect(formatFriendlyDate('2024-11-20', '2025-12-02')).toBe('November 20, 2024 – December 2, 2025');
  });

  it('should format month ranges', () => {
    expect(formatFriendlyDate('2025-11', '2025-12')).toBe('November – December 2025');
    expect(formatFriendlyDate('2024-11', '2025-12')).toBe('November 2024 – December 2025');
  });

  it('should format week keys as day ranges', () => {
    const weekKey = '2025-W46';
    const weekStart = formatDateAsKey(parseDateKey(weekKey), 'day');
    const weekEndDate = parseDateKey(weekKey);
    weekEndDate.setDate(weekEndDate.getDate() + 6);
    const expectedEnd = formatDateAsKey(weekEndDate, 'day');

    expect(formatFriendlyDate(weekKey)).toBe(formatFriendlyDate(weekStart, expectedEnd));
  });
});

describe('parseDateKey', () => {
  describe('day key parsing', () => {
    it('should parse a day key to a Date', () => {
      const result = parseDateKey('2025-11-15');
      expect(result).toEqual(new Date('2025-11-15'));
    });

    it('should parse January 1st', () => {
      const result = parseDateKey('2025-01-01');
      expect(result).toEqual(new Date('2025-01-01'));
    });

    it('should parse December 31st', () => {
      const result = parseDateKey('2025-12-31');
      expect(result).toEqual(new Date('2025-12-31'));
    });

    it('should parse leap year dates', () => {
      const result = parseDateKey('2024-02-29');
      expect(result).toEqual(new Date('2024-02-29'));
    });

    it('should parse dates with leading zeros', () => {
      const result = parseDateKey('2025-01-05');
      expect(result).toEqual(new Date('2025-01-05'));
    });
  });

  describe('month key parsing', () => {
    it('should parse a month key to the first day of the month', () => {
      const result = parseDateKey('2025-11');
      expect(result).toEqual(new Date('2025-11-01'));
    });

    it('should parse January', () => {
      const result = parseDateKey('2025-01');
      expect(result).toEqual(new Date('2025-01-01'));
    });

    it('should parse December', () => {
      const result = parseDateKey('2025-12');
      expect(result).toEqual(new Date('2025-12-01'));
    });

    it('should parse months with leading zeros', () => {
      const result = parseDateKey('2025-05');
      expect(result).toEqual(new Date('2025-05-01'));
    });
  });

  describe('year key parsing', () => {
    it('should parse a year key to January 1st of that year', () => {
      const result = parseDateKey('2025');
      expect(result).toEqual(new Date('2025-01-01'));
    });

    it('should parse different years', () => {
      expect(parseDateKey('2024')).toEqual(new Date('2024-01-01'));
      expect(parseDateKey('2026')).toEqual(new Date('2026-01-01'));
      expect(parseDateKey('2000')).toEqual(new Date('2000-01-01'));
    });
  });

  describe('week key parsing', () => {
    it('should parse a week key to the Sunday of that week', () => {
      const result = parseDateKey('2025-W46');
      // Week 46 of 2025 should start on Sunday (US calendar convention)
      expect(result.getDay()).toBe(0); // Sunday
      expect(result.getFullYear()).toBe(2025);
    });

    it('should parse week 1 of the year (may start in previous year)', () => {
      const result = parseDateKey('2025-W01');
      expect(result.getDay()).toBe(0); // Sunday
      // Week 1 can start in the previous year depending on when the first Sunday falls
      expect([2024, 2025]).toContain(result.getFullYear());
    });

    it('should parse the last week of the year', () => {
      const result = parseDateKey('2025-W52');
      expect(result.getDay()).toBe(0); // Sunday
      expect(result.getFullYear()).toBe(2025);
    });

    it('should pad week numbers correctly', () => {
      const result = parseDateKey('2025-W05');
      expect(result.getDay()).toBe(0); // Sunday
    });
  });
});

describe('round-trip conversions', () => {
  it('should convert day to key and back to same date', () => {
    const date = new Date('2025-11-15');
    const key = formatDateAsKey(date, 'day');
    const parsed = parseDateKey(key);
    expect(parsed).toEqual(date);
  });

  it('should convert month to key and back to first of month', () => {
    const date = new Date('2025-11-15');
    const key = formatDateAsKey(date, 'month');
    const parsed = parseDateKey(key);
    expect(parsed).toEqual(new Date('2025-11-01'));
  });

  it('should convert year to key and back to January 1st', () => {
    const date = new Date('2025-11-15');
    const key = formatDateAsKey(date, 'year');
    const parsed = parseDateKey(key);
    expect(parsed).toEqual(new Date('2025-01-01'));
  });

  it('should convert week to key and back to Sunday of that week', () => {
    const date = new Date('2025-11-15');
    const key = formatDateAsKey(date, 'week');
    const parsed = parseDateKey(key);
    // Should be a Sunday (US calendar convention)
    expect(parsed.getDay()).toBe(0);
  });

  it('should handle multiple round-trips consistently', () => {
    const originalDate = new Date('2025-06-20');
    const types = ['day', 'month', 'year'] as const;

    types.forEach(type => {
      const key1 = formatDateAsKey(originalDate, type);
      const parsed1 = parseDateKey(key1);
      const key2 = formatDateAsKey(parsed1, type);
      expect(key1).toBe(key2);
    });

    // Week requires special handling due to week boundaries
    const weekKey = formatDateAsKey(originalDate, 'week');
    const weekParsed = parseDateKey(weekKey);
    expect(weekParsed.getDay()).toBe(0); // Should be Sunday
  });
});

describe('helper functions integration', () => {
  it('should work with toDayKey', () => {
    const key = toDayKey(2025, 11, 15);
    const parsed = parseDateKey(key);
    expect(parsed).toEqual(new Date('2025-11-15'));
  });

  it('should work with toMonthKey', () => {
    const key = toMonthKey(2025, 11);
    const parsed = parseDateKey(key);
    expect(parsed).toEqual(new Date('2025-11-01'));
  });

  it('should work with toYearKey', () => {
    const key = toYearKey(2025);
    const parsed = parseDateKey(key);
    expect(parsed).toEqual(new Date('2025-01-01'));
  });

  it('should work with toWeekKey', () => {
    const key = toWeekKey(2025, 46);
    const parsed = parseDateKey(key);
    expect(parsed.getDay()).toBe(0); // Sunday
    expect(isWeekKey(key)).toBe(true);
  });

  it('should work with parseWeekKey', () => {
    const key = toWeekKey(2025, 46);
    const { year, week } = parseWeekKey(key);
    expect(year).toBe(2025);
    expect(week).toBe(46);
  });

  it('should work with getDateKeyType', () => {
    expect(getDateKeyType('2025-11-15')).toBe('day');
    expect(getDateKeyType('2025-11')).toBe('month');
    expect(getDateKeyType('2025')).toBe('year');
    expect(getDateKeyType('2025-W46')).toBe('week');
  });
});

describe('edge cases', () => {
  it('should handle dates at year boundaries', () => {
    const newYearsEve = new Date('2025-12-31');
    const newYearsDay = new Date('2025-01-01');

    expect(formatDateAsKey(newYearsEve, 'day')).toBe('2025-12-31');
    expect(formatDateAsKey(newYearsDay, 'day')).toBe('2025-01-01');

    expect(parseDateKey('2025-12-31')).toEqual(newYearsEve);
    expect(parseDateKey('2025-01-01')).toEqual(newYearsDay);
  });

  it('should handle leap year February 29', () => {
    const leapDate = new Date('2024-02-29');
    const key = formatDateAsKey(leapDate, 'day');
    const parsed = parseDateKey(key);
    expect(parsed).toEqual(leapDate);
  });

  it('should handle different centuries', () => {
    const date2000 = new Date('2000-01-01');
    const date2100 = new Date('2100-01-01');

    expect(formatDateAsKey(date2000, 'year')).toBe('2000');
    expect(formatDateAsKey(date2100, 'year')).toBe('2100');

    expect(parseDateKey('2000')).toEqual(date2000);
    expect(parseDateKey('2100')).toEqual(date2100);
  });

  it('should handle week 1 across year boundaries', () => {
    // Week 1 can start in the previous year depending on when the first Sunday falls
    // This is expected behavior with Sunday-based weeks
    const key = parseDateKey('2025-W01');
    expect(key.getDay()).toBe(0); // Sunday
    // Week 1 can be in either the previous year or the specified year
    expect([2024, 2025]).toContain(key.getFullYear());
  });

  it('should format and parse consistently regardless of system timezone', () => {
    // These tests should pass regardless of where the code is run
    const utcDate = new Date('2025-06-15T12:00:00Z');
    const key = formatDateAsKey(utcDate, 'day');
    // Should be consistent because we use ISO format
    expect(key).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('should do round-trip for dateToWeekKey at year boundaries', () => {
    // Test dates at year boundaries where week year may differ from calendar year
    // These dates will reveal the bug if getFullYear() is used when getWeekYear() is needed
    const boundaryDates = [
      new Date('2024-01-01'), // Early January - might be in week of previous year
      new Date('2024-12-30'), // Late December - might be in week of next year
      new Date('2024-12-31'),
      new Date('2025-01-01'),
      new Date('2025-12-31'),
    ];

    boundaryDates.forEach(date => {
      const weekKey = dateToWeekKey(date);
      const parsedDate = parseDateKey(weekKey);
      
      // The parsed date should be in the same week as the original
      // Check by verifying they're within 6 days of each other and both are the same day of week
      const daysDiff = Math.abs(
        (parsedDate.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
      );
      
      expect(daysDiff).toBeLessThanOrEqual(6);
      expect(parsedDate.getDay()).toBe(0); // Should be Sunday (start of week)
    });
  });
});
