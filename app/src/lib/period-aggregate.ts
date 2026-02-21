import type { DateKeyByPeriod, DayKey, TimePeriod } from '@/features/db/localdb';
import { emptyStats, type NumberStats, type StatsExtremes, calculateExtremes } from '@/lib/stats';
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