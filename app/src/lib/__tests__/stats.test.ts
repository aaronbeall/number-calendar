import { describe, expect, it } from 'vitest';
import {
  calculateExtremes,
  computeCumulatives,
  computeMetricStats,
  computeNumberStats,
  computePeriodDerivedStats,
  computeStatsDeltas,
  computeStatsPercents,
  emptyStats,
} from '../stats';

describe('stats', () => {
  describe('computeNumberStats', () => {
    it('computes stats for a number list', () => {
      const stats = computeNumberStats([1, 2, 3]);
      expect(stats).toEqual({
        count: 3,
        total: 6,
        mean: 2,
        median: 2,
        min: 1,
        max: 3,
        first: 1,
        last: 3,
        range: 2,
        change: 2,
        changePercent: 200,
        mode: 1,
        slope: 1,
        midrange: 2,
        variance: 0.6666666666666666,
        standardDeviation: 0.816496580927726,
        interquartileRange: 2,
      });
    });

    it('returns null for empty input', () => {
      expect(computeNumberStats([])).toBeNull();
    });
  });

  describe('computeMetricStats', () => {
    it('computes stats for a specific metric', () => {
      const statsA = computeNumberStats([1, 3]);
      const statsB = computeNumberStats([2, 4]);
      const result = computeMetricStats([statsA!, statsB!], 'total');
      expect(result).toEqual({
        count: 2,
        total: 10,
        mean: 5,
        median: 5,
        min: 4,
        max: 6,
        first: 4,
        last: 6,
        range: 2,
        change: 2,
        changePercent: 50,
        mode: 4,
        slope: 2,
        midrange: 5,
        variance: 1,
        standardDeviation: 1,
        interquartileRange: 2,
      });
    });

    it('returns null when no stats are provided', () => {
      expect(computeMetricStats([], 'total')).toBeNull();
    });
  });

  describe('calculateExtremes', () => {
    it('returns undefined for empty or single item lists', () => {
      const stats = computeNumberStats([1, 2, 3]);
      expect(calculateExtremes([])).toBeUndefined();
      expect(calculateExtremes([stats!])).toBeUndefined();
    });

    it('computes extremes across stats', () => {
      const statsA = computeNumberStats([1, 3]);
      const statsB = computeNumberStats([5, 10]);
      const extremes = calculateExtremes([statsA!, statsB!]);
      expect(extremes?.highestTotal).toBe(15);
      expect(extremes?.lowestTotal).toBe(4);
      expect(extremes?.highestMax).toBe(10);
      expect(extremes?.lowestMin).toBe(1);
      expect(extremes?.highestMean).toBe(7.5);
      expect(extremes?.lowestMean).toBe(2);
    });
  });

  describe('computeStatsDeltas', () => {
    it('uses the current first value as baseline when prior is null', () => {
      const current = computeNumberStats([10, 20, 30])!;
      const delta = computeStatsDeltas(current, null);
      expect(delta.total).toBe(50);
      expect(delta.mean).toBe(10);
      expect(delta.change).toBe(20);
    });

    it('computes deltas against a prior stats object', () => {
      const current = computeNumberStats([10, 20, 30])!;
      const prior = computeNumberStats([5, 5])!;
      const delta = computeStatsDeltas(current, prior);
      expect(delta.total).toBe(50);
      expect(delta.mean).toBe(15);
    });
  });

  describe('computeStatsPercents', () => {
    it('uses the current first value as baseline when prior is null', () => {
      const current = computeNumberStats([10, 20, 30])!;
      const percents = computeStatsPercents(current, null);
      expect(percents.total).toBe(500);
      expect(percents.mean).toBe(100);
    });

    it('returns undefined percent when baseline is zero', () => {
      const current = computeNumberStats([0, 10])!;
      const percents = computeStatsPercents(current, null);
      expect(percents.total).toBeUndefined();
      expect(percents.mean).toBeUndefined();
    });
  });

  describe('computePeriodDerivedStats', () => {
    it('uses stats as cumulatives when no prior cumulatives', () => {
      const derived = computePeriodDerivedStats([2, 4], null, null);
      const stats = computeNumberStats([2, 4])!;
      expect(derived.stats).toEqual(stats);
      expect(derived.cumulatives).toEqual(stats);
      expect(derived.cumulativeDeltas).toEqual(emptyStats());
      expect(derived.cumulativePercents).toEqual({});
    });

    it('computes deltas and percents against prior stats', () => {
      const currentStats = computeNumberStats([10, 20, 30])!;
      const priorStats = computeNumberStats([5, 5])!;
      const derived = computePeriodDerivedStats([10, 20, 30], priorStats, null);

      const expectedDeltas = computeStatsDeltas(currentStats, priorStats);
      const expectedPercents = computeStatsPercents(currentStats, priorStats);
      expect(derived.deltas).toEqual(expectedDeltas);
      expect(derived.percents).toEqual(expectedPercents);
    });

    it('builds cumulatives from prior cumulative stats and current numbers', () => {
      const priorCumulatives = computeNumberStats([6, 4])!; // total = 10
      const derived = computePeriodDerivedStats([2, 4], null, priorCumulatives);

      expect(derived.cumulatives.total).toBe(16);
      expect(derived.cumulatives.count).toBe(4);
      expect(derived.cumulatives.mean).toBe(4);
      expect(derived.cumulatives.min).toBe(2);
      expect(derived.cumulatives.max).toBe(6);

      const expectedDeltas = computeStatsDeltas(derived.cumulatives, priorCumulatives);
      const expectedPercents = computeStatsPercents(derived.cumulatives, priorCumulatives);

      expect(derived.cumulativeDeltas).toEqual(expectedDeltas);
      expect(derived.cumulativePercents).toEqual(expectedPercents);
    });

    it('returns empty stats for empty numbers', () => {
      const derived = computePeriodDerivedStats([], null, null);
      const stats = emptyStats();
      expect(derived.stats).toEqual(stats);
      expect(derived.deltas).toEqual(computeStatsDeltas(stats, null));
    });
  });

  describe('computeCumulatives', () => {
    it('accumulates totals and counts across periods', () => {
      const prior = computeNumberStats([6, 4])!; // total 10, count 2
      const cumulatives = computeCumulatives([2, 4], prior);

      expect(cumulatives.total).toBe(16);
      expect(cumulatives.count).toBe(4);
      expect(cumulatives.mean).toBe(4);
      expect(cumulatives.first).toBe(6);
      expect(cumulatives.last).toBe(4);
    });
  });
});
