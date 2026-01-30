import { nanoid } from 'nanoid';
import type { Goal, GoalTarget, TimePeriod, Tracking, Valence } from '@/features/db/localdb';
import type { NumberMetric } from './stats';
import type { AchievementBadgeColor, AchievementBadgeIcon, AchievementBadgeStyle } from './achievements';

// User input for the goal builder
export interface GoalBuilderInput {
  datasetId: string;
  tracking: Tracking;
  valence: Valence;
  period: 'day' | 'week' | 'month';
  goodValue: number; // What user considers a "good" value for the period
  valueType: 'amount' | 'change'; // Whether goodValue is an amount or a change
  activityDays: number; // How many days per period the user expects to have entries
}

// Generated goal suggestions
export interface GeneratedGoals {
  milestones: Goal[];
  targets: Goal[];
  achievements: Goal[];
}

// Helper to create a clean rounded number
function roundToClean(num: number): number {
  if (num < 10) return Math.round(num);
  if (num < 100) return Math.round(num / 5) * 5;
  if (num < 1000) return Math.round(num / 10) * 10;
  if (num < 10000) return Math.round(num / 100) * 100;
  return Math.round(num / 1000) * 1000;
}

// Helper to create a goal target
function createTarget(
  metric: NumberMetric,
  source: 'stats' | 'deltas',
  condition: 'above' | 'below',
  value: number
): GoalTarget {
  return {
    metric,
    source,
    condition,
    value,
  };
}

// Helper to get appropriate metric and source based on value type
function getMetricAndSource(
  valueType: 'amount' | 'change',
  tracking: Tracking
): { metric: NumberMetric; source: 'stats' | 'deltas' } {
  if (valueType === 'change') {
    return { metric: 'total', source: 'deltas' };
  }
  // For amount with series tracking, use total; for trend use mean
  return {
    metric: tracking === 'series' ? 'total' : 'mean',
    source: 'stats',
  };
}

// Helper to get condition based on valence
function getCondition(valence: Valence): 'above' | 'below' {
  return valence === 'negative' ? 'below' : 'above';
}

// Helper to create badge
function createBadge(
  style: AchievementBadgeStyle,
  color: AchievementBadgeColor,
  icon?: AchievementBadgeIcon,
  label?: string
) {
  return { style, color, icon, label };
}

// Generate milestone goals
function generateMilestones(input: GoalBuilderInput): Goal[] {
  const { datasetId, period, goodValue, valueType, tracking, valence } = input;
  const { metric, source } = getMetricAndSource(valueType, tracking);
  const condition = getCondition(valence);

  const milestones: Goal[] = [];
  const multipliers = [1, 2, 5, 10, 100];
  const milestoneNames = ['First', 'Double', 'Pentuple', 'Decuple', 'Centuple'];
  const colors: AchievementBadgeColor[] = ['bronze', 'silver', 'gold', 'purple', 'magic'];

  multipliers.forEach((multiplier, idx) => {
    const value = roundToClean(goodValue * multiplier);
    const periodName = period.charAt(0).toUpperCase() + period.slice(1);

    milestones.push({
      id: nanoid(),
      datasetId,
      createdAt: Date.now(),
      type: 'milestone',
      title: `${milestoneNames[idx]} ${periodName}`,
      description: `Reach ${value} in a ${period}`,
      badge: createBadge('laurel_trophy', colors[idx], 'flag'),
      target: createTarget(metric, source, condition, value),
      timePeriod: period,
      count: 1,
    });
  });

  return milestones;
}

// Generate target goals
function generateTargets(input: GoalBuilderInput): Goal[] {
  const { datasetId, period, goodValue, valueType, tracking, valence, activityDays } = input;
  const { metric, source } = getMetricAndSource(valueType, tracking);
  const condition = getCondition(valence);

  const targets: Goal[] = [];
  const periods: Array<'day' | 'week' | 'month'> = ['day', 'week', 'month'];

  periods.forEach((targetPeriod) => {
    // Extrapolate the value for this period
    let targetValue: number;
    const daysInPeriod = targetPeriod === 'day' ? 1 : targetPeriod === 'week' ? 7 : 30;
    const daysInUserPeriod = period === 'day' ? 1 : period === 'week' ? 7 : 30;

    // Calculate expected active days in target period
    const expectedActiveDaysInTarget = (activityDays / daysInUserPeriod) * daysInPeriod;

    if (valueType === 'change') {
      // For change, multiply by expected active days
      targetValue = goodValue * expectedActiveDaysInTarget;
    } else {
      // For amount, the value stays the same (it's already a target for the period)
      targetValue = goodValue * (daysInPeriod / daysInUserPeriod);
    }

    targetValue = roundToClean(targetValue);

    const periodName = targetPeriod.charAt(0).toUpperCase() + targetPeriod.slice(1);
    const color: AchievementBadgeColor =
      targetPeriod === 'day' ? 'green' : targetPeriod === 'week' ? 'blue' : 'purple';

    targets.push({
      id: nanoid(),
      datasetId,
      createdAt: Date.now(),
      type: 'target',
      title: `${periodName}ly Target`,
      description: `Reach ${targetValue} each ${targetPeriod}`,
      badge: createBadge('bolt_shield', color, 'target'),
      target: createTarget(metric, source, condition, targetValue),
      timePeriod: targetPeriod,
      count: 1,
    });
  });

  return targets;
}

// Generate achievement goals
function generateAchievements(input: GoalBuilderInput): Goal[] {
  const { datasetId, period, goodValue, valueType, tracking, valence, activityDays } = input;
  const { metric, source } = getMetricAndSource(valueType, tracking);
  const condition = getCondition(valence);

  const achievements: Goal[] = [];
  const valenceTerm = valence === 'positive' ? 'Good' : valence === 'negative' ? 'Low' : 'Consistent';
  const periodName = period.charAt(0).toUpperCase() + period.slice(1);

  // First Entry
  achievements.push({
    id: nanoid(),
    datasetId,
    createdAt: Date.now(),
    type: 'goal',
    title: 'First Entry',
    description: 'Record your first data point',
    badge: createBadge('medal', 'bronze', 'trophy'),
    target: createTarget('count', 'stats', 'above', 0),
    timePeriod: 'anytime',
    count: 1,
  });

  // Good Days/Weeks/Months completed (non-consecutive)
  const goodPeriodCounts = [5, 10, 20, 100];
  const goodPeriodColors: AchievementBadgeColor[] = ['bronze', 'silver', 'gold', 'magic'];
  goodPeriodCounts.forEach((count, idx) => {
    achievements.push({
      id: nanoid(),
      datasetId,
      createdAt: Date.now(),
      type: 'goal',
      title: `${count} ${valenceTerm} ${periodName}s`,
      description: `Complete ${count} ${valenceTerm.toLowerCase()} ${period}s`,
      badge: createBadge('medal', goodPeriodColors[idx], 'trophy'),
      target: createTarget(metric, source, condition, goodValue),
      timePeriod: period,
      count,
    });
  });

  // Targets Completed
  const targetCounts = [5, 10, 20, 100];
  const targetColors: AchievementBadgeColor[] = ['green', 'blue', 'purple', 'magic'];
  ['day', 'week', 'month'].forEach((targetPeriod) => {
    const targetPeriodName = targetPeriod.charAt(0).toUpperCase() + targetPeriod.slice(1);
    const daysInPeriod = targetPeriod === 'day' ? 1 : targetPeriod === 'week' ? 7 : 30;
    const daysInUserPeriod = period === 'day' ? 1 : period === 'week' ? 7 : 30;
    const expectedActiveDaysInTarget = (activityDays / daysInUserPeriod) * daysInPeriod;
    let targetValue = valueType === 'change'
      ? goodValue * expectedActiveDaysInTarget
      : goodValue * (daysInPeriod / daysInUserPeriod);
    targetValue = roundToClean(targetValue);

    targetCounts.forEach((count, idx) => {
      achievements.push({
        id: nanoid(),
        datasetId,
        createdAt: Date.now(),
        type: 'goal',
        title: `${count} ${targetPeriodName}ly Targets`,
        description: `Complete ${count} ${targetPeriod}ly targets`,
        badge: createBadge('bolt_shield', targetColors[idx], 'target'),
        target: createTarget(metric, source, condition, targetValue),
        timePeriod: targetPeriod as TimePeriod,
        count,
      });
    });
  });

  // Multiple target achievements (Double, Triple, etc.)
  const multiples = [2, 3, 4, 5, 6, 7, 8, 9, 10, 100];
  const multipleNames = [
    'Double',
    'Triple',
    'Quadruple',
    'Quintuple',
    'Sextuple',
    'Septuple',
    'Octuple',
    'Nonuple',
    'Decuple',
    'Centuple',
  ];
  ['day', 'week', 'month'].forEach((targetPeriod) => {
    const targetPeriodName = targetPeriod.charAt(0).toUpperCase() + targetPeriod.slice(1);
    const daysInPeriod = targetPeriod === 'day' ? 1 : targetPeriod === 'week' ? 7 : 30;
    const daysInUserPeriod = period === 'day' ? 1 : period === 'week' ? 7 : 30;
    const expectedActiveDaysInTarget = (activityDays / daysInUserPeriod) * daysInPeriod;
    let targetValue = valueType === 'change'
      ? goodValue * expectedActiveDaysInTarget
      : goodValue * (daysInPeriod / daysInUserPeriod);
    targetValue = roundToClean(targetValue);

    multiples.forEach((multiple, idx) => {
      const multipleValue = roundToClean(targetValue * multiple);
      const color: AchievementBadgeColor = multiple <= 3 ? 'gold' : multiple <= 6 ? 'purple' : 'magic';

      achievements.push({
        id: nanoid(),
        datasetId,
        createdAt: Date.now(),
        type: 'goal',
        title: `${multipleNames[idx]} ${targetPeriodName}`,
        description: `Reach ${multipleValue} in a ${targetPeriod}`,
        badge: createBadge('star_formation', color, 'trophy'),
        target: createTarget(metric, source, condition, multipleValue),
        timePeriod: targetPeriod as TimePeriod,
        count: 1,
      });
    });
  });

  // Good Year
  achievements.push({
    id: nanoid(),
    datasetId,
    createdAt: Date.now(),
    type: 'goal',
    title: `${valenceTerm} Year`,
    description: `Have a ${valenceTerm.toLowerCase()} year`,
    badge: createBadge('laurel_trophy', 'magic', 'trophy'),
    target: createTarget(metric, source, condition, roundToClean(goodValue * 12)),
    timePeriod: 'year',
    count: 1,
  });

  // Day streaks
  const dayStreaks = [5, 10, 20];
  const dayStreakColors: AchievementBadgeColor[] = ['red', 'red', 'magic'];
  dayStreaks.forEach((days, idx) => {
    achievements.push({
      id: nanoid(),
      datasetId,
      createdAt: Date.now(),
      type: 'goal',
      title: `${days}-Day ${valenceTerm} Streak`,
      description: `Maintain a ${days}-day ${valenceTerm.toLowerCase()} streak`,
      badge: createBadge('fire', dayStreakColors[idx], 'flame'),
      target: createTarget(metric, source, condition, goodValue),
      timePeriod: 'day',
      count: days,
      consecutive: true,
    });
  });

  // Week/Month streaks
  const periodStreaks = [2, 3, 4, 5, 6, 7, 8, 9, 10];
  ['week', 'month'].forEach((streakPeriod) => {
    const streakPeriodName = streakPeriod.charAt(0).toUpperCase() + streakPeriod.slice(1);
    periodStreaks.forEach((count) => {
      const color: AchievementBadgeColor = count <= 3 ? 'red' : count <= 6 ? 'red' : 'magic';
      achievements.push({
        id: nanoid(),
        datasetId,
        createdAt: Date.now(),
        type: 'goal',
        title: `${count}-${streakPeriodName} ${valenceTerm} Streak`,
        description: `Maintain a ${count}-${streakPeriod} ${valenceTerm.toLowerCase()} streak`,
        badge: createBadge('fire', color, 'flame'),
        target: createTarget(metric, source, condition, goodValue),
        timePeriod: streakPeriod as TimePeriod,
        count,
        consecutive: true,
      });
    });
  });

  // Legend - 100 good periods
  achievements.push({
    id: nanoid(),
    datasetId,
    createdAt: Date.now(),
    type: 'goal',
    title: 'Legend',
    description: `Complete 100 ${valenceTerm.toLowerCase()} ${period}s`,
    badge: createBadge('laurel_trophy', 'magic', 'crown'),
    target: createTarget(metric, source, condition, goodValue),
    timePeriod: period,
    count: 100,
  });

  // Active Month
  achievements.push({
    id: nanoid(),
    datasetId,
    createdAt: Date.now(),
    type: 'goal',
    title: 'Active Month',
    description: `Record ${activityDays} entries in a month`,
    badge: createBadge('star_formation', 'blue', 'calendar'),
    target: createTarget('count', 'stats', 'above', activityDays),
    timePeriod: 'month',
    count: 1,
  });

  return achievements;
}

// Main function to generate all goals
export function generateGoals(input: GoalBuilderInput): GeneratedGoals {
  return {
    milestones: generateMilestones(input),
    targets: generateTargets(input),
    achievements: generateAchievements(input),
  };
}
