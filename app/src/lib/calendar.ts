import type { DayEntry, DayKey, MonthKey, TimePeriod, Tracking, WeekKey } from "@/features/db/localdb";
import { getWeek, parseISO } from "date-fns";
import { dateToWeekKey, parseDateKey, toDayKey, toMonthKey, toWeekKey } from "./friendly-date";
import type { PeriodAggregateData } from "./period-aggregate";
import type { StatsExtremes } from "./stats";
import { getChangeMetricValueFromData, getPrimaryMetric, getPrimaryMetricFromStats, getPrimaryMetricHighFromExtremes, getPrimaryMetricLabel, getPrimaryMetricLowFromExtremes, getSecondaryMetricFormat, getSecondaryMetricLabel, getSecondaryMetricValueFromData, getValenceValueFromData as getValenceMetricFromData, getValenceSource } from "./tracking";


/**
 * Returns an array of day keys for the given month and year.
 */
export function getMonthDays(year: number, month: number) {
  const days: DayKey[] = [];
  const lastDay = new Date(year, month, 0).getDate();
  for (let d = 1; d <= lastDay; d++) {
    days.push(toDayKey(year, month, d));
  }
  return days;
}

/**
 * Returns an array of day keys for the given year.
 */
export function getYearDays(year: number): DayKey[] {
  const days: DayKey[] = [];
  for (let m = 1; m <= 12; m++) {
    const lastDay = new Date(year, m, 0).getDate();
    for (let d = 1; d <= lastDay; d++) {
      days.push(toDayKey(year, m, d));
    }
  }
  return days;
}

/**
 * Returns an array of day keys for the given week and year.
 * Assumes week starts on Sunday and uses calendar week numbering.
 */
export function getWeekDays(year: number, week: number): DayKey[] {
  const days: DayKey[] = [];
  const weekKey = toWeekKey(year, week);
  const start = parseDateKey(weekKey); // Sunday of the requested week
  for (let i = 0; i < 7; i++) {
    const currentDay = new Date(start.getTime());
    currentDay.setDate(start.getDate() + i);
    days.push(toDayKey(currentDay.getFullYear(), currentDay.getMonth() + 1, currentDay.getDate()));
  }
  return days;
}

/**
 * Returns an array of month keys for the given year.
 */
export function getYearMonths(year: number): MonthKey[] {
  const months: MonthKey[] = [];
  for (let m = 1; m <= 12; m++) {
    months.push(toMonthKey(year, m));
  }
  return months;
}

/**
 * Returns an array of week keys for the given month and year.
 * This is derived from the days in the month, so it accounts for partial weeks at the start and end of the month.
 * Assumes week starts on Sunday and uses calendar week numbering.
 */
export function getMonthWeeks(year: number, month: number): WeekKey[] {
  const weeksSet = new Set<WeekKey>();
  const days = getMonthDays(year, month);
  for (const day of days) {
    const date = parseISO(day);
    const weekKey = dateToWeekKey(date);
    weeksSet.add(weekKey);
  }
  return Array.from(weeksSet).sort() as WeekKey[];
}

/**
 * Returns an array of week keys for the given year.
 * This is derived from the days in the year, so it accounts for partial weeks at the start and end of the year.
 * Assumes week starts on Sunday and uses calendar week numbering.
 */
export function getYearWeeks(year: number): WeekKey[] {
  const weeksSet = new Set<WeekKey>();
  const days = getYearDays(year);
  for (const day of days) {
    const date = parseISO(day);
    const weekKey = dateToWeekKey(date);
    weeksSet.add(weekKey);
  }
  return Array.from(weeksSet).sort() as WeekKey[];
}

/**
 * Aggregates calendar data for a given set of numbers, prior numbers, extremes, and tracking type.
 * This could be used for a day, week, month, year, or any arbitrary period.
 */
export function getCalendarData<T extends TimePeriod>(
  data: PeriodAggregateData<T> | null | undefined,
  extremes: StatsExtremes | undefined,
  tracking: Tracking,
) {
  const stats = data?.stats;
  const deltas = data?.deltas;
  const percents = data?.percents;
  const valenceStats = stats ? { stats, deltas }[getValenceSource(tracking)] : undefined;
  const primaryMetric = stats ? getPrimaryMetricFromStats(stats, tracking) : undefined;
  const primaryMetricLabel = getPrimaryMetricLabel(tracking);
  const primaryMetricDelta = deltas && deltas[getPrimaryMetric(tracking)];
  const primaryMetricPercent = percents && percents[getPrimaryMetric(tracking)];
  const primaryValenceMetric = (stats && getValenceMetricFromData({ stats, deltas }, tracking));
  const secondaryMetric = (stats && getSecondaryMetricValueFromData({ stats, deltas, cumulatives: data?.cumulatives }, tracking));
  const secondaryMetricLabel = getSecondaryMetricLabel(tracking);
  const secondaryMetricFormat = getSecondaryMetricFormat(tracking);
  const changeMetric = (stats && getChangeMetricValueFromData({ stats, deltas, percents, cumulatives: data?.cumulatives, cumulativePercents: data?.cumulativePercents }, tracking));
  const hasData = (data?.numbers?.length ?? 0) > 0;
  return {
    stats,
    valenceStats,
    deltas,
    percents,
    primaryMetric,
    primaryMetricLabel,
    primaryMetricDelta,
    primaryMetricPercent,
    primaryValenceMetric,
    secondaryMetric,
    secondaryMetricLabel,
    secondaryMetricFormat,
    secondaryValenceMetric: secondaryMetric,
    changeMetric,
    changeValenceMetric: changeMetric,
    isHighestPrimary: hasData && extremes && primaryMetric === getPrimaryMetricHighFromExtremes(extremes, tracking),
    isLowestPrimary: hasData && extremes && primaryMetric === getPrimaryMetricLowFromExtremes(extremes, tracking),
    isHighestCount: hasData && extremes && stats?.count === extremes.highestCount,
    isHighestMean: hasData && extremes && stats?.mean === extremes.highestMean,
    isLowestMean: hasData && extremes && stats?.mean === extremes.lowestMean,
    isHighestMedian: hasData && extremes && stats?.median === extremes.highestMedian,
    isLowestMedian: hasData && extremes && stats?.median === extremes.lowestMedian,
    isHighestMin: hasData && extremes && stats?.min === extremes.highestMin,
    isLowestMin: hasData && extremes && stats?.min === extremes.lowestMin,
    isHighestMax: hasData && extremes && stats?.max === extremes.highestMax,
    isLowestMax: hasData && extremes && stats?.max === extremes.lowestMax,
  }
}

// Overload signatures for precise return types
export function getPriorMonthNumbersMap(
  days: DayKey[],
  monthData: Record<DayKey, number[]>,
  priorMonthData: Record<DayKey, number[]> | undefined | null,
  include: { days: true; weeks?: false; month?: false }
): Record<DayKey, number[]>;

export function getPriorMonthNumbersMap(
  days: DayKey[],
  monthData: Record<DayKey, number[]>,
  priorMonthData: Record<DayKey, number[]> | undefined | null,
  include: { days: true; weeks: true; month?: false }
): Record<DayKey | WeekKey, number[]>;

export function getPriorMonthNumbersMap(
  days: DayKey[],
  monthData: Record<DayKey, number[]>,
  priorMonthData: Record<DayKey, number[]> | undefined | null,
  include: { days: true; weeks?: false; month: true }
): Record<DayKey | MonthKey, number[]>;

export function getPriorMonthNumbersMap(
  days: DayKey[],
  monthData: Record<DayKey, number[]>,
  priorMonthData: Record<DayKey, number[]> | undefined | null,
  include: { days: true; weeks: true; month: true }
): Record<DayKey | WeekKey | MonthKey, number[]>;

export function getPriorMonthNumbersMap(
  days: DayKey[],
  monthData: Record<DayKey, number[]>,
  priorMonthData: Record<DayKey, number[]> | undefined | null,
  include: { days?: false; weeks: true; month?: false }
): Record<WeekKey, number[]>;

export function getPriorMonthNumbersMap(
  days: DayKey[],
  monthData: Record<DayKey, number[]>,
  priorMonthData: Record<DayKey, number[]> | undefined | null,
  include: { days?: false; weeks?: false; month: true }
): Record<MonthKey, number[]>;

export function getPriorMonthNumbersMap(
  days: DayKey[],
  monthData: Record<DayKey, number[]>,
  priorMonthData: Record<DayKey, number[]> | undefined | null,
  include: { days?: false; weeks: true; month: true }
): Record<WeekKey | MonthKey, number[]>;

export function getPriorMonthNumbersMap(
  days: DayKey[],
  monthData: Record<DayKey, number[]>,
  priorMonthData: Record<DayKey, number[]> | undefined | null,
): Record<DayKey | WeekKey | MonthKey, number[]>;

// Implementation signature (general case)
export function getPriorMonthNumbersMap(
  days: DayKey[],
  monthData: Record<DayKey, number[]>,
  priorMonthData: Record<DayKey, number[]> | undefined | null,
  include: { days?: boolean; weeks?: boolean; month?: boolean } = { days: true, weeks: true, month: true }
): Record<DayKey | WeekKey | MonthKey, number[]> {

  const result = {} as Record<DayKey | WeekKey | MonthKey, number[]>;

  // For days
  if (include.days) {
    // Seed lastPopulated with last non-empty entry from priorMonthData, if available
    let lastPopulatedDay: number[] = [];
    if (priorMonthData) {
      const priorKeys = Object.keys(priorMonthData).sort() as DayKey[];
      for (let i = priorKeys.length - 1; i >= 0; i--) {
        const nums = priorMonthData[priorKeys[i]];
        if (nums && nums.length > 0) {
          lastPopulatedDay = nums;
          break;
        }
      }
    }
    // For days
    for (let i = 0; i < days.length; i++) {
      const key = days[i];
      result[key] = lastPopulatedDay;
      if (monthData[key] && monthData[key].length > 0) {
        lastPopulatedDay = monthData[key];
      }
    }
  }

  // For weeks
  if (include.weeks) {
    // Map: weekKey -> [all numbers in that week]
    const weekMap = new Map<WeekKey, { days: DayKey[]; numbers: number[] }>();
    for (const dayKey of days) {
      const date = parseISO(dayKey);
      const week = getWeek(date);
      const year = date.getFullYear();
      const weekKey = toWeekKey(year, week);
      if (!weekMap.has(weekKey)) weekMap.set(weekKey, { days: [], numbers: [] });
      weekMap.get(weekKey)!.days.push(dayKey);
      if (monthData[dayKey] && monthData[dayKey].length > 0) {
        weekMap.get(weekKey)!.numbers.push(...monthData[dayKey]);
      }
    }
    // See the lastPopulatedWeek with the last populated week from priorMonthData
    let lastPopulatedWeek: number[] = [];
    if (priorMonthData) {
      const priorWeekMap = new Map<WeekKey, number[]>();
      const priorKeys = Object.keys(priorMonthData).sort() as DayKey[];
      for (const dayKey of priorKeys) {
        const date = parseISO(dayKey);
        const weekKey = dateToWeekKey(date);
        if (!priorWeekMap.has(weekKey)) priorWeekMap.set(weekKey, []);
        const nums = priorMonthData[dayKey];
        if (nums && nums.length > 0) {
          priorWeekMap.get(weekKey)!.push(...nums);
        }
      }
      // Find the last populated week in priorWeekMap
      const priorWeekKeys = Array.from(priorWeekMap.keys()).sort();
      for (let i = priorWeekKeys.length - 1; i >= 0; i--) {
        const wk = priorWeekKeys[i];
        const nums = priorWeekMap.get(wk)!;
        if (nums.length > 0) {
          lastPopulatedWeek = nums;
          break;
        }
      }
    }
    // For each week, find the prior populated week (from priorMonthData if needed)
    const weekKeys = Array.from(weekMap.keys()).sort() as WeekKey[];
    for (const weekKey of weekKeys) {
      result[weekKey] = lastPopulatedWeek;
      const weekNumbers = weekMap.get(weekKey)!.numbers;
      if (weekNumbers.length > 0) {
        lastPopulatedWeek = weekNumbers;
      }
    }
  }

  // For the month
  if (include.month) {
    // Get all numbers in prior month
    const priorMonthNumbers = priorMonthData ? Object.values(priorMonthData).flat() : [];
    // Assume all days are in the same month
    const firstDay = parseISO(days[0]);
    const monthKey = toMonthKey(firstDay.getFullYear(), firstDay.getMonth() + 1);
    result[monthKey] = priorMonthNumbers;
  }

  return result;
}

export function getPriorYearMonthNumbersMap(
  year: number, 
  yearData: Record<DayKey, number[]>, 
  priorYearMonthData?: Record<DayKey, number[]> | null
): Record<DayKey | MonthKey, number[]> {
  const result = {} as Record<DayKey | MonthKey, number[]>;
  let lastPopulated: number[] = [];

  // Seed lastPopulated with last non-empty entry from priorYearMonthData, if available
  if (priorYearMonthData) {
    const priorKeys = Object.keys(priorYearMonthData).sort() as DayKey[];
    for (let i = priorKeys.length - 1; i >= 0; i--) {
      const nums = priorYearMonthData[priorKeys[i]];
      if (nums && nums.length > 0) {
        lastPopulated = nums;
        break;
      }
    }
  }

  // Get all numbers from priorYearMonthData for the first month
  const priorYearNumbers = priorYearMonthData ? Object.values(priorYearMonthData).flat() : [];
  let lastPopulatedMonth: number[] = priorYearNumbers;

  // Iterate through each month in the year
  for (let m = 1; m <= 12; m++) {
    const monthKey = toMonthKey(year, m);
    const monthDays = getMonthDays(year, m);

    // Populate month key with prior month's aggregated numbers
    result[monthKey] = lastPopulatedMonth;

    // Collect all numbers from current month for next month's prior
    const currentMonthNumbers: number[] = [];

    // Populate result for each day in the month
    for (const day of monthDays) {
      result[day] = lastPopulated;
      if (yearData[day] && yearData[day].length > 0) {
        lastPopulated = yearData[day];
        currentMonthNumbers.push(...yearData[day]);
      }
    }

    // Update lastPopulatedMonth for the next iteration
    if (currentMonthNumbers.length > 0) {
      lastPopulatedMonth = currentMonthNumbers;
    }
  }

  return result;
}

// Convert an array of DayEntry to a Record<DayKey, number[]>
export function getDaysMap(days: DayEntry[]): Record<DayKey, number[]> {
  const result: Record<DayKey, number[]> = {};
  for (const dayEntry of days) {
    result[dayEntry.date] = dayEntry.numbers;
  }
  return result;
}