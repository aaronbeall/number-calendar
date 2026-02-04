import type { DayEntry, DayKey, MonthKey, TimePeriod, WeekKey, YearKey } from "@/features/db/localdb";
import { getMonthDays, getMonthWeeks, getWeekDays, getYearDays, getYearMonths, getYearWeeks } from "./calendar";
import { convertDateKey, parseDateKey, parseWeekKey } from "./friendly-date";
import type { NumberStats, StatsExtremes } from "./stats";
import { calculateExtremes, computeNumberStats, emptyStats, getStatsDelta, getStatsPercentChange } from "./stats";

export type CalendarPeriodData<P extends TimePeriod> = {
  dateKey: {
    'day': DayKey;
    'week': WeekKey;
    'month': MonthKey;
    'year': YearKey;
    'anytime': null;
  }[P];
  period: P;

  // Computed data
  numbers: number[];
  stats: NumberStats;
  deltas: NumberStats;
  percents: Partial<NumberStats>;
  extremes?: StatsExtremes; // Not included with day, or if there's only a single period in the range
  cumulatives: NumberStats;
  cumulativeDeltas: NumberStats;
  cumulativePercents: Partial<NumberStats>;

  // Child periods
  days?: DayKey[]; // For week, month and year periods
  weeks?: WeekKey[]; // For month and year periods
  months?: MonthKey[]; // For year periods
};

// Internal cache structure for a period, computed properties are lazily evaluated, 
// null indicates they have not been evaluated yet
type PeriodCache<P extends TimePeriod> = {
  [K in keyof CalendarPeriodData<P>]: K extends 'numbers' | 'stats' | 'deltas' | 'percents' | 'extremes' | 'cumulatives' | 'cumulativeDeltas' | 'cumulativePercents'
    ? CalendarPeriodData<P>[K] | null
    : CalendarPeriodData<P>[K];
};

type WithNonNullKeys<T, K extends keyof T> = T & {
  [P in K]-?: NonNullable<T[P]>;
}

/**
 * A cached, lazy computed, and surgically invalidated data manager for all calendar related calculations
 */
export class CalendarData {
  // Raw data storage
  private dayEntries: Map<DayKey, DayEntry> = new Map();

  // Caches
  private dayCache: Map<DayKey, PeriodCache<'day'>> = new Map();
  private weekCache: Map<WeekKey, PeriodCache<'week'>> = new Map();
  private monthCache: Map<MonthKey, PeriodCache<'month'>> = new Map();
  private yearCache: Map<YearKey, PeriodCache<'year'>> = new Map();
  private alltimeCache: PeriodCache<'anytime'> | null = null;

  // Prior period maps for efficient lookups
  private priorDayMap: Map<DayKey, DayKey | null> = new Map();
  private priorWeekMap: Map<WeekKey, WeekKey | null> = new Map();
  private priorMonthMap: Map<MonthKey, MonthKey | null> = new Map();
  private priorYearMap: Map<YearKey, YearKey | null> = new Map();

  setDays(allDays: DayEntry[]) {
    
    // Clear all caches
    this.dayCache.clear();
    this.weekCache.clear();
    this.monthCache.clear();
    this.yearCache.clear();
    this.alltimeCache = null;
    
    // Clear prior maps
    this.priorDayMap.clear();
    this.priorWeekMap.clear();
    this.priorMonthMap.clear();
    this.priorYearMap.clear();
    
    // Store day entries
    this.dayEntries.clear();
    for (const day of allDays) {
      this.dayEntries.set(day.date, day);
    }
    
    // Build prior period maps
    this.buildPriorMaps();
  }

  setDay(day: DayEntry) {
    const oldDay = this.dayEntries.get(day.date);
    const isNewDay = !oldDay;
    this.dayEntries.set(day.date, day);
    
    // If numbers haven't changed, no need to invalidate
    if (oldDay && JSON.stringify(oldDay.numbers) === JSON.stringify(day.numbers)) {
      return;
    }
    
    // If this is a new day, update prior maps
    if (isNewDay) {
      this.updatePriorMapsForDay(day.date);
    }
    
    // Invalidate caches affected by this day
    const dayKey = day.date;
    const monthKey = convertDateKey(dayKey, 'month');
    const weekKey = convertDateKey(dayKey, 'week');
    const yearKey = convertDateKey(dayKey, 'year');
    
    // Invalidate this day
    this.invalidate(this.dayCache.get(dayKey));
    
    // Invalidate this week
    this.invalidate(this.weekCache.get(weekKey));
    
    // Invalidate this month
    this.invalidate(this.monthCache.get(monthKey));
    
    // Invalidate this year
    this.invalidate(this.yearCache.get(yearKey));
    
    // Invalidate all following days (for cumulatives)
    this.dayCache.forEach((cache, key) => key > dayKey && this.invalidateAggregates(cache));
    
    // Invalidate all following weeks
    this.weekCache.forEach((cache, key) => key > weekKey && this.invalidateAggregates(cache));
    
    // Invalidate all following months
    this.monthCache.forEach((cache, key) => key > monthKey && this.invalidateAggregates(cache));
    
    // Invalidate all following years
    this.yearCache.forEach((cache, key) => key > yearKey && this.invalidateAggregates(cache));
    
    // Invalidate alltime
    this.alltimeCache = null;
  }

  // Completely invalidates a period cache calculations (numbers, stats, aggregates, etc)
  private invalidate(cache: PeriodCache<any> | undefined) {
    if (cache) {
      cache.numbers = null;
      cache.stats = null;
      cache.deltas = null;
      cache.percents = null;
      cache.extremes = null;
      cache.cumulatives = null;
      cache.cumulativeDeltas = null;
      cache.cumulativePercents = null;
    }
  }

  // Invalidates only the aggregate calculations (deltas, percents, cumulatives) but keeps numbers and stats intact
  private invalidateAggregates(cache: PeriodCache<any> | undefined) {
    if (cache) {
      cache.deltas = null;
      cache.percents = null;
      cache.cumulatives = null;
      cache.cumulativeDeltas = null;
      cache.cumulativePercents = null;
    }
  }

  private computeDeltas<P extends TimePeriod, K extends CalendarPeriodData<P>['dateKey']>(
    cache: WithNonNullKeys<PeriodCache<P>, 'stats'>,
    getPriorKey: (key: K) => K | null,
    getPriorStats: (key: K) => NumberStats,
  ): asserts cache is WithNonNullKeys<PeriodCache<P>, 'stats' | 'deltas' | 'percents'> {
    if (cache.deltas !== null && cache.percents !== null) return;

    const currentKey = cache.dateKey as K;
    const priorKey = getPriorKey(currentKey);
    if (priorKey) {
      const priorStats = getPriorStats(priorKey);
      cache.deltas = getStatsDelta(cache.stats, priorStats);
      cache.percents = getStatsPercentChange(cache.stats, priorStats);
    } else {
      cache.deltas = null;
      cache.percents = null;
    }
  }

  private computeCumulatives<P extends TimePeriod, K extends CalendarPeriodData<P>['dateKey']>(
    cache: WithNonNullKeys<PeriodCache<P>, 'stats'>,
    getCache: (key: K) => WithNonNullKeys<PeriodCache<P>, 'stats'>,
    getPriorKey: (key: K) => K | null,
  ): asserts cache is WithNonNullKeys<PeriodCache<P>, 'stats' | 'cumulatives' | 'cumulativeDeltas' | 'cumulativePercents'> {
    if (cache.cumulatives !== null) {
      return;
    }

    const currentKey = cache.dateKey as K;
    const cacheChain: K[] = [];

    let current: K | null = currentKey;
    while (current) {
      const currentCache = getCache(current);
      cacheChain.push(current);

      if (currentCache.cumulatives !== null) {
        break;
      }

      const prior = getPriorKey(current);
      if (!prior) break;
      current = prior;
    }

    cacheChain.reverse();

    let priorCumulatives: NumberStats | null = null;

    for (const key of cacheChain) {
      const currentCache = getCache(key);

      if (currentCache.cumulatives !== null) {
        priorCumulatives = currentCache.cumulatives;
        continue;
      }

      const stats = currentCache.stats;
      if (priorCumulatives) {
        const allNumbers: number[] = [priorCumulatives.total, ...(currentCache.numbers ?? [])];
        currentCache.cumulatives = computeNumberStats(allNumbers) ?? stats;
        currentCache.cumulativeDeltas = getStatsDelta(currentCache.cumulatives, priorCumulatives);
        currentCache.cumulativePercents = getStatsPercentChange(currentCache.cumulatives, priorCumulatives);
      } else {
        currentCache.cumulatives = stats;
        currentCache.cumulativeDeltas = stats;
        currentCache.cumulativePercents = stats;
      }

      priorCumulatives = currentCache.cumulatives;
    }
  }

  // Internal method to get the day cache, computing numbers and stats if needed
  private getDayCache(dayKey: DayKey): WithNonNullKeys<PeriodCache<'day'>, 'stats' | 'numbers'> {
    let cache = this.dayCache.get(dayKey);
    if (!cache) {
      cache = {
        dateKey: dayKey,
        period: 'day',
        numbers: null,
        stats: null,
        deltas: null,
        percents: null,
        extremes: null,
        cumulatives: null,
        cumulativeDeltas: null,
        cumulativePercents: null,
      };
      this.dayCache.set(dayKey, cache);
    }
    
    // Compute numbers
    if (cache.numbers === null) {
      const entry = this.dayEntries.get(dayKey);
      cache.numbers = entry ? entry.numbers : [];
    }
    
    // Compute stats
    if (cache.stats === null) {
      cache.stats = computeNumberStats(cache.numbers) ?? emptyStats();
    }
    
    return cache as WithNonNullKeys<PeriodCache<'day'>, 'stats' | 'numbers'>;
  }

  /**
   * Get data for a specific day
   */
  getDayData(dayKey: DayKey): CalendarPeriodData<'day'> {
    
    // Ensure numbers and stats are computed
    const cache = this.getDayCache(dayKey);
    
    // Lazy compute deltas and percents
    this.computeDeltas(cache, this.getPriorDay.bind(this), (key) => this.getDayCache(key).stats);
    
    // Lazy compute cumulatives
    this.computeCumulatives(cache, (key) => this.getDayCache(key), this.getPriorDay.bind(this));

    // No extremes for day period
    cache.extremes = undefined;
    
    return cache as CalendarPeriodData<'day'>;
  }

  // Internal method to get the week cache, computing numbers and stats if needed
  private getWeekCache(weekKey: WeekKey): WithNonNullKeys<PeriodCache<'week'>, 'stats' | 'numbers'> {
    let cache = this.weekCache.get(weekKey);
    
    if (!cache) {
      // Compute permanent child keys (days in this week)
      const { year, week } = parseWeekKey(weekKey);
      const days = getWeekDays(year, week);
      
      cache = {
        dateKey: weekKey,
        period: 'week',
        days,
        numbers: null,
        stats: null,
        deltas: null,
        percents: null,
        extremes: null,
        cumulatives: null,
        cumulativeDeltas: null,
        cumulativePercents: null,
      };
      this.weekCache.set(weekKey, cache);
    }
    
    const days = cache.days ?? [];
    
    // Compute numbers
    if (cache.numbers === null) {
      cache.numbers = [];
      for (const dayKey of days) {
        cache.numbers.push(...this.dayEntries.get(dayKey)?.numbers ?? []);
      }
    }
    
    // Compute stats
    if (cache.stats === null) {
      cache.stats = computeNumberStats(cache.numbers) ?? emptyStats();
    }
    
    return cache as WithNonNullKeys<PeriodCache<'week'>, 'stats' | 'numbers'>;
  }

  getWeekData(weekKey: WeekKey): CalendarPeriodData<'week'> {
    // Ensure cache, stats, and derived data are computed
    const cache = this.getWeekCache(weekKey);
    const days = cache.days ?? [];

    // Lazy compute deltas and percents
    this.computeDeltas(cache, this.getPriorWeek.bind(this), (key) => this.getWeekCache(key).stats);
    
    // Lazy compute cumulatives
    this.computeCumulatives(cache, (key) => this.getWeekCache(key), this.getPriorWeek.bind(this));
    
    // Lazy compute extremes
    if (cache.extremes === null) {
      const dayStats = days.map(d => this.getDayCache(d).stats);
      cache.extremes = calculateExtremes(dayStats);
    }
    
    return cache as CalendarPeriodData<'week'>;
  }

  // Internal method to get the month cache, computing numbers and stats if needed
  private getMonthCache(monthKey: MonthKey): WithNonNullKeys<PeriodCache<'month'>, 'stats' | 'numbers'> {
    let cache = this.monthCache.get(monthKey);
    
    if (!cache) {
      // Compute permanent child keys
      const date = parseDateKey(monthKey)
      const days = getMonthDays(date.getFullYear(), date.getMonth() + 1);
      
      // Get weeks that overlap with this month
      const weeks = getMonthWeeks(date.getFullYear(), date.getMonth() + 1);
      
      cache = {
        dateKey: monthKey,
        period: 'month',
        days,
        weeks,
        numbers: null,
        stats: null,
        deltas: null,
        percents: null,
        extremes: null,
        cumulatives: null,
        cumulativeDeltas: null,
        cumulativePercents: null,
      };
      this.monthCache.set(monthKey, cache);
    }
    
    const days = cache.days ?? [];
    
    // Compute numbers
    if (cache.numbers === null) {
      cache.numbers = [];
      for (const dayKey of days) {
        cache.numbers.push(...this.dayEntries.get(dayKey)?.numbers ?? []);
      }
    }
    
    // Compute stats
    if (cache.stats === null) {
      cache.stats = computeNumberStats(cache.numbers) ?? emptyStats();
    }
    
    return cache as WithNonNullKeys<PeriodCache<'month'>, 'stats' | 'numbers'>;
  }

  getMonthData(monthKey: MonthKey): CalendarPeriodData<'month'> {
    // Ensure cache, stats, and derived data are computed
    const cache = this.getMonthCache(monthKey);
    const days = cache.days ?? [];

    // Lazy compute deltas and percents
    this.computeDeltas(cache, this.getPriorMonth.bind(this), (key) => this.getMonthCache(key).stats);
    
    // Lazy compute cumulatives
    this.computeCumulatives(cache, (key) => this.getMonthCache(key), this.getPriorMonth.bind(this));
    
    // Lazy compute extremes
    if (cache.extremes === null) {
      const dayStats = days.map(d => this.getDayCache(d).stats);
      cache.extremes = calculateExtremes(dayStats);
    }
    
    return cache as CalendarPeriodData<'month'>;
  }

  // Internal method to get the year cache, computing numbers and stats if needed
  private getYearCache(yearKey: YearKey): WithNonNullKeys<PeriodCache<'year'>, 'stats' | 'numbers'> {
    let cache = this.yearCache.get(yearKey);
    
    if (!cache) {
      // Compute permanent child keys
      const date = parseDateKey(yearKey);
      const days = getYearDays(date.getFullYear());
      
      // Get all months in the year
      const months = getYearMonths(date.getFullYear());
      
      // Get all weeks that overlap with this year
      const weeks = getYearWeeks(date.getFullYear());
      
      cache = {
        dateKey: yearKey,
        period: 'year',
        days,
        weeks,
        months,
        numbers: null,
        stats: null,
        deltas: null,
        percents: null,
        extremes: null,
        cumulatives: null,
        cumulativeDeltas: null,
        cumulativePercents: null,
      };
      this.yearCache.set(yearKey, cache);
    }
    
    const days = cache.days ?? [];
    
    // Compute numbers
    if (cache.numbers === null) {
      cache.numbers = [];
      for (const dayKey of days) {
        cache.numbers.push(...this.dayEntries.get(dayKey)?.numbers ?? []);
      }
    }
    
    // Compute stats
    if (cache.stats === null) {
      cache.stats = computeNumberStats(cache.numbers) ?? emptyStats();
    }
    
    return cache as WithNonNullKeys<PeriodCache<'year'>, 'stats' | 'numbers'>;
  }

  getYearData(yearKey: YearKey): CalendarPeriodData<'year'> {
    // Ensure cache, stats, and derived data are computed
    const cache = this.getYearCache(yearKey);
    const days = cache.days ?? [];

    // Lazy compute deltas and percents
    this.computeDeltas(cache, this.getPriorYear.bind(this), (key) => this.getYearCache(key).stats);
    
    // Lazy compute cumulatives
    this.computeCumulatives(cache, (key) => this.getYearCache(key), this.getPriorYear.bind(this));
    
    // Lazy compute extremes
    if (cache.extremes === null) {
      const dayStats = days.map(d => this.getDayCache(d).stats);
      cache.extremes = calculateExtremes(dayStats);
    }
    
    return cache as CalendarPeriodData<'year'>;
  }

  getAlltimeData(): CalendarPeriodData<'anytime'> {
    if (!this.alltimeCache) {
      this.alltimeCache = {
        dateKey: null,
        period: 'anytime',
        numbers: null,
        stats: null,
        deltas: null,
        percents: null,
        extremes: null,
        cumulatives: null,
        cumulativeDeltas: null,
        cumulativePercents: null,
      };
    }
    
    const cache = this.alltimeCache;
    
    // Lazy compute numbers
    if (cache.numbers === null) {
      cache.numbers = [];
      for (const entry of this.dayEntries.values()) {
        cache.numbers.push(...entry.numbers);
      }
    }
    
    // Lazy compute stats
    if (cache.stats === null) {
      cache.stats = computeNumberStats(cache.numbers) ?? emptyStats();
    }
    
    // Alltime doesn't have deltas, percents, or cumulatives (no prior period)
    cache.deltas = emptyStats();
    cache.percents = emptyStats();
    cache.cumulatives = cache.stats;
    cache.cumulativeDeltas = emptyStats();
    cache.cumulativePercents = emptyStats();
    
    // Lazy compute extremes
    if (cache.extremes === null) {
      const allDays = Array.from(this.dayEntries.keys()).sort();
      const dayStats = allDays.map(d => this.getDayCache(d).stats);
      cache.extremes = calculateExtremes(dayStats);
    }
    
    return cache as CalendarPeriodData<'anytime'>;
  }

  // Build prior period maps from current data
  private buildPriorMaps() {
    // Build prior day map
    const sortedDays = Array.from(this.dayEntries.keys()).sort();
    for (let i = 0; i < sortedDays.length; i++) {
      const dayKey = sortedDays[i];
      const priorDay = i > 0 ? sortedDays[i - 1] : null;
      this.priorDayMap.set(dayKey, priorDay);
    }
    
    // Build prior week map by collecting all weeks
    const weeksSet = new Set<WeekKey>();
    for (const dayKey of sortedDays) {
      const weekKey = convertDateKey(dayKey, 'week');
      weeksSet.add(weekKey);
    }
    const sortedWeeks = Array.from(weeksSet).sort();
    for (let i = 0; i < sortedWeeks.length; i++) {
      const weekKey = sortedWeeks[i];
      const priorWeek = i > 0 ? sortedWeeks[i - 1] : null;
      this.priorWeekMap.set(weekKey, priorWeek);
    }
    
    // Build prior month map by collecting all months
    const monthsSet = new Set<MonthKey>();
    for (const dayKey of sortedDays) {
      const monthKey = convertDateKey(dayKey, 'month');
      monthsSet.add(monthKey);
    }
    const sortedMonths = Array.from(monthsSet).sort();
    for (let i = 0; i < sortedMonths.length; i++) {
      const monthKey = sortedMonths[i];
      const priorMonth = i > 0 ? sortedMonths[i - 1] : null;
      this.priorMonthMap.set(monthKey, priorMonth);
    }
    
    // Build prior year map by collecting all years
    const yearsSet = new Set<YearKey>();
    for (const dayKey of sortedDays) {
      const yearKey = convertDateKey(dayKey, 'year');
      yearsSet.add(yearKey);
    }
    const sortedYears = Array.from(yearsSet).sort();
    for (let i = 0; i < sortedYears.length; i++) {
      const yearKey = sortedYears[i];
      const priorYear = i > 0 ? sortedYears[i - 1] : null;
      this.priorYearMap.set(yearKey, priorYear);
    }
  }

  // Update prior maps when a new day is added
  private updatePriorMapsForDay(dayKey: DayKey) {
    // Update day prior map
    const sortedDays = Array.from(this.dayEntries.keys()).sort();
    const dayIndex = sortedDays.indexOf(dayKey);
    if (dayIndex >= 0) {
      const priorDay = dayIndex > 0 ? sortedDays[dayIndex - 1] : null;
      this.priorDayMap.set(dayKey, priorDay);
      
      // Update the next day's prior if it exists
      if (dayIndex < sortedDays.length - 1) {
        const nextDay = sortedDays[dayIndex + 1];
        this.priorDayMap.set(nextDay, dayKey);
      }
    }
    
    // Update week prior map
    const weekKey = convertDateKey(dayKey, 'week');
    if (!this.priorWeekMap.has(weekKey)) {
      const sortedWeeks = Array.from(this.weekCache.keys()).sort();
      sortedWeeks.push(weekKey);
      sortedWeeks.sort();
      const weekIndex = sortedWeeks.indexOf(weekKey);
      const priorWeek = weekIndex > 0 ? sortedWeeks[weekIndex - 1] : null;
      this.priorWeekMap.set(weekKey, priorWeek);
      
      if (weekIndex < sortedWeeks.length - 1) {
        const nextWeek = sortedWeeks[weekIndex + 1];
        this.priorWeekMap.set(nextWeek, weekKey);
      }
    }
    
    // Update month prior map
    const monthKey = convertDateKey(dayKey, 'month');
    if (!this.priorMonthMap.has(monthKey)) {
      const sortedMonths = Array.from(this.monthCache.keys()).sort();
      sortedMonths.push(monthKey);
      sortedMonths.sort();
      const monthIndex = sortedMonths.indexOf(monthKey);
      const priorMonth = monthIndex > 0 ? sortedMonths[monthIndex - 1] : null;
      this.priorMonthMap.set(monthKey, priorMonth);
      
      if (monthIndex < sortedMonths.length - 1) {
        const nextMonth = sortedMonths[monthIndex + 1];
        this.priorMonthMap.set(nextMonth, monthKey);
      }
    }
    
    // Update year prior map
    const yearKey = convertDateKey(dayKey, 'year');
    if (!this.priorYearMap.has(yearKey)) {
      const sortedYears = Array.from(this.yearCache.keys()).sort();
      sortedYears.push(yearKey);
      sortedYears.sort();
      const yearIndex = sortedYears.indexOf(yearKey);
      const priorYear = yearIndex > 0 ? sortedYears[yearIndex - 1] : null;
      this.priorYearMap.set(yearKey, priorYear);
      
      if (yearIndex < sortedYears.length - 1) {
        const nextYear = sortedYears[yearIndex + 1];
        this.priorYearMap.set(nextYear, yearKey);
      }
    }
  }

  // Helper methods to find prior periods (now O(1) lookups)
  private getPriorDay(dayKey: DayKey): DayKey | null {
    return this.priorDayMap.get(dayKey) ?? null;
  }

  private getPriorWeek(weekKey: WeekKey): WeekKey | null {
    return this.priorWeekMap.get(weekKey) ?? null;
  }

  private getPriorMonth(monthKey: MonthKey): MonthKey | null {
    return this.priorMonthMap.get(monthKey) ?? null;
  }

  private getPriorYear(yearKey: YearKey): YearKey | null {
    return this.priorYearMap.get(yearKey) ?? null;
  }
}