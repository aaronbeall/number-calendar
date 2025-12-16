import { type Achievement, type DateKey, type DayKey, type Goal, type MetricGoal, type TimePeriod } from '@/features/db/localdb';
import { convertDateKey, isDayKey, type DateKeyType } from './friendly-date';
import { computeNumberStats, type NumberStats } from './stats';
import { keysOf } from './utils';

// Helper: evaluate a metric condition (inclusive for non-zero, exclusive for zero)
function evalCondition(cond: MetricGoal, value: number): boolean {
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
  let anytimeStats: NumberStats | null | undefined = undefined;

  function getPeriods(timePeriod: DateKeyType): DateKey[] {
    if (periodsCache[timePeriod]) return periodsCache[timePeriod]!;
    let periods: DateKey[] = [];
    if (timePeriod === 'day') periods = keysOf(data).filter(isDayKey);
    else if (timePeriod === 'week' || timePeriod === 'month' || timePeriod === 'year') {
      periods = Array.from(new Set(keysOf(data).filter(isDayKey).map(d => convertDateKey(d, timePeriod))));
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

  function getAnytimeStats(): NumberStats | null {
    if (anytimeStats !== undefined) return anytimeStats;
    anytimeStats = computeNumberStats(Object.values(data).flat());
    return anytimeStats;
  }

  return { getPeriods, getPeriodData, getPeriodStats, getAnytimeStats };
}

// Main function: update achievements progress
export function updateAchievements({
  goals,
  achievements,
  data,
  datasetId,
}: {
  goals: Goal[];
  achievements: Achievement[];
  data: Record<DayKey, number[]>;
  datasetId: string;
}): Array<{
  goal: Goal;
  achievements: Achievement[];
  completedCount: number;
  currentProgress: number;
  lastCompletedAt?: DateKey;
  firstCompletedAt?: DateKey;
}> {
  const { getPeriods, getPeriodData, getPeriodStats, getAnytimeStats } = createPeriodCache(data);
  const achievementsByGoalId: Record<string, Achievement[]> = goals.reduce((acc, goal) => {
    acc[goal.id] = achievements.filter(a => a.goalId === goal.id && a.datasetId === datasetId);
    return acc;
  }, {} as Record<string, Achievement[]>);
  const result: ReturnType<typeof updateAchievements> = [];
  for (const goal of goals) {
    const goalAchievements = achievementsByGoalId[goal.id] || [];
    let completedCount = 0;
    let currentProgress = 0;
    let lastCompletedAt: DateKey | undefined = undefined;
    let firstCompletedAt: DateKey | undefined = undefined;
    let newAchievements: Achievement[] = [];

    // ANYTIME: Only one achievement, only update if not already completed
    if (goal.timePeriod === 'anytime') {
      let ach = goalAchievements[0] || { goalId: goal.id, datasetId, progress: 0 };
      if (ach.completedAt) {
        // Already completed, nothing to do
        newAchievements.push(ach);
        completedCount = 1;
        lastCompletedAt = ach.completedAt;
        currentProgress = 1;
      } else {
        const stat = getAnytimeStats();
        const met = stat && evalCondition(goal.goal, stat[goal.goal.metric]);
        if (met) {
          ach.progress = 1;
          ach.completedAt = ach.completedAt || (keysOf(data).length ? keysOf(data).sort().slice(-1)[0] : undefined);
          completedCount = 1;
          lastCompletedAt = ach.completedAt;
        } else {
          ach.progress = 0;
        }
        newAchievements.push(ach);
        currentProgress = ach.progress;
      }
    } else {
      // PERIODIC: day/week/month/year
      const periods = getPeriods(goal.timePeriod);
      const periodStats = getPeriodStats(goal.timePeriod);
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
          const met = stat && evalCondition(goal.goal, stat[goal.goal.metric]);
          if (met) {
            if (!ach) {
              ach = { goalId: goal.id, datasetId, progress: 1, startedAt: period, completedAt: period };
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
        // count > 1: streaks or multi-period
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
          const met = stat && evalCondition(goal.goal, stat[goal.goal.metric]);
          if (met) {
            if (streak.length === 0) streakStart = period;
            streak.push(period);
            streakEnd = period;
            if (streak.length === goal.count) {
              // Completed a new achievement
              const ach: Achievement = { goalId: goal.id, datasetId, progress: goal.count, startedAt: streakStart, completedAt: streakEnd };
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
          } else {
            // Not met, break streak
            streak = [];
            streakStart = undefined;
            streakEnd = undefined;
          }
        }
        // If streak is not empty and not completed, add as in-progress
        if (streak.length > 0 && streak.length < goal.count) {
          const ach: Achievement = { goalId: goal.id, datasetId, progress: streak.length, startedAt: streakStart };
          newAchievements.push(ach);
          currentProgress = streak.length;
        }
      }
    }
    // After all logic for this goal:
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