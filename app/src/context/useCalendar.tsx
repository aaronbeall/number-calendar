import type { DayKey, MonthKey, YearKey } from '@/features/db/localdb';
import { getMonthDays } from '@/lib/calendar';
import { convertDateKey, getTodayKey, parseDateKeyToParts, toDayKey } from '@/lib/friendly-date';
import { useCalendarParams } from '@/lib/search-params';
import { useSearchParams } from 'react-router-dom';
import { useCallback } from 'react';

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
  const [, setSearchParams] = useSearchParams();
  const today = getTodayKey();

  const getDefaultExportDateRange = useCallback((exportType: 'daily' | 'monthly' | 'entries' = 'daily'): DateRange => {
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
            startDate: monthOnly,
            endDate: monthOnly
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
            startDate: startMonth,
            endDate: endMonth
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
  }, [mode, year, month]);

  const setDate = useCallback((dateKey: DayKey | MonthKey | YearKey) => {
    const parts = parseDateKeyToParts(dateKey);
    setSearchParams((prev) => {
      prev.set('year', String(parts.year));
      if (parts.month !== undefined) {
        prev.set('month', String(parts.month));
      }
      return prev;
    });
  }, [setSearchParams]);

  const goToToday = useCallback(() => {
    setDate(today);
  }, [today, setDate]);

  const goToPrevious = useCallback(() => {
    if (mode === 'daily') {
      if (month === 1) {
        setDate(toDayKey(year - 1, 12, 1));
      } else {
        setDate(toDayKey(year, month - 1, 1));
      }
    } else {
      setDate(String(year - 1) as YearKey);
    }
  }, [mode, year, month, setDate]);

  const goToNext = useCallback(() => {
    if (mode === 'daily') {
      if (month === 12) {
        setDate(toDayKey(year + 1, 1, 1));
      } else {
        setDate(toDayKey(year, month + 1, 1));
      }
    } else {
      setDate(String(year + 1) as YearKey);
    }
  }, [mode, year, month, setDate]);

  return { mode, setMode, year, setYear, month, setMonth, setDate, getDefaultExportDateRange, goToToday, goToPrevious, goToNext };
}
