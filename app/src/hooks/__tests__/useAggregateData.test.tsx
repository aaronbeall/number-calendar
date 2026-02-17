/* @vitest-environment jsdom */
import { renderHook } from '@testing-library/react';
import { describe, expect, it, beforeEach, vi } from 'vitest';
import type { DayEntry } from '@/features/db/localdb';
import { convertDateKey } from '@/lib/friendly-date';
import { useAllPeriodsAggregateData } from '../useAggregateData';

let datasetId = 'dataset-1';
let allDays: DayEntry[] = [];

vi.mock('@/context/DatasetContext', () => ({
  useDatasetContext: () => ({ dataset: { id: datasetId } }),
}));

vi.mock('@/features/db/useDayEntryData', () => ({
  useAllDays: () => ({ data: allDays }),
}));

const makeEntry = (date: DayEntry['date'], numbers: number[]): DayEntry => ({
  date,
  numbers,
  datasetId,
});

describe('useAllPeriodsAggregateData', () => {
  beforeEach(() => {
    allDays = [];
  });

  it('aggregates day data into months, years, and alltime', () => {
    allDays = [
      makeEntry('2024-11-15', [1, 2]),
      makeEntry('2024-11-16', [3]),
      makeEntry('2025-01-05', [4]),
      makeEntry('2025-02-10', [5, 6]),
    ];

    const { result } = renderHook(() => useAllPeriodsAggregateData());

    const monthKey2024 = convertDateKey('2024-11-15', 'month');
    const monthKey2025 = convertDateKey('2025-02-10', 'month');
    const monthByKey = new Map(result.current.months.map((month) => [month.dateKey, month]));

    expect(result.current.days).toHaveLength(4);
    expect(result.current.months).toHaveLength(3);
    expect(result.current.years).toHaveLength(2);
    expect(result.current.alltime.stats.total).toBe(21);

    expect(monthByKey.get(monthKey2024)?.stats.total).toBe(6);
    expect(monthByKey.get(monthKey2025)?.stats.total).toBe(11);
  });

  it('reuses cached periods when extremes stay the same', () => {
    const dayA = makeEntry('2024-11-18', [1]);
    const dayB = makeEntry('2024-11-25', [2]);
    const dayC = makeEntry('2025-01-05', [3]);
    const dayD = makeEntry('2025-02-10', [4]);

    allDays = [dayA, dayB, dayC, dayD];

    const { result, rerender } = renderHook(() => useAllPeriodsAggregateData());

    const first = result.current;
    const prevDayRefs = first.days;
    const prevWeekByKey = new Map(first.weeks.map((week) => [week.dateKey, week]));
    const prevMonthByKey = new Map(first.months.map((month) => [month.dateKey, month]));
    const prevYearByKey = new Map(first.years.map((year) => [year.dateKey, year]));
    const prevAlltime = first.alltime;

    const updatedDayD = makeEntry('2025-02-10', [4, 5]);
    allDays = [dayA, dayB, dayC, updatedDayD];

    rerender();

    const next = result.current;
    expect(next.days[0]).toBe(prevDayRefs[0]);
    expect(next.days[1]).toBe(prevDayRefs[1]);
    expect(next.days[2]).toBe(prevDayRefs[2]);
    expect(next.days[3]).not.toBe(prevDayRefs[3]);
    expect(next.days[3].stats.total).toBe(9);

    const weekKeyUnchanged = convertDateKey(dayA.date, 'week');
    const weekKeyChanged = convertDateKey(updatedDayD.date, 'week');
    expect(weekKeyUnchanged).not.toBe(weekKeyChanged);

    const nextWeekByKey = new Map(next.weeks.map((week) => [week.dateKey, week]));
    expect(nextWeekByKey.get(weekKeyUnchanged)).toBe(prevWeekByKey.get(weekKeyUnchanged));
    expect(nextWeekByKey.get(weekKeyChanged)).not.toBe(prevWeekByKey.get(weekKeyChanged));

    const monthKeyUnchanged = convertDateKey(dayA.date, 'month');
    const monthKeyChanged = convertDateKey(updatedDayD.date, 'month');
    const nextMonthByKey = new Map(next.months.map((month) => [month.dateKey, month]));
    expect(nextMonthByKey.get(monthKeyUnchanged)).toBe(prevMonthByKey.get(monthKeyUnchanged));
    expect(nextMonthByKey.get(monthKeyChanged)).not.toBe(prevMonthByKey.get(monthKeyChanged));

    const yearKeyUnchanged = convertDateKey(dayA.date, 'year');
    const yearKeyChanged = convertDateKey(updatedDayD.date, 'year');
    const nextYearByKey = new Map(next.years.map((year) => [year.dateKey, year]));
    expect(nextYearByKey.get(yearKeyUnchanged)).toBe(prevYearByKey.get(yearKeyUnchanged));
    expect(nextYearByKey.get(yearKeyChanged)).not.toBe(prevYearByKey.get(yearKeyChanged));

    expect(next.alltime).not.toBe(prevAlltime);
    expect(next.alltime.stats.total).toBe(15);
  });

  it('returns new period objects when extremes change', () => {
    const dayA = makeEntry('2024-11-15', [1]);
    const dayB = makeEntry('2024-11-16', [10]);

    allDays = [dayA, dayB];

    const { result, rerender } = renderHook(() => useAllPeriodsAggregateData());

    const first = result.current;
    const weekKey = convertDateKey(dayA.date, 'week');
    const monthKey = convertDateKey(dayA.date, 'month');
    const prevWeek = first.weeks.find((week) => week.dateKey === weekKey);
    const prevMonth = first.months.find((month) => month.dateKey === monthKey);

    const updatedDayB = makeEntry('2024-11-16', [25]);
    allDays = [dayA, updatedDayB];

    rerender();

    const next = result.current;
    const nextWeek = next.weeks.find((week) => week.dateKey === weekKey);
    const nextMonth = next.months.find((month) => month.dateKey === monthKey);

    expect(nextWeek).not.toBe(prevWeek);
    expect(nextMonth).not.toBe(prevMonth);
    expect(nextWeek?.extremes?.highestMax).toBe(25);
    expect(nextMonth?.extremes?.highestMax).toBe(25);
  });

  it('recomputes middle-month changes and later periods', () => {
    const dayA = makeEntry('2024-01-05', [1]);
    const dayB = makeEntry('2024-02-10', [2]);
    const dayC = makeEntry('2024-03-15', [3]);

    allDays = [dayA, dayB, dayC];

    const { result, rerender } = renderHook(() => useAllPeriodsAggregateData());

    const first = result.current;
    const prevDayRefs = first.days;
    const prevMonthByKey = new Map(first.months.map((month) => [month.dateKey, month]));

    const updatedDayB = makeEntry('2024-02-10', [2, 5]);
    allDays = [dayA, updatedDayB, dayC];

    rerender();

    const next = result.current;
    expect(next.days[0]).toBe(prevDayRefs[0]);
    expect(next.days[1]).not.toBe(prevDayRefs[1]);
    expect(next.days[2]).not.toBe(prevDayRefs[2]);

    const monthKeyJan = convertDateKey(dayA.date, 'month');
    const monthKeyFeb = convertDateKey(updatedDayB.date, 'month');
    const monthKeyMar = convertDateKey(dayC.date, 'month');
    const nextMonthByKey = new Map(next.months.map((month) => [month.dateKey, month]));

    expect(nextMonthByKey.get(monthKeyJan)).toBe(prevMonthByKey.get(monthKeyJan));
    expect(nextMonthByKey.get(monthKeyFeb)).not.toBe(prevMonthByKey.get(monthKeyFeb));
    expect(nextMonthByKey.get(monthKeyMar)).not.toBe(prevMonthByKey.get(monthKeyMar));

    expect(nextMonthByKey.get(monthKeyFeb)?.stats.total).toBe(7);
    expect(nextMonthByKey.get(monthKeyMar)?.cumulatives.total).toBe(11);
  });
});
