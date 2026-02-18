
import type { DateKey, DayKey, MonthKey, WeekKey, YearKey } from '@/features/db/localdb';
import { endOfWeek, format, getWeek, getWeekYear, isValid, parse, parseISO, startOfWeek } from 'date-fns';

export type DateKeyType = 'day' | 'week' | 'month' | 'year';

// Type guards for date keys
export function isDayKey(key: DateKey): key is DayKey {
  return /^\d{4}-\d{2}-\d{2}$/.test(key); // YYYY-MM-DD
}
export function isWeekKey(key: DateKey): key is WeekKey {
  return /^\d{4}-W\d{2}$/.test(key); // YYYY-Www
}
export function isMonthKey(key: DateKey): key is MonthKey {
  return /^\d{4}-\d{2}$/.test(key); // YYYY-MM
}
export function isYearKey(key: DateKey): key is YearKey {
  return /^\d{4}$/.test(key); // YYYY
}

const padNumber = (n: number) => String(n).padStart(2, '0') as `${number}`;

export function toDayKey(year: number, month: number, day: number): DayKey {  
  return `${year}-${padNumber(month)}-${padNumber(day)}`; // YYYY-MM-DD
}
export function toWeekKey(year: number, week: number): WeekKey {  
  return `${year}-W${padNumber(week)}`; // YYYY-Www
}
export function toMonthKey(year: number, month: number): MonthKey {
  return `${year}-${padNumber(month)}`; // YYYY-MM
}
export function toYearKey(year: number): YearKey {
  return `${year}`; // YYYY
}

export function dateToDayKey(date: Date): DayKey {
  return toDayKey(date.getFullYear(), date.getMonth() + 1, date.getDate());
}
export function dateToWeekKey(date: Date): WeekKey {
  return toWeekKey(getWeekYear(date), getWeek(date));
}
export function dateToMonthKey(date: Date): MonthKey {
  return toMonthKey(date.getFullYear(), date.getMonth() + 1);
}
export function dateToYearKey(date: Date): YearKey {
  return toYearKey(date.getFullYear()); 
}

/**
 * Converts a DateKey to another DateKey type.
 */
export function convertDateKey(dateKey: DateKey, targetType: 'day'): DayKey;
export function convertDateKey(dateKey: DateKey, targetType: 'week'): WeekKey;
export function convertDateKey(dateKey: DateKey, targetType: 'month'): MonthKey;
export function convertDateKey(dateKey: DateKey, targetType: 'year'): YearKey;
export function convertDateKey(dateKey: DateKey, targetType: DateKeyType): DateKey;
export function convertDateKey(dateKey: DateKey, targetType: DateKeyType): DateKey {
  const date = parseDateKey(dateKey);
  return formatDateAsKey(date, targetType);
}

/**
 * Formats a date, week, month, or range in a friendly way.
 * - For week (YYYY-Www): returns the date range (e.g. Nov 24–30, 2025)
 * - For week ranges (YYYY-Www → YYYY-Www): returns the start day of the first week to the end day of the last week
 * - For month: returns 'Month YYYY'
 * - For day: returns 'MMM d, yyyy'
 * - For other: returns as-is
 */
export function formatFriendlyDate(date: DateKey): string;
export function formatFriendlyDate(start: DateKey, end: DateKey): string;
export function formatFriendlyDate(start: DateKey, end?: DateKey): string {
  if (!start) return '';
  // If end is provided and different from start, treat as a range
  if (end && end !== start) {
    // Week range: both are weeks
    if (isWeekKey(start) && isWeekKey(end)) {
      // Convert week keys to their start and end day keys, then use day range formatting
      const startDate = startOfWeek(parseDateKey(start));
      const endDate = endOfWeek(parseDateKey(end));
      const startDayKey = formatDateAsKey(startDate, 'day');
      const endDayKey = formatDateAsKey(endDate, 'day');
      return formatFriendlyDate(startDayKey, endDayKey);
    }
    // Day range
    if (isDayKey(start) && isDayKey(end)) {
      const startDate = parseDateKey(start);
      const endDate = parseDateKey(end);
      if (isValid(startDate) && isValid(endDate)) {
        // Same year
        if (startDate.getFullYear() === endDate.getFullYear()) {
          // Same month
          if (startDate.getMonth() === endDate.getMonth()) {
            // November 12-13, 2025
            return `${format(startDate, 'MMMM d')}-${format(endDate, 'd, yyyy')}`;
          } else {
            // November 20 - December 2, 2025
            return `${format(startDate, 'MMMM d')} – ${format(endDate, 'MMMM d, yyyy')}`;
          }
        } else {
          // November 20, 2024 – December 2, 2025
          return `${format(startDate, 'MMMM d, yyyy')} – ${format(endDate, 'MMMM d, yyyy')}`;
        }
      }
    }
    // Month range
    if (isMonthKey(start) && isMonthKey(end)) {
      const startDate = parseDateKey(start);
      const endDate = parseDateKey(end);
      if (isValid(startDate) && isValid(endDate)) {
        if (startDate.getFullYear() === endDate.getFullYear()) {
          // November – December 2025
          return `${format(startDate, 'MMMM')} – ${format(endDate, 'MMMM yyyy')}`;
        } else {
          // November 2024 – December 2025
          return `${format(startDate, 'MMMM yyyy')} – ${format(endDate, 'MMMM yyyy')}`;
        }
      }
    }
    // Fallback (start and end types are not the same?): just show both
    return `${formatFriendlyDate(start)} – ${formatFriendlyDate(end)}`;
  }
  // Single week: 'YYYY-Www'
  if (isWeekKey(start)) {
    const weekStart = startOfWeek(parseDateKey(start));
    const weekEnd = endOfWeek(parseDateKey(start));
    const startDayKey = formatDateAsKey(weekStart, 'day');
    const endDayKey = formatDateAsKey(weekEnd, 'day');
    return formatFriendlyDate(startDayKey, endDayKey);
  }
  // Month: 'YYYY-MM'
  if (isMonthKey(start)) {
    const parsed = parseDateKey(start);
    if (isValid(parsed)) return format(parsed, 'MMMM yyyy');
  }
  // Day: 'YYYY-MM-DD'
  if (isDayKey(start)) {
    const parsed = parseDateKey(start);
    if (isValid(parsed)) return format(parsed, 'MMMM d, yyyy');
  }
  // Year: 'YYYY'
  if (isYearKey(start)) {
    const parsed = parseDateKey(start);
    if (isValid(parsed)) return format(parsed, 'yyyy');
  }
  // Fallback: return as-is
  return start;
}

/**
 * Converts a local week string (YYYY-Www) to the corresponding ISO date string (YYYY-MM-DD) of the Sunday of that week.
 * 
 * Note about week keys: The 'YYYY-Www' format represents a local week, where the week number is based on the local calendar. 
 * For now we use the default locale: the week starts on Sunday and ends on Saturday. 
 * The 'YYYY' part is the calendar year, which may differ from the week year in cases where the week overlaps two years.
 * For example, '2025-W01' represents the week starting on Sunday, December 30, 2024 and ending on Saturday, January 5, 2025. The week start date calendar year is 2024, but the week year for that week is 2025, because the majority of the week falls in 2025.
 * In order to preserve round-trip integrity we need to use the week year when parsing the week, which requires the useAdditionalWeekYearTokens option in date-fns. 
 */
function weekKeyToISODate(week: WeekKey): string {
  // Parse 'YYYY-Www' as local week (requires useAdditionalWeekYearTokens) and return the Sunday of that week
  const date = parse(week, "YYYY-'W'ww", new Date(), { useAdditionalWeekYearTokens: true });
  const first = startOfWeek(date);
  return format(first, 'yyyy-MM-dd'); 
}

/**
 * Parses a DateKey (day, week, month, year) and returns a Date object representing the start of that period.
 * - DayKey: returns the parsed date
 * - WeekKey: returns the Sunday of the calendar week
 * - MonthKey: returns the first day of the month
 * - YearKey: returns January 1st of the year
 */
export function parseDateKey(key: DateKey): Date {
  if (isDayKey(key)) {
    return parseISO(key);
  }
  if (isWeekKey(key)) {
    return parseISO(weekKeyToISODate(key));
  }
  if (isMonthKey(key)) {
    return parseISO(`${key}-01`);
  }
  if (isYearKey(key)) {
    return parseISO(`${key}-01-01`);
  }
  throw new Error(`Invalid DateKey: ${key}`);
}

export function parseDayKey(dayKey: DayKey): { year: number; month: number; day: number } {
  const [yearStr, monthStr, dayStr] = dayKey.split('-');
  return { year: parseInt(yearStr, 10), month: parseInt(monthStr, 10), day: parseInt(dayStr, 10) };
}

export function parseWeekKey(weekKey: WeekKey): { year: number; week: number } {
  const [yearStr, weekStr] = weekKey.split('-W');
  return { year: parseInt(yearStr, 10), week: parseInt(weekStr, 10) };
}

export function parseMonthKey(monthKey: MonthKey): { year: number; month: number } {
  const [yearStr, monthStr] = monthKey.split('-');
  return { year: parseInt(yearStr, 10), month: parseInt(monthStr, 10) };
}

export function parseYearKey(yearKey: YearKey) {
  return parseInt(yearKey, 10);
}

export function parseDateKeyToParts(dateKey: DateKey): { year: number; month?: number; day?: number; week?: number } {
  if (isDayKey(dateKey)) {
    const { year, month, day } = parseDayKey(dateKey);
    return { year, month, day };
  }
  if (isWeekKey(dateKey)) {
    const { year, week } = parseWeekKey(dateKey);
    return { year, week };
  }
  if (isMonthKey(dateKey)) {
    const { year, month } = parseMonthKey(dateKey);
    return { year, month };
  }
  if (isYearKey(dateKey)) {
    const year = parseYearKey(dateKey);
    return { year };
  }
  throw new Error(`Invalid DateKey: ${dateKey}`);
}

/**
 * Formats a Date as a DateKey of the specified type ('day', 'week', 'month', 'year').
 * The return type is inferred based on the type argument.
 */
export function formatDateAsKey(date: Date, type: 'day'): DayKey;
export function formatDateAsKey(date: Date, type: 'week'): WeekKey;
export function formatDateAsKey(date: Date, type: 'month'): MonthKey;
export function formatDateAsKey(date: Date, type: 'year'): YearKey;
export function formatDateAsKey(date: Date, type: DateKeyType): DateKey
export function formatDateAsKey(date: Date, type: DateKeyType): DateKey {
  switch (type) {
    case 'day':
      return format(date, 'yyyy-MM-dd') as DayKey;
    case 'week':
      return format(date, "YYYY-'W'ww", { useAdditionalWeekYearTokens: true }) as WeekKey;
    case 'month':
      return format(date, 'yyyy-MM') as MonthKey;
    case 'year':
      return format(date, 'yyyy') as YearKey;
    default:
      throw new Error('Invalid key type');
  }
}

/**
 * Returns the type of a DateKey ('day', 'week', 'month', 'year').
 */
export function getDateKeyType(key: DateKey): DateKeyType {
  if (isDayKey(key)) return 'day';
  if (isWeekKey(key)) return 'week';
  if (isMonthKey(key)) return 'month';
  if (isYearKey(key)) return 'year';
  throw new Error(`Invalid DateKey: ${key}`);
}

/**
 * Returns true if the given dateKey corresponds to the current day/week/month/year based on its type.
 * If the optional period argument is provided, it checks if the dateKey corresponds to the current period of that type regardless of the dateKey's own type. 
 * For example, if dateKey is a week but period is 'month', it checks if that week falls within the current month.
 */
export function isCurrentPeriod(dateKey: DateKey, period?: DateKeyType): boolean {
  switch (period ?? getDateKeyType(dateKey)) {
    case 'day':
      return isCurrentDay(dateKey);
    case 'week':
      return isCurrentWeek(dateKey);
    case 'month':
      return isCurrentMonth(dateKey);
    case 'year':
      return isCurrentYear(dateKey);
    default:
      return false;
  }
}
export function isCurrentDay(dateKey: DateKey): boolean {
  return convertDateKey(dateKey, 'day') === formatDateAsKey(new Date(), 'day');
}
export function isCurrentWeek(dateKey: DateKey): boolean {
  return convertDateKey(dateKey, 'week') === formatDateAsKey(new Date(), 'week');
}
export function isCurrentMonth(dateKey: DateKey): boolean {
  return convertDateKey(dateKey, 'month') === formatDateAsKey(new Date(), 'month');
}
export function isCurrentYear(dateKey: DateKey): boolean {
  return convertDateKey(dateKey, 'year') === formatDateAsKey(new Date(), 'year');
}
