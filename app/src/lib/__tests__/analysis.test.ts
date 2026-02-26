import { describe, it, expect } from 'vitest';
import { getTimeRange, getAvailablePresets, filterPeriodsByTimeRange, computeAnalysisData } from '../analysis';
import type { PeriodAggregateData } from '../period-aggregate';
import { createEmptyAggregate } from '../period-aggregate';

describe('analysis', () => {
  const testDate = new Date('2024-03-15T12:00:00Z');

  describe('getTimeRange', () => {
    it('should return last 7 days for day aggregation', () => {
      const range = getTimeRange('last-7-days', testDate);
      expect(range.endDate).toEqual(testDate);
      expect(range.startDate.getDate()).toBe(8); // 7 days before the 15th
    });

    it('should return this year range', () => {
      const range = getTimeRange('this-year', testDate);
      expect(range.startDate.getFullYear()).toBe(2024);
      expect(range.startDate.getMonth()).toBe(0); // January
      expect(range.startDate.getDate()).toBe(1);
      expect(range.endDate).toEqual(testDate);
    });

    it('should return custom range when provided', () => {
      const customRange = {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-02-01'),
      };
      const range = getTimeRange('custom', testDate, customRange);
      expect(range).toEqual(customRange);
    });

    it('should return this week for day aggregation', () => {
      const range = getTimeRange('this-week', testDate);
      // Week starts on Sunday
      expect(range.startDate.getDay()).toBe(0);
      expect(range.endDate).toEqual(testDate);
    });
  });

  describe('getAvailablePresets', () => {
    it('should return day-specific presets for day aggregation', () => {
      const presets = getAvailablePresets('day');
      const labels = presets.map(p => p.preset);
      expect(labels).toContain('last-7-days');
      expect(labels).toContain('last-30-days');
      expect(labels).toContain('this-week'); // available for day
      expect(labels).not.toContain('last-4-weeks'); // week only
    });

    it('should return week-specific presets for week aggregation', () => {
      const presets = getAvailablePresets('week');
      const labels = presets.map(p => p.preset);
      expect(labels).toContain('this-month');
      expect(labels).toContain('last-4-weeks');
      expect(labels).not.toContain('last-7-days'); // day only
    });

    it('should include all-time and custom for all aggregations', () => {
      const aggregations: Array<'day' | 'week' | 'month' | 'year'> = ['day', 'week', 'month', 'year'];
      aggregations.forEach(agg => {
        const presets = getAvailablePresets(agg);
        const labels = presets.map(p => p.preset);
        expect(labels).toContain('all-time');
        expect(labels).toContain('custom');
      });
    });
  });

  describe('filterPeriodsByTimeRange', () => {
    it('should filter periods within date range', () => {
      const periods: PeriodAggregateData<'day'>[] = [
        createEmptyAggregate('2024-01-01', 'day'),
        createEmptyAggregate('2024-01-15', 'day'),
        createEmptyAggregate('2024-02-01', 'day'),
        createEmptyAggregate('2024-02-15', 'day'),
      ];

      const filtered = filterPeriodsByTimeRange(periods, {
        startDate: new Date('2024-01-10'),
        endDate: new Date('2024-02-10'),
      });

      expect(filtered).toHaveLength(2);
      expect(filtered[0].dateKey).toBe('2024-01-15');
      expect(filtered[1].dateKey).toBe('2024-02-01');
    });

    it('should return empty array when no periods in range', () => {
      const periods: PeriodAggregateData<'day'>[] = [
        createEmptyAggregate('2024-01-01', 'day'),
      ];

      const filtered = filterPeriodsByTimeRange(periods, {
        startDate: new Date('2024-02-01'),
        endDate: new Date('2024-02-28'),
      });

      expect(filtered).toHaveLength(0);
    });
  });

  describe('computeAnalysisData', () => {
    it('should compute aggregated stats from periods', () => {
      const periods: PeriodAggregateData<'day'>[] = [
        { ...createEmptyAggregate('2024-01-01', 'day'), numbers: [1, 2, 3] },
        { ...createEmptyAggregate('2024-01-02', 'day'), numbers: [4, 5, 6] },
        { ...createEmptyAggregate('2024-01-03', 'day'), numbers: [7, 8, 9] },
      ];

      const result = computeAnalysisData(periods, {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-03'),
      });

      expect(result.periodCount).toBe(3);
      expect(result.dataPoints).toHaveLength(9);
      expect(result.stats?.count).toBe(9);
      expect(result.stats?.min).toBe(1);
      expect(result.stats?.max).toBe(9);
      expect(result.stats?.mean).toBe(5);
    });

    it('should calculate period count correctly', () => {
      const periods: PeriodAggregateData<'week'>[] = [
        createEmptyAggregate('2024-W01', 'week'),
        createEmptyAggregate('2024-W02', 'week'),
        createEmptyAggregate('2024-W03', 'week'),
        createEmptyAggregate('2024-W04', 'week'),
      ];

      const result = computeAnalysisData(periods, {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-28'),
      });

      expect(result.periodCount).toBeGreaterThan(0);
    });

    it('should calculate delta percents comparing range stats to prior period', () => {
      const periods: PeriodAggregateData<'day'>[] = [
        { 
          ...createEmptyAggregate('2024-01-01', 'day'), 
          numbers: [10],
          stats: { count: 1, total: 10, mean: 10, median: 10, min: 10, max: 10, first: 10, last: 10, range: 0, change: 0, changePercent: 0, mode: 10, slope: 0, midrange: 10, variance: 0, standardDeviation: 0, interquartileRange: 0 },
          cumulatives: { count: 1, total: 10, mean: 10, median: 10, min: 10, max: 10, first: 10, last: 10, range: 0, change: 0, changePercent: 0, mode: 10, slope: 0, midrange: 10, variance: 0, standardDeviation: 0, interquartileRange: 0 },
        },
        { 
          ...createEmptyAggregate('2024-01-02', 'day'), 
          numbers: [20],
          stats: { count: 1, total: 20, mean: 20, median: 20, min: 20, max: 20, first: 20, last: 20, range: 0, change: 0, changePercent: 0, mode: 20, slope: 0, midrange: 20, variance: 0, standardDeviation: 0, interquartileRange: 0 },
          cumulatives: { count: 2, total: 30, mean: 15, median: 15, min: 10, max: 20, first: 10, last: 20, range: 10, change: 10, changePercent: 100, mode: 10, slope: 10, midrange: 15, variance: 0, standardDeviation: 0, interquartileRange: 0 },
        },
        { 
          ...createEmptyAggregate('2024-01-03', 'day'), 
          numbers: [30],
          stats: { count: 1, total: 30, mean: 30, median: 30, min: 30, max: 30, first: 30, last: 30, range: 0, change: 0, changePercent: 0, mode: 30, slope: 0, midrange: 30, variance: 0, standardDeviation: 0, interquartileRange: 0 },
          cumulatives: { count: 3, total: 60, mean: 20, median: 20, min: 10, max: 30, first: 10, last: 30, range: 20, change: 20, changePercent: 200, mode: 10, slope: 10, midrange: 20, variance: 0, standardDeviation: 0, interquartileRange: 0 },
        },
      ];

      const result = computeAnalysisData(periods, {
        startDate: new Date('2024-01-02'),
        endDate: new Date('2024-01-03'),
      }, true);

      // Range contains days 2-3 with numbers [20, 30], total = 50
      // Prior period is day 1 with total = 10
      // Delta percent for total: (50 - 10) / 10 * 100 = 400%
      expect(result.stats?.total).toBe(50);
      expect(result.priorPeriod?.stats.total).toBe(10);
      expect(result.percents?.total).toBe(400);
    });

    it('should calculate cumulative percents comparing range stats to cumulative stats', () => {
      const periods: PeriodAggregateData<'day'>[] = [
        { 
          ...createEmptyAggregate('2024-01-01', 'day'), 
          numbers: [10],
          stats: { count: 1, total: 10, mean: 10, median: 10, min: 10, max: 10, first: 10, last: 10, range: 0, change: 0, changePercent: 0, mode: 10, slope: 0, midrange: 10, variance: 0, standardDeviation: 0, interquartileRange: 0 },
          cumulatives: { count: 1, total: 10, mean: 10, median: 10, min: 10, max: 10, first: 10, last: 10, range: 0, change: 0, changePercent: 0, mode: 10, slope: 0, midrange: 10, variance: 0, standardDeviation: 0, interquartileRange: 0 },
        },
        { 
          ...createEmptyAggregate('2024-01-02', 'day'), 
          numbers: [20],
          stats: { count: 1, total: 20, mean: 20, median: 20, min: 20, max: 20, first: 20, last: 20, range: 0, change: 0, changePercent: 0, mode: 20, slope: 0, midrange: 20, variance: 0, standardDeviation: 0, interquartileRange: 0 },
          cumulatives: { count: 2, total: 30, mean: 15, median: 15, min: 10, max: 20, first: 10, last: 20, range: 10, change: 10, changePercent: 100, mode: 10, slope: 10, midrange: 15, variance: 0, standardDeviation: 0, interquartileRange: 0 },
        },
        { 
          ...createEmptyAggregate('2024-01-03', 'day'), 
          numbers: [30],
          stats: { count: 1, total: 30, mean: 30, median: 30, min: 30, max: 30, first: 30, last: 30, range: 0, change: 0, changePercent: 0, mode: 30, slope: 0, midrange: 30, variance: 0, standardDeviation: 0, interquartileRange: 0 },
          cumulatives: { count: 3, total: 60, mean: 20, median: 20, min: 10, max: 30, first: 10, last: 30, range: 20, change: 20, changePercent: 200, mode: 10, slope: 10, midrange: 20, variance: 0, standardDeviation: 0, interquartileRange: 0 },
        },
      ];

      const result = computeAnalysisData(periods, {
        startDate: new Date('2024-01-02'),
        endDate: new Date('2024-01-03'),
      }, true);

      // Range contains days 2-3, cumulative at end of range = 60
      // Prior period (day 1) has cumulative = 10
      // Cumulative percent for total: (60 - 10) / 10 * 100 = 500%
      expect(result.stats?.total).toBe(50);
      expect(result.cumulatives?.total).toBe(60);
      expect(result.priorPeriod?.cumulatives.total).toBe(10);
      expect(result.cumulativePercents?.total).toBe(500);
    });

    it('should show negative cumulative percent when cumulative decreases', () => {
      const periods: PeriodAggregateData<'month'>[] = [
        { 
          ...createEmptyAggregate('2024-11', 'month'), 
          numbers: [-7400],
          stats: { count: 1, total: -7400, mean: -7400, median: -7400, min: -7400, max: -7400, first: -7400, last: -7400, range: 0, change: 0, changePercent: 0, mode: -7400, slope: 0, midrange: -7400, variance: 0, standardDeviation: 0, interquartileRange: 0 },
          cumulatives: { count: 1, total: -7400, mean: -7400, median: -7400, min: -7400, max: -7400, first: -7400, last: -7400, range: 0, change: 0, changePercent: 0, mode: -7400, slope: 0, midrange: -7400, variance: 0, standardDeviation: 0, interquartileRange: 0 },
        },
        { 
          ...createEmptyAggregate('2024-12', 'month'), 
          numbers: [-10900],
          stats: { count: 1, total: -10900, mean: -10900, median: -10900, min: -10900, max: -10900, first: -10900, last: -10900, range: 0, change: 0, changePercent: 0, mode: -10900, slope: 0, midrange: -10900, variance: 0, standardDeviation: 0, interquartileRange: 0 },
          cumulatives: { count: 2, total: -18300, mean: -9150, median: -9150, min: -10900, max: -7400, first: -7400, last: -10900, range: 3500, change: -3500, changePercent: 47.3, mode: -7400, slope: -3500, midrange: -9150, variance: 0, standardDeviation: 0, interquartileRange: 0 },
        },
        { 
          ...createEmptyAggregate('2025-01', 'month'), 
          numbers: [-11000],
          stats: { count: 1, total: -11000, mean: -11000, median: -11000, min: -11000, max: -11000, first: -11000, last: -11000, range: 0, change: 0, changePercent: 0, mode: -11000, slope: 0, midrange: -11000, variance: 0, standardDeviation: 0, interquartileRange: 0 },
          cumulatives: { count: 3, total: -29300, mean: -9767, median: -10900, min: -11000, max: -7400, first: -7400, last: -11000, range: 3600, change: -3600, changePercent: 48.6, mode: -7400, slope: -1800, midrange: -9200, variance: 0, standardDeviation: 0, interquartileRange: 0 },
        },
      ];

      const result = computeAnalysisData(periods, {
        startDate: new Date('2024-12-01'),
        endDate: new Date('2025-01-31'),
      }, true);

      // Range: Dec 2024 - Jan 2025, total = -21900
      // Cumulative at end (Jan 2025): -29300
      // Prior cumulative (Nov 2024): -7400
      // Cumulative percent: (-29300 - (-7400)) / |-7400| * 100 = -21900 / 7400 * 100 = -295.95%
      expect(result.stats?.total).toBe(-21900);
      expect(result.cumulatives?.total).toBe(-29300);
      expect(result.priorPeriod?.cumulatives.total).toBe(-7400);
      expect(result.cumulativePercents?.total).toBeCloseTo(-295.95, 1);
    });
  });
});
