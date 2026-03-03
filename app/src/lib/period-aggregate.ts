import type { DateKeyByPeriod, DayKey, TimePeriod } from '@/features/db/localdb';
import { emptyStats, computeCumulatives, type NumberStats, type NumberMetric, type StatsExtremes, calculateExtremes } from '@/lib/stats';
import type { DateKeyType } from './friendly-date';

export type PeriodAggregateData<T extends TimePeriod> = {
  dateKey: DateKeyByPeriod<T>;
  period: T;
  numbers: number[];
  stats: NumberStats;
  deltas: NumberStats;
  percents: Partial<NumberStats>;
  cumulatives: NumberStats;
  cumulativeDeltas: NumberStats;
  cumulativePercents: Partial<NumberStats>;
  /** Extreme values of the child period stats (e.g. `months` -> `daily stats`) */
  extremes?: StatsExtremes;
};

export const createEmptyAggregate = <T extends TimePeriod>(
  dateKey: DateKeyByPeriod<T>,
  period: T,
): PeriodAggregateData<T> => ({
  dateKey,
  period,
  numbers: [],
  stats: emptyStats(),
  deltas: emptyStats(),
  percents: {},
  cumulatives: emptyStats(),
  cumulativeDeltas: emptyStats(),
  cumulativePercents: {},
  extremes: undefined,
});

export const buildPriorAggregateMap = <T extends DateKeyType>(
  items: PeriodAggregateData<T>[],
): Record<DateKeyByPeriod<T>, PeriodAggregateData<T> | undefined> => {
  const record = {} as Record<DateKeyByPeriod<T>, PeriodAggregateData<T> | undefined>;
  let lastPopulated: PeriodAggregateData<T> | undefined;
  for (let i = 0; i < items.length; i += 1) {
    const item = items[i];
    record[item.dateKey] = lastPopulated;
    if (item.numbers.length > 0) {
      lastPopulated = item;
    }
  }
  return record;
};

/**
 * Compute cumulative statistics across aggregated periods, treating each period as a single unit.
 * 
 * This transforms each period's stats by setting count=1, then uses computeCumulatives to accumulate
 * basic metrics (count, total, mean, min, max, etc.). For distributional metrics (median, mode, 
 * variance, etc.), we compute them from the period metric values themselves.
 * 
 * The result represents statistics of the period aggregates themselves:
 * - count: number of periods (not individual data points)
 * - total: sum of all period totals
 * - mean: average of period totals
 * - min/max: lowest/highest values across all periods
 * - median/mode/variance/etc: computed from the sequence of period metric values
 * 
 * @param periods Array of period aggregate data to accumulate
 * @param primaryMetric The metric to use for distributional calculations (default: 'total')
 * @returns Cumulative stats across the periods, or undefined if no valid periods
 */
export const computeAggregateCumulatives = <T extends TimePeriod>(
  periods: PeriodAggregateData<T>[],
  primaryMetric: NumberMetric = 'total',
): NumberStats | undefined => {
  const validPeriods = periods.filter(p => p.stats.count > 0);
  if (validPeriods.length === 0) return undefined;

  // Extract metric values for distributional computation
  const metricValues = validPeriods.map(p => p.stats[primaryMetric]);

  // Accumulate basic metrics using computeCumulatives with metric values
  let cumulatives: NumberStats | null = null;
  for (const period of validPeriods) {
    const unitAggregate = { ...period.stats, count: 1 };
    cumulatives = cumulatives
      ? computeCumulatives(unitAggregate, cumulatives, metricValues)
      : unitAggregate;
  }

  return cumulatives ?? undefined;
};

/**
 * Calculate extreme values across all days in a specific year from aggregate data.
 * Useful for scaling visualizations based on daily min/max values within a year.
 */
export const calculateYearDailyExtremes = (
  dayDataByKey: Record<DayKey, PeriodAggregateData<'day'>>,
  year: number,
): StatsExtremes | undefined => {
  const yearDayStats = Object.entries(dayDataByKey)
    .filter(([dayKey]) => dayKey.startsWith(`${year}-`))
    .map(([, dayData]) => dayData.stats)
    .filter((stats) => stats.count > 0); // Only include days with data
  return calculateExtremes(yearDayStats);
};