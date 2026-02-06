import { describe, expect, it } from 'vitest';
import {
  calculateExtremes,
  computeMetricStats,
  computeNumberStats,
  getStatsDelta,
  getStatsPercentChange,
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

  describe('getStatsDelta', () => {
    it('uses the current first value as baseline when prior is null', () => {
      const current = computeNumberStats([10, 20, 30])!;
      const delta = getStatsDelta(current, null);
      expect(delta.total).toBe(50);
      expect(delta.mean).toBe(10);
      expect(delta.change).toBe(20);
    });

    it('computes deltas against a prior stats object', () => {
      const current = computeNumberStats([10, 20, 30])!;
      const prior = computeNumberStats([5, 5])!;
      const delta = getStatsDelta(current, prior);
      expect(delta.total).toBe(50);
      expect(delta.mean).toBe(15);
    });
  });

  describe('getStatsPercentChange', () => {
    it('uses the current first value as baseline when prior is null', () => {
      const current = computeNumberStats([10, 20, 30])!;
      const percents = getStatsPercentChange(current, null);
      expect(percents.total).toBe(500);
      expect(percents.mean).toBe(100);
    });

    it('returns undefined percent when baseline is zero', () => {
      const current = computeNumberStats([0, 10])!;
      const percents = getStatsPercentChange(current, null);
      expect(percents.total).toBeUndefined();
      expect(percents.mean).toBeUndefined();
    });
  });
});
