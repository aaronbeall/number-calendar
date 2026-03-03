import type { PeriodAggregateData } from '@/lib/period-aggregate';
import type { DayEntry } from '@/features/db/localdb';
import {
  buildPriorAggregateMap,
  createEmptyAggregate,
  computeAggregateCumulatives,
  buildSingleNumberAggregates,
  computeRunningAggregatePeriods,
} from '@/lib/period-aggregate';
import { computeNumberStats } from '@/lib/stats';
import { describe, expect, it } from 'vitest';

const makeDayAggregate = (dateKey: PeriodAggregateData<'day'>['dateKey'], numbers: number[]): PeriodAggregateData<'day'> => {
  const aggregate = createEmptyAggregate(dateKey, 'day');
  const stats = computeNumberStats(numbers) || createEmptyAggregate('2024-01-01', 'day').stats;
  return { ...aggregate, numbers, stats };
};

const makeDayEntry = (date: DayEntry['date'], numbers: number[]): DayEntry => ({
  date,
  numbers,
  datasetId: 'test-dataset',
});

describe('buildPriorAggregateMap', () => {
  it('skips empty days when selecting prior aggregates', () => {
    const day1 = makeDayAggregate('2024-11-01', [1]);
    const day2 = makeDayAggregate('2024-11-02', []);
    const day3 = makeDayAggregate('2024-11-03', [2]);
    const day4 = makeDayAggregate('2024-11-04', []);

    const map = buildPriorAggregateMap([day1, day2, day3, day4]);

    expect(map[day1.dateKey]).toBeUndefined();
    expect(map[day2.dateKey]).toBe(day1);
    expect(map[day3.dateKey]).toBe(day1);
    expect(map[day4.dateKey]).toBe(day3);
  });

  it('returns undefined prior when no populated entries exist yet', () => {
    const day1 = makeDayAggregate('2024-11-01', []);
    const day2 = makeDayAggregate('2024-11-02', [3]);

    const map = buildPriorAggregateMap([day1, day2]);

    expect(map[day1.dateKey]).toBeUndefined();
    expect(map[day2.dateKey]).toBeUndefined();
  });
});

describe('computeAggregateCumulatives', () => {
  it('returns undefined for empty periods', () => {
    const result = computeAggregateCumulatives([]);
    expect(result).toBeUndefined();
  });

  it('returns undefined when all periods have no data', () => {
    const day1 = makeDayAggregate('2024-11-01', []);
    const day2 = makeDayAggregate('2024-11-02', []);

    const result = computeAggregateCumulatives([day1, day2]);
    expect(result).toBeUndefined();
  });

  it('treats single period as a unit with count=1', () => {
    const day1 = makeDayAggregate('2024-11-01', [10, 20, 30]);

    const result = computeAggregateCumulatives([day1]);

    expect(result).toBeDefined();
    expect(result?.count).toBe(1);
    expect(result?.total).toBe(60); // sum of [10, 20, 30]
    expect(result?.mean).toBe(20); // average of [10, 20, 30]
    expect(result?.min).toBe(10);
    expect(result?.max).toBe(30);
  });

  it('accumulates count as number of periods', () => {
    const day1 = makeDayAggregate('2024-11-01', [10, 20]);
    const day2 = makeDayAggregate('2024-11-02', [30, 40]);
    const day3 = makeDayAggregate('2024-11-03', [50]);

    const result = computeAggregateCumulatives([day1, day2, day3]);

    expect(result?.count).toBe(3); // 3 periods, not 5 data points
  });

  it('computes mean as average of period totals', () => {
    const day1 = makeDayAggregate('2024-11-01', [10, 20]); // total = 30
    const day2 = makeDayAggregate('2024-11-02', [60]); // total = 60

    const result = computeAggregateCumulatives([day1, day2]);

    expect(result?.total).toBe(90); // 30 + 60
    expect(result?.mean).toBe(45); // (30 + 60) / 2
  });

  it('preserves min/max across all periods', () => {
    const day1 = makeDayAggregate('2024-11-01', [15, 25]); // min=15, max=25
    const day2 = makeDayAggregate('2024-11-02', [5, 35]); // min=5, max=35

    const result = computeAggregateCumulatives([day1, day2]);

    expect(result?.min).toBe(5); // overall min
    expect(result?.max).toBe(35); // overall max
  });

  it('skips periods with no data', () => {
    const day1 = makeDayAggregate('2024-11-01', [10]);
    const day2 = makeDayAggregate('2024-11-02', []);
    const day3 = makeDayAggregate('2024-11-03', [20]);

    const result = computeAggregateCumulatives([day1, day2, day3]);

    expect(result?.count).toBe(2); // only 2 periods with data
    expect(result?.total).toBe(30); // 10 + 20
  });

  it('computes distributional metrics from period totals', () => {
    // Period totals: [30, 70, 50]
    const day1 = makeDayAggregate('2024-11-01', [10, 20]); // total=30
    const day2 = makeDayAggregate('2024-11-02', [60, 10]); // total=70
    const day3 = makeDayAggregate('2024-11-03', [50]); // total=50

    const result = computeAggregateCumulatives([day1, day2, day3]);

    // Median of [30, 50, 70] = 50
    expect(result?.median).toBe(50);
    // Mean of [30, 70, 50] = 50
    expect(result?.mean).toBe(50);
    // These are computed from the period totals, not carried forward from first period
  });
});

describe('buildSingleNumberAggregates', () => {
  it('creates one aggregate per number with normalized stats', () => {
    const days: DayEntry[] = [makeDayEntry('2026-01-01', [5, -2])];
    const result = buildSingleNumberAggregates(days);

    expect(result).toHaveLength(2);
    expect(result[0].numbers).toEqual([5]);
    expect(result[0].stats.count).toBe(1);
    expect(result[0].stats.total).toBe(5);
    expect(result[0].stats.mean).toBe(5);
    expect(result[0].stats.last).toBe(5);

    expect(result[1].numbers).toEqual([-2]);
    expect(result[1].stats.count).toBe(1);
    expect(result[1].stats.total).toBe(-2);
    expect(result[1].stats.mean).toBe(-2);
    expect(result[1].stats.last).toBe(-2);

    expect(result[0].deltas.last).toBe(0);
    expect(result[1].deltas.last).toBe(-7);
    expect(result[0].percents.last).toBe(0);
    expect(result[1].percents.last).toBe(-140);
  });
});

describe('computeRunningAggregatePeriods', () => {
  it('computes running distributional cumulatives from primary metric values', () => {
    const days: DayEntry[] = [makeDayEntry('2026-01-01', [10, 30, 20])];
    const source = buildSingleNumberAggregates(days);
    const result = computeRunningAggregatePeriods(source, 'last');

    expect(result).toHaveLength(3);

    expect(result[0].cumulatives.median).toBe(10);
    expect(result[1].cumulatives.median).toBe(20);
    expect(result[2].cumulatives.median).toBe(20);

    expect(result[2].cumulatives.min).toBe(10);
    expect(result[2].cumulatives.max).toBe(30);
    expect(result[2].cumulatives.midrange).toBe(20);
  });

  it('preserves period-local primary metric in stats while updating other running metrics', () => {
    const days: DayEntry[] = [makeDayEntry('2026-01-01', [2, 4, 8])];
    const source = buildSingleNumberAggregates(days);
    const result = computeRunningAggregatePeriods(source, 'last');

    expect(result[0].stats.last).toBe(2);
    expect(result[1].stats.last).toBe(4);
    expect(result[2].stats.last).toBe(8);

    expect(result[2].stats.min).toBe(2);
    expect(result[2].stats.max).toBe(8);
    expect(result[2].stats.median).toBe(4);
  });
});
