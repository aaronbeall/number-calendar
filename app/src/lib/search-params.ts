import { useSearchParamState } from '@/hooks/useSearchParamState';
import type { DateKey } from '@/features/db/localdb';
import { parseDateKeyToParts } from './friendly-date';
import type { CalendarMode } from '@/context/useCalendar';

// Parameter validators
function isOneOf<T>(value: T | null | boolean, options: readonly T[]): value is T {
  return options.includes(value as T);
}

function isInRange(value: unknown, min: number, max: number): value is number {
  return typeof value === 'number' && value >= min && value <= max;
}

/**
 * Hook to manage the side panel state via URL search params
 */
export function useSidePanelParam() {
  return useSearchParamState<string>('panel', null);
}

/**
 * Hook to manage the calendar view mode (daily or monthly)
 */
export function useCalendarModeParam() {
  const [mode, setMode] = useSearchParamState<CalendarMode>('mode', 'daily');
  const validatedMode = isOneOf(mode, ['daily', 'monthly']) ? mode : 'daily';
  return [validatedMode, setMode] as const;
}

/**
 * Hook to manage the calendar year
 */
export function useCalendarYearParam() {
  const [yearValue, setYear] = useSearchParamState<number>('year', null);
  const currentYear = new Date().getFullYear();
  const year = isInRange(yearValue, 1900, 2100) ? yearValue : currentYear;
  return [year, setYear] as const;
}

/**
 * Hook to manage the calendar month (1-12)
 */
export function useCalendarMonthParam() {
  const [monthValue, setMonth] = useSearchParamState<number>('month', null);
  const currentMonth = new Date().getMonth() + 1;
  const month = isInRange(monthValue, 1, 12) ? monthValue : currentMonth;
  return [month, setMonth] as const;
}

/**
 * Combined hook for calendar navigation state
 */
export function useCalendarParams() {
  const [mode, setMode] = useCalendarModeParam();
  const [year, setYear] = useCalendarYearParam();
  const [month, setMonth] = useCalendarMonthParam();
  
  return { mode, setMode, year, setYear, month, setMonth } as const;
}

/**
 * Hook to navigate to a specific date and open its panel
 * Automatically determines the appropriate view mode based on the date key format
 */
export function useNavigateToDateKey() {
  const { setYear, setMonth } = useCalendarParams();
  const [, setPanelView] = useSidePanelParam();

  return (dateKey: DateKey) => {
    const parts = parseDateKeyToParts(dateKey);

    // Always set year
    setYear(parts.year);

    // Set month if available (day, week, month formats have it)
    if (parts.month !== undefined) {
      setMonth(parts.month);
    }

    // Open the panel for this date
    setPanelView(dateKey);
  };
}
