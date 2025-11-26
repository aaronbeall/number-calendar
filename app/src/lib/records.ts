
import type { Dataset, DateKey, DayEntry, DayKey, MonthKey, Valence, WeekKey } from '../features/db/localdb';

const entriesOf = <T extends object>(obj: T) =>
  Object.entries(obj) as [keyof T, NonNullable<T[keyof T]>][];

// Helper: group entries by week and month
import { getISOWeek, getISOWeekYear, parseISO } from 'date-fns';
function groupByWeek(entries: DayEntry[]) {
  const weeks: Record<WeekKey, number[]> = {};
  for (const entry of entries) {
    const dateObj = parseISO(entry.date);
    const isoYear = getISOWeekYear(dateObj);
    const isoWeek = getISOWeek(dateObj);
    const weekKey = `${isoYear}-W${String(isoWeek).padStart(2, '0')}` as WeekKey;
    if (!weeks[weekKey]) weeks[weekKey] = [];
    weeks[weekKey].push(...entry.numbers);
  }
  return weeks;
}

function groupByMonth(entries: DayEntry[]) {
  const months: Record<MonthKey, number[]> = {};
  for (const entry of entries) {
    const monthKey = entry.date.slice(0, 7) as MonthKey; // YYYY-MM
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


// Generic streak calculation for a predicate on value (sum or median)
function longestStreakByPredicate<T, K extends DateKey>(
  items: { key: K, value: number }[],
  isConsecutive: (a: K, b: K) => boolean,
  predicate: (value: number, prevValue?: number) => boolean
): { length: number, start: K, end: K } {
  let maxLen = 0, curLen = 0;
  let maxStart = '', maxEnd = '', curStart = '', curEnd = '';
  let prevKey: K | null = null;
  let prevValue: number | undefined = undefined;
  for (const { key, value } of items) {
    if (predicate(value, prevValue)) {
      if (curLen === 0) {
        curLen = 1;
        curStart = key;
        curEnd = key;
      } else if (prevKey && isConsecutive(prevKey, key)) {
        curLen++;
        curEnd = key;
      }
      if (curLen > maxLen) {
        maxLen = curLen;
        maxStart = curStart;
        maxEnd = curEnd
      }
    } else {
      curLen = 0;
      curStart = '';
      curEnd = '';
    }
    prevKey = key;
    prevValue = value;
  }
  return { length: maxLen, start: maxStart as K, end: maxEnd as K };
}

// Helper: check if two day keys are consecutive (YYYY-MM-DD)
function areConsecutiveDays(a: DayKey, b: DayKey): boolean {
  const [ay, am, ad] = a.split('-').map(Number);
  const [by, bm, bd] = b.split('-').map(Number);
  const adate = new Date(ay, am - 1, ad);
  const bdate = new Date(by, bm - 1, bd);
  return (bdate.getTime() - adate.getTime()) === 86400000;
}
// Helper: check if two week keys are consecutive (YYYY-Www)
function areConsecutiveWeeks(a: WeekKey, b: WeekKey): boolean {
  const [ay, aw] = a.split('-W').map(Number);
  const [by, bw] = b.split('-W').map(Number);
  if (by === ay && bw === aw + 1) return true;
  if (by === ay + 1 && aw === 52 && bw === 1) return true; // year wrap
  return false;
}
// Helper: check if two month keys are consecutive (YYYY-MM)
function areConsecutiveMonths(a: MonthKey, b: MonthKey): boolean {
  const [ay, am] = a.split('-').map(Number);
  const [by, bm] = b.split('-').map(Number);
  if (by === ay && bm === am + 1) return true;
  if (by === ay + 1 && am === 12 && bm === 1) return true;
  return false;
}


export function calculateRecords(entries: DayEntry[]) {
  

  // Highest/lowest day
  let highestDay = { value: -Infinity, date: '' as DayKey };
  let lowestDay = { value: Infinity, date: '' as DayKey };
  let highestDayMedian = { value: -Infinity, date: '' as DayKey };
  let lowestDayMedian = { value: Infinity, date: '' as DayKey };
  const daySums: { key: DayKey, value: number }[] = [];
  const dayMedians: { key: DayKey, value: number }[] = [];
  for (const entry of entries) {
    if (!entry.numbers.length) continue;
    const sum = entry.numbers.reduce((a, b) => a + b, 0);
    const med = median(entry.numbers);
    daySums.push({ key: entry.date, value: sum });
    dayMedians.push({ key: entry.date, value: med });
    if (sum > highestDay.value) highestDay = { value: sum, date: entry.date };
    if (sum < lowestDay.value) lowestDay = { value: sum, date: entry.date };
    if (med > highestDayMedian.value) highestDayMedian = { value: med, date: entry.date };
    if (med < lowestDayMedian.value) lowestDayMedian = { value: med, date: entry.date };
  }

  // Group by week/month
  const weeks = groupByWeek(entries);
  const months = groupByMonth(entries);

  // Highest/lowest week (sum and median)
  let highestWeek = { value: -Infinity, date: '' as WeekKey };
  let lowestWeek = { value: Infinity, date: '' as WeekKey };
  let highestWeekMedian = { value: -Infinity, date: '' as WeekKey };
  let lowestWeekMedian = { value: Infinity, date: '' as WeekKey };
  const weekSums: { key: WeekKey, value: number }[] = [];
  const weekMedians: { key: WeekKey, value: number }[] = [];
  for (const [week, nums] of entriesOf(weeks)) {
    if (!nums.length) continue;
    const sum = nums.reduce((a, b) => a + b, 0);
    const med = median(nums);
    weekSums.push({ key: week, value: sum });
    weekMedians.push({ key: week, value: med });
    if (sum > highestWeek.value) highestWeek = { value: sum, date: week };
    if (sum < lowestWeek.value) lowestWeek = { value: sum, date: week };
    if (med > highestWeekMedian.value) highestWeekMedian = { value: med, date: week };
    if (med < lowestWeekMedian.value) lowestWeekMedian = { value: med, date: week };
  }

  // Highest/lowest month (sum and median)
  let highestMonth = { value: -Infinity, date: '' as MonthKey };
  let lowestMonth = { value: Infinity, date: '' as MonthKey };
  let highestMonthMedian = { value: -Infinity, date: '' as MonthKey };
  let lowestMonthMedian = { value: Infinity, date: '' as MonthKey };
  const monthSums: { key: MonthKey, value: number }[] = [];
  const monthMedians: { key: MonthKey, value: number }[] = [];
  for (const [month, nums] of entriesOf(months)) {
    if (!nums.length) continue;
    const sum = nums.reduce((a, b) => a + b, 0);
    const med = median(nums);
    monthSums.push({ key: month, value: sum });
    monthMedians.push({ key: month, value: med });
    if (sum > highestMonth.value) highestMonth = { value: sum, date: month };
    if (sum < lowestMonth.value) lowestMonth = { value: sum, date: month };
    if (med > highestMonthMedian.value) highestMonthMedian = { value: med, date: month };
    if (med < lowestMonthMedian.value) lowestMonthMedian = { value: med, date: month };
  }

  // --- Streaks ---
  // Predicates
  const isPositive = (v: number) => v > 0;
  const isNegative = (v: number) => v < 0;
  const uptrend = (v: number, prev?: number) => prev !== undefined && v > prev;
  const downtrend = (v: number, prev?: number) => prev !== undefined && v < prev;
  const any = (_: number) => true;

  // Day streaks
  const sortedDaySums = [...daySums].sort((a, b) => a.key.localeCompare(b.key));
  const sortedDayMedians = [...dayMedians].sort((a, b) => a.key.localeCompare(b.key));
  const longestPositiveDayStreak = longestStreakByPredicate(sortedDaySums, areConsecutiveDays, isPositive);
  const longestNegativeDayStreak = longestStreakByPredicate(sortedDaySums, areConsecutiveDays, isNegative);
  const longestDailyUptrendStreak = longestStreakByPredicate(sortedDayMedians, areConsecutiveDays, uptrend);
  const longestDailyDowntrendStreak = longestStreakByPredicate(sortedDayMedians, areConsecutiveDays, downtrend);
  const longestConsecutiveDayStreak = longestStreakByPredicate(sortedDaySums, areConsecutiveDays, any);

  // Week streaks
  const sortedWeekSums = [...weekSums].sort((a, b) => a.key.localeCompare(b.key));
  const sortedWeekMedians = [...weekMedians].sort((a, b) => a.key.localeCompare(b.key));
  const longestPositiveWeekStreak = longestStreakByPredicate(sortedWeekSums, areConsecutiveWeeks, isPositive);
  const longestNegativeWeekStreak = longestStreakByPredicate(sortedWeekSums, areConsecutiveWeeks, isNegative);
  const longestWeeklyUptrendStreak = longestStreakByPredicate(sortedWeekMedians, areConsecutiveWeeks, uptrend);
  const longestWeeklyDowntrendStreak = longestStreakByPredicate(sortedWeekMedians, areConsecutiveWeeks, downtrend);
  const longestConsecutiveWeekStreak = longestStreakByPredicate(sortedWeekSums, areConsecutiveWeeks, any);

  // Month streaks
  const sortedMonthSums = [...monthSums].sort((a, b) => a.key.localeCompare(b.key));
  const sortedMonthMedians = [...monthMedians].sort((a, b) => a.key.localeCompare(b.key));
  const longestPositiveMonthStreak = longestStreakByPredicate(sortedMonthSums, areConsecutiveMonths, isPositive);
  const longestNegativeMonthStreak = longestStreakByPredicate(sortedMonthSums, areConsecutiveMonths, isNegative);
  const longestMonthlyUptrendStreak = longestStreakByPredicate(sortedMonthMedians, areConsecutiveMonths, uptrend);
  const longestMonthlyDowntrendStreak = longestStreakByPredicate(sortedMonthMedians, areConsecutiveMonths, downtrend);
  const longestConsecutiveMonthStreak = longestStreakByPredicate(sortedMonthSums, areConsecutiveMonths, any);

  return {
    highestDay,
    highestDayMedian,
    highestWeek,
    highestWeekMedian,
    highestMonth,
    highestMonthMedian,
    lowestDay,
    lowestDayMedian,
    lowestWeek,
    lowestWeekMedian,
    lowestMonth,
    lowestMonthMedian,

    longestPositiveDayStreak,
    longestPositiveWeekStreak,
    longestPositiveMonthStreak,
    longestNegativeDayStreak,
    longestNegativeWeekStreak,
    longestNegativeMonthStreak,
    longestDailyUptrendStreak,
    longestWeeklyUptrendStreak,
    longestMonthlyUptrendStreak,
    longestDailyDowntrendStreak,
    longestWeeklyDowntrendStreak,
    longestMonthlyDowntrendStreak,
    longestConsecutiveDayStreak,
    longestConsecutiveWeekStreak,
    longestConsecutiveMonthStreak,
  };
}

export function calculateRecordsForValence(entries: DayEntry[], valence: Valence) {
  const records = calculateRecords(entries);

  switch (valence) {
    case 'positive':
      return {
        bestDay: records.highestDay,
        bestDayMedian: records.highestDayMedian,
        bestWeek: records.highestWeek,
        bestWeekMedian: records.highestWeekMedian,
        bestMonth: records.highestMonth,
        bestMonthMedian: records.highestMonthMedian,
        worstDay: records.lowestDay,
        worstDayMedian: records.lowestDayMedian,
        worstWeek: records.lowestWeek,
        worstWeekMedian: records.lowestWeekMedian,
        worstMonth: records.lowestMonth,
        worstMonthMedian: records.lowestMonthMedian,
        bestDailyStreak: records.longestPositiveDayStreak,
        bestWeeklyStreak: records.longestPositiveWeekStreak,
        bestMonthlyStreak: records.longestPositiveMonthStreak,
        bestDailyTrendStreak: records.longestDailyUptrendStreak,
        bestWeeklyTrendStreak: records.longestWeeklyUptrendStreak,
        bestMonthlyTrendStreak: records.longestMonthlyUptrendStreak,
      };
    case 'negative':
      return {
        bestDay: records.lowestDay,
        bestDayMedian: records.lowestDayMedian,
        bestWeek: records.lowestWeek,
        bestWeekMedian: records.lowestWeekMedian,
        bestMonth: records.lowestMonth,
        bestMonthMedian: records.lowestMonthMedian,
        worstDay: records.highestDay,
        worstDayMedian: records.highestDayMedian,
        worstWeek: records.highestWeek,
        worstWeekMedian: records.highestWeekMedian,
        worstMonth: records.highestMonth,
        worstMonthMedian: records.highestMonthMedian,
        bestDailyStreak: records.longestNegativeDayStreak,
        bestWeeklyStreak: records.longestNegativeWeekStreak,
        bestMonthlyStreak: records.longestNegativeMonthStreak,
        bestDailyTrendStreak: records.longestDailyDowntrendStreak,
        bestWeeklyTrendStreak: records.longestWeeklyDowntrendStreak,
        bestMonthlyTrendStreak: records.longestMonthlyDowntrendStreak,
      };
    case 'neutral':
      return {
        bestDay: records.highestDay,
        bestDayMedian: records.highestDayMedian,
        bestWeek: records.highestWeek,
        bestWeekMedian: records.highestWeekMedian,
        bestMonth: records.highestMonth,
        bestMonthMedian: records.highestMonthMedian,
        worstDay: records.lowestDay,
        worstDayMedian: records.lowestDayMedian,
        worstWeek: records.lowestWeek,
        worstWeekMedian: records.lowestWeekMedian,
        worstMonth: records.lowestMonth,
        worstMonthMedian: records.lowestMonthMedian,
        bestDailyStreak: records.longestConsecutiveDayStreak,
        bestWeeklyStreak: records.longestConsecutiveWeekStreak,
        bestMonthlyStreak: records.longestConsecutiveMonthStreak,
        bestDailyTrendStreak: records.longestConsecutiveDayStreak,
        bestWeeklyTrendStreak: records.longestConsecutiveWeekStreak,
        bestMonthlyTrendStreak: records.longestConsecutiveMonthStreak,
      };
  }
}