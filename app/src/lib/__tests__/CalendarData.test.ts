import { beforeEach, describe, expect, test } from 'vitest';
import { CalendarData, type CalendarPeriodData } from '../CalendarData';
import type { DayEntry, DayKey } from '@/features/db/localdb';

// Now lets revamp #file:CalendarData.test.ts to test the functionality we built in #file:CalendarData.ts :
// * Test `getDayData()`, `getMonthData()`, `getYearData()`, and `getAlltimeData()`
// * For each method:
//   1 - test a simple get call
//   2- ensure data outside the range is not returned
//   3- check that updating a piece period returns expected updated values
// * Also add a specific test using mocks if possible to ensure that invalidation works as expected
//   - Updating data outside a getter range returns the original objects by identity (they aren't invalidated)
//  - anything else relevant to ensure the caching/invalidation/lazy computation is working as designed

/**
 * CSV format: {dateKey,...values}
 * Example:
 * 2023-10-15,42,51,9
 * 2023-10-16,36
 * 2023-10-17,
 */
function generateMockCalendarDataFromCSV(csv: string): CalendarData {
  const calendarData = new CalendarData();
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
  calendarData.setDays(allDays, { tracking: 'series', valence: 'positive' });
  return calendarData;
}

describe('CalendarData', () => {  
  
});
