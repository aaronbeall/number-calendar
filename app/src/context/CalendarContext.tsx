import React, { createContext, useContext, useState } from 'react';
import { getMonthDays } from '@/lib/calendar';
import { convertDateKey, toDayKey } from '@/lib/friendly-date';
import type { DayKey, MonthKey } from '@/features/db/localdb';

type CalendarView = 'daily' | 'monthly';

export interface DateRange {
  startDate: MonthKey | DayKey;
  endDate: MonthKey | DayKey;
}

interface CalendarContextType {
  view: CalendarView;
  setView: (view: CalendarView) => void;
  year: number;
  setYear: (year: number | ((prev: number) => number)) => void;
  month: number;
  setMonth: (month: number | ((prev: number) => number)) => void;
  getDefaultExportDateRange: (exportType?: 'daily' | 'monthly' | 'entries') => DateRange;
  goToToday: () => void;
  goToPrevious: () => void;
  goToNext: () => void;
}

const CalendarContext = createContext<CalendarContextType | undefined>(undefined);

export function CalendarProvider({ children }: { children: React.ReactNode }) {
  const today = new Date();
  const [view, setView] = useState<CalendarView>('daily');
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);

  const getDefaultExportDateRange = (exportType: 'daily' | 'monthly' | 'entries' = 'daily'): DateRange => {
    const rangeGetters: Record<CalendarView, Record<'daily' | 'monthly' | 'entries', () => DateRange>> = {
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
    return rangeGetters[view][exportType]();
  };

  const goToToday = () => {
    setYear(today.getFullYear());
    setMonth(today.getMonth() + 1);
  };

  const goToPrevious = () => {
    ({
      'daily': () => {
        if (month === 1) {
          setYear(y => y - 1);
          setMonth(12);
        } else {
          setMonth(m => m - 1);
        }
      },
      'monthly': () => {
        setYear(y => y - 1);
      }
    })[view]();
  };

  const goToNext = () => {
    ({
      'daily': () => {
        if (month === 12) {
          setYear(y => y + 1);
          setMonth(1);
        } else {
          setMonth(m => m + 1);
        }
      },
      'monthly': () => {
        setYear(y => y + 1);
      }
    })[view]();
  };

  return (
    <CalendarContext.Provider value={{ view, setView, year, setYear, month, setMonth, getDefaultExportDateRange, goToToday, goToPrevious, goToNext }}>
      {children}
    </CalendarContext.Provider>
  );
}

export function useCalendarContext() {
  const context = useContext(CalendarContext);
  if (!context) {
    throw new Error('useCalendarContext must be used within CalendarProvider');
  }
  return context;
}
