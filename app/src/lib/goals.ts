import { type Achievement, type DateKey, type DayKey, type Goal, type GoalRequirements, type GoalType, type GoalTarget, type TimePeriod } from '@/features/db/localdb';
import { nanoid } from 'nanoid';
import { convertDateKey, isDayKey, type DateKeyType } from './friendly-date';
import { computeNumberStats, getMetricDisplayName, getStatsDelta, getStatsPercentChange, type NumberStats } from './stats';
import { capitalize, keysOf } from './utils';

// Helper: evaluate a metric condition (inclusive for non-zero, exclusive for zero)
function evalCondition(cond: GoalTarget, value: number): boolean {
  if (cond.condition === 'above') {
    if (cond.value === 0) return value > 0;
    return value >= cond.value;
  }
  if (cond.condition === 'below') {
    if (cond.value === 0) return value < 0;
    return value <= cond.value;
  }
  if (cond.condition === 'equal') return value === cond.value;
  if (cond.condition === 'inside') return value >= cond.range[0] && value <= cond.range[1];
  if (cond.condition === 'outside') return value < cond.range[0] || value > cond.range[1];
  return false;
}

// Caches for periods, period data, and period stats by timePeriod type
function createPeriodCache(data: Record<DayKey, number[]>) {
  const periodsCache: Partial<Record<TimePeriod, DateKey[]>> = {};
  const periodDataCache: Partial<Record<TimePeriod, Record<DateKey, number[]>>> = {};
  const periodStatsCache: Partial<Record<TimePeriod, Record<DateKey, NumberStats | null>>> = {};
  const periodDeltasCache: Partial<Record<TimePeriod, Record<DateKey, Record<keyof NumberStats, number> | null>>> = {};
  const periodPercentsCache: Partial<Record<TimePeriod, Record<DateKey, Partial<NumberStats> | null>>> = {};
  let anytimeStats: NumberStats | null | undefined = undefined;

  function getPeriods(timePeriod: 'day'): DayKey[]
  function getPeriods(timePeriod: DateKeyType): DateKey[]
  function getPeriods(timePeriod: DateKeyType): DateKey[] {
    if (periodsCache[timePeriod]) return periodsCache[timePeriod]!;
    let periods: DateKey[] = [];
    if (timePeriod === 'day') periods = keysOf(data).filter(isDayKey).sort() as DateKey[];
    else if (timePeriod === 'week' || timePeriod === 'month' || timePeriod === 'year') {
      periods = Array.from(new Set(keysOf(data).filter(isDayKey).map(d => convertDateKey(d, timePeriod)))).sort() as DateKey[];
    }
    periodsCache[timePeriod] = periods;
    return periods;
  }

  function getPeriodData(timePeriod: DateKeyType): Record<DateKey, number[]> {
    if (periodDataCache[timePeriod]) return periodDataCache[timePeriod]!;
    let result: Record<DateKey, number[]> = {};
    if (timePeriod === 'day') {
      result = { ...data };
    } else if (timePeriod === 'week' || timePeriod === 'month' || timePeriod === 'year') {
      for (const k of keysOf(data).filter(isDayKey)) {
        const period = convertDateKey(k, timePeriod);
        if (!result[period]) result[period] = [];
        result[period].push(...data[k]);
      }
    }
    periodDataCache[timePeriod] = result;
    return result;
  }

  function getPeriodStats(timePeriod: DateKeyType): Record<DateKey, NumberStats | null> {
    if (periodStatsCache[timePeriod]) return periodStatsCache[timePeriod]!;
    const dataByPeriod = getPeriodData(timePeriod);
    const stats: Record<DateKey, NumberStats | null> = {};
    for (const period of keysOf(dataByPeriod)) {
      stats[period] = computeNumberStats(dataByPeriod[period]);
    }
    periodStatsCache[timePeriod] = stats;
    return stats;
  }

  function getPeriodDeltas(timePeriod: DateKeyType): Record<DateKey, Record<keyof NumberStats, number> | null> {
    if (periodDeltasCache[timePeriod]) return periodDeltasCache[timePeriod]!;
    const periods = getPeriods(timePeriod);
    const statsByPeriod = getPeriodStats(timePeriod);
    const deltas: Record<DateKey, Record<keyof NumberStats, number> | null> = {};
    let priorStats: NumberStats | null = null;
    for (const period of periods) {
      const stats = statsByPeriod[period];
      if (stats && priorStats) {
        deltas[period] = getStatsDelta(stats, priorStats);
      } else {
        deltas[period] = null;
      }
      if (stats) priorStats = stats;
    }
    periodDeltasCache[timePeriod] = deltas;
    return deltas;
  }

  function getPeriodPercents(timePeriod: DateKeyType): Record<DateKey, Partial<NumberStats> | null> {
    if (periodPercentsCache[timePeriod]) return periodPercentsCache[timePeriod]!;
    const periods = getPeriods(timePeriod);
    const statsByPeriod = getPeriodStats(timePeriod);
    const percents: Record<DateKey, Partial<NumberStats> | null> = {};
    let priorStats: NumberStats | null = null;
    for (const period of periods) {
      const stats = statsByPeriod[period];
      if (stats && priorStats) {
        percents[period] = getStatsPercentChange(stats, priorStats);
      } else {
        percents[period] = null;
      }
      if (stats) priorStats = stats;
    }
    periodPercentsCache[timePeriod] = percents;
    return percents;
  }

  function getAnytimeStats(): NumberStats | null {
    if (anytimeStats !== undefined) return anytimeStats;
    anytimeStats = computeNumberStats(Object.values(data).flat());
    return anytimeStats;
  }

  return { getPeriods, getPeriodData, getPeriodStats, getPeriodDeltas, getPeriodPercents, getAnytimeStats };
}

export interface GoalResults {
  goal: Goal;
  achievements: Achievement[];
  completedCount: number;
  currentProgress: number;
  lastCompletedAt?: DateKey;
  firstCompletedAt?: DateKey;
}

/**
 * Updates and computes the progress and completion state of all goals for a dataset, returning a summary for each goal.
 * 
 * This function processes a list of goals, existing achievements, and the current dataset's data to:
 * - Determine which goals have been completed, are in progress, or are locked.
 * - Create or update achievement records for each goal, including handling streaks, multi-period counts, and one-time goals.
 * - For 'anytime' goals, finds the exact day the goal was achieved and sets completedAt accordingly.
 * - For periodic goals (day/week/month/year), tracks completed and in-progress achievements, including streaks and multi-period counts.
 * - Ensures completed achievements are always preserved, but in-progress achievements are only preserved if they remain valid with the current data.
 * - Returns a summary for each goal, including the list of achievements, completed count, current progress, and completion dates.
 * 
 * TODO: 
 * - Does not handle goal.source yet, it evaluates all goals are based on 'stats' source.
 * - Does not support `resets` logic, all goals implicitly reset in their respective periods, so "1k a Day in a Week" is not possible, only "7 x 1k Days" or "7-Day 1k Streak".
 * - Does not support `repeatable` flag, all goals are treated as repeatable except 'anytime' goals.
 * - For time periods other than 'anytime', completed in the curren period should be provisional and can be lost if data changes.
 * - Optimization: only check dates following the last achievement completedAt for each goal.
 * 
 *
 * @param {Object} params
 * @param {Goal[]} params.goals - The list of goals to evaluate.
 * @param {Achievement[]} params.achievements - The list of existing achievement records for the dataset.
 * @param {Record<DayKey, number[]>} params.data - The dataset's data, keyed by day.
 * @param {string} params.datasetId - The dataset ID.
 * @returns {GoalResults[]} An array of results, one per goal, with computed achievements, progress, and completion info.
 *
 * Notes:
 * - For non-repeating (anytime) goals, only one achievement is tracked and completedAt is set to the exact day the goal was achieved.
 * - For repeating goals, completed achievements are always preserved, but in-progress achievements are only preserved if the streak/progress is still valid.
 * - Handles both consecutive and non-consecutive count goals, as well as streaks and multi-period goals.
 * - Designed to be idempotent and safe to call repeatedly as data or achievements change.
 */
export function processAchievements({
  goals,
  achievements,
  data,
  datasetId,
}: {
  goals: Goal[];
  achievements: Achievement[];
  data: Record<DayKey, number[]>;
  datasetId: string;
}): GoalResults[] {

  const { getPeriods, getPeriodData, getPeriodStats, getPeriodDeltas, getPeriodPercents, getAnytimeStats } = createPeriodCache(data);

  const achievementsByGoalId: Record<string, Achievement[]> = achievements.reduce((acc, ach) => {
    if (!acc[ach.goalId]) acc[ach.goalId] = [];
    acc[ach.goalId].push(ach);
    return acc;
  }, {} as Record<string, Achievement[]>);

  const result: GoalResults[] = [];

  for (const goal of goals) {
    const goalAchievements = achievementsByGoalId[goal.id] ?? [];
    let completedCount = 0;
    let currentProgress = 0;
    let lastCompletedAt: DateKey | undefined = undefined;
    let firstCompletedAt: DateKey | undefined = undefined;
    let newAchievements: Achievement[] = [];
    const goalSource = goal.target.source ?? 'stats';
    const getMetricValue = (
      stats: NumberStats | null | undefined,
      deltas: Record<keyof NumberStats, number> | null | undefined,
      percents: Partial<NumberStats> | null | undefined,
    ) => {
      if (goalSource === 'stats') return stats?.[goal.target.metric];
      if (goalSource === 'deltas') return deltas?.[goal.target.metric];
      if (goalSource === 'percents') return percents?.[goal.target.metric];
      return undefined;
    };

    // ANYTIME: Only one achievement, only update if not already completed
    if (goal.timePeriod === 'anytime') {
      let ach = goalAchievements[0] ?? { goalId: goal.id, datasetId, progress: 0 };
      if (ach.completedAt) {
        // Already completed, nothing to do
        newAchievements.push(ach);
        completedCount = 1;
        lastCompletedAt = ach.completedAt;
        currentProgress = 1;
      } else {
        if (goalSource !== 'stats') {
          // Deltas/percents are not supported for anytime goals yet.
          ach.progress = 0;
          newAchievements.push(ach);
          currentProgress = ach.progress;
        } else {
          const stat = getAnytimeStats();
          const value = getMetricValue(stat, undefined, undefined);
          const met = typeof value === 'number' && evalCondition(goal.target, value);
          if (met) {
            ach.progress = 1;
            // Find the exact day when the goal was met
            // TODO: Thie would be partially mitigated by a `repeatable` flag, so you can designate `day` time period 
            //   and `repeatable=false` to get an exact first-day a goal is achieved. Anytime goals would still be ambiguous.
            let completedAt: DateKey | undefined = undefined;
            const days = getPeriods('day');
            const acc: number[] = [];
            for (const day of days) {
              if (completedAt) break;
              const numbers = data[day] ?? [];
              acc.push(...numbers);
              const stats = computeNumberStats(acc);
              const dayValue = getMetricValue(stats, undefined, undefined);
              if (typeof dayValue === 'number' && evalCondition(goal.target, dayValue)) {
                completedAt = day;
              }
            }
            ach.completedAt = completedAt;
            completedCount = 1;
            lastCompletedAt = ach.completedAt;
          } else {
            ach.progress = 0;
          }
          newAchievements.push(ach);
          currentProgress = ach.progress;
        }
      }
    } else {
      // PERIODIC: day/week/month/year
      const periods = getPeriods(goal.timePeriod);
      const periodStats = getPeriodStats(goal.timePeriod);
      const periodDeltas = getPeriodDeltas(goal.timePeriod);
      const periodPercents = getPeriodPercents(goal.timePeriod);
      const periodData = getPeriodData(goal.timePeriod);
      const periodAchievements = goalAchievements.reduce((acc, ach) => {
        if (ach.startedAt) {
          acc[ach.startedAt] = ach;
        }
        return acc;
      }, {} as Record<DateKey, Achievement>);
      // For count=1, just check each period
      if (goal.count === 1) {
        for (const period of periods) {
          let ach = periodAchievements[period];
          if (ach && ach.completedAt) {
            // Already completed, nothing to do
            newAchievements.push(ach);
            completedCount++;
            lastCompletedAt = ach.completedAt;
            continue;
          }
          const stat = periodStats[period];
          const value = getMetricValue(stat, periodDeltas[period], periodPercents[period]);
          const met = typeof value === 'number' && evalCondition(goal.target, value);
          if (met) {
            if (!ach) {
              ach = { id: nanoid(), goalId: goal.id, datasetId, progress: 1, startedAt: period, completedAt: period };
              completedCount++;
              lastCompletedAt = period;
            } else {
              ach.progress = 1;
              ach.completedAt = period;
              completedCount++;
              lastCompletedAt = period;
            }
            newAchievements.push(ach);
          }
        }
        currentProgress = completedCount;
      } else {
        // count > 1: streaks and multi-period counts
        // Build a set of periods already covered by completed achievements
        const usedPeriods = new Set<DateKey>();
        for (const ach of goalAchievements) {
          if (ach.completedAt && ach.startedAt) {
            // Mark all periods in this achievement as used
            const startIdx = periods.indexOf(ach.startedAt);
            const endIdx = periods.indexOf(ach.completedAt);
            if (startIdx !== -1 && endIdx !== -1) {
              for (let i = startIdx; i <= endIdx; i++) usedPeriods.add(periods[i]);
            }
            newAchievements.push(ach);
            completedCount++;
            lastCompletedAt = ach.completedAt;
          }
        }
        // Now walk through periods, skipping used, and try to build new streaks
        let streak: DateKey[] = [];
        let streakStart: DateKey | undefined = undefined;
        let streakEnd: DateKey | undefined = undefined;
        for (let i = 0; i < periods.length; i++) {
          const period = periods[i];
          if (usedPeriods.has(period)) continue;
          const stat = periodStats[period];
          const numbers = periodData[period] || [];
          const value = getMetricValue(stat, periodDeltas[period], periodPercents[period]);
          const met = typeof value === 'number' && evalCondition(goal.target, value);
          if (met) {
            if (streak.length === 0) streakStart = period;
            streak.push(period);
            streakEnd = period;
            if (streak.length === goal.count) {
              // Completed a new achievement
              const ach: Achievement = { id: nanoid(), goalId: goal.id, datasetId, progress: goal.count, startedAt: streakStart, completedAt: streakEnd };
              newAchievements.push(ach);
              completedCount++;
              lastCompletedAt = streakEnd;
              // Mark these periods as used
              for (const p of streak) usedPeriods.add(p);
              streak = [];
              streakStart = undefined;
              streakEnd = undefined;
            }
          } else if (numbers.length === 0) {
            // Allow null/empty gaps for consecutive
            // streak remains unchanged
          } else if ('consecutive' in goal && goal.consecutive) {
            // Not met, break streak
            streak = [];
            streakStart = undefined;
            streakEnd = undefined;
          }
        }
        // If streak is not empty and not completed, add as in-progress
        if (streak.length > 0 && streak.length < goal.count) {
          const progress = streak.length;
          const ach: Achievement = { id: nanoid(), goalId: goal.id, datasetId, progress, startedAt: streakStart };
          newAchievements.push(ach);
          currentProgress = progress;
        }
      }
    }
    // After all logic for this goal, find firstCompletedAt
    firstCompletedAt = newAchievements.find(a => !!a.completedAt)?.completedAt;

    result.push({
      goal,
      achievements: newAchievements,
      completedCount,
      currentProgress,
      lastCompletedAt,
      firstCompletedAt,
    });
  }
  return result;
}

// Examples:
// 100k Reached:          { type: 'milestone', targetDate: '2024-12-31', count: 1, goal: { condition: 'above', metric: 'total', source: 'stats', value: 100000 } }
// 1k Monthly Target Hit: { type: 'target', timePeriod: 'monthly', count: 1, goal: { condition: 'above', metric: 'total', source: 'stats', value: 1000 } }
// 10% Weekly Target Hit: { type: 'target', timePeriod: 'weekly', count: 1, goal: { condition: 'above', metric: 'total', source: 'percents', value: 0.1 } }
// First Entry:           { type: 'goal', timePeriod: 'anytime', count: 1, goal: { condition: 'above', metric: 'count', source: 'stats', value: 1 } }
// Active Month:          { type: 'goal', timePeriod: 'monthly', count: 1, goal: { condition: 'above', metric: 'count', source: 'stats', value: 1 } }
// 7-Day Streak:          { type: 'goal', timePeriod: 'daily', count: 7, consecutive: true, goal: { condition: 'above', metric: 'count', source: 'stats', value: 1 } }
// 1k Total:              { type: 'goal', timePeriod: 'anytime', count: 1, goal: { condition: 'above', metric: 'total', source: 'stats', value: 1000 } }
// 1k Day:                { type: 'goal', timePeriod: 'daily', count: 1, goal: { condition: 'above', metric: 'total', source: 'stats', value: 1000 } }
// 1k Daily Average Week: { type: 'goal', timePeriod: 'daily', count: 7, consecutive: true, resets: 'weekly', goal: { condition: 'above', metric: 'mean', source: 'stats', value: 1000 } }
// 7-Day Uptred:          { type: 'goal', timePeriod: 'daily', count: 7, consecutive: 'allow-gaps', goal: { condition: 'above', metric: 'total', source: 'deltas', value: 0 } }
// 7-Day 1% Improvement:  { type: 'goal', timePeriod: 'daily', count: 7, consecutive: 'allow-gaps', goal: { condition: 'above', metric: 'mean', source: 'stats', value: 0.01 } }
// 1k a Day Week:         { type: 'goal', timePeriod: 'daily', count: 7, consecutive: true, resets: 'weekly', goal: { condition: 'above', metric: 'total', source: 'stats', value: 1000 } }
// 100 Positive Days:     { type: 'goal', timePeriod: 'daily', count: 100, consecutive: false, goal: { condition: 'above', metric: 'total', source: 'stats', value: 0 } }
// 4-Week Trend:          { type: 'goal', timePeriod: 'weekly', count: 4, consecutive: true, goal: { condition: 'above', metric: 'total', source: 'deltas', value: 0 } }
// Sustain 90 Days:       { type: 'goal', timePeriod: 'daily', count: 90, consecutive: true, goal: { condition: 'above', metric: 'total', source: 'deltas', value: 0 } }
// Perfect Month:         { type: 'goal', timePeriod: 'monthly', count: 1, goal: { condition: 'above', metric: 'min', source: 'stats', value: 0 } }

export function isValidGoalAttributes(goal: Partial<GoalRequirements>): goal is GoalRequirements {
  const { target: metricGoal, timePeriod, count } = goal;
  if (!metricGoal || !timePeriod || !count) return false;
  const { condition, metric, source } = metricGoal;
  if (!condition || !metric || !source) return false;
  if (isRangeCondition(condition)) {
    if (!metricGoal.range || metricGoal.range.length !== 2) return false;
  } else {
    if (metricGoal.value === undefined) return false;
  }
  return true;
}

// Helper to shorten numbers (e.g., 1000 -> 1k)
function formatValue(num: number | undefined, { short = false, percent = false, delta = false }: { short?: boolean; percent?: boolean; delta?: boolean;  } = {}): string {
  if (num === undefined || isNaN(num)) return '';
  let options: Intl.NumberFormatOptions = {};
  let symbol = '';
  let value = num;
  if (short) {
    options = { notation: 'compact', compactDisplay: 'short', maximumFractionDigits: 1 };
  }
  if (percent) {
    options = { ...options, style: 'percent', maximumFractionDigits: 2 };
    value = num / 100;
  }
  if (delta) {
    options = { ...options, signDisplay: 'always' };
    // symbol = 'Δ'
  }
  const formatted = new Intl.NumberFormat('en-US', options).format(value);
  return `${formatted}${symbol}`;
}

export function getGoalCategory(goal: Goal) {
  const { timePeriod, count, consecutive } = goal;
  return count > 1
    ? consecutive
      ? 'streak'
      : 'count'
    : timePeriod === 'anytime'
      ? 'milestone'
      : 'target';
}

export function getSuggestedGoalContent(goal: Partial<Goal>) {
  const { target: metricGoal, timePeriod = 'anytime', count = 1, consecutive = false, type = 'goal' } = goal;
  const { condition, metric, source } = metricGoal ?? {};
  const value = metricGoal?.value;
  const range = metricGoal?.range ?? [];

  // Type suggestion
  let suggestedType: GoalType = 'goal';
  if (timePeriod === 'anytime' && count === 1) suggestedType = 'milestone';
  else if (count === 1) suggestedType = 'target';

  // Title formatting:
  // {Daily/Weekly/Monthly/Yearly | N-Day/Week/Month/Year | N × } {Value/Range}{Source?} {Metric?} {Streak? | Days/Weeks/Months/Years?} {Milstone/Target?}
  //   {Daily/Weekly/Monthly/Yearly} for count=1
  //   | {N-Day/Week/Month/Year} for count>1, consecutive
  //   | {N × } for count>1, non-consecutive
  //   {Value/Range} use shortened number format, for value=0 & condition="above" use "Positive", "below" use "Negative", if deltas always use sign
  //   {Source} skipped if stats, use % for percents, Δ for deltas
  //   {Metric} skipped if primary metric (total/last/count)
  //   {Streak} only included if count > 1 and consecutive
  //   {Days/Weeks/Months/Years} included for count > 1 non-consecutive
  //   {Streak} only for count>1, consecutive
  //   {Milestone/Target} skipped for goals
  // eg. "7 × 1k Days", "100 Positive Days", "Monthly 10% Target", "1k Milestone", "10k Median Milestone", 
  //    "10-Day +10Δ Streak", "4-Week +5% Trend", "Daily 1k Average Week"

  const isMultiPeriod = !!count && count > 1;
  const isStreak = !!count && count > 1 && !!consecutive;

  // Interval string
  let intervalStr = isStreak 
    ? `${formatValue(count)}-${capitalize(timePeriod)}` // e.g., "7-Day", "4-Week"
    : isMultiPeriod 
    ? `${formatValue(count)}${value !== 0 && source !== 'deltas' ? ' ×' : ''}` // e.g., "7 × ", "100 × "
    : type == 'target' 
    ? timePeriod == 'day' ? 'Daily' : `${capitalize(timePeriod)}ly` // e.g., "Daily", "Weekly", "Monthly", "Yearly"
    : ''

  let valueStr = '';
  const delta = source === 'deltas';
  const percent = source === 'percents';
  const isRange = isRangeCondition(condition);
  if (!isRange) {
    if (value === 0) {
      if (condition === 'above') valueStr = 'Positive'; // TODO: Use valence to formulate better descriptions, like "Green" and "Red"
      else if (condition === 'below') valueStr = 'Negative';
      else if (condition === 'equal') valueStr = 'Zero';
    }
    if (!valueStr) valueStr = formatValue(value, { short: true, delta, percent });
  } else {
    valueStr = `${formatValue(range[0], { short: true })}-${formatValue(range[1], { short: true, delta, percent })}`
  }

  let metricStr = '';
  const isPrimary = metric === 'total' || metric === 'last' || metric === 'count'; // TODO: Use dataset primary metric
  if (!isPrimary && metric) {
    metricStr = getMetricDisplayName(metric);
  }

  // Metric string for descriptions - always includes metric name, lowercase, no capitalization
  const metricDescStr = getMetricDisplayName(metric || 'total').toLowerCase();
  const metricArticleStr = metricDescStr.startsWith('a') ? 'an' : 'a';

  let streakStr = '';
  if (isStreak) {
    // For streaks, use "N-Day Streak", "N-Week Streak", etc.
    streakStr = 'Streak';
  } else if (isMultiPeriod) {
    // For non-consecutive multi-period goals, use "N Days", "N Weeks", etc.
    streakStr = `${capitalize(timePeriod)}s`;
  } else if(type === 'goal' && timePeriod !== 'anytime') {
    // For single-period goals, use "{goal} Day", "{goal} Week", etc.
    streakStr = capitalize(timePeriod);
  }

  let goalStr = '';
  if (type === 'milestone') goalStr = 'Milestone';
  else if (type === 'target') goalStr = 'Target';

  const titleParts = [intervalStr, valueStr, metricStr, streakStr, goalStr].filter(Boolean);
  const title = titleParts.join(' ').trim() || 'Achievement';
  

  // Description
  // Target [timeframe,count=1]: "Hit 5,000 in a week", "Hit 10% increase in a month", "Hit +100 increase in a day"
  // Milestone [anytime,count=1]: "Reach 100,000 total"
  // Streak [count>1,consecutive]: "Positive total for 7 days in a row", "Total of 1,000+ for 30 days in a row", "Average of 500+ for 4 weeks in a row"
  // Count [count>1,!consecutive]: "Log a positive total on 100 days", "Log a total of 1,000 on 4 weeks"
  let description = '';

  // Value description string: `{a positive total | a negative total | total of 1,000 | average of 500 | delta between +100 and +200}`
  const valueDescStr = value === 0 && condition === 'above'
    ? `a positive ${metricDescStr}`
    : value === 0 && condition === 'below'
    ? `a negative ${metricDescStr}`
    : isRange
    ? `${metricDescStr} ${condition === 'inside' ? 'between' : 'outside'} ${formatValue(range![0]) || 'X'} and ${formatValue(range![1], { delta, percent }) || 'Y'}`
    : `${metricArticleStr} ${metricDescStr} of ${formatValue(value, { delta, percent }) || 'X'}`;
  
  if (suggestedType === 'target' && count === 1) {
    // Target [timeframe,count=1]: "Hit 5,000 in a week", "Hit 10% increase in a month", "Hit +100 increase in a day"
    const timeframeStr = 'in a ' + (timePeriod === 'day' ? 'day' : timePeriod === 'week' ? 'week' : timePeriod === 'month' ? 'month' : 'year');
    description = `Hit ${valueDescStr} ${timeframeStr}`;
  } else if (suggestedType === 'milestone' && timePeriod === 'anytime') {
    // Milestone [anytime,count=1]: "Reach a total of 100,000"
    description = `Reach ${valueDescStr}`;
  } else if (isStreak) {
    // Streak [count>1,consecutive]: "Log a positive total for 7 days in a row", "Total of 1,000+ for 30 days in a row", "Average of 500+ for 4 weeks in a row"
    const periodName = `${timePeriod}s`;
    description = `Log ${valueDescStr} for ${count} ${periodName} in a row`;
  } else if (isMultiPeriod && !consecutive) {
    // Count [count>1,!consecutive]: "Log a positive total on 100 days", "Log a total of 1,000 on 4 weeks"
    const periodName = `${timePeriod}s`;
    description = `Log ${valueDescStr} on ${count} ${periodName}`;
  }

  // Badge label
  let label = '';
  if (count && count > 1) label = formatValue(count, { short: true });
  else if (!isRange) label = formatValue(value, { short: true, delta, percent });
  else if (range) label = `${formatValue(range[0], { short: true })}-${formatValue(range[1], { short: true, delta, percent })}`;
  // else label = title.slice(0, 4);

  // For now, icon is undefined
  const icon = undefined;

  return {
    title,
    description,
    icon,
    label,
    type,
  };
}

export function isRangeGoal(goal: GoalTarget): boolean {
  return isRangeCondition(goal.condition);
}

export function isRangeCondition(condition: GoalTarget['condition'] | undefined): condition is 'inside' | 'outside' {
  return !!condition && (condition === 'inside' || condition === 'outside');
}