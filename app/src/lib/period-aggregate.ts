import type { DateKeyByPeriod, TimePeriod } from '@/features/db/localdb';
import { emptyStats, type NumberStats, type StatsExtremes } from '@/lib/stats';
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
  for (let i = 0; i < items.length; i += 1) {
    record[items[i].dateKey] = i > 0 ? items[i - 1] : undefined;
  }
  return record;
};