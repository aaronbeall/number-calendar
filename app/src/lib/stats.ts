import type { DateKey, DayKey, MonthKey, Tracking } from "@/features/db/localdb";
import { capitalize } from "./utils";

export interface NumberStats {
  count: number;
  total: number;
  mean: number; // average
  median: number;
  min: number;
  max: number;
  first: number;
  last: number;
}

export function computeNumberStats(numbers: number[]): NumberStats | null {
  if (!numbers || numbers.length === 0) return null;
  const count = numbers.length;
  const total = numbers.reduce((a, b) => a + b, 0);
  const mean = total / count;
  const sorted = [...numbers].sort((a, b) => a - b);
  const median = count % 2 === 0
    ? (sorted[count / 2 - 1] + sorted[count / 2]) / 2
    : sorted[Math.floor(count / 2)];
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  const first = numbers[0];
  const last = numbers[Math.max(0, numbers.length - 1)];
  return { count, total, mean, median, min, max, first, last };
}

export interface DayStatsData extends NumberStats {
  dateStr: string;
}

export interface MonthStatsData extends NumberStats {
  monthNumber: number;
}

export interface StatsExtremes {
  highestTotal?: number;
  lowestTotal?: number;
  highestCount?: number;
  highestMean?: number;
  lowestMean?: number;
  highestMedian?: number;
  lowestMedian?: number;
  highestMax?: number;
  lowestMax?: number;
  highestMin?: number;
  lowestMin?: number;
  highestFirst?: number;
  lowestFirst?: number;
  highestLast?: number;
  lowestLast?: number;
}

/**
 * Calculate statistics for each day in the month
 */
export function calculateDayStats(monthData: Record<DayKey, number[]>): DayStatsData[] {
  return Object.entries(monthData)
    .map(([dateStr, nums]): DayStatsData | null => {
      const stats = computeNumberStats(nums);
      if (!stats) return null;
      const { total, count, mean, median, min, max, first, last } = stats;
      return { dateStr, total, count, mean, median, min, max, first, last };
    })
    .filter((d): d is DayStatsData => !!d);
}

/**
 * Calculate extreme values across all days in the month
 */
export function calculateMonthExtremes(dayStats: DayStatsData[]): StatsExtremes {
  if (dayStats.length <= 1) return {};

  return {
    highestTotal: Math.max(...dayStats.map(d => d.total)),
    lowestTotal: Math.min(...dayStats.map(d => d.total)),
    highestCount: Math.max(...dayStats.map(d => d.count)),
    highestMean: Math.max(...dayStats.map(d => d.mean)),
    lowestMean: Math.min(...dayStats.map(d => d.mean)),
    highestMedian: Math.max(...dayStats.map(d => d.median)),
    lowestMedian: Math.min(...dayStats.map(d => d.median)),
    highestMax: Math.max(...dayStats.map(d => d.max)),
    lowestMax: Math.min(...dayStats.map(d => d.max)),
    highestMin: Math.max(...dayStats.map(d => d.min)),
    lowestMin: Math.min(...dayStats.map(d => d.min)),
    highestFirst: Math.max(...dayStats.map(d => d.first)),
    lowestFirst: Math.min(...dayStats.map(d => d.first)),
    highestLast: Math.max(...dayStats.map(d => d.last)),
    lowestLast: Math.min(...dayStats.map(d => d.last)),
  };
}

/**
 * Calculate statistics for each month in the year
 */
export function calculateMonthStats(yearData: Record<DayKey, number[]>, year: number): MonthStatsData[] {
  const monthStats: MonthStatsData[] = [];
  
  for (let monthNumber = 1; monthNumber <= 12; monthNumber++) {
    const monthNumbers: number[] = [];
    const lastDay = new Date(year, monthNumber, 0).getDate();
    
    for (let day = 1; day <= lastDay; day++) {
      const dateStr = `${year}-${String(monthNumber).padStart(2, '0')}-${String(day).padStart(2, '0')}` as DayKey;
      const dayNumbers = yearData[dateStr] || [];
      monthNumbers.push(...dayNumbers);
    }
    
    if (monthNumbers.length === 0) continue;
    
    const stats = computeNumberStats(monthNumbers);
    if (stats) {
      const { total, count, mean, median, min, max, first, last } = stats;
      monthStats.push({ monthNumber, total, count, mean, median, min, max, first, last });
    }
  }
  
  return monthStats;
}

/**
 * Calculate extreme values across all months in the year
 */
export function calculateYearExtremes(monthStats: MonthStatsData[]): StatsExtremes {
  if (monthStats.length <= 1) return {};

  return {
    highestTotal: Math.max(...monthStats.map(m => m.total)),
    lowestTotal: Math.min(...monthStats.map(m => m.total)),
    highestCount: Math.max(...monthStats.map(m => m.count)),
    highestMean: Math.max(...monthStats.map(m => m.mean)),
    lowestMean: Math.min(...monthStats.map(m => m.mean)),
    highestMedian: Math.max(...monthStats.map(m => m.median)),
    lowestMedian: Math.min(...monthStats.map(m => m.median)),
    highestMax: Math.max(...monthStats.map(m => m.max)),
    lowestMax: Math.min(...monthStats.map(m => m.max)),
    highestMin: Math.max(...monthStats.map(m => m.min)),
    lowestMin: Math.min(...monthStats.map(m => m.min)),
    highestFirst: Math.max(...monthStats.map(m => m.first)),
    lowestFirst: Math.min(...monthStats.map(m => m.first)),
    highestLast: Math.max(...monthStats.map(m => m.last)),
    lowestLast: Math.min(...monthStats.map(m => m.last)),
  };
}

export function getPrimaryMetric(tracking: Tracking) {
  return tracking === 'series' ? 'total' : 'last';
}

export function getPrimaryMetricLabel(tracking: Tracking): string {
  return tracking === 'series' ? 'Total' : 'Close';
}

export function getPrimaryMetricFromStats(stats: NumberStats, tracking: Tracking): number {
  return stats[getPrimaryMetric(tracking)];
}

export function getPrimaryMetricHighFromExtremes(extremes: StatsExtremes, tracking: Tracking): number | undefined {
  const key = getPrimaryMetric(tracking);
  const extremeKey = `highest${capitalize(key)}` as const;
  return extremes[extremeKey];
}

export function getPrimaryMetricLowFromExtremes(extremes: StatsExtremes, tracking: Tracking): number | undefined {
  const key = getPrimaryMetric(tracking);
  const extremeKey = `lowest${capitalize(key)}` as const;
  return extremes[extremeKey];
}

export function getValenceSource(tracking: Tracking) {
  return tracking === 'series' ? 'stats' : 'deltas';
}

export function getValenceMetricFromData(data: { stats: NumberStats, deltas?: NumberStats }, tracking: Tracking): number {
  const metric = getPrimaryMetric(tracking);
  const key = getValenceSource(tracking);
  const source = data[key];
  return source ? source[metric] : 0;
}

// Given an ordered array of date keys and a data map, returns a map of dateKey -> prior populated numbers (previous non-empty entry)
export function getPriorNumbersMap<T extends DateKey>(orderedKeys: T[], data: Record<T, number[]>): Record<T, number[]> {
  const result = {} as Record<T, number[]>;
  let lastPopulated: number[] = [];
  for (let i = 0; i < orderedKeys.length; i++) {
    const key = orderedKeys[i];
    result[key] = lastPopulated;
    if (data[key] && data[key].length > 0) {
      lastPopulated = data[key];
    }
  }
  return result;
}

// Returns the delta (current - prior) for each metric in NumberStats
export function getStatsDelta(current: NumberStats, prior: NumberStats): Record<keyof NumberStats, number> {
  const result = {} as Record<keyof NumberStats, number>;
  for (const key of Object.keys(current) as (keyof NumberStats)[]) {
    if (typeof current[key] === 'number' && typeof prior[key] === 'number') {
      result[key] = (current[key] as number) - (prior[key] as number);
    }
  }
  return result;
}

// Returns the percent change (delta/prior) for each metric in NumberStats
export function getStatsPercentChange(current: NumberStats, prior: NumberStats): Partial<Record<keyof NumberStats, number>> {
  const result: Partial<Record<keyof NumberStats, number>> = {};
  for (const key of Object.keys(current) as (keyof NumberStats)[]) {
    if (typeof current[key] === 'number' && typeof prior[key] === 'number' && prior[key] !== 0) {
      result[key] = ((current[key] as number) - (prior[key] as number)) / Math.abs(prior[key] as number) * 100;
    } else {
      result[key] = undefined;
    }
  }
  return result;
}