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
  });
});
