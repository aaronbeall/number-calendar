import { toDayKey, toMonthKey, toWeekKey, toYearKey } from '@/lib/friendly-date';
import type { NumberStats } from '@/lib/stats';
import { computeNumberStats } from '@/lib/stats';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getISOWeek, getISOWeekYear, parseISO } from 'date-fns';
import {
  findMostRecentPopulatedMonthBefore, loadAllDays, loadDay,
  loadMonth,
  loadYear, saveDay,
  type DayKey, type MonthKey, type WeekKey, type YearKey, type DayEntry
} from './localdb';

// Hook to load a day's numbers for a dataset
export function useDay(datasetId: string, date: DayKey) {
  return useQuery({
    queryKey: ['day', datasetId, date],
    queryFn: () => loadDay(datasetId, date),
  });
}

// Hook to load a month's numbers for a dataset
export function useMonth(datasetId: string, year: number, month: number) {
  return useQuery({
    queryKey: ['month', datasetId, year, month],
    queryFn: () => loadMonth(datasetId, year, month),
  });
}

// Hook to load a year's numbers for a dataset
export function useYear(datasetId: string, year: number) {
  return useQuery({
    queryKey: ['year', datasetId, year],
    queryFn: () => loadYear(datasetId, year),
  });
}

// Hook to load all daily DayEntry[] for a dataset
export function useAllDays(datasetId: string) {
  return useQuery({
    queryKey: ['allDays', datasetId],
    queryFn: () => loadAllDays(datasetId),
  });
}

// Hook to save a day's numbers and update caches using DayEntry type
export function useSaveDay() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: { datasetId: string; date: DayKey; numbers: number[] }) => {
      await saveDay(params.datasetId, params.date, params.numbers);
      return params;
    },
    onSuccess: ({ datasetId, date, numbers }) => {
      // Update 'day' cache
      queryClient.setQueryData(['day', datasetId, date], numbers);

      // Update 'allDays' cache using DayEntry type
      const allDaysKey = ['allDays', datasetId];
      const allDays = queryClient.getQueryData(allDaysKey) as DayEntry[] | undefined;
      if (allDays) {
        const idx = allDays.findIndex(d => d.date === date);
        if (idx !== -1) {
          // Update existing day
          allDays[idx] = { ...allDays[idx], numbers };
        } else {
          // Add new day
          allDays.push({ date, numbers, datasetId });
        }
        queryClient.setQueryData(allDaysKey, [...allDays]);
      }

      // Update 'month' cache
      const [year, month] = date.split('-');
      const monthKey = ['month', datasetId, Number(year), Number(month)];
      const monthData = queryClient.getQueryData(monthKey) as Record<DayKey, number[]> | undefined;
      if (monthData) {
        queryClient.setQueryData(monthKey, { ...monthData, [date]: numbers });
      }

      // Update 'year' cache
      const yearKey = ['year', datasetId, Number(year)];
      const yearData = queryClient.getQueryData(yearKey) as Record<DayKey, number[]> | undefined;
      if (yearData) {
        queryClient.setQueryData(yearKey, { ...yearData, [date]: numbers });
      }

      // Invalidate all 'mostRecentPopulatedMonthBefore' queries for this dataset except the current beforeDate (first day of the current month)
      const currentMonthFirstDay = toDayKey(Number(year), Number(month), 1);
      const queries = queryClient.getQueryCache().findAll({ queryKey: ['mostRecentPopulatedMonthBefore', datasetId] });
      for (const q of queries) {
        const [, , beforeDate] = q.queryKey as [string, string, string];
        if (beforeDate !== currentMonthFirstDay) {
          queryClient.invalidateQueries({ queryKey: ['mostRecentPopulatedMonthBefore', datasetId, beforeDate] });
        }
      }
    },
  });
}

// Hook to find the most recent populated month before a given date
export function useMostRecentPopulatedMonthBefore(datasetId: string, beforeDate: DayKey) {
  return useQuery({
    queryKey: ['mostRecentPopulatedMonthBefore', datasetId, beforeDate],
    queryFn: () => findMostRecentPopulatedMonthBefore(datasetId, beforeDate),
    enabled: !!beforeDate,
  });
}




interface CalendarPeriodData {
  /**
   * Number entries for this period
   */
  numbers: number[];
  /**
   * Statistics for this period (if at least one number exists)
   */
  stats: NumberStats | null;
  /**
   * Statistics for the prior non-empty period (if this is not the first) -- can be used to compute deltas, percent changes, etc.
   */
  priorStats?: NumberStats | null;
}

interface CalendarDayData extends CalendarPeriodData {
  dayKey: DayKey;
  date: Date;
}

interface CalendarMonthData extends CalendarPeriodData {
  monthKey: MonthKey;
  month: number;
  year: number;
  days: Record<DayKey, CalendarDayData>;
  weeks: Record<WeekKey, CalendarWeekData>
}

interface CalendarWeekData extends CalendarPeriodData {
  weekKey: WeekKey;
  week: number;
  year: number;
  days: Record<DayKey, CalendarDayData>;
}

interface CalendarYearData extends CalendarPeriodData {
  yearKey: YearKey;
  year: number;
  months: Record<MonthKey, CalendarMonthData>;
  weeks: Record<WeekKey, CalendarWeekData>;
  days: Record<DayKey, CalendarDayData>;
}

interface CalendarData {
  datasetId: string;
  days: Record<DayKey, CalendarDayData>;
  weeks: Record<WeekKey, CalendarWeekData>;
  months: Record<MonthKey, CalendarMonthData>;
  years: Record<YearKey, CalendarYearData>;
}



export function useCalendarData(datasetId: string): CalendarData | null {
  const { data: allDays } = useAllDays(datasetId);
  if (!allDays) return null;

  // Group by day, and collect ordered day keys
  const days: Record<DayKey, CalendarDayData> = {};
  const allDaysOrdered = allDays.sort((a, b) => a.date.localeCompare(b.date));
  let lastDayStats: NumberStats | null = null;
  for (const entry of allDaysOrdered) {
    const date = parseISO(entry.date);
    const stats = computeNumberStats(entry.numbers);
    days[entry.date] = {
      dayKey: entry.date,
      date,
      numbers: entry.numbers,
      stats,
      priorStats: lastDayStats,
    };
    lastDayStats = stats;
  }

  const entries = Object.entries(days) as [DayKey, CalendarDayData][];

  // Group by week
  const weeks: Record<WeekKey, CalendarWeekData> = {};
  for (const [dayKey, dayData] of entries) {
    const { date } = dayData;
    const week = getISOWeek(date);
    const year = getISOWeekYear(date);
    const weekKey = toWeekKey(year, week);
    if (!weeks[weekKey]) {
      weeks[weekKey] = {
        weekKey,
        week,
        year,
        days: {},
        numbers: [],
        stats: null,
      };
    }
    weeks[weekKey].days[dayKey] = days[dayKey];
  }
  // Fill week numbers, stats, and priorStats
  const orderedWeekKeys = Array.from(new Set(Object.keys(weeks))).sort() as WeekKey[];
  let lastWeekStats: NumberStats | null = null;
  for (const weekKey of orderedWeekKeys) {
    const weekDays = Object.values(weeks[weekKey].days);
    const allNumbers = weekDays.flatMap(d => d.numbers);
    weeks[weekKey].numbers = allNumbers;
    weeks[weekKey].stats = computeNumberStats(allNumbers);
    weeks[weekKey].priorStats = lastWeekStats;
    lastWeekStats = weeks[weekKey].stats;
  }

  // Group by month
  const months: Record<MonthKey, CalendarMonthData> = {};
  for (const [dayKey, dayData] of entries) {
    const { date } = dayData;
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const monthKey = toMonthKey(year, month);
    if (!months[monthKey]) {
      months[monthKey] = {
        monthKey,
        month,
        year,
        days: {},
        weeks: {},
        numbers: [],
        stats: null,
      };
    }
    months[monthKey].days[dayKey] = days[dayKey];
  }
  // Fill month weeks, numbers, stats, and priorStats
  const orderedMonthKeys = Array.from(new Set(Object.keys(months))).sort() as MonthKey[];
  let lastMonthStats: NumberStats | null = null;
  for (const monthKey of orderedMonthKeys) {
    // Assign weeks in this month
    for (const key in months[monthKey].days) {
      const dayKey = key as DayKey;
      const { date } = months[monthKey].days[dayKey];
      const week = getISOWeek(date);
      const year = getISOWeekYear(date);
      const weekKey = toWeekKey(year, week);
      months[monthKey].weeks[weekKey] = weeks[weekKey];
    }
    const allNumbers = Object.values(months[monthKey].days).flatMap(d => d.numbers);
    months[monthKey].numbers = allNumbers;
    months[monthKey].stats = computeNumberStats(allNumbers);
    months[monthKey].priorStats = lastMonthStats;
    lastMonthStats = months[monthKey].stats;
  }

  // Group by year
  const years: Record<YearKey, CalendarYearData> = {};
  for (const [dayKey, dayData] of entries) {
    const { date } = dayData;
    const year = date.getFullYear();
    const yearKey = toYearKey(year);
    if (!years[yearKey]) {
      years[yearKey] = {
        yearKey,
        year,
        months: {},
        weeks: {},
        days: {},
        numbers: [],
        stats: null,
      };
    }
    years[yearKey].days[dayKey] = dayData;
  }
  // Fill year months, weeks, numbers, stats, and priorStats
  const orderedYearKeys = Array.from(new Set(Object.keys(years))).sort() as YearKey[] ;
  let lastYearStats: NumberStats | null = null;
  for (const yearKey of orderedYearKeys) {
    // Assign months in this year
    for (const key in years[yearKey].days) {
      const dayKey = key as DayKey;
      const { date } = years[yearKey].days[dayKey];
      const month = date.getMonth() + 1;
      const monthKey = toMonthKey(years[yearKey].year, month);
      years[yearKey].months[monthKey] = months[monthKey];
      // Assign weeks in this year
      const week = getISOWeek(date);
      const weekYear = getISOWeekYear(date);
      const weekKey = toWeekKey(weekYear, week);
      years[yearKey].weeks[weekKey] = weeks[weekKey];
    }
    const allNumbers = Object.values(years[yearKey].days).flatMap(d => d.numbers);
    years[yearKey].numbers = allNumbers;
    years[yearKey].stats = computeNumberStats(allNumbers);
    years[yearKey].priorStats = lastYearStats;
    lastYearStats = years[yearKey].stats;
  }

  return {
    datasetId,
    days,
    weeks,
    months,
    years,
  };
}