import type { DayEntry, DayKey, MonthKey, TimePeriod, WeekKey, YearKey } from "@/features/db/localdb";
import { getMonthDays, getMonthWeeks, getWeekDays, getYearDays, getYearMonths, getYearWeeks } from "./calendar";
import { convertDateKey, parseDateKey, parseWeekKey, type DateKeyType } from "./friendly-date";
import type { NumberStats, StatsExtremes } from "./stats";
import { calculateExtremes, computeNumberStats, emptyStats, getStatsDelta, getStatsPercentChange } from "./stats";

export type CalendarPeriodData<P extends TimePeriod> = {
  dateKey: {
    'day': DayKey | null; // Null signifies that day doesn't have any entries associated with it
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

// Helper type to represent a cache that has had certain properties computed, used for type safety in methods that compute derived data based on the presence of other computed data.
type PartialComputedCache<D extends DateKeyType, K extends keyof PeriodCache<D>> = PeriodCache<D> & {
  [P in K]: NonNullable<PeriodCache<D>[P]>;
}

/**
 * A cached, lazy computed, and surgically invalidated data manager for all calendar related calculations.
 * 
 * Key features:
 * - Raw day entries are stored in-memory and transformed into period caches on demand.
 * - Each period cache lazily computes numbers, stats, and aggregates (deltas, percents, cumulatives, extremes).
 * - Prior-period maps provide O(1) lookups to compute deltas/cumulatives efficiently.
 * - Updates invalidate only affected caches so unchanged periods keep stable references.
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

  /**
   * In order to avoid stuffing every day with cache items (which can be thousands of entries across many years), 
   * we use a single shared empty cache item for days that don't have any data.
   */
  private emptyDayCacheItem = {
    dateKey: null,
    period: 'day' as const,
    numbers: [],
    stats: emptyStats(),
    deltas: emptyStats(),
    percents: {},
    extremes: undefined,
    cumulatives: emptyStats(),
    cumulativeDeltas: emptyStats(),
    cumulativePercents: {},
  };

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
    if (oldDay && oldDay.numbers.length === day.numbers.length && 
      (oldDay.numbers === day.numbers || oldDay.numbers.every((num, idx) => num === day.numbers[idx]))
    ) {
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

  // Helper to update a cache entry with only the changed props and return the new object
  // Note: this assumes there is already a cache entry for the dateKey, which is true for all current usages since we always create a cache entry before computing any derived data
  private updateCache<P extends DateKeyType>(
    cacheMap: Map<CalendarPeriodData<P>['dateKey'], PeriodCache<P>>,
    updates: Partial<PeriodCache<P>> & Pick<PeriodCache<P>, 'dateKey'>,
  ): CalendarPeriodData<P> {
    const existing = cacheMap.get(updates.dateKey);
    const next = { ...existing, ...updates } as PeriodCache<P>;
    cacheMap.set(next.dateKey, next);
    return next as CalendarPeriodData<P>;
  }

  // Helper to compute deltas and percents based on the presence of stats and a prior period, returns updated cache with deltas and percents filled in
  private computeDeltas<P extends DateKeyType, K extends CalendarPeriodData<P>['dateKey']>(
    cacheMap: Map<K, PeriodCache<P>>,
    cache: PartialComputedCache<P, 'stats' | 'numbers'>,
    getPriorKey: (key: K) => K | null,
    getPriorStats: (key: K) => NumberStats,
  ): PartialComputedCache<P, 'stats' | 'numbers' | 'deltas' | 'percents'> {
    if (cache.deltas !== null && cache.percents !== null) return cache as PartialComputedCache<P, 'stats' | 'numbers' | 'deltas' | 'percents'>;

    const currentKey = cache.dateKey as K;
    let priorKey = getPriorKey(currentKey);
    while (priorKey) {
      const priorStats = getPriorStats(priorKey);
      if (priorStats.count > 0) break;
      priorKey = getPriorKey(priorKey);
    }

    let deltas: NumberStats;
    let percents: Partial<NumberStats>;
    if (priorKey) {
      const priorStats = getPriorStats(priorKey);
      deltas = getStatsDelta(cache.stats, priorStats);
      percents = getStatsPercentChange(cache.stats, priorStats);
    } else {
      deltas = emptyStats();
      percents = {};
    }
    
    return this.updateCache(cacheMap, { dateKey: currentKey, deltas, percents }) as PartialComputedCache<P, 'stats' | 'numbers' | 'deltas' | 'percents'>;
  }

  // Helper to compute cumulatives, cumulative deltas, and cumulative percents based on the presence of stats and a chain of prior periods, returns updated cache with cumulatives filled in
  private computeCumulatives<P extends DateKeyType, K extends CalendarPeriodData<P>['dateKey']>(
    cacheMap: Map<K, PeriodCache<P>>,
    cache: PartialComputedCache<P, 'stats' | 'numbers'>,
    getCache: (key: K) => PartialComputedCache<P, 'stats' | 'numbers'>,
    getPriorKey: (key: K) => K | null,
  ): PartialComputedCache<P, 'stats' | 'numbers' | 'cumulatives' | 'cumulativeDeltas' | 'cumulativePercents'> {
    if (cache.cumulatives !== null) return cache as PartialComputedCache<P, 'stats' | 'numbers' | 'cumulatives' | 'cumulativeDeltas' | 'cumulativePercents'>;

    const currentKey = cache.dateKey as K;
    // Build a chain of period keys walking backward until we hit a cached cumulative (or the start).
    const cacheChain: K[] = [];

    let current: K | null = currentKey;
    while (current) {
      const currentCache = getCache(current);
      cacheChain.push(current);

      // If cumulatives have already been computed for this period, we can stop building the chain, this is the seed to start forward computations.
      if (currentCache.cumulatives !== null) {
        break;
      }

      // Move to the prior period in the chain
      const prior = getPriorKey(current);
      if (!prior) break; // Reached the start of the chain
      current = prior;
    }

    // Compute forward so each period can use the prior cumulative as its seed.
    cacheChain.reverse();

    let priorCumulatives: NumberStats | null = null;

    for (const key of cacheChain) {
      const currentCache = getCache(key);

      // If cumulatives have already been computed for this period (could be from a prior in the chain), use them as the seed for the next periods and skip to the next iteration.
      if (currentCache.cumulatives !== null) {
        priorCumulatives = currentCache.cumulatives;
        continue;
      }

      // Compute cumulatives for the current period
      const stats = currentCache.stats;
      let cumulatives: NumberStats;
      let cumulativeDeltas: NumberStats;
      let cumulativePercents: Partial<NumberStats>;
      if (priorCumulatives) {
        // Seed the running total with the prior cumulative total, then add current numbers.
        const allNumbers: number[] = [priorCumulatives.total, ...(currentCache.numbers ?? [])];
        cumulatives = computeNumberStats(allNumbers) ?? stats;
        cumulativeDeltas = getStatsDelta(cumulatives, priorCumulatives);
        cumulativePercents = getStatsPercentChange(cumulatives, priorCumulatives);
      } else {
        // First period in the chain: cumulative equals the period stats, no deltas or percents
        cumulatives = stats;
        cumulativeDeltas = emptyStats();
        cumulativePercents = {};
      }

      // Update the cache with the new cumulative values
      const updatedCache = this.updateCache(cacheMap, {
        dateKey: currentCache.dateKey as K,
        cumulatives,
        cumulativeDeltas,
        cumulativePercents,
      });

      // Set the prior cumulatives for the next iteration
      priorCumulatives = updatedCache.cumulatives;
    }

    // Return the stored cache entry because the loop refreshes instances above
    return cacheMap.get(cache.dateKey as K) as PartialComputedCache<P, 'stats' | 'numbers' | 'cumulatives' | 'cumulativeDeltas' | 'cumulativePercents'>;
  }

  // Internal method to get the day cache, computing numbers and stats if needed
  private getDayCache(dayKey: DayKey): PartialComputedCache<'day', 'stats' | 'numbers'> {
    const entry = this.dayEntries.get(dayKey);
    if (!entry) return this.emptyDayCacheItem;

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
    
    // Lazily compute numbers and stats
    if (cache.numbers === null || cache.stats === null) {
      const numbers = entry.numbers;
      const stats = computeNumberStats(numbers ?? []) ?? emptyStats();
      cache = this.updateCache(this.dayCache, { dateKey: cache.dateKey, numbers, stats });
    }
    
    return cache as PartialComputedCache<'day', 'stats' | 'numbers'>;
  }

  /**
   * Get data for a specific day
   */
  getDayData(dayKey: DayKey): CalendarPeriodData<'day'> {
    
    // Ensure numbers and stats are computed
    let cache = this.getDayCache(dayKey);

    // If there's no data associated with this day, return the default empty cache with null dateKey to signify it's an empty day
    if (cache.dateKey === null) return cache as CalendarPeriodData<'day'>;

    // Lazy compute deltas and percents
    cache = this.computeDeltas(this.dayCache, cache, this.getPriorDay.bind(this), (key) => this.getDayCache(key).stats);
    
    // Lazy compute cumulatives
    cache = this.computeCumulatives(this.dayCache, cache, (key) => this.getDayCache(key), this.getPriorDay.bind(this));

    // No extremes for day period
    if (cache.extremes === null) {
      cache = this.updateCache(this.dayCache, { dateKey: cache.dateKey, extremes: undefined });
    }
    
    return cache as CalendarPeriodData<'day'>;
  }

  // Internal method to get the week cache, computing numbers and stats if needed
  private getWeekCache(weekKey: WeekKey): PartialComputedCache<'week', 'stats' | 'numbers'> {
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
    
    // Lazily compute numbers and stats
    if (cache.numbers === null || cache.stats === null) {
      const days = cache.days ?? [];
      const numbers: number[] = [];
      for (const dayKey of days) {
        numbers.push(...this.dayEntries.get(dayKey)?.numbers ?? []);
      }
      const stats = computeNumberStats(numbers ?? []) ?? emptyStats();
      cache = this.updateCache(this.weekCache, { dateKey: cache.dateKey, numbers, stats });
    }
    
    return cache as PartialComputedCache<'week', 'stats' | 'numbers'>;
  }

  getWeekData(weekKey: WeekKey): CalendarPeriodData<'week'> {
    // Ensure cache, stats, and derived data are computed
    let cache = this.getWeekCache(weekKey);
    const days = cache.days ?? [];

    // Lazy compute deltas and percents
    cache = this.computeDeltas(this.weekCache, cache, this.getPriorWeek.bind(this), (key) => this.getWeekCache(key).stats);
    
    // Lazy compute cumulatives
    cache = this.computeCumulatives(this.weekCache, cache, (key) => this.getWeekCache(key), this.getPriorWeek.bind(this));
    
    // Lazy compute extremes
    if (cache.extremes === null) {
      const dayStats = days.map(d => this.getDayCache(d).stats);
      const extremes = calculateExtremes(dayStats);
      cache = this.updateCache(this.weekCache, { dateKey: cache.dateKey, extremes });
    }
    
    return cache as CalendarPeriodData<'week'>;
  }

  // Internal method to get the month cache, computing numbers and stats if needed
  private getMonthCache(monthKey: MonthKey): PartialComputedCache<'month', 'stats' | 'numbers'> {
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
    
    // Lazily compute numbers and stats
    if (cache.numbers === null || cache.stats === null) {
      const days = cache.days ?? [];
      const numbers: number[] = [];
      for (const dayKey of days) {
        numbers.push(...this.dayEntries.get(dayKey)?.numbers ?? []);
      }
      const stats = computeNumberStats(numbers ?? []) ?? emptyStats();
      cache = this.updateCache(this.monthCache, { dateKey: cache.dateKey, numbers, stats });
    }
    
    return cache as PartialComputedCache<'month', 'stats' | 'numbers'>;
  }

  getMonthData(monthKey: MonthKey): CalendarPeriodData<'month'> {
    // Ensure cache, stats, and derived data are computed
    let cache = this.getMonthCache(monthKey);
    const days = cache.days ?? [];

    // Lazy compute deltas and percents
    cache = this.computeDeltas(this.monthCache, cache, this.getPriorMonth.bind(this), (key) => this.getMonthCache(key).stats);
    
    // Lazy compute cumulatives
    cache = this.computeCumulatives(this.monthCache, cache, (key) => this.getMonthCache(key), this.getPriorMonth.bind(this));
    
    // Lazy compute extremes
    if (cache.extremes === null) {
      const dayStats = days.map(d => this.getDayCache(d).stats);
      const extremes = calculateExtremes(dayStats);
      cache = this.updateCache(this.monthCache, { dateKey: cache.dateKey, extremes });
    }
    
    return cache as CalendarPeriodData<'month'>;
  }

  // Internal method to get the year cache, computing numbers and stats if needed
  private getYearCache(yearKey: YearKey): PartialComputedCache<'year', 'stats' | 'numbers'> {
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
    
    // Lazily compute numbers and stats
    if (cache.numbers === null || cache.stats === null) {
      const days = cache.days ?? [];
      const numbers: number[] = [];
      for (const dayKey of days) {
        numbers.push(...this.dayEntries.get(dayKey)?.numbers ?? []);
      }
      const stats = computeNumberStats(numbers ?? []) ?? emptyStats();
      cache = this.updateCache(this.yearCache, { dateKey: cache.dateKey, numbers, stats });
    }
    
    return cache as PartialComputedCache<'year', 'stats' | 'numbers'>;
  }

  getYearData(yearKey: YearKey): CalendarPeriodData<'year'> {
    // Ensure cache, stats, and derived data are computed
    let cache = this.getYearCache(yearKey);
    
    // Lazy compute deltas and percents
    cache = this.computeDeltas(this.yearCache, cache, this.getPriorYear.bind(this), (key) => this.getYearCache(key).stats);
    
    // Lazy compute cumulatives
    cache = this.computeCumulatives(this.yearCache, cache, (key) => this.getYearCache(key), this.getPriorYear.bind(this));
    
    // Lazy compute extremes
    if (cache.extremes === null) {
      const days = cache.days ?? [];
      const dayStats = days.map(d => this.getDayCache(d).stats);
      const extremes = calculateExtremes(dayStats);
      cache = this.updateCache(this.yearCache, { dateKey: cache.dateKey, extremes });
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
    
    let cache = this.alltimeCache;
    
    // Lazy compute numbers and stats
    if (cache.numbers === null || cache.stats === null) {
      const numbers: number[] = [];
      for (const entry of this.dayEntries.values()) {
        numbers.push(...entry.numbers);
      }
      const stats = computeNumberStats(numbers) ?? emptyStats();
      cache = { ...cache, numbers, stats, cumulatives: stats };
    }
    
    // Alltime doesn't have deltas or percents (no prior period)
    if (cache.deltas === null) {
      cache = {
        ...cache,
        deltas: emptyStats(),
        percents: {},
        cumulativeDeltas: emptyStats(),
        cumulativePercents: {},
      };
    }
    
    // Lazy compute extremes
    if (cache.extremes === null) {
      const allDays = Array.from(this.dayEntries.keys()).sort();
      const dayStats = allDays.map(d => this.getDayCache(d).stats);
      const extremes = calculateExtremes(dayStats);
      cache = { ...cache, extremes };
    }

    // Fresh cache object if anything changed
    this.alltimeCache = cache;
    
    return this.alltimeCache as CalendarPeriodData<'anytime'>;
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