import type { DayKey, MonthKey } from "@/features/db/localdb";
import { parseDayKey, toMonthKey } from "./friendly-date";
import { capitalize, entriesOf } from "./utils";

// Stats for an array of numbers
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
  mode: number; // most frequently occurring value
  slope: number; // (last - first) / count
  midrange: number; // (max + min) / 2
  variance: number; // average of squared differences from the mean
  standardDeviation: number; // square root of variance
  interquartileRange: number; // difference between 75th and 25th percentiles
}

// Key type for NumberStats
export type NumberMetric = keyof NumberStats;

/**
 * Source of the metric values, which can be:
 * - 'stats': the actual computed statistics for a period
 * - 'deltas': the change in statistics from a prior period (current stats - prior stats)
 * - 'percents': the percentage change in statistics from a prior period ((current - prior) / |prior| * 100)
 * - 'cumulatives': cumulative values for a period (e.g., running total up to that period)
 * - 'cumulativePercents': percentage change in cumulative values from a prior period
 * 
 * Sources presented in the UI are tailored for the tracking mode:
 * - For 'series' tracking: 'stats', 'cumulatives', and 'cumulativePercents' are most relevant, while 'deltas' and 'percents' are nomimally relevent -- since series totals already represent changes, and a difference from period to period probably doesn't mean as much as cumulative changes
 * - For 'trend' tracking: 'stats', 'deltas', and 'percents' are most relevant, while 'cumulatives' and 'cumulativePercents' are not helpful at all and generally never used
 * 
 * Note that 'cumulativeDeltas' is not included since for series the `stats` are essentially a delta, and for trend cumulatives are not helpful
 */
export type NumberSource = 'stats' | 'deltas' | 'percents' | 'cumulatives' | 'cumulativePercents'; //| 'averages' | 'maximums' | 'minimums';

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

  // Calculate distribution metrics
  // Mode: most frequently occurring value
  const frequencyMap = new Map<number, number>();
  for (const num of numbers) {
    frequencyMap.set(num, (frequencyMap.get(num) ?? 0) + 1);
  }
  let mode = sorted[0];
  let maxFreq = 0;
  for (const [value, freq] of frequencyMap.entries()) {
    if (freq > maxFreq) {
      maxFreq = freq;
      mode = value;
    }
  }

  // Slope: average change per entry (last - first) / count
  const slope = count > 1 ? change / (count - 1) : 0;

  // Midrange: average of min and max
  const midrange = (min + max) / 2;

  // Variance: average of squared differences from the mean
  const squaredDiffs = numbers.map(num => Math.pow(num - mean, 2));
  const variance = squaredDiffs.reduce((a, b) => a + b, 0) / count;

  // Standard deviation: square root of variance
  const standardDeviation = Math.sqrt(variance);

  // Interquartile range: 75th percentile - 25th percentile
  const q1Index = Math.floor(count * 0.25);
  const q3Index = Math.floor(count * 0.75);
  const interquartileRange = sorted[q3Index] - sorted[q1Index];

  return { count, total, mean, median, min, max, first, last, range, change, changePercent, mode, slope, midrange, variance, standardDeviation, interquartileRange };
}

/**
 * Compute statistics for a group of NumberStats based on a specific metric (e.g., 'total', 'last')
 */
export function computeMetricStats(stats: NumberStats[], metric: keyof NumberStats): NumberStats | null {
  if (!stats || stats.length === 0) return null;
  const metricValues = stats.map(s => s[metric]).filter(v => typeof v === 'number') as number[];
  return computeNumberStats(metricValues);
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
 * Calculate statistics for each day (ex. in the month)
 */
export function computeDailyStats(data: Record<DayKey, number[]>): DayStatsData[] {
  return entriesOf(data)
    .map(([dateStr, nums]): DayStatsData | null => {
      const stats = computeNumberStats(nums);
      if (!stats) return null;
      return { dateStr, ...stats };
    })
    .filter((d): d is DayStatsData => !!d);
}

/**
 * Calculate extreme values across all days (ex. in the month)
 */
export function calculateDailyExtremes(data: Record<DayKey, number[]>): StatsExtremes | undefined {
  const dayStats = computeDailyStats(data);
  return calculateExtremes(dayStats);
}

/**
 * Calculate statistics for each month by grouping days from the data
 */
export function computeMonthlyStats(data: Record<DayKey, number[]>): MonthStatsData[] {
  // Group numbers by year-month
  const monthGroups = new Map<MonthKey, { year: number; monthNumber: number; numbers: number[] }>();
  
  for (const [dateStr, dayNumbers] of entriesOf(data)) {
    if (dayNumbers.length === 0) continue;
    
    // Extract year and month from DayKey (YYYY-MM-DD)
    const { year, month: monthNumber } = parseDayKey(dateStr);
    const monthKey = toMonthKey(year, monthNumber);
    
    if (!monthGroups.has(monthKey)) {
      monthGroups.set(monthKey, { year, monthNumber, numbers: [] });
    }
    
    monthGroups.get(monthKey)!.numbers.push(...dayNumbers);
  }
  
  // Compute stats for each month and sort by year-month
  const monthStats: MonthStatsData[] = [];
  
  for (const { year, monthNumber, numbers } of monthGroups.values()) {
    const stats = computeNumberStats(numbers);
    if (stats) {
      monthStats.push({ year, monthNumber, ...stats });
    }
  }
  
  // Sort by year and month
  monthStats.sort((a, b) => {
    if (a.year !== b.year) return a.year - b.year;
    return a.monthNumber - b.monthNumber;
  });
  
  return monthStats;
}

/**
 * Calculate extreme values across all months in the data
 */
export function calculateMonthlyExtremes(data: Record<DayKey, number[]>): StatsExtremes | undefined {
  const monthStats = computeMonthlyStats(data);
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
    highestMode: Math.max(...stats.map(s => s.mode)),
    lowestMode: Math.min(...stats.map(s => s.mode)),
    highestSlope: Math.max(...stats.map(s => s.slope)),
    lowestSlope: Math.min(...stats.map(s => s.slope)),
    highestMidrange: Math.max(...stats.map(s => s.midrange)),
    lowestMidrange: Math.min(...stats.map(s => s.midrange)),
    highestVariance: Math.max(...stats.map(s => s.variance)),
    lowestVariance: Math.min(...stats.map(s => s.variance)),
    highestStandardDeviation: Math.max(...stats.map(s => s.standardDeviation)),
    lowestStandardDeviation: Math.min(...stats.map(s => s.standardDeviation)),
    highestInterquartileRange: Math.max(...stats.map(s => s.interquartileRange)),
    lowestInterquartileRange: Math.min(...stats.map(s => s.interquartileRange)),
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
export function computeStatsDeltas(current: NumberStats, prior: NumberStats | null): NumberStats {
  const baseline = prior ?? computeNumberStats([current.first]) ?? current; // If no prior, seed baseline with first value to get deltas out of the range of the current values instead of all zeros
  const result = {} as Record<keyof NumberStats, number>;
  for (const key of Object.keys(current) as (keyof NumberStats)[]) {
    if (typeof current[key] === 'number' && typeof baseline[key] === 'number') {
      result[key] = (current[key] as number) - (baseline[key] as number);
    }
  }
  return result;
}

// Returns the percent change (delta/prior) for each metric in NumberStats
export function computeStatsPercents(current: NumberStats, prior: NumberStats | null): Partial<NumberStats> {
  const baseline = prior ?? computeNumberStats([current.first]) ?? current; // If no prior, seed baseline with first value to get deltas out of the range of the current values instead of all zeros
  const result: Partial<NumberStats> = {};
  for (const key of Object.keys(current) as (keyof NumberStats)[]) {
    if (typeof current[key] === 'number' && typeof baseline[key] === 'number' && baseline[key] !== 0) {
      result[key] = ((current[key] as number) - (baseline[key] as number)) / Math.abs(baseline[key] as number) * 100;
    } else {
      result[key] = undefined;
    }
  }
  return result;
}

export type PeriodDerivedStats = {
  stats: NumberStats;
  deltas: NumberStats;
  percents: Partial<NumberStats>;
  cumulatives: NumberStats;
  cumulativeDeltas: NumberStats;
  cumulativePercents: Partial<NumberStats>;
};

export function computePeriodDerivedStats(
  numbers: number[],
  priorStats: NumberStats | null,
  priorCumulatives: NumberStats | null,
): PeriodDerivedStats {
  const stats = computeNumberStats(numbers) ?? emptyStats();
  const deltas = computeStatsDeltas(stats, priorStats);
  const percents = computeStatsPercents(stats, priorStats);

  if (!priorCumulatives) {
    return {
      stats,
      deltas,
      percents,
      cumulatives: stats,
      cumulativeDeltas: emptyStats(),
      cumulativePercents: {},
    };
  }

  const cumulativeNumbers = [priorCumulatives.total, ...numbers];
  const cumulatives = computeNumberStats(cumulativeNumbers) ?? stats;
  const cumulativeDeltas = computeStatsDeltas(cumulatives, priorCumulatives);
  const cumulativePercents = computeStatsPercents(cumulatives, priorCumulatives);

  return { stats, deltas, percents, cumulatives, cumulativeDeltas, cumulativePercents };
}

export const METRIC_DISPLAY_INFO: Record<NumberMetric, { label: string; description: string }> = {
  total: { label: 'Total', description: 'Sum of all values in the period' },
  mean: { label: 'Average', description: 'Mean of all values in the period' },
  median: { label: 'Median', description: 'Middle value when sorted' },
  min: { label: 'Minimum', description: 'Lowest value in the period' },
  max: { label: 'Maximum', description: 'Highest value in the period' },
  count: { label: 'Count', description: 'Number of data points recorded' },
  first: { label: 'Open', description: 'First value at the start of the period' },
  last: { label: 'Close', description: 'Last value at the end of the period' },
  range: { label: 'Range', description: 'Difference between max and min values' },
  change: { label: 'Difference', description: 'Difference between first and last values' },
  changePercent: { label: 'Difference (%)', description: 'Percentage change from first to last value' },
  mode: { label: 'Mode', description: 'Most frequently occurring value in the period' },
  slope: { label: 'Slope', description: 'Average change per entry (rate of change)' },
  midrange: { label: 'Midrange', description: 'Average of the minimum and maximum values' },
  variance: { label: 'Variance', description: 'Measure of spread around the mean' },
  standardDeviation: { label: 'Standard Deviation', description: 'Square root of variance (spread around mean)' },
  interquartileRange: { label: 'Interquartile Range', description: 'Range between 25th and 75th percentiles' },
};


export function getMetricDisplayName(metric: NumberMetric): string {
  return METRIC_DISPLAY_INFO[metric].label;
}

export function getMetricDescription(metric: NumberMetric): string {
  return METRIC_DISPLAY_INFO[metric].description;
}

export const METRIC_SOURCES_DISPLAY_INFO: Record<NumberSource, { label: string; description: string }> = {
  stats: { label: 'Value', description: 'Actual recorded value for a time period' },
  deltas: { label: 'Delta', description: 'Difference from prior time period' },
  percents: { label: 'Change (%)', description: 'Percentage difference from prior time period' },
  cumulatives: { label: 'Cumulative', description: 'Cumulative value from beginning to the time period' },
  cumulativePercents: { label: 'Change (%)', description: 'Percentage change from prior time period\'s cumulative' },
};

export function getMetricSourceDisplayName(source: NumberSource): string {
  return METRIC_SOURCES_DISPLAY_INFO[source].label;
}

export function getMetricSourceDescription(source: NumberSource): string {
  return METRIC_SOURCES_DISPLAY_INFO[source].description;
}

export function emptyStats(): NumberStats {
  return {
    count: 0,
    total: 0,
    mean: 0,
    median: 0,
    min: 0,
    max: 0,
    first: 0,
    last: 0,
    range: 0,
    change: 0,
    changePercent: 0,
    mode: 0,
    slope: 0,
    midrange: 0,
    variance: 0,
    standardDeviation: 0,
    interquartileRange: 0,
  };
}