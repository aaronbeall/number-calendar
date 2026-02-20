import { getMonthDays } from '@/lib/calendar';
import { convertDateKey, toDayKey } from '@/lib/friendly-date';
import type { DayKey, MonthKey } from '@/features/db/localdb';
import { useCalendarParams } from '@/lib/search-params';

export type CalendarMode = 'daily' | 'monthly';

export interface DateRange {
  startDate: MonthKey | DayKey;
  endDate: MonthKey | DayKey;
}

/**
 * Hook for calendar navigation state and methods
 * Wraps useCalendarState with additional navigation helpers
 */
export function useCalendar() {
  const { mode, setMode, year, setYear, month, setMonth } = useCalendarParams();
  const today = new Date();

  const getDefaultExportDateRange = (exportType: 'daily' | 'monthly' | 'entries' = 'daily'): DateRange => {
    const rangeGetters: Record<CalendarMode, Record<'daily' | 'monthly' | 'entries', () => DateRange>> = {
      'daily': {
        'daily': () => {
          const daysOfMonth = getMonthDays(year, month);
          return {
            startDate: daysOfMonth[0],
            endDate: daysOfMonth[daysOfMonth.length - 1]
          };
        },
        'monthly': () => {
          const daysOfMonth = getMonthDays(year, month);
          const monthOnly = convertDateKey(daysOfMonth[0], 'month');
          return {
            startDate: monthOnly as MonthKey,
            endDate: monthOnly as MonthKey
          };
        },
        'entries': () => {
          const daysOfMonth = getMonthDays(year, month);
          return {
            startDate: daysOfMonth[0],
            endDate: daysOfMonth[daysOfMonth.length - 1]
          };
        }
      },
      'monthly': {
        'daily': () => {
          const firstDayOfYear = toDayKey(year, 1, 1);
          const lastDayOfYear = toDayKey(year, 12, 31);
          return {
            startDate: firstDayOfYear,
            endDate: lastDayOfYear
          };
        },
        'monthly': () => {
          const firstDayOfYear = toDayKey(year, 1, 1);
          const lastDayOfYear = toDayKey(year, 12, 31);
          const startMonth = convertDateKey(firstDayOfYear, 'month');
          const endMonth = convertDateKey(lastDayOfYear, 'month');
          return {
            startDate: startMonth as MonthKey,
            endDate: endMonth as MonthKey
          };
        },
        'entries': () => {
          const firstDayOfYear = toDayKey(year, 1, 1);
          const lastDayOfYear = toDayKey(year, 12, 31);
          return {
            startDate: firstDayOfYear,
            endDate: lastDayOfYear
          };
        }
      }
    };
    return rangeGetters[mode][exportType]();
  };

  const goToToday = () => {
    setYear(today.getFullYear());
    setMonth(today.getMonth() + 1);
  };

  const goToPrevious = () => {
    if (mode === 'daily') {
      if (month === 1) {
        setYear(year - 1);
        setMonth(12);
      } else {
        setMonth(month - 1);
      }
    } else {
      setYear(year - 1);
    }
  };

  const goToNext = () => {
    if (mode === 'daily') {
      if (month === 12) {
        setYear(year + 1);
        setMonth(1);
      } else {
        setMonth(month + 1);
      }
    } else {
      setYear(year + 1);
    }
  };

  return { mode, setMode, year, setYear, month, setMonth, getDefaultExportDateRange, goToToday, goToPrevious, goToNext };
}
