import type { DayKey } from "@/features/db/localdb";
import { toDayKey } from "./friendly-date";
import { capitalize, entriesOf } from "./utils";

export interface NumberStats {
  count: number; // number of entries
  total: number; // sum of all numbers
  mean: number; // average
  median: number; // middle value
  min: number; // lowest value
  max: number; // highest value
  first: number; // first value
  last: number; // last value
  range: number; // max - min
  change: number; // last - first
  changePercent: number; // (last - first) / first * 100
}

/**
 * Compute basic statistics for an array of numbers
 */
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
  const range = max - min;
  const change = last - first;
  const changePercent = first !== 0 ? (change / Math.abs(first)) * 100 : 0;
  return { count, total, mean, median, min, max, first, last, range, change, changePercent };
}

export interface DayStatsData extends NumberStats {
  dateStr: DayKey;
}

export interface MonthStatsData extends NumberStats {
  year: number;
  monthNumber: number;
}

export type StatsExtremes = {
  [P in keyof NumberStats as `highest${Capitalize<P>}`]: number;
} & {
  [P in keyof NumberStats as `lowest${Capitalize<P>}`]: number;
}

/**
 * Calculate statistics for each day in the month
 */
export function calculateDailyStats(monthData: Record<DayKey, number[]>): DayStatsData[] {
  return entriesOf(monthData)
    .map(([dateStr, nums]): DayStatsData | null => {
      const stats = computeNumberStats(nums);
      if (!stats) return null;
      return { dateStr, ...stats };
    })
    .filter((d): d is DayStatsData => !!d);
}

/**
 * Calculate extreme values across all days in the month
 */
export function calculateDailyExtremes(data: Record<DayKey, number[]>): StatsExtremes | undefined {
  const dayStats = calculateDailyStats(data);
  return calculateExtremes(dayStats);
}

/**
 * Calculate statistics for each month in the year
 */
export function calculateMonthlyStats(yearData: Record<DayKey, number[]>, year: number): MonthStatsData[] {
  const monthStats: MonthStatsData[] = [];
  
  for (let monthNumber = 1; monthNumber <= 12; monthNumber++) {
    const monthNumbers: number[] = [];
    const lastDay = new Date(year, monthNumber, 0).getDate();
    
    for (let day = 1; day <= lastDay; day++) {
      const dateStr = toDayKey(year, monthNumber, day);
      const dayNumbers = yearData[dateStr] || [];
      monthNumbers.push(...dayNumbers);
    }
    
    if (monthNumbers.length === 0) continue;
    
    const stats = computeNumberStats(monthNumbers);
    if (stats) {
      monthStats.push({ year, monthNumber, ...stats });
    }
  }
  
  return monthStats;
}

/**
 * Calculate extreme values across all months in the year
 */
export function calculateMonthlyExtremes(data: Record<DayKey, number[]>, year: number): StatsExtremes | undefined {
  const monthStats = calculateMonthlyStats(data, year);
  return calculateExtremes(monthStats);
}

/**
 * Calculate extreme values across a set of NumberStats
 */
export function calculateExtremes(stats: NumberStats[]): StatsExtremes | undefined {
  if (stats.length <= 1) return undefined;

  return {
    highestTotal: Math.max(...stats.map(s => s.total)),
    lowestTotal: Math.min(...stats.map(s => s.total)),
    highestCount: Math.max(...stats.map(s => s.count)),
    lowestCount: Math.min(...stats.map(s => s.count)),
    highestMean: Math.max(...stats.map(s => s.mean)),
    lowestMean: Math.min(...stats.map(s => s.mean)),
    highestMedian: Math.max(...stats.map(s => s.median)),
    lowestMedian: Math.min(...stats.map(s => s.median)),
    highestMax: Math.max(...stats.map(s => s.max)),
    lowestMax: Math.min(...stats.map(s => s.max)),
    highestMin: Math.max(...stats.map(s => s.min)),
    lowestMin: Math.min(...stats.map(s => s.min)),
    highestFirst: Math.max(...stats.map(s => s.first)),
    lowestFirst: Math.min(...stats.map(s => s.first)),
    highestLast: Math.max(...stats.map(s => s.last)),
    lowestLast: Math.min(...stats.map(s => s.last)),
    highestChange: Math.max(...stats.map(s => s.change)),
    lowestChange: Math.min(...stats.map(s => s.change)),
    highestChangePercent: Math.max(...stats.map(s => s.changePercent)),
    lowestChangePercent: Math.min(...stats.map(s => s.changePercent)),
    highestRange: Math.max(...stats.map(s => s.range)),
    lowestRange: Math.min(...stats.map(s => s.range)),
  }
}


export function getHighForMetric(metric: keyof NumberStats, extremes: StatsExtremes): number | undefined {
  const key = `highest${capitalize(metric)}` as const;
  return extremes[key];
}

export function getLowForMetric(metric: keyof NumberStats, extremes: StatsExtremes): number | undefined {
  const key = `lowest${capitalize(metric)}` as const;
  return extremes[key];
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