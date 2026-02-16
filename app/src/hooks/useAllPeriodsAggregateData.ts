import { useMemo, useRef } from 'react';
import { useDatasetContext } from '@/context/DatasetContext';
import { useAllDays } from '@/features/db/useDayEntryData';
import type { DateKeyByPeriod, DayEntry, DayKey, MonthKey, TimePeriod, WeekKey, YearKey } from '@/features/db/localdb';
import { convertDateKey } from '@/lib/friendly-date';
import type { StatsExtremes } from '@/lib/stats';
import { calculateExtremes, computePeriodDerivedStats } from '@/lib/stats';
import { keysOf } from '@/lib/utils';
import type { PeriodAggregateData } from '@/lib/period-aggregate';


type AllPeriodsAggregateData = {
  dayKeys: DayKey[];
  weekKeys: WeekKey[];
  monthKeys: MonthKey[];
  yearKeys: YearKey[];
  days: PeriodAggregateData<'day'>[];
  weeks: PeriodAggregateData<'week'>[];
  months: PeriodAggregateData<'month'>[];
  years: PeriodAggregateData<'year'>[];
  alltime: PeriodAggregateData<'anytime'>;
};

type CalendarCache = {
  allDays: DayEntry[];
  dayData: PeriodAggregateData<'day'>[];
  weekData: PeriodAggregateData<'week'>[];
  monthData: PeriodAggregateData<'month'>[];
  yearData: PeriodAggregateData<'year'>[];
};

const sortByDateKey = (a: DayEntry, b: DayEntry) => a.date.localeCompare(b.date);

const findFirstChangedIndex = (prev: DayEntry[], next: DayEntry[]): number => {
  const minLen = Math.min(prev.length, next.length);
  for (let i = 0; i < minLen; i += 1) {
    if (prev[i] !== next[i]) return i;
  }
  return prev.length === next.length ? -1 : minLen;
};

const findFirstKeyIndex = <T extends string>(keys: T[], startKey: T | null): number => {
  if (!startKey) return keys.length;
  const index = keys.findIndex((key) => key >= startKey);
  return index === -1 ? keys.length : index;
};

const flattenNumbers = <T extends TimePeriod>(items: PeriodAggregateData<T>[]): number[] => {
  const numbers: number[] = [];
  for (const item of items) {
    numbers.push(...item.numbers);
  }
  return numbers;
};

const computePeriodData = <T extends TimePeriod>(
  dateKey: DateKeyByPeriod<T>,
  period: T,
  numbers: number[],
  prior: PeriodAggregateData<T> | null,
): PeriodAggregateData<T> => {
  const derived = computePeriodDerivedStats(numbers, prior?.stats ?? null, prior?.cumulatives ?? null);
  return { dateKey, period, numbers, ...derived, extremes: undefined };
};

const computeAlltimeData = (yearData: PeriodAggregateData<'year'>[]): PeriodAggregateData<'anytime'> => {
  const numbers = flattenNumbers(yearData);
  const derived = computePeriodDerivedStats(numbers, null, null);
  return { dateKey: null, period: 'anytime', numbers, ...derived, extremes: undefined };
};

const pushMapItem = <K, V>(map: Map<K, V[]>, key: K, value: V) => {
  if (!map.has(key)) map.set(key, []);
  map.get(key)!.push(value);
}

const areExtremesEqual = (left: StatsExtremes | undefined, right: StatsExtremes | undefined): boolean => {
  if (!left && !right) return true;
  if (!left || !right) return false;
  const leftKeys = keysOf(left);
  const rightKeys = keysOf(right);
  if (leftKeys.length !== rightKeys.length) return false;
  return leftKeys.every((key) => left[key] === right[key]);
};

/**
 * Custom hook to aggregate calendar data into daily, weekly, monthly, yearly, and all-time statistics.
 *
 * This hook retrieves all day entries for the current dataset and computes aggregate statistics for each time period. It uses memoization and caching to optimize performance, only recomputing aggregates for periods that have changed.
 */
export function useAllPeriodsAggregateData(): AllPeriodsAggregateData {
  const { dataset } = useDatasetContext();
  const { data: allDays = [] } = useAllDays(dataset.id);
  const cacheRef = useRef<CalendarCache | null>(null);

  return useMemo(() => {
    const sortedAllDays = [...allDays].sort(sortByDateKey);
    const prevCache = cacheRef.current;
    const prevAllDays = prevCache?.allDays ?? [];
    const changedIndex = findFirstChangedIndex(prevAllDays, sortedAllDays);
    const hasChanges = changedIndex !== -1;

    const dayStartIndex = hasChanges ? changedIndex : sortedAllDays.length;
    const dayData: PeriodAggregateData<'day'>[] = hasChanges
      ? (prevCache?.dayData?.slice(0, dayStartIndex) ?? [])
      : (prevCache?.dayData ?? []);

    if (hasChanges) {
      for (let i = dayStartIndex; i < sortedAllDays.length; i += 1) {
        const entry = sortedAllDays[i];
        const prior = i > 0 ? dayData[i - 1] : null;
        const numbers = entry.numbers ?? [];
        dayData.push(computePeriodData(entry.date, 'day', numbers, prior));
      }
    }

    const dayKeys = sortedAllDays.map((entry) => entry.date);

    const earliestDayKey = hasChanges
      ? (sortedAllDays[changedIndex]?.date ?? prevAllDays[changedIndex]?.date ?? null)
      : null;

    const dayStatsByWeek = new Map<WeekKey, PeriodAggregateData<'day'>[]>();
    const dayStatsByMonth = new Map<MonthKey, PeriodAggregateData<'day'>[]>();

    for (const day of dayData) {
      const dayKey = day.dateKey;
      const weekKey = convertDateKey(dayKey, 'week');
      const monthKey = convertDateKey(dayKey, 'month');

      pushMapItem(dayStatsByWeek, weekKey, day);
      pushMapItem(dayStatsByMonth, monthKey, day);
    }

    const weekKeys = Array.from(dayStatsByWeek.keys()).sort();
    const monthKeys = Array.from(dayStatsByMonth.keys()).sort();

    const weekStartIndex = hasChanges
      ? findFirstKeyIndex(weekKeys, earliestDayKey ? convertDateKey(earliestDayKey, 'week') : null)
      : weekKeys.length;
    const monthStartIndex = hasChanges
      ? findFirstKeyIndex(monthKeys, earliestDayKey ? convertDateKey(earliestDayKey, 'month') : null)
      : monthKeys.length;

    const prevWeekByKey = new Map(prevCache?.weekData?.map((item) => [item.dateKey, item]) ?? []);
    const prevMonthByKey = new Map(prevCache?.monthData?.map((item) => [item.dateKey, item]) ?? []);

    const weekData: PeriodAggregateData<'week'>[] = [];
    const monthData: PeriodAggregateData<'month'>[] = [];

    for (let i = 0; i < weekKeys.length; i += 1) {
      const key = weekKeys[i];
      if (i < weekStartIndex && prevWeekByKey.has(key)) {
        weekData.push(prevWeekByKey.get(key)!);
        continue;
      }
      const prior = weekData.length > 0 ? weekData[weekData.length - 1] : null;
      const numbers = flattenNumbers(dayStatsByWeek.get(key) ?? []);
      weekData.push(computePeriodData(key, 'week', numbers, prior));
    }

    for (let i = 0; i < monthKeys.length; i += 1) {
      const key = monthKeys[i];
      if (i < monthStartIndex && prevMonthByKey.has(key)) {
        monthData.push(prevMonthByKey.get(key)!);
        continue;
      }
      const prior = monthData.length > 0 ? monthData[monthData.length - 1] : null;
      const numbers = flattenNumbers(dayStatsByMonth.get(key) ?? []);
      monthData.push(computePeriodData(key, 'month', numbers, prior));
    }

    const monthStatsByYear = new Map<YearKey, PeriodAggregateData<'month'>[]>(); 
    for (const month of monthData) {
      const monthKey = month.dateKey;
      const yearKey = convertDateKey(monthKey, 'year');
      pushMapItem(monthStatsByYear, yearKey, month);
    }

    const yearKeys = Array.from(monthStatsByYear.keys()).sort();
    const yearStartIndex = hasChanges
      ? findFirstKeyIndex(yearKeys, earliestDayKey ? convertDateKey(earliestDayKey, 'year') : null)
      : yearKeys.length;

    const prevYearByKey = new Map(prevCache?.yearData?.map((item) => [item.dateKey, item]) ?? []);
    const yearData: PeriodAggregateData<'year'>[] = [];

    for (let i = 0; i < yearKeys.length; i += 1) {
      const key = yearKeys[i];
      if (i < yearStartIndex && prevYearByKey.has(key)) {
        yearData.push(prevYearByKey.get(key)!);
        continue;
      }
      const prior = yearData.length > 0 ? yearData[yearData.length - 1] : null;
      const numbers = flattenNumbers(monthStatsByYear.get(key) ?? []);
      yearData.push(computePeriodData(key, 'year', numbers, prior));
    }

    const alltime = computeAlltimeData(yearData);

    const weeksWithExtremes = weekData.map((week) => {
      const extremes = calculateExtremes((dayStatsByWeek.get(week.dateKey) ?? []).map((day) => day.stats));
      const prevWeek = prevWeekByKey.get(week.dateKey);
      if (prevWeek && prevWeek === week && areExtremesEqual(prevWeek.extremes, extremes)) {
        return week;
      }
      return { ...week, extremes };
    });

    const monthsWithExtremes = monthData.map((month) => {
      const extremes = calculateExtremes((dayStatsByMonth.get(month.dateKey) ?? []).map((day) => day.stats));
      const prevMonth = prevMonthByKey.get(month.dateKey);
      if (prevMonth && prevMonth === month && areExtremesEqual(prevMonth.extremes, extremes)) {
        return month;
      }
      return { ...month, extremes };
    });

    const yearsWithExtremes = yearData.map((year) => {
      const extremes = calculateExtremes((monthStatsByYear.get(year.dateKey) ?? []).map((month) => month.stats));
      const prevYear = prevYearByKey.get(year.dateKey);
      if (prevYear && prevYear === year && areExtremesEqual(prevYear.extremes, extremes)) {
        return year;
      }
      return { ...year, extremes };
    });

    const alltimeWithExtremes = {
      ...alltime,
      extremes: calculateExtremes(yearData.map((year) => year.stats)),
    };

    cacheRef.current = {
      allDays: sortedAllDays,
      dayData,
      weekData: weeksWithExtremes,
      monthData: monthsWithExtremes,
      yearData: yearsWithExtremes,
    };

    return {
      dayKeys,
      weekKeys,
      monthKeys,
      yearKeys,
      days: dayData,
      weeks: weeksWithExtremes,
      months: monthsWithExtremes,
      years: yearsWithExtremes,
      alltime: alltimeWithExtremes,
    };
  }, [allDays, dataset.id]);
}
