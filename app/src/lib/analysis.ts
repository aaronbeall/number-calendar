import type { TimePeriod, DateKey, Valence } from '@/features/db/localdb';
import { computeAggregateCumulatives, type PeriodAggregateData } from '@/lib/period-aggregate';
import type { NumberStats, NumberMetric } from '@/lib/stats';
import { computeNumberStats, computeMetricStats, calculateExtremes, computeStatsDeltas, computeStatsPercents, type StatsExtremes, METRIC_DISPLAY_INFO, type AggregationType } from '@/lib/stats';
import { convertDateKey, parseDateKey, formatFriendlyDate, formatDateAsKey, type DateKeyType } from '@/lib/friendly-date';
import { isBad } from '@/lib/valence';
import { capitalize, adjectivize, pluralize } from '@/lib/utils';
import { colord } from 'colord';
import { subDays, subWeeks, subMonths, startOfWeek, startOfMonth, startOfYear, endOfWeek, endOfMonth, endOfYear, format, getWeekYear } from 'date-fns';
import type { Tracking } from '@/features/db/localdb';
import type { GoalResults } from './goals';

// Re-export AggregationType for backward compatibility
export type { AggregationType };

/**
 * Format a period label for chart display based on aggregation type
 */
export function formatPeriodLabel(dateKey: DateKey, aggregationType: AggregationType): string {
  try {
    const date = parseDateKey(dateKey);
    switch (aggregationType) {
      case 'none':
        return format(date, "MMM d");
      case 'week':
        return `W${format(date, 'ww')} '${format(date, 'yy')}`;
      case 'month':
        return format(date, "MMM ''yy");
      case 'year':
        return format(date, 'yyyy');
      case 'day':
      default:
        return format(date, "MMM d, ''yy");
    }
  } catch {
    return dateKey;
  }
}

/**
 * Convert an aggregation type into a human-readable period label.
 * Maps "none" to "Entry".
 */
export function getAggregationPeriodLabel(aggregationType: AggregationType): string {
  return aggregationType === 'none' ? 'entry' : aggregationType;
}

/**
 * Format a date range label for a given aggregation type.
 * @param short - Use abbreviated format (default: true for backward compatibility)
 */
export function formatAggregationRange(
  startDate: Date,
  endDate: Date,
  aggregation: AggregationType,
  short: boolean = true,
): string {
  try {
    // Convert dates to appropriate DateKey type based on aggregation
    const keyType: DateKeyType = aggregation === 'none' ? 'day' : aggregation as DateKeyType;
    const startKey = formatDateAsKey(startDate, keyType);
    const endKey = formatDateAsKey(endDate, keyType);
    
    // Special handling for weeks to show week numbers
    if (aggregation === 'week') {
      const startYear = getWeekYear(startDate);
      const endYear = getWeekYear(endDate);
      const startWeek = format(startDate, 'ww');
      const endWeek = format(endDate, 'ww');
      
      if (short) {
        if (startYear === endYear) {
          // Same year: W5 – W7 '25
          return `W${startWeek} – W${endWeek} '${format(startDate, 'yy')}`;
        } else {
          // Different years: W5 '24 – W7 '25
          return `W${startWeek} '${format(startDate, 'yy')} – W${endWeek} '${format(endDate, 'yy')}`;
        }
      } else {
        if (startYear === endYear) {
          // Same year: Week 5 – Week 7, 2025
          return `Week ${startWeek} – Week ${endWeek}, ${format(startDate, 'yyyy')}`;
        } else {
          // Different years: Week 5, 2024 – Week 7, 2025
          return `Week ${startWeek}, ${format(startDate, 'yyyy')} – Week ${endWeek}, ${format(endDate, 'yyyy')}`;
        }
      }
    }
    
    return formatFriendlyDate(startKey, endKey, { short });
  } catch {
    return 'Custom range';
  }
}

/**
 * Semantic colors for metrics in visualizations
 */
export const METRIC_COLORS: Record<NumberMetric, string> = {
  total: '#22c55e',
  mean: '#3b82f6',
  median: '#06b6d4',
  min: '#ef4444',
  max: '#22c55e',
  count: '#a78bfa',
  first: '#f59e0b',
  last: '#ec4899',
  range: '#14b8a6',
  change: '#6366f1',
  changePercent: '#8b5cf6',
  mode: '#06b6d4',
  slope: '#f59e0b',
  midrange: '#ec4899',
  variance: '#14b8a6',
  standardDeviation: '#6366f1',
  interquartileRange: '#8b5cf6',
};

/**
 * Get a color with valence-aware darkening.
 * Darkens the hex color if the value is "bad" according to the valence.
 */
export function getValenceAdjustedColor(hex: string, value: number, valence: Valence): string {
  if (isBad(value, valence)) {
    return colord(hex).darken(0.3).toHex();
  }
  return hex;
}

/**
 * Get the color for a metric with valence-aware darkening.
 * Returns a darkened version of the metric color for "bad" values.
 * If the metric is valenceless, returns the normal color regardless of the value.
 * 
 * @param metric The metric to get the color for
 * @param value The value to evaluate for valence (can be null/undefined for neutral)
 * @param valence The valence setting ('positive', 'negative', or 'neutral')
 * @returns Hex color string, darkened if the value is "bad" according to valence
 */
export function getMetricColorForValence(
  metric: NumberMetric,
  value: number | null | undefined,
  valence: Valence,
): string {
  const baseColor = METRIC_COLORS[metric];
  
  // If the metric is valenceless, always return the base color
  if (METRIC_DISPLAY_INFO[metric].valenceless) {
    return baseColor;
  }
  
  // If the value is "bad" for the given valence, return darkened color
  if (isBad(value ?? 0, valence)) {
    return getValenceAdjustedColor(baseColor, value ?? 0, valence);
  }
  
  return baseColor;
}

export interface TimeFrameConfig {
  label: string;
  aggregations: AggregationType[];
}

export const TIME_FRAME_PRESETS = {
  'last-7-days': { label: 'Past 7 Days', aggregations: ['day'] },
  'last-30-days': { label: 'Past 30 Days', aggregations: ['day'] },
  'this-week': { label: 'This Week', aggregations: ['day', 'week'] },
  'last-week': { label: 'Last Week', aggregations: ['day', 'week'] },
  'last-4-weeks': { label: 'Past 4 Weeks', aggregations: ['week'] },
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

export type ProjectionMode = 'linear' | 'recent-average' | 'momentum' | 'flat';
export type ProjectionHorizon = 3 | 6 | 12;

export interface ProjectionSeriesPoint {
  label: string;
  actual?: number;
  projected?: number;
  isProjection: boolean;
}

export interface MomentumQuadrantPoint {
  label: string;
  level: number;
  momentum: number;
}

export interface MomentumQuadrantData {
  points: MomentumQuadrantPoint[];
  levelMid: number;
  momentumMid: number;
}

export interface AchievementInsightItem {
  id: string;
  title: string;
  badge: GoalResults['goal']['badge'];
  inRangeCount: number;
  allTimeCount: number;
  widthPercent: number;
}

export interface AchievementInsightsData {
  stacked: AchievementInsightItem[];
  topByCount: AchievementInsightItem[];
  rarestByAllTimeCount: AchievementInsightItem[];
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
    if (!period.dateKey) return false;
    const periodDate = parseDateKey(period.dateKey);
    return periodDate >= startDate && periodDate <= endDate;
  });
}

export interface AnalysisData {
  /** Periods in the selected time range */
  periods: PeriodAggregateData<DateKeyType>[];
  /** Prior period for delta calculation (if available) */
  priorPeriod?: PeriodAggregateData<DateKeyType>;
  /** All data points from periods in the time range */
  dataPoints: number[];
  /** Summary stats for the time range (raw for none, aggregate for primary metric otherwise) */
  stats: NumberStats | null;
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
export function computeAnalysisData<T extends DateKeyType>(
  allPeriods: PeriodAggregateData<T>[],
  timeRange: TimeRange,
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

  const lastPeriodKey = periodsInRange.length > 0
    ? periodsInRange[periodsInRange.length - 1].dateKey
    : undefined;
  const lastPeriodIndex = lastPeriodKey
    ? allPeriods.findIndex(p => p.dateKey === lastPeriodKey)
    : -1;
  const lastPeriodsSlice = lastPeriodIndex >= 0
    ? allPeriods.slice(0, lastPeriodIndex + 1)
    : [];

  // Get cumulatives from the last period in range
  const cumulatives = aggregation === 'none'
    ? computeNumberStats(lastPeriodsSlice.flatMap(p => p.numbers)) ?? undefined // Stats of all raw numbers up to end of range
    : computeAggregateCumulatives(lastPeriodsSlice, primaryMetric); // Stats of period metrics up to end of range

  // Find prior period for deltas
  let priorPeriod: PeriodAggregateData<T> | undefined;
  let deltas: NumberStats | undefined;
  let percents: Partial<NumberStats> | undefined;
  let cumulativePercents: Partial<NumberStats> | undefined;

  if (periodsInRange.length > 0 && stats) {
    const firstPeriodIndex = allPeriods.findIndex(p => p.dateKey === periodsInRange[0].dateKey);
    if (firstPeriodIndex > 0) {
      priorPeriod = allPeriods[firstPeriodIndex - 1];
      const priorStats = aggregation === 'none'
        ? priorPeriod.stats
        : computeMetricStats([priorPeriod.stats], primaryMetric);
      // Compare summary stats for entire range vs prior period
      deltas = priorStats ? computeStatsDeltas(stats, priorStats) : undefined;
      percents = priorStats ? computeStatsPercents(stats, priorStats) : undefined;
      // Cumulative percent: compare current range stats vs cumulative at end of range
      cumulativePercents = cumulatives && stats
        ? computeStatsPercents(stats, cumulatives)
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

/**
 * Build projection-ready time series from aggregate periods.
 */
export function computeProjectionSeries(
  periods: PeriodAggregateData<DateKeyType>[],
  tracking: Tracking,
  primaryMetric: NumberMetric,
  aggregationType: AggregationType,
  mode: ProjectionMode,
  horizon: ProjectionHorizon,
): ProjectionSeriesPoint[] {
  const points = periods
    .map((period, index) => {
      const value = tracking === 'series'
        ? (period.cumulatives?.[primaryMetric] ?? period.stats[primaryMetric] ?? 0)
        : (period.stats[primaryMetric] ?? 0);
      return {
        index,
        label: formatPeriodLabel(period.dateKey, aggregationType),
        value,
      };
    })
    .filter((point) => Number.isFinite(point.value));

  if (points.length < 2) return [];

  const values = points.map((point) => point.value);
  const indices = points.map((point) => point.index);
  const lastValue = values[values.length - 1] ?? 0;
  const deltas = values.slice(1).map((value, i) => value - values[i]);
  const recentDeltas = deltas.slice(-Math.min(3, deltas.length));
  const avgRecentDelta = recentDeltas.length > 0
    ? recentDeltas.reduce((sum, value) => sum + value, 0) / recentDeltas.length
    : 0;

  const xMean = indices.reduce((sum, value) => sum + value, 0) / indices.length;
  const yMean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const numerator = indices.reduce((sum, x, i) => sum + ((x - xMean) * (values[i] - yMean)), 0);
  const denominator = indices.reduce((sum, x) => sum + ((x - xMean) ** 2), 0);
  const slope = denominator === 0 ? 0 : numerator / denominator;
  const momentumDelta = recentDeltas.length > 0
    ? recentDeltas.reduce((sum, delta, i) => sum + (delta * (i + 1)), 0) / (recentDeltas.length * (recentDeltas.length + 1) / 2)
    : 0;

  const getNextValue = (step: number): number => {
    if (mode === 'flat') return lastValue;
    if (mode === 'recent-average') return lastValue + (avgRecentDelta * step);
    if (mode === 'momentum') return lastValue + (momentumDelta * step);
    return lastValue + (slope * step);
  };

  const withActuals: ProjectionSeriesPoint[] = points.map((point) => ({
    label: point.label,
    actual: point.value,
    projected: undefined,
    isProjection: false,
  }));

  const futurePoints: ProjectionSeriesPoint[] = Array.from({ length: horizon }, (_, i) => {
    const step = i + 1;
    return {
      label: `+${step}`,
      actual: undefined,
      projected: getNextValue(step),
      isProjection: true,
    };
  });

  return [...withActuals, ...futurePoints];
}

/**
 * Compute level-vs-momentum scatter points with quadrant centers.
 */
export function computeMomentumQuadrantData(
  periods: PeriodAggregateData<DateKeyType>[],
  primaryMetric: NumberMetric,
  aggregationType: AggregationType,
): MomentumQuadrantData {
  const points = periods
    .map((period, index) => {
      const value = period.stats[primaryMetric] ?? 0;
      const prior = index > 0 ? (periods[index - 1]?.stats[primaryMetric] ?? 0) : value;
      return {
        label: formatPeriodLabel(period.dateKey, aggregationType),
        level: value,
        momentum: value - prior,
      };
    })
    .filter((point) => Number.isFinite(point.level) && Number.isFinite(point.momentum));

  if (points.length === 0) {
    return { points: [], levelMid: 0, momentumMid: 0 };
  }

  const levelMid = points.reduce((sum, point) => sum + point.level, 0) / points.length;
  const momentumMid = points.reduce((sum, point) => sum + point.momentum, 0) / points.length;
  return { points, levelMid, momentumMid };
}

/**
 * Compute ranked achievement insights for the selected period and range.
 */
export function computeAchievementInsightsData(
  results: GoalResults[],
  aggregationType: AggregationType,
  timeRange: TimeRange,
): AchievementInsightsData {
  const selectedPeriod = aggregationType === 'none' ? 'day' : aggregationType;
  const isGoalInSelectedPeriod = (timePeriod: string): boolean => timePeriod === selectedPeriod;

  const buckets = results
    .filter((result) => isGoalInSelectedPeriod(result.goal.timePeriod))
    .map((result) => {
      const completed = result.achievements.filter((ach) => !!ach.completedAt);
      const inRange = completed.filter((ach) => {
        if (!ach.completedAt) return false;
        try {
          const comparable = convertDateKey(ach.completedAt, 'day');
          const date = parseDateKey(comparable);
          return date >= timeRange.startDate && date <= timeRange.endDate;
        } catch {
          return false;
        }
      });

      return {
        id: result.goal.id,
        title: result.goal.title,
        badge: result.goal.badge,
        inRangeCount: inRange.length,
        allTimeCount: completed.length,
      };
    })
    .filter((item) => item.inRangeCount > 0 || item.allTimeCount > 0);

  const maxInRange = Math.max(...buckets.map((item) => item.inRangeCount), 1);
  const stacked = [...buckets]
    .sort((a, b) => b.inRangeCount - a.inRangeCount)
    .slice(0, 8)
    .map((item) => ({
      ...item,
      widthPercent: Math.max(8, Math.round((item.inRangeCount / maxInRange) * 100)),
    }));

  const topByCount = [...buckets]
    .sort((a, b) => b.inRangeCount - a.inRangeCount)
    .slice(0, 5)
    .map((item) => ({
      ...item,
      widthPercent: Math.max(8, Math.round((item.inRangeCount / maxInRange) * 100)),
    }));

  const rarestByAllTimeCount = [...buckets]
    .filter((item) => item.inRangeCount > 0)
    .sort((a, b) => a.allTimeCount - b.allTimeCount || b.inRangeCount - a.inRangeCount)
    .slice(0, 5)
    .map((item) => ({
      ...item,
      widthPercent: Math.max(8, Math.round((item.inRangeCount / maxInRange) * 100)),
    }));

  return { stacked, topByCount, rarestByAllTimeCount };
}

function replaceTokens(template: string, tokens: Record<string, string>): string {
  return Object.entries(tokens).reduce(
    (result, [key, value]) => result.replace(new RegExp(`\\{${key}\\}`, 'g'), value),
    template,
  );
}

function substitutePlaceholders(
  template: string,
  params: {
    metric: NumberMetric;
    aggregationType: AggregationType;
    primaryMetric: NumberMetric;
    timeframe: string;
  },
): string {
  const primaryMetricLabel = METRIC_DISPLAY_INFO[params.primaryMetric].label.toLowerCase();
  const primaryMetrics = pluralize(primaryMetricLabel);
  const period = params.aggregationType === 'none' ? 'value' : params.aggregationType;
  const periods = params.aggregationType === 'none' ? 'values' : pluralize(params.aggregationType);
  const periodly = params.aggregationType === 'none' ? 'individual' : adjectivize(params.aggregationType);
  const value = params.aggregationType === 'none' ? 'value' : `${periodly} ${primaryMetricLabel}`;
  const values = params.aggregationType === 'none' ? 'values' : `${periodly} ${primaryMetrics}`;

  const baseTokens = {
    period,
    periods,
    periodly,
    primaryMetric: primaryMetricLabel,
    primaryMetrics,
    value,
    values,
  };

  const timeframe = replaceTokens(params.timeframe, baseTokens);
  return replaceTokens(template, { ...baseTokens, timeframe });
}

/**
 * Get a contextual description for a metric based on aggregation, time frame, and primary metric
 * Uses metric-specific templates with dynamic token substitution
 * Examples:
 * - Non-aggregated: "Sum of values in past 30 days"
 * - Aggregated: "Sum of all daily totals in past 30 days"
 * - With count metric: "Count of logged days in past 30 days"
 */
export function getMetricAnalysisDescription(
  metric: NumberMetric,
  aggregationType: AggregationType,
  timeFrameLabel: string,
  primaryMetric: NumberMetric,
): string {
  return capitalize(
    substitutePlaceholders(METRIC_DISPLAY_INFO[metric].descriptionTemplate, {
      metric,
      aggregationType,
      primaryMetric,
      timeframe: timeFrameLabel,
    }),
  );
}

/**
 * Get a description for cumulative values - uses same template as metric descriptions
 * but with "from the beginning" timeframe instead of period-based
 * Examples:
 * - Non-aggregated: "Sum of values from the beginning"
 * - Aggregated: "Sum of all daily totals from the beginning"
 * - With count metric: "Count of logged days from the beginning"
 */
export function getCumulativeAnalysisDescription(
  metric: NumberMetric,
  aggregationType: AggregationType,
  _timeFrameLabel: string,
  primaryMetric: NumberMetric,
): string {
  return capitalize(
    substitutePlaceholders(METRIC_DISPLAY_INFO[metric].descriptionTemplate, {
      metric,
      aggregationType,
      primaryMetric,
      timeframe: 'all {periods} since the beginning',
    }),
  );
}

/**
 * Get a description for extreme values (highest/lowest)
 * Uses custom description format since it doesn't fit the unified template pattern
 * Examples:
 * - Non-aggregated: "Highest and lowest values in past 30 days"
 * - Aggregated: "Highest and lowest daily totals in past 30 days"
 * - Aggregated: "Highest and lowest weekly counts in this year"
 */
export function getExtremesAnalysisDescription(
  metric: NumberMetric,
  aggregationType: AggregationType,
  timeFrameLabel: string,
  primaryMetric?: NumberMetric,
): string {
  const resolvedPrimaryMetric = primaryMetric ?? metric;
  return substitutePlaceholders('Highest and lowest {values} in {timeframe}', {
    metric,
    aggregationType,
    primaryMetric: resolvedPrimaryMetric,
    timeframe: timeFrameLabel,
  });
}

/**
 * Get a description for delta values (change from prior period)
 * Clarifies what's changing: the metric value per period, not raw values
 * Examples:
 * - Non-aggregated: "Change in mean from the prior day"
 * - Aggregated: "Change in average from the prior day"
 * - Aggregated: "Change in count from the prior week"
 */
export function getDeltasAnalysisDescription(
  metric: NumberMetric,
  aggregationType: AggregationType,
  _timeFrameLabel: string,
): string {
  const metricLabel = METRIC_DISPLAY_INFO[metric].label;
  
  if (aggregationType === 'none') {
    return `Change in ${metricLabel.toLowerCase()} from the prior value`;
  }
    
  return `Change in ${metricLabel.toLowerCase()} from the prior ${aggregationType}`;
}
