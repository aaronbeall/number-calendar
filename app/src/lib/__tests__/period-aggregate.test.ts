import type { PeriodAggregateData } from '@/lib/period-aggregate';
import { buildPriorAggregateMap, createEmptyAggregate } from '@/lib/period-aggregate';

const makeDayAggregate = (dateKey: PeriodAggregateData<'day'>['dateKey'], numbers: number[]): PeriodAggregateData<'day'> => {
  const aggregate = createEmptyAggregate(dateKey, 'day');
  return { ...aggregate, numbers };
};

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
