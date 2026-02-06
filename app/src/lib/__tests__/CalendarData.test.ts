import { beforeEach, describe, expect, test } from 'vitest';
import { CalendarData, type CalendarPeriodData } from '../CalendarData';
import type { DayEntry, DayKey } from '@/features/db/localdb';
import { emptyStats } from '../stats';

/**
 * CSV format: {dateKey,...values}
 * Example:
 * 2023-10-15,42,51,9
 * 2023-10-16,36
 * 2023-10-17,
 */
function generateMockDayEntriesFromCSV(csv: string): DayEntry[] {
  const allDays: DayEntry[] = [];
  const lines = csv.trim().split('\n');
  for (const line of lines) {
    const [date, ...valueStrs] = line.trim().split(',') as [DayKey, ...string[]];
    const values = valueStrs.map(v => v.trim()).filter(v => v.length > 0).map(v => Number(v));
    allDays.push({
      datasetId: 'mock-dataset',
      date,
      numbers: values,
    });
  }
  return allDays;
}

function generateMockCalendarDataFromCSV(csv: string): CalendarData {
  const calendarData = new CalendarData();
  calendarData.setDays(generateMockDayEntriesFromCSV(csv));
  return calendarData;
}

describe('CalendarData', () => {
  describe('setDays', () => {
    test('should no-op when day references are unchanged', () => {
      const days = generateMockDayEntriesFromCSV(`
        2025-01-01,10,20
        2025-01-02,30
      `);

      const calendarData = new CalendarData();
      calendarData.setDays(days);

      const first = calendarData.getDayData('2025-01-01');

      calendarData.setDays(days);

      const second = calendarData.getDayData('2025-01-01');
      expect(second).toBe(first);
    });

    test('should rebuild priors when a new day is added', () => {
      const initialDays = generateMockDayEntriesFromCSV(`
        2025-01-02,20
      `);
      const calendarData = new CalendarData();
      calendarData.setDays(initialDays);

      const day2Before = calendarData.getDayData('2025-01-02');
      expect(day2Before.deltas?.total).toBe(0);

      const nextDays = generateMockDayEntriesFromCSV(`
        2025-01-01,10
        2025-01-02,20
      `);

      calendarData.setDays(nextDays);

      const day2After = calendarData.getDayData('2025-01-02');
      expect(day2After.deltas?.total).toBe(10);
    });

    test('should invalidate following ranges after updates', () => {
      const initialDays = generateMockDayEntriesFromCSV(`
        2025-01-01,10
        2025-01-02,20
        2025-01-03,30
        2025-01-04,40
      `);
      const calendarData = new CalendarData();
      calendarData.setDays(initialDays);

      const day1Before = calendarData.getDayData('2025-01-01');
      const day4Before = calendarData.getDayData('2025-01-04');

      const nextDays: DayEntry[] = [
        initialDays[0],
        initialDays[1],
        { ...initialDays[2], numbers: [300] },
        initialDays[3],
      ];

      calendarData.setDays(nextDays);

      const day1After = calendarData.getDayData('2025-01-01');
      const day4After = calendarData.getDayData('2025-01-04');

      expect(day1After).toBe(day1Before);
      expect(day4After).not.toBe(day4Before);
      expect(day4After.cumulatives.total).toBe(370); // 10 + 20 + 300 + 40
    });
  });
  
  describe('getDayData', () => {
    test('should return expected day data', () => {
      const calendarData = generateMockCalendarDataFromCSV(`
        2025-01-01,10,20,30
        2025-01-02,40,50
        2025-01-03,60
      `);
      
      const dayData = calendarData.getDayData('2025-01-02');

      expect(dayData.dateKey).toBe('2025-01-02');
      expect(dayData.period).toBe('day');
      expect(dayData.numbers).toEqual([40, 50]);
      expect(dayData.stats).toEqual({
        count: 2,
        total: 90,
        mean: 45,
        median: 45,
        min: 40,
        max: 50,
        first: 40,
        last: 50,
        range: 10,
        change: 10,
        changePercent: 25,
      });
      expect(dayData.deltas?.total).toBe(30);
      expect(dayData.percents?.total).toBe(50);
      expect(dayData.cumulatives.total).toBe(150);
      expect(dayData.cumulativeDeltas?.total).toBe(90);
      expect(dayData.cumulativePercents?.total).toBe(150);
    });

    test('should compute deltas relative to prior day', () => {
      const calendarData = generateMockCalendarDataFromCSV(`
        2025-01-01,10,20
        2025-01-02,40,50
      `);
      
      const day1 = calendarData.getDayData('2025-01-01');
      const day2 = calendarData.getDayData('2025-01-02');
      
      // Day 1 has no prior, baseline uses the first value
      expect(day1.deltas?.total).toBe(20); // 30 - 10
      expect(day1.percents?.total).toBe(200); // (30 - 10) / 10 * 100
      
      // Day 2 has day 1 as prior
      expect(day2.deltas?.total).toBe(60); // 90 - 30
      expect(day2.percents?.total).toBe(200); // (90 - 30) / 30 * 100
    });

    test('should compute cumulatives including all prior days', () => {
      const calendarData = generateMockCalendarDataFromCSV(`
        2025-01-01,10
        2025-01-02,20
        2025-01-03,30
      `);
      
      const day1 = calendarData.getDayData('2025-01-01');
      const day2 = calendarData.getDayData('2025-01-02');
      const day3 = calendarData.getDayData('2025-01-03');
      
      expect(day1.cumulatives.total).toBe(10);
      expect(day2.cumulatives.total).toBe(30); // 10 + 20
      expect(day3.cumulatives.total).toBe(60); // 30 + 30
    });

    test('should update day data when day is modified', () => {
      const calendarData = generateMockCalendarDataFromCSV(`
        2025-01-01,10
        2025-01-02,20
      `);
      
      const originalDay2 = calendarData.getDayData('2025-01-02');
      expect(originalDay2.stats.total).toBe(20);
      
      calendarData.setDay({
        datasetId: 'mock-dataset',
        date: '2025-01-02',
        numbers: [30, 40],
      });
      
      const updatedDay2 = calendarData.getDayData('2025-01-02');
      expect(updatedDay2.stats.total).toBe(70);
    });

    test('should not include data from other days', () => {
      const calendarData = generateMockCalendarDataFromCSV(`
        2025-01-01,10
        2025-01-02,20
        2025-01-03,30
      `);
      
      const day2 = calendarData.getDayData('2025-01-02');
      expect(day2.numbers).toEqual([20]);
      expect(day2.stats.total).toBe(20);
      expect(day2.deltas?.total).toBe(10);
    });
  });

  describe('getWeekData', () => {
    test('should return expected week data with all days', () => {
      // Week of Jan 5, 2025 (Sunday) through Jan 11, 2025 (Saturday)
      const calendarData = generateMockCalendarDataFromCSV(`
        2025-01-06,10
        2025-01-07,20
        2025-01-08,30
      `);
      
      const weekData = calendarData.getWeekData('2025-W02');
      
      expect(weekData.dateKey).toBe('2025-W02');
      expect(weekData.period).toBe('week');
      expect(weekData.days).toBeDefined();
      expect(weekData.days?.length).toBe(7);
      expect(weekData.days).toContain('2025-01-06');
      expect(weekData.days).toContain('2025-01-07');
      expect(weekData.days).toContain('2025-01-08');
      expect(weekData.numbers).toEqual([10, 20, 30]);
      expect(weekData.numbers.length).toBe(3);
      expect(weekData.stats).toEqual({
        count: 3,
        total: 60,
        mean: 20,
        median: 20,
        min: 10,
        max: 30,
        first: 10,
        last: 30,
        range: 20,
        change: 20,
        changePercent: 200,
      });
      expect(weekData.deltas?.total).toBe(50); // 60 - 10
      expect(weekData.percents?.total).toBe(500); // (60 - 10) / 10 * 100
      expect(weekData.cumulatives.total).toBe(60);
      expect(weekData.extremes).toBeDefined();
    });

    test('should compute deltas relative to prior week', () => {
      // Use dates that are clearly in different weeks
      const calendarData = generateMockCalendarDataFromCSV(`
        2025-01-06,10
        2025-01-13,20
      `);
      
      const week1 = calendarData.getWeekData('2025-W02');
      const week2 = calendarData.getWeekData('2025-W03');
      
      expect(week1.deltas).toEqual(emptyStats());
      expect(week2.deltas?.total).toBe(10); // 20 - 10
    });

    test('should compute cumulatives across weeks', () => {
      const calendarData = generateMockCalendarDataFromCSV(`
        2025-01-06,10
        2025-01-13,20
        2025-01-20,30
      `);
      
      const week1 = calendarData.getWeekData('2025-W02');
      const week2 = calendarData.getWeekData('2025-W03');
      const week3 = calendarData.getWeekData('2025-W04');
      
      expect(week1.cumulatives.total).toBe(10);
      expect(week2.cumulatives.total).toBe(30);
      expect(week3.cumulatives.total).toBe(60);
    });

    test('should not include data from other weeks', () => {
      const calendarData = generateMockCalendarDataFromCSV(`
        2025-01-06,10
        2025-01-13,20
      `);
      
      const week1 = calendarData.getWeekData('2025-W02');
      expect(week1.numbers).toEqual([10]);
      expect(week1.stats.total).toBe(10);
    });

    test('should update week data when day in week is modified', () => {
      const calendarData = generateMockCalendarDataFromCSV(`
        2025-01-06,10
        2025-01-07,20
      `);
      
      const originalWeek = calendarData.getWeekData('2025-W02');
      expect(originalWeek.stats.total).toBe(30);
      
      calendarData.setDay({
        datasetId: 'mock-dataset',
        date: '2025-01-06',
        numbers: [50],
      });
      
      const updatedWeek = calendarData.getWeekData('2025-W02');
      expect(updatedWeek.stats.total).toBe(70);
    });

    test('should calculate extremes from days in week', () => {
      const calendarData = generateMockCalendarDataFromCSV(`
        2025-01-06,10,20
        2025-01-07,30,40
        2025-01-08,5,50
      `);
      
      const weekData = calendarData.getWeekData('2025-W02');
      
      expect(weekData.extremes?.highestTotal).toBe(70); // Jan 7
      expect(weekData.extremes?.lowestTotal).toBe(0); // Empty days in the week
      expect(weekData.extremes?.highestMax).toBe(50); // Jan 8
      expect(weekData.extremes?.lowestMin).toBe(0); // Empty days
    });
  });

  describe('getMonthData', () => {
    test('should return expected month data with all days', () => {
      const calendarData = generateMockCalendarDataFromCSV(`
        2025-01-01,10
        2025-01-15,20
        2025-01-31,30
      `);
      
      const monthData = calendarData.getMonthData('2025-01');
      
      expect(monthData.dateKey).toBe('2025-01');
      expect(monthData.period).toBe('month');
      expect(monthData.days).toBeDefined();
      expect(monthData.days?.length).toBe(31);
      expect(monthData.days).toContain('2025-01-01');
      expect(monthData.days).toContain('2025-01-15');
      expect(monthData.days).toContain('2025-01-31');
      expect(monthData.weeks).toBeDefined();
      expect(monthData.weeks?.length).toBeGreaterThan(3);
      expect(monthData.weeks).toContain('2025-W01');
      expect(monthData.numbers).toEqual([10, 20, 30]);
      expect(monthData.numbers.length).toBe(3);
      expect(monthData.stats).toEqual({
        count: 3,
        total: 60,
        mean: 20,
        median: 20,
        min: 10,
        max: 30,
        first: 10,
        last: 30,
        range: 20,
        change: 20,
        changePercent: 200,
      });
      expect(monthData.deltas?.total).toBe(50); // 60 - 10
      expect(monthData.percents?.total).toBe(500); // (60 - 10) / 10 * 100
      expect(monthData.cumulatives.total).toBe(60);
      expect(monthData.extremes).toBeDefined();
    });

    test('should compute deltas relative to prior month', () => {
      const calendarData = generateMockCalendarDataFromCSV(`
        2025-01-15,100
        2025-02-15,150
      `);
      
      const month1 = calendarData.getMonthData('2025-01');
      const month2 = calendarData.getMonthData('2025-02');
      
      expect(month1.deltas).toEqual(emptyStats());
      expect(month2.deltas?.total).toBe(50);
      expect(month2.percents?.total).toBe(50);
    });

    test('should compute cumulatives across months', () => {
      const calendarData = generateMockCalendarDataFromCSV(`
        2025-01-15,100
        2025-02-15,200
        2025-03-15,300
      `);
      
      const month1 = calendarData.getMonthData('2025-01');
      const month2 = calendarData.getMonthData('2025-02');
      const month3 = calendarData.getMonthData('2025-03');
      
      expect(month1.cumulatives.total).toBe(100);
      expect(month2.cumulatives.total).toBe(300);
      expect(month3.cumulatives.total).toBe(600);
    });

    test('should not include data from other months', () => {
      const calendarData = generateMockCalendarDataFromCSV(`
        2025-01-31,10
        2025-02-01,20
      `);
      
      const jan = calendarData.getMonthData('2025-01');
      const feb = calendarData.getMonthData('2025-02');
      
      expect(jan.numbers).toEqual([10]);
      expect(jan.stats.total).toBe(10);
      expect(feb.numbers).toEqual([20]);
      expect(feb.stats.total).toBe(20);
    });

    test('should update month data when day in month is modified', () => {
      const calendarData = generateMockCalendarDataFromCSV(`
        2025-01-01,10
        2025-01-15,20
      `);
      
      const originalMonth = calendarData.getMonthData('2025-01');
      expect(originalMonth.stats.total).toBe(30);
      
      calendarData.setDay({
        datasetId: 'mock-dataset',
        date: '2025-01-15',
        numbers: [100],
      });
      
      const updatedMonth = calendarData.getMonthData('2025-01');
      expect(updatedMonth.stats.total).toBe(110);
    });

    test('should calculate extremes from days in month', () => {
      const calendarData = generateMockCalendarDataFromCSV(`
        2025-01-01,10,20
        2025-01-15,30,40
        2025-01-31,5,100
      `);
      
      const monthData = calendarData.getMonthData('2025-01');
      
      expect(monthData.extremes?.highestTotal).toBe(105); // Jan 31
      expect(monthData.extremes?.lowestTotal).toBe(0); // Empty days in month
      expect(monthData.extremes?.highestMax).toBe(100); // Jan 31
      expect(monthData.extremes?.lowestMin).toBe(0); // Empty days
    });
  });

  describe('getYearData', () => {
    test('should return expected year data with all days', () => {
      const calendarData = generateMockCalendarDataFromCSV(`
        2025-01-01,10
        2025-06-15,20
        2025-12-31,30
      `);
      
      const yearData = calendarData.getYearData('2025');
      
      expect(yearData.dateKey).toBe('2025');
      expect(yearData.period).toBe('year');
      expect(yearData.days).toBeDefined();
      expect(yearData.days?.length).toBe(365);
      expect(yearData.days).toContain('2025-01-01');
      expect(yearData.days).toContain('2025-06-15');
      expect(yearData.days).toContain('2025-12-31');
      expect(yearData.weeks).toBeDefined();
      expect(yearData.weeks?.length).toBeGreaterThan(50);
      expect(yearData.weeks).toContain('2025-W01');
      expect(yearData.months).toBeDefined();
      expect(yearData.months?.length).toBe(12);
      expect(yearData.months).toContain('2025-01');
      expect(yearData.months).toContain('2025-06');
      expect(yearData.months).toContain('2025-12');
      expect(yearData.numbers).toEqual([10, 20, 30]);
      expect(yearData.numbers.length).toBe(3);
      expect(yearData.stats).toEqual({
        count: 3,
        total: 60,
        mean: 20,
        median: 20,
        min: 10,
        max: 30,
        first: 10,
        last: 30,
        range: 20,
        change: 20,
        changePercent: 200,
      });
      expect(yearData.deltas?.total).toBe(50); // 60 - 10
      expect(yearData.percents?.total).toBe(500); // (60 - 10) / 10 * 100
      expect(yearData.cumulatives.total).toBe(60);
      expect(yearData.extremes).toBeDefined();
    });

    test('should compute deltas relative to prior year', () => {
      const calendarData = generateMockCalendarDataFromCSV(`
        2024-06-15,100
        2025-06-15,200
      `);
      
      const year2024 = calendarData.getYearData('2024');
      const year2025 = calendarData.getYearData('2025');
      
      expect(year2024.deltas).toEqual(emptyStats());
      expect(year2025.deltas?.total).toBe(100);
      expect(year2025.percents?.total).toBe(100);
    });

    test('should compute cumulatives across years', () => {
      const calendarData = generateMockCalendarDataFromCSV(`
        2023-01-01,100
        2024-01-01,200
        2025-01-01,300
      `);
      
      const year2023 = calendarData.getYearData('2023');
      const year2024 = calendarData.getYearData('2024');
      const year2025 = calendarData.getYearData('2025');
      
      expect(year2023.cumulatives.total).toBe(100);
      expect(year2024.cumulatives.total).toBe(300);
      expect(year2025.cumulatives.total).toBe(600);
    });

    test('should not include data from other years', () => {
      const calendarData = generateMockCalendarDataFromCSV(`
        2024-12-31,10
        2025-01-01,20
      `);
      
      const year2024 = calendarData.getYearData('2024');
      const year2025 = calendarData.getYearData('2025');
      
      expect(year2024.numbers).toEqual([10]);
      expect(year2024.stats.total).toBe(10);
      expect(year2025.numbers).toEqual([20]);
      expect(year2025.stats.total).toBe(20);
    });

    test('should calculate extremes from days in year', () => {
      const calendarData = generateMockCalendarDataFromCSV(`
        2025-01-01,10,20
        2025-06-15,30,40
        2025-12-31,5,100
      `);
      const yearData = calendarData.getYearData('2025');
      expect(yearData.extremes?.highestTotal).toBe(105); // Dec 31
      expect(yearData.extremes?.lowestTotal).toBe(0); // Empty days in year
      expect(yearData.extremes?.highestMax).toBe(100); // Dec 31
      expect(yearData.extremes?.lowestMin).toBe(0); // Empty days
    });

    test('should update year data when day in year is modified', () => {
      const calendarData = generateMockCalendarDataFromCSV(`
        2025-01-01,10
        2025-06-15,20
      `);
      
      const originalYear = calendarData.getYearData('2025');
      expect(originalYear.stats.total).toBe(30);
      
      calendarData.setDay({
        datasetId: 'mock-dataset',
        date: '2025-06-15',
        numbers: [100],
      });
      
      const updatedYear = calendarData.getYearData('2025');
      expect(updatedYear.stats.total).toBe(110);
    });
  });

  describe('getAlltimeData', () => {
    test('should return expected alltime data with all days', () => {
      const calendarData = generateMockCalendarDataFromCSV(`
        2023-01-01,10
        2024-06-15,20
        2025-12-31,30
      `);
      
      const alltimeData = calendarData.getAlltimeData();
      
      expect(alltimeData.dateKey).toBeNull();
      expect(alltimeData.period).toBe('anytime');
      expect(alltimeData.numbers).toEqual([10, 20, 30]);
      expect(alltimeData.stats.total).toBe(60);
      expect(alltimeData.extremes).toBeDefined();
    });

    test('should have no deltas or percents (no prior period)', () => {
      const calendarData = generateMockCalendarDataFromCSV(`
        2025-01-01,10
      `);
      
      const alltimeData = calendarData.getAlltimeData();
      
      expect(alltimeData.deltas).toEqual(emptyStats());
      expect(alltimeData.percents).toEqual({});
    });

    test('should have cumulatives equal to stats', () => {
      const calendarData = generateMockCalendarDataFromCSV(`
        2025-01-01,10,20,30
      `);
      
      const alltimeData = calendarData.getAlltimeData();
      
      expect(alltimeData.cumulatives).toEqual(alltimeData.stats);
    });

    test('should update alltime data when any day is modified', () => {
      const calendarData = generateMockCalendarDataFromCSV(`
        2025-01-01,10
        2025-06-15,20
      `);
      
      const originalAlltime = calendarData.getAlltimeData();
      expect(originalAlltime.stats.total).toBe(30);
      
      calendarData.setDay({
        datasetId: 'mock-dataset',
        date: '2025-06-15',
        numbers: [100],
      });
      
      const updatedAlltime = calendarData.getAlltimeData();
      expect(updatedAlltime.stats.total).toBe(110);
    });
  });

  describe('cache invalidation', () => {
    test('should maintain stable cache references for unchanged prior days', () => {
      const calendarData = generateMockCalendarDataFromCSV(`
        2025-01-01,10
        2025-01-02,20
        2025-01-03,30
      `);
      
      const day1Before = calendarData.getDayData('2025-01-01');
      const day2Before = calendarData.getDayData('2025-01-02');
      
      // Update day 3
      calendarData.setDay({
        datasetId: 'mock-dataset',
        date: '2025-01-03',
        numbers: [100],
      });
      
      const day1After = calendarData.getDayData('2025-01-01');
      const day2After = calendarData.getDayData('2025-01-02');
      
      // Cache references for prior days should remain the same
      expect(day1After).toBe(day1Before);
      expect(day2After).toBe(day2Before);
    });

    test('should invalidate cumulatives for all following days', () => {
      const calendarData = generateMockCalendarDataFromCSV(`
        2025-01-01,10
        2025-01-02,20
        2025-01-03,30
      `);
      
      const day2Before = calendarData.getDayData('2025-01-02');
      const day3Before = calendarData.getDayData('2025-01-03');
      
      expect(day2Before.cumulatives.total).toBe(30);
      expect(day3Before.cumulatives.total).toBe(60);
      
      // Update day 1
      calendarData.setDay({
        datasetId: 'mock-dataset',
        date: '2025-01-01',
        numbers: [100],
      });
      
      const day2After = calendarData.getDayData('2025-01-02');
      const day3After = calendarData.getDayData('2025-01-03');

      // Caches for day 2 and day 3 should be different objects since cumulatives changed
      expect(day2After).not.toBe(day2Before);
      expect(day3After).not.toBe(day3Before);
      
      // Cumulatives should be updated to reflect the change
      expect(day2After.cumulatives.total).toBe(120); // 100 + 20
      expect(day3After.cumulatives.total).toBe(150); // 120 + 30
    });

    test('should invalidate parent period caches when day is updated', () => {
      const calendarData = generateMockCalendarDataFromCSV(`
        2025-01-06,10
        2025-01-07,20
      `);
      
      const weekBefore = calendarData.getWeekData('2025-W02');
      const monthBefore = calendarData.getMonthData('2025-01');
      const yearBefore = calendarData.getYearData('2025');
      
      expect(weekBefore.stats.total).toBe(30);
      expect(monthBefore.stats.total).toBe(30);
      expect(yearBefore.stats.total).toBe(30);
      
      calendarData.setDay({
        datasetId: 'mock-dataset',
        date: '2025-01-06',
        numbers: [100],
      });
      
      const weekAfter = calendarData.getWeekData('2025-W02');
      const monthAfter = calendarData.getMonthData('2025-01');
      const yearAfter = calendarData.getYearData('2025');
      
      expect(weekAfter.stats.total).toBe(120);
      expect(monthAfter.stats.total).toBe(120);
      expect(yearAfter.stats.total).toBe(120);
    });

    test('should not invalidate unaffected periods', () => {
      const calendarData = generateMockCalendarDataFromCSV(`
        2025-01-06,10
        2025-02-06,20
      `);
      
      const week1Before = calendarData.getWeekData('2025-W02');
      const month1Before = calendarData.getMonthData('2025-01');
      
      expect(week1Before.stats.total).toBe(10);
      expect(month1Before.stats.total).toBe(10);
      
      // Update a day in February
      calendarData.setDay({
        datasetId: 'mock-dataset',
        date: '2025-02-06',
        numbers: [100],
      });
      
      const week1After = calendarData.getWeekData('2025-W02');
      const month1After = calendarData.getMonthData('2025-01');

      // Cache references should be the same since they are unaffected
      expect(week1After).toBe(week1Before);
      expect(month1After).toBe(month1Before);
      
      // January week and month should remain unchanged
      expect(week1After.stats.total).toBe(10);
      expect(month1After.stats.total).toBe(10);
    });

    test('should not recompute stats if numbers have not changed', () => {
      const calendarData = generateMockCalendarDataFromCSV(`
        2025-01-01,10,20
      `);
      
      const day1Before = calendarData.getDayData('2025-01-01');
      expect(day1Before.stats.total).toBe(30);
      
      // Set the same numbers
      calendarData.setDay({
        datasetId: 'mock-dataset',
        date: '2025-01-01',
        numbers: [10, 20],
      });
      
      const day1After = calendarData.getDayData('2025-01-01');
      
      // Stats should remain the same
      expect(day1After.stats.total).toBe(30);
    });

    test('should handle adding a new day and update prior maps', () => {
      const calendarData = generateMockCalendarDataFromCSV(`
        2025-01-01,10
        2025-01-03,30
      `);
      
      const day3Before = calendarData.getDayData('2025-01-03');
      expect(day3Before.deltas?.total).toBe(20); // 30 - 10
      
      // Add a new day in between
      calendarData.setDay({
        datasetId: 'mock-dataset',
        date: '2025-01-02',
        numbers: [20],
      });
      
      const day2 = calendarData.getDayData('2025-01-02');
      const day3After = calendarData.getDayData('2025-01-03');
      
      expect(day2.deltas?.total).toBe(10); // 20 - 10
      expect(day3After.deltas?.total).toBe(10); // 30 - 20
    });
  });

  describe('lazy computation', () => {
    test('should only compute stats when requested', () => {
      const calendarData = generateMockCalendarDataFromCSV(`
        2025-01-01,10,20,30
        2025-01-02,40,50
      `);
      
      // Access specific day
      const day1 = calendarData.getDayData('2025-01-01');
      expect(day1.stats.total).toBe(60);
      
      // Day 2 should be lazy-computed only when accessed
      const day2 = calendarData.getDayData('2025-01-02');
      expect(day2.stats.total).toBe(90);
    });

    test('should compute deltas lazily only when requested', () => {
      const calendarData = generateMockCalendarDataFromCSV(`
        2025-01-01,10
        2025-01-02,20
        2025-01-03,30
      `);
      
      // Access only day 3, which should trigger lazy computation of prior days
      const day3 = calendarData.getDayData('2025-01-03');
      expect(day3.deltas?.total).toBe(10); // 30 - 20
    });

    test('should compute cumulatives efficiently by chaining', () => {
      const calendarData = generateMockCalendarDataFromCSV(`
        2025-01-01,10
        2025-01-02,20
        2025-01-03,30
        2025-01-04,40
        2025-01-05,50
      `);
      
      // Access day 5, should compute cumulatives for all prior days
      const day5 = calendarData.getDayData('2025-01-05');
      expect(day5.cumulatives.total).toBe(150);
      
      // Verify intermediate cumulative values
      const day3 = calendarData.getDayData('2025-01-03');
      expect(day3.cumulatives.total).toBe(60);
    });
  });

  describe('larger multi-year, month, day dataset', () => {

    let calendarData: CalendarData;

    beforeEach(() => {
      calendarData = generateMockCalendarDataFromCSV(`
        2023-01-02,11,11
        2023-01-15,12,12
        2023-01-28,13,13
        2023-06-02,21,21
        2023-06-15,22,22
        2023-06-28,23,23
        2023-12-02,31,31
        2023-12-15,32,32
        2023-12-28,33,33
        2024-01-02,41,41
        2024-01-15,42,42
        2024-01-28,43,43
        2024-06-02,51,51
        2024-06-15,52,52
        2024-06-28,53,53
        2024-12-02,61,61
        2024-12-15,62,62
        2024-12-28,63,63
        2025-01-02,71,71
        2025-01-15,72,72
        2025-01-28,73,73
        2025-06-02,81,81
        2025-06-15,82,82
        2025-06-28,83,83
        2025-12-02,91,91
        2025-12-15,92,92
        2025-12-28,93,93
      `);
    });

    test('should calculate day stats, deltas, and cumulatives', () => {
      const dayData = calendarData.getDayData('2024-06-15');
      expect(dayData.stats.total).toBe(104); // 52 + 52
      expect(dayData.stats.count).toBe(2);
      expect(dayData.deltas?.total).toBe(2); // 104 - 102
      expect(dayData.cumulatives.total).toBe(854); // 2023 totals (396) + 2024-01 totals (252) + 2024-06-02 (102) + 2024-06-15 (104)
    });

    test('should calculate week stats, deltas, and cumulatives', () => {
      const weekData = calendarData.getWeekData('2024-W24');
      expect(weekData.stats.total).toBe(104);
      expect(weekData.stats.count).toBe(2);
      expect(weekData.deltas?.total).toBe(2); // 104 - 102
      expect(weekData.cumulatives.total).toBe(854);
    });

    test('should calculate month stats, deltas, and cumulatives', () => {
      const monthData = calendarData.getMonthData('2024-06');
      expect(monthData.stats.total).toBe(312); // (102 + 104 + 106)
      expect(monthData.stats.count).toBe(6);
      expect(monthData.deltas?.total).toBe(60); // 312 - 252
      expect(monthData.cumulatives.total).toBe(960); // 396 + 252 + 312
    });

    test('should calculate year stats, deltas, and cumulatives', () => {
      const yearData = calendarData.getYearData('2024');
      expect(yearData.stats.total).toBe(936); // 252 + 312 + 372
      expect(yearData.stats.count).toBe(18);
      expect(yearData.deltas?.total).toBe(540); // 936 - 396
      expect(yearData.cumulatives.total).toBe(1332); // 396 + 936
    });

    describe('should update caches correctly when a day is modified', () => {

      let priorDayBefore: CalendarPeriodData<'day'>;
      let targetDayBefore: CalendarPeriodData<'day'>;
      let nextDayBefore: CalendarPeriodData<'day'>;

      let priorWeekBefore: CalendarPeriodData<'week'>;
      let targetWeekBefore: CalendarPeriodData<'week'>;
      let nextWeekBefore: CalendarPeriodData<'week'>;

      let priorYearBefore: CalendarPeriodData<'year'>;
      let targetYearBefore: CalendarPeriodData<'year'>;
      let nextYearBefore: CalendarPeriodData<'year'>;

      beforeEach(() => {
        priorDayBefore = calendarData.getDayData('2024-06-02');
        targetDayBefore = calendarData.getDayData('2024-06-15');
        nextDayBefore = calendarData.getDayData('2024-06-28');

        priorWeekBefore = calendarData.getWeekData('2024-W23');
        targetWeekBefore = calendarData.getWeekData('2024-W24');
        nextWeekBefore = calendarData.getWeekData('2024-W26');

        priorYearBefore = calendarData.getYearData('2023');
        targetYearBefore = calendarData.getYearData('2024');
        nextYearBefore = calendarData.getYearData('2025');

        calendarData.setDay({
          datasetId: 'mock-dataset',
          date: '2024-06-15',
          numbers: [200, 200],
        });
      });

      test('should update day, week, month, and year data for modified day', () => {
        const updatedDay = calendarData.getDayData('2024-06-15');
        const updatedWeek = calendarData.getWeekData('2024-W24');
        const updatedMonth = calendarData.getMonthData('2024-06');
        const updatedYear = calendarData.getYearData('2024');

        expect(updatedDay).not.toBe(targetDayBefore);
        expect(updatedWeek).not.toBe(targetWeekBefore);
        expect(updatedYear).not.toBe(targetYearBefore);

        expect(updatedDay.stats.total).toBe(400); // 200 + 200
        expect(updatedWeek.stats.total).toBe(400);
        expect(updatedMonth.stats.total).toBe(608); // 312 - 104 + 400
        expect(updatedYear.stats.total).toBe(1232); // 936 - 104 + 400
      });

      test('should update subsequent days, weeks, and years that rely on cumulatives', () => {
        const nextDayAfter = calendarData.getDayData('2024-06-28');
        const nextWeekAfter = calendarData.getWeekData('2024-W26');
        const nextYearAfter = calendarData.getYearData('2025');

        expect(nextDayAfter).not.toBe(nextDayBefore);
        expect(nextWeekAfter).not.toBe(nextWeekBefore);
        expect(nextYearAfter).not.toBe(nextYearBefore);

        expect(nextDayAfter.cumulatives.total).toBe(1256); // 854 - 104 + 400 + 106
        expect(nextWeekAfter.cumulatives.total).toBe(1256);
        expect(nextYearAfter.cumulatives.total).toBe(3104); // 1332 - 104 + 400 + 1476
      });

      test('should not update prior days, weeks, or years that do not rely on the modified day', () => {
        const priorDayAfter = calendarData.getDayData('2024-06-02');
        const priorWeekAfter = calendarData.getWeekData('2024-W23');
        const priorYearAfter = calendarData.getYearData('2023');

        expect(priorDayAfter).toBe(priorDayBefore);
        expect(priorWeekAfter).toBe(priorWeekBefore);
        expect(priorYearAfter).toBe(priorYearBefore);
      });
    });
  });
});
