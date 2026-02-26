import type { TimePeriod } from '@/features/db/localdb';
import type { PeriodAggregateData } from '@/lib/period-aggregate';
import type { NumberStats, NumberMetric } from '@/lib/stats';
import { computeNumberStats, computeMetricStats, calculateExtremes, computeStatsDeltas, computeStatsPercents, type StatsExtremes } from '@/lib/stats';
import { parseDateKey } from '@/lib/friendly-date';
import { subDays, subWeeks, subMonths, startOfWeek, startOfMonth, startOfYear, endOfWeek, endOfMonth, endOfYear } from 'date-fns';

export type AggregationType = 'none' | 'day' | 'week' | 'month' | 'year';

export interface TimeFrameConfig {
  label: string;
  aggregations: AggregationType[];
}

export const TIME_FRAME_PRESETS = {
  'last-7-days': { label: 'Past 7 Days', aggregations: ['day'] },
  'last-30-days': { label: 'Past 30 Days', aggregations: ['day'] },
  'this-week': { label: 'This Week', aggregations: ['day', 'week'] },
  'last-week': { label: 'Last Week', aggregations: ['day', 'week'] },
  'last-4-weeks': { label: 'Last 4 Weeks', aggregations: ['week'] },
  'this-month': { label: 'This Month', aggregations: ['day', 'week', 'month'] },
  'last-month': { label: 'Last Month', aggregations: ['day', 'week', 'month'] },
  'last-6-months': { label: 'Past 6 Months', aggregations: ['day', 'week', 'month'] },
  'last-12-months': { label: 'Past 12 Months', aggregations: ['day', 'week', 'month'] },
  'this-year': { label: 'This Year', aggregations: ['day', 'week', 'month', 'year'] },
  'last-year': { label: 'Last Year', aggregations: ['day', 'week', 'month', 'year'] },
  'all-time': { label: 'All Time', aggregations: ['day', 'week', 'month', 'year'] },
  'custom': { label: 'Custom Range...', aggregations: ['day', 'week', 'month', 'year'] },
} as const satisfies Record<string, TimeFrameConfig>;

export type TimeFramePreset = keyof typeof TIME_FRAME_PRESETS;

export interface TimeRange {
  startDate: Date;
  endDate: Date;
}

/**
 * Get the time range for a given preset
 */
export function getTimeRange(
  preset: TimeFramePreset,
  today: Date = new Date(),
  customRange?: TimeRange,
): TimeRange {
  if (preset === 'custom' && customRange) {
    return customRange;
  }

  const endDate = today;
  let startDate = today;

  switch (preset) {
    case 'last-7-days':
      startDate = subDays(today, 7);
      break;
    case 'last-30-days':
      startDate = subDays(today, 30);
      break;
    case 'this-week':
      startDate = startOfWeek(today);
      break;
    case 'last-week':
      startDate = startOfWeek(subWeeks(today, 1));
      return { startDate, endDate: endOfWeek(subWeeks(today, 1)) };
    case 'last-4-weeks':
      startDate = startOfWeek(subWeeks(today, 4));
      break;
    case 'this-month':
      startDate = startOfMonth(today);
      break;
    case 'last-month':
      startDate = startOfMonth(subMonths(today, 1));
      return { startDate, endDate: endOfMonth(subMonths(today, 1)) };
    case 'last-6-months':
      startDate = startOfMonth(subMonths(today, 6));
      break;
    case 'last-12-months':
      startDate = startOfMonth(subMonths(today, 12));
      break;
    case 'this-year':
      startDate = startOfYear(today);
      break;
    case 'last-year':
      startDate = startOfYear(subDays(today, 365));
      return { startDate, endDate: endOfYear(subDays(today, 365)) };
    case 'all-time':
      return { startDate: new Date(0), endDate: today };
  }

  return { startDate, endDate };
}

/**
 * Filter aggregate data by time range
 */
export function filterPeriodsByTimeRange<T extends TimePeriod>(
  periods: PeriodAggregateData<T>[],
  timeRange: TimeRange,
): PeriodAggregateData<T>[] {
  const { startDate, endDate } = timeRange;
  
  return periods.filter(period => {
    const dateKey = period.dateKey;
    if (!dateKey) return false;
    
    // Parse the dateKey to get its date representation
    try {
      const periodDate = parseDateKey(dateKey);
      
      // For period-based keys, we need to check if the period overlaps with the range
      // A period can be partially in the range
      if (period.period === 'week') {
        const weekStart = startOfWeek(periodDate);
        const weekEnd = endOfWeek(periodDate);
        return weekEnd >= startDate && weekStart <= endDate;
      } else if (period.period === 'month') {
        const monthStart = startOfMonth(periodDate);
        const monthEnd = endOfMonth(periodDate);
        return monthEnd >= startDate && monthStart <= endDate;
      } else if (period.period === 'year') {
        const yearStart = startOfYear(periodDate);
        const yearEnd = endOfYear(periodDate);
        return yearEnd >= startDate && yearStart <= endDate;
      } else {
        // For day aggregation, simple date comparison
        return periodDate >= startDate && periodDate <= endDate;
      }
    } catch {
      return false;
    }
  });
}

export interface AnalysisData {
  /** Periods in the selected time range */
  periods: PeriodAggregateData<any>[];
  /** Prior period for delta calculation (if available) */
  priorPeriod?: PeriodAggregateData<any>;
  /** All data points from periods in the time range */
  dataPoints: number[];
  /** Summary stats for the time range (raw for none, aggregate for primary metric otherwise) */
  stats: NumberStats | null;
  /** Stats computed from period aggregates (stats of stats for each metric) */
  aggregateStats?: Record<NumberMetric, NumberStats | null>;
  /** Delta stats compared to prior period */
  deltas?: NumberStats;
  /** Percent change vs prior period */
  percents?: Partial<NumberStats>;
  /** Extremes across all periods in range */
  extremes?: StatsExtremes;
  /** Cumulative stats (for series tracking) */
  cumulatives?: NumberStats;
  /** Percent change in cumulative from start to end of time range (compares cumulative before range vs cumulative at end of range) */
  cumulativePercents?: Partial<NumberStats>;
  /** Number of periods in the range */
  periodCount: number;
}

type AnalysisOptions = {
  aggregation?: AggregationType;
  primaryMetric?: NumberMetric;
};

/**
 * Compute analysis data for a given time range and aggregation
 */
export function computeAnalysisData<T extends TimePeriod>(
  allPeriods: PeriodAggregateData<T>[],
  timeRange: TimeRange,
  includePriorPeriod: boolean = true,
  options: AnalysisOptions = {},
): AnalysisData {
  const aggregation = options.aggregation ?? 'none';
  const primaryMetric = options.primaryMetric ?? 'total';
  const periodsInRange = filterPeriodsByTimeRange(allPeriods, timeRange);
  const periodCount = periodsInRange.length;

  // Collect all numbers from periods in range
  const dataPoints = periodsInRange.flatMap(p => p.numbers);
  
  // Compute summary stats based on aggregation mode
  const periodStats = periodsInRange.map(p => p.stats).filter(s => s.count > 0);
  const stats = aggregation === 'none'
    ? computeNumberStats(dataPoints)
    : computeMetricStats(periodStats, primaryMetric);

  // Calculate extremes across all periods
  const extremes = calculateExtremes(periodStats);

  // Compute stats from period aggregates (stats of stats for each metric)
  const aggregateStats: Record<NumberMetric, NumberStats | null> = {} as any;
  const metrics: NumberMetric[] = ['count', 'total', 'mean', 'median', 'min', 'max', 'first', 'last', 'range', 'change', 'changePercent', 'mode', 'slope', 'midrange', 'variance', 'standardDeviation', 'interquartileRange'];
  for (const metric of metrics) {
    aggregateStats[metric] = computeMetricStats(periodStats, metric);
  }

  // Get cumulatives from the last period in range (already computed incrementally)
  const cumulatives = periodsInRange.length > 0 
    ? periodsInRange[periodsInRange.length - 1].cumulatives 
    : undefined;

  // Find prior period for deltas
  let priorPeriod: PeriodAggregateData<T> | undefined;
  let deltas: NumberStats | undefined;
  let percents: Partial<NumberStats> | undefined;
  let cumulativePercents: Partial<NumberStats> | undefined;

  if (includePriorPeriod && periodsInRange.length > 0 && stats) {
    const firstPeriodIndex = allPeriods.findIndex(p => p.dateKey === periodsInRange[0].dateKey);
    if (firstPeriodIndex > 0) {
      priorPeriod = allPeriods[firstPeriodIndex - 1];
      const priorStats = aggregation === 'none'
        ? priorPeriod.stats
        : computeMetricStats([priorPeriod.stats], primaryMetric);
      // Compare summary stats for entire range vs prior period
      deltas = priorStats ? computeStatsDeltas(stats, priorStats) : undefined;
      percents = priorStats ? computeStatsPercents(stats, priorStats) : undefined;
      // Cumulative percent: compare cumulative at end of range vs cumulative before range
      cumulativePercents = cumulatives && priorPeriod.cumulatives
        ? computeStatsPercents(cumulatives, priorPeriod.cumulatives)
        : undefined;
    } else {
      // Seed deltas/percents when there is no prior period available.
      deltas = computeStatsDeltas(stats, null);
      percents = computeStatsPercents(stats, null);
    }
  }

  return {
    periods: periodsInRange,
    priorPeriod,
    dataPoints,
    stats,
    aggregateStats,
    deltas,
    percents,
    extremes,
    cumulatives,
    cumulativePercents,
    periodCount,
  };
}

/**
 * Get available time frame presets for a given aggregation type
 */
export function getAvailablePresets(aggregation: AggregationType): Array<TimeFrameConfig & { preset: TimeFramePreset }> {
  const effectiveAggregation = aggregation === 'none' ? 'day' : aggregation;
  return (Object.entries(TIME_FRAME_PRESETS) as Array<[TimeFramePreset, TimeFrameConfig]>)
    .filter(([_, config]) => config.aggregations.includes(effectiveAggregation))
    .map(([preset, config]) => ({ ...config, preset }));
}
