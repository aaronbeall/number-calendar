import type { DateKey, DayKey, MonthKey, WeekKey, YearKey } from '@/features/db/localdb';
import { format, parseISO, isValid, parse, startOfISOWeek, endOfISOWeek } from 'date-fns';

// Type guards for date keys
export function isDayKey(key: DateKey): key is DayKey {
  return /^\d{4}-\d{2}-\d{2}$/.test(key);
}
export function isWeekKey(key: DateKey): key is WeekKey {
  return /^\d{4}-W\d{2}$/.test(key);
}
export function isMonthKey(key: DateKey): key is MonthKey {
  return /^\d{4}-\d{2}$/.test(key);
}
export function isYearKey(key: DateKey): key is YearKey {
  return /^\d{4}$/.test(key);
}

/**
 * Formats a date, week, month, or range in a friendly way.
 * - For ISO week (YYYY-Www): returns the date range (e.g. Nov 24–30, 2025)
 * - For week ranges (YYYY-Www → YYYY-Www): returns the start day of the first week to the end day of the last week
 * - For month: returns 'Month YYYY'
 * - For day: returns 'MMM d, yyyy'
 * - For other: returns as-is
 */
export function formatFriendlyDate(start: DateKey, end?: DateKey): string {
  if (!start) return '';
  // If end is provided and different from start, treat as a range
  if (end && end !== start) {
    // Week range: both are weeks
    if (isWeekKey(start) && isWeekKey(end)) {
      // Convert week keys to their start and end day keys, then use day range formatting
      const startDate = startOfISOWeek(parseISO(weekToISODate(start)));
      const endDate = endOfISOWeek(parseISO(weekToISODate(end)));
      const startDayKey = format(startDate, 'yyyy-MM-dd') as DayKey;
      const endDayKey = format(endDate, 'yyyy-MM-dd') as DayKey;
      return formatFriendlyDate(startDayKey, endDayKey);
    }
    // Day range
    if (isDayKey(start) && isDayKey(end)) {
      const startDate = parseISO(start);
      const endDate = parseISO(end);
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
      const startDate = parseISO(start + '-01');
      const endDate = parseISO(end + '-01');
      if (isValid(startDate) && isValid(endDate)) {
        if (startDate.getFullYear() === endDate.getFullYear()) {
          // November–December 2025
          return `${format(startDate, 'MMMM')}–${format(endDate, 'MMMM yyyy')}`;
        } else {
          // November 2024 – December 2025
          return `${format(startDate, 'MMMM yyyy')} – ${format(endDate, 'MMMM yyyy')}`;
        }
      }
    }
    // Fallback: just show both
    return `${formatFriendlyDate(start)} – ${formatFriendlyDate(end)}`;
  }
  // Single week: 'YYYY-Www'
  if (isWeekKey(start)) {
    const weekStart = startOfISOWeek(parseISO(weekToISODate(start)));
    const weekEnd = endOfISOWeek(parseISO(weekToISODate(start)));
    const startDayKey = format(weekStart, 'yyyy-MM-dd') as DayKey;
    const endDayKey = format(weekEnd, 'yyyy-MM-dd') as DayKey;
    return formatFriendlyDate(startDayKey, endDayKey);
  }
  // Month: 'YYYY-MM'
  if (isMonthKey(start)) {
    const parsed = parseISO(start + '-01');
    if (isValid(parsed)) return format(parsed, 'MMMM yyyy');
  }
  // Day: 'YYYY-MM-DD'
  if (isDayKey(start)) {
    const parsed = parseISO(start);
    if (isValid(parsed)) return format(parsed, 'MMMM d, yyyy');
  }
  return start;
}

/**
 * Converts an ISO week string (YYYY-Www) to the corresponding date string (YYYY-MM-DD) of the Monday of that week.
 */
function weekToISODate(week: string): string {
  // Parse 'YYYY-Www' as ISO week and return the Monday of that week
  const date = parse(week, "RRRR-'W'II", new Date());
  const monday = startOfISOWeek(date);
  return format(monday, 'yyyy-MM-dd');
}

/**
 * Parses a DateKey (day, week, month, year) and returns a Date object representing the start of that period.
 * - DayKey: returns the parsed date
 * - WeekKey: returns the Monday of the ISO week
 * - MonthKey: returns the first day of the month
 * - YearKey: returns January 1st of the year
 */
export function parseDateKey(key: DateKey): Date {
  if (isDayKey(key)) {
    return parseISO(key);
  }
  if (isWeekKey(key)) {
    // Use weekToISODate to get the Monday of the week
    return parseISO(weekToISODate(key));
  }
  if (isMonthKey(key)) {
    return parseISO(key + '-01');
  }
  if (isYearKey(key)) {
    return parseISO(key + '-01-01');
  }
  throw new Error('Invalid DateKey: ' + key);
}