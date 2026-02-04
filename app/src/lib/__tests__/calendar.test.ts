import { describe, expect, it } from 'vitest';
import { parseISO } from 'date-fns';
import { getWeekDays } from '../calendar';
import { dateToWeekKey, toWeekKey } from '../friendly-date';

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
