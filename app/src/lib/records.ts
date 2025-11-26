
import type { Dataset, DayEntry } from '../features/db/localdb';

// Helper: group entries by week and month
function groupByWeek(entries: DayEntry[]) {
  const weeks: Record<string, number[]> = {};
  for (const entry of entries) {
    const [year, month, day] = entry.date.split('-').map(Number);
    const dateObj = new Date(year, month - 1, day);
    // Get ISO week number
    const tempDate = new Date(dateObj.getTime());
    tempDate.setHours(0, 0, 0, 0);
    // Thursday in current week decides the year.
    tempDate.setDate(tempDate.getDate() + 3 - ((tempDate.getDay() + 6) % 7));
    const week1 = new Date(tempDate.getFullYear(), 0, 4);
    // Calculate week number
    const weekNo = 1 + Math.round(((tempDate.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
    const weekKey = `${tempDate.getFullYear()}-W${String(weekNo).padStart(2, '0')}`;
    if (!weeks[weekKey]) weeks[weekKey] = [];
    weeks[weekKey].push(...entry.numbers);
  }
  return weeks;
}

function groupByMonth(entries: DayEntry[]) {
  const months: Record<string, number[]> = {};
  for (const entry of entries) {
    const monthKey = entry.date.slice(0, 7); // YYYY-MM
    if (!months[monthKey]) months[monthKey] = [];
    months[monthKey].push(...entry.numbers);
  }
  return months;
}

function median(arr: number[]) {
  if (!arr.length) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

// Streak calculation: consecutive days with at least one number
function longestStreak(entries: DayEntry[]): { length: number, start: string, end: string } {
  if (!entries.length) return { length: 0, start: '', end: '' };
  // Sort by date
  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));
  let maxLen = 0, curLen = 0;
  let maxStart = '', maxEnd = '', curStart = '';
  let prevDate: Date | null = null;
  for (const entry of sorted) {
    if (!entry.numbers.length) continue;
    const [y, m, d] = entry.date.split('-').map(Number);
    const curDate = new Date(y, m - 1, d);
    if (prevDate && (curDate.getTime() - prevDate.getTime() === 86400000)) {
      curLen++;
      maxEnd = entry.date;
    } else {
      curLen = 1;
      curStart = entry.date;
      maxEnd = entry.date;
    }
    if (curLen > maxLen) {
      maxLen = curLen;
      maxStart = curStart;
    }
    prevDate = curDate;
  }
  return { length: maxLen, start: maxStart, end: maxEnd };
}

// Streak calculation for weeks/months: consecutive non-empty periods
function longestPeriodStreak(periods: Record<string, number[]>): { length: number, start: string, end: string } {
  const keys = Object.keys(periods).sort();
  let maxLen = 0, curLen = 0;
  let maxStart = '', maxEnd = '', curStart = '';
  for (let i = 0; i < keys.length; i++) {
    if (periods[keys[i]].length) {
      if (curLen === 0) curStart = keys[i];
      curLen++;
      maxEnd = keys[i];
      if (curLen > maxLen) {
        maxLen = curLen;
        maxStart = curStart;
      }
    } else {
      curLen = 0;
    }
  }
  return { length: maxLen, start: maxStart, end: maxEnd };
}

export function calculateRecords(entries: DayEntry[]) {

  // Highest/lowest day
  let highestDay = { value: -Infinity, date: '' };
  let lowestDay = { value: Infinity, date: '' };
  let highestDayMedian = { value: -Infinity, date: '' };
  let lowestDayMedian = { value: Infinity, date: '' };
  for (const entry of entries) {
    if (!entry.numbers.length) continue;
    const sum = entry.numbers.reduce((a, b) => a + b, 0);
    const med = median(entry.numbers);
    if (sum > highestDay.value) highestDay = { value: sum, date: entry.date };
    if (sum < lowestDay.value) lowestDay = { value: sum, date: entry.date };
    if (med > highestDayMedian.value) highestDayMedian = { value: med, date: entry.date };
    if (med < lowestDayMedian.value) lowestDayMedian = { value: med, date: entry.date };
  }

  // Group by week/month
  const weeks = groupByWeek(entries);
  const months = groupByMonth(entries);

  // Highest/lowest week (sum and median)
  let highestWeek = { value: -Infinity, date: '' };
  let lowestWeek = { value: Infinity, date: '' };
  let highestWeekMedian = { value: -Infinity, date: '' };
  let lowestWeekMedian = { value: Infinity, date: '' };
  for (const [week, nums] of Object.entries(weeks)) {
    if (!nums.length) continue;
    const sum = nums.reduce((a, b) => a + b, 0);
    const med = median(nums);
    if (sum > highestWeek.value) highestWeek = { value: sum, date: week };
    if (sum < lowestWeek.value) lowestWeek = { value: sum, date: week };
    if (med > highestWeekMedian.value) highestWeekMedian = { value: med, date: week };
    if (med < lowestWeekMedian.value) lowestWeekMedian = { value: med, date: week };
  }

  // Highest/lowest month (sum and median)
  let highestMonth = { value: -Infinity, date: '' };
  let lowestMonth = { value: Infinity, date: '' };
  let highestMonthMedian = { value: -Infinity, date: '' };
  let lowestMonthMedian = { value: Infinity, date: '' };
  for (const [month, nums] of Object.entries(months)) {
    if (!nums.length) continue;
    const sum = nums.reduce((a, b) => a + b, 0);
    const med = median(nums);
    if (sum > highestMonth.value) highestMonth = { value: sum, date: month };
    if (sum < lowestMonth.value) lowestMonth = { value: sum, date: month };
    if (med > highestMonthMedian.value) highestMonthMedian = { value: med, date: month };
    if (med < lowestMonthMedian.value) lowestMonthMedian = { value: med, date: month };
  }

  // Streaks
  const longestDailyStreak = longestStreak(entries);
  const longestWeeklyStreak = longestPeriodStreak(weeks);
  const longestMonthlyStreak = longestPeriodStreak(months);

  return {
    highestDay,
    highestDayMedian,
    highestWeek,
    highestWeekMedian,
    highestMonth,
    highestMonthMedian,
    longestDailyStreak,
    longestWeeklyStreak,
    longestMonthlyStreak,
    lowestDay,
    lowestDayMedian,
    lowestWeek,
    lowestWeekMedian,
    lowestMonth,
    lowestMonthMedian,
  };
}
