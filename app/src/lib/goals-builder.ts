import { nanoid } from 'nanoid';
import type { Goal, GoalTarget, Tracking, Valence } from '@/features/db/localdb';
import type { NumberMetric } from './stats';
import { getMetricDisplayName } from './stats';
import type { AchievementBadgeColor, AchievementBadgeIcon, AchievementBadgeStyle } from './achievements';
import { adjectivize, capitalize } from './utils';
import { formatValue } from './goals';
import { getValueForValence } from './valence';

// User input for the goal builder
export interface GoalBuilderInput {
  datasetId: string;
  tracking: Tracking;
  valence: Valence;
  period: 'day' | 'week' | 'month';
  value: number;
  valueType: 'period-total' | 'alltime-total' | 'period-change' | 'alltime-target';
  activePeriods: number; // How many periods active (e.g., days per week, weeks per month)
  startingValue: number; // Starting value for all-time goals (optional)
  targetDays?: number; // Time period in days to reach the goal (for all-time goals)
}

// Generated goal suggestions
export interface GeneratedGoals {
  milestones: Goal[];
  targets: Goal[];
  achievements: Goal[];
}

// Helper to create a clean rounded number
function roundToClean(num: number, significantLeadingDigits: number = 2): number {
  if (num === 0) return 0;
  const sign = num < 0 ? -1 : 1;
  const abs = Math.abs(num);
  
  // For numbers less than 1, round to 1 decimal place
  if (abs < 1) return sign * (Math.round(abs * 10) / 10);
  
  // Find the magnitude (power of 10) of the number
  const magnitude = Math.pow(10, Math.floor(Math.log10(abs)));
  
  // Calculate divisor based on magnitude and significant leading digits
  // If we want N leading digits, we divide by magnitude / 10^(N-1)
  const divisor = magnitude / Math.pow(10, significantLeadingDigits - 1);
  
  return sign * (Math.round(abs / divisor) * divisor);
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
  valueType: 'period-total' | 'alltime-total' | 'period-change' | 'alltime-target',
  goalType: 'milestone' | 'target'
): { metric: NumberMetric; source: 'stats' | 'deltas' } {
  const isTrend = valueType === 'period-change' || valueType === 'alltime-target';
  
  if (isTrend) {
    // For Trend tracking, use 'last' metric
    // Milestones use 'stats' source, targets use 'deltas' source
    return {
      metric: 'last',
      source: goalType === 'milestone' ? 'stats' : 'deltas',
    };
  }
  
  // For Series tracking (period-total and alltime-total), use total
  return {
    metric: 'total',
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

// Phase 1: Calculate baseline values for milestones and targets
interface BaselineValues {
  baselineMilestone: number; // The core milestone value
  dayTarget: number;
  weekTarget: number;
  monthTarget: number;
}

function calculateBaselines(input: GoalBuilderInput): BaselineValues {
  const { period, value: goodValue, valueType, activePeriods, startingValue, targetDays } = input;
  const isAllTime = valueType === 'alltime-total' || valueType === 'alltime-target';
  
  const WEEKS_PER_MONTH = 4.3;
  
  if (isAllTime) {
    // For all-time goals
    const baselineMilestone = goodValue;
    const start = startingValue ?? 0;
    const range = goodValue - start;
    
    if (!targetDays || targetDays <= 0) {
      throw new Error('targetDays must be provided and greater than 0 for all-time goals');
    }

    const dailyRate = range / targetDays;
    
    return {
      baselineMilestone,
      dayTarget: roundToClean(dailyRate),
      weekTarget: roundToClean(dailyRate * 7),
      monthTarget: roundToClean(dailyRate * 30),
    };
  } else {
    // For period-based goals
    // activePeriods represents how many of the selected period occur in the parent period
    // e.g., if period='day' and activePeriods=3, user is active 3 days per week
    
    let dayTarget: number;
    let weekTarget: number;
    let monthTarget: number;
    
    if (period === 'day') {
      // activePeriods = days per week
      dayTarget = roundToClean(goodValue);
      weekTarget = roundToClean(goodValue * activePeriods);
      monthTarget = roundToClean(weekTarget * WEEKS_PER_MONTH);
    } else if (period === 'week') {
      // activePeriods = weeks per month
      dayTarget = roundToClean(goodValue / 7);
      weekTarget = roundToClean(goodValue);
      monthTarget = roundToClean(goodValue * activePeriods);
    } else {
      // period === 'month', activePeriods = months per year
      dayTarget = roundToClean(goodValue / 30);
      weekTarget = roundToClean(goodValue / WEEKS_PER_MONTH);
      monthTarget = roundToClean(goodValue);
    }

    // Calculate baseline milestone as 3 months of monthTarget
    const baselineMilestone = startingValue + roundToClean(monthTarget * 3);
    
    return {
      baselineMilestone,
      dayTarget,
      weekTarget,
      monthTarget,
    };
  }
}

// Generate milestone goals
function generateMilestones(input: GoalBuilderInput, baselines: BaselineValues): Goal[] {
  const { datasetId, valueType, valence, tracking, startingValue } = input;
  const { metric, source } = getMetricAndSource(valueType, 'milestone');
  const condition = getCondition(valence);

  const milestones: Goal[] = [];
  const metricName = tracking == 'trend' ? '' : ` ${getMetricDisplayName(metric).toLowerCase()}`;
  
  const baseValue = baselines.baselineMilestone;
  const startValue = startingValue ?? 0;
  const delta = baseValue - startValue;

  // Create milestone series using interpolation from start to baseline,
  // then extend past baseline using the same direction.
  const preBaselineFractions = [0.25, 0.5, 0.75];
  const extendedMultipliers = [2, 4, 10, 20, 50, 100];
  const funNames = [
    // Start milestones
    'First Steps',
    'Good Start',
    // Pre-baseline
    'Blast Off',
    'Locked In',
    'Firestarter',
    // Baseline
    'Bullseye',
    // Extended
    'Trailblazer',
    'Rocket',
    'Meteor',
    'Comet',
    'Galactic',
    'Supernova',
  ];
  const colors: AchievementBadgeColor[] = [
    'bronze',
    'bronze',
    'bronze',
    'silver',
    'gold',
    'purple',
    'purple',
    'magic',
    'magic',
    'magic',
    'magic',
    'magic',
  ];

  const milestonesConfig = [
    {
      multiplier: 0,
      value: roundToClean(startValue + baselines.dayTarget, 2),
    },
    {
      multiplier: 0,
      value: roundToClean(startValue + baselines.weekTarget, 2),
    },
    ...preBaselineFractions.map((fraction) => ({
      multiplier: fraction,
      value: roundToClean(startValue + delta * fraction, 2),
    })),
    {
      multiplier: 1,
      value: baseValue,
    },
    ...extendedMultipliers.map((multiplier) => ({
      multiplier,
      value: roundToClean(startValue + delta * multiplier, 1),
    })),
  ];

  milestonesConfig.forEach(({ multiplier, value }, idx) => {
    const name = funNames[idx] ?? `Milestone ${multiplier}x`;
    const color = colors[idx] ?? 'magic';

    milestones.push({
      id: nanoid(),
      datasetId,
      createdAt: Date.now(),
      type: 'milestone',
      title: name,
      description: `Reach ${formatValue(value, { delta: source === 'deltas' })}${metricName}`,
      badge: createBadge('laurel_trophy', color, 'flag'),
      target: createTarget(metric, source, condition, value),
      timePeriod: 'anytime',
      count: 1,
    });
  });
  
  // Filter out any duplicate milestone targets
  const uniqueMilestones = Array.from(new Set(milestones.map(m => m.target.value))).map(value => {
      return milestones.find(m => m.target.value === value);
  }).filter(Boolean) as Goal[];

  // Special case: if trending towards zero, add a "Zero" milestone and remove milestones past zero
  if (tracking === 'trend') {
    const approachingZeroDown = condition === 'below' && (startingValue ?? 0) > 0;
    const approachingZeroUp = condition === 'above' && (startingValue ?? 0) < 0;
    
    if (approachingZeroDown || approachingZeroUp) {
      uniqueMilestones.push({
        id: nanoid(),
        datasetId,
        createdAt: Date.now(),
        type: 'milestone',
        title: 'Zero Point',
        description: `Reach zero${metricName}`,
        badge: createBadge('laurel_trophy', 'gold', 'flag'),
        target: createTarget(metric, source, condition, 0),
        timePeriod: 'anytime',
        count: 1,
      });
    }

    return uniqueMilestones.filter(m => approachingZeroDown ? m.target.value! >= 0 : m.target.value! <= 0);
  }

  return uniqueMilestones;
}

// Generate target goals
function generateTargets(input: GoalBuilderInput, baselines: BaselineValues): Goal[] {
  const { datasetId, valueType, valence } = input;
  const { metric, source } = getMetricAndSource(valueType, 'target');
  const condition = getCondition(valence);
  
  const targets: Goal[] = [];
  const periods: Array<{ period: 'day' | 'week' | 'month'; value: number; color: AchievementBadgeColor }> = [
    { period: 'day', value: baselines.dayTarget, color: 'green' },
    { period: 'week', value: baselines.weekTarget, color: 'blue' },
    { period: 'month', value: baselines.monthTarget, color: 'purple' },
  ];

  periods.forEach(({ period, value, color }) => {
    const adjectiveName = capitalize(adjectivize(period));
    
    targets.push({
      id: nanoid(),
      datasetId,
      createdAt: Date.now(),
      type: 'target',
      title: `${adjectiveName} Target`,
      description: `Reach ${formatValue(value, { delta: source === 'deltas' })} in a ${period}`,
      badge: createBadge('bolt_shield', color, 'target'),
      target: createTarget(metric, source, condition, value),
      timePeriod: period,
      count: 1,
    });
  });

  return targets;
}

// Generate achievement goals
function generateAchievements(input: GoalBuilderInput, baselines: BaselineValues): Goal[] {
  const { datasetId, period, valueType, valence, activePeriods: activityDays } = input;
  const { metric, source } = getMetricAndSource(valueType, 'target');
  const condition = getCondition(valence);

  const achievements: Goal[] = [];
  const valenceTerm = (valueType === 'period-change' || valueType === 'alltime-target')
    ? getValueForValence(1, valence, { good: 'Uptrend', bad: 'Downtrend', neutral: 'Steady' })
    : getValueForValence(1, valence, { good: 'Positive', bad: 'Negative', neutral: 'Consistent' });
  const periodName = capitalize(period);

  // Use baseline targets for achievement calculations
  const periodTargets = {
    day: baselines.dayTarget,
    week: baselines.weekTarget,
    month: baselines.monthTarget,
  };

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

  // First Win - use the user's selected period target
  achievements.push({
    id: nanoid(),
    datasetId,
    createdAt: Date.now(),
    type: 'goal',
    title: 'First Win',
    description: `Record your first ${valenceTerm.toLowerCase()} entry`,
    badge: createBadge('medal', 'silver', 'trophy'),
    target: createTarget(metric, source, condition, periodTargets[period]),
    timePeriod: 'anytime',
    count: 1,
  });

  // Good Days/Weeks/Months completed (non-consecutive) - use user's period
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
      target: createTarget(metric, source, condition, periodTargets[period]),
      timePeriod: period,
      count,
    });
  });

  // Targets Completed - for all periods using baseline targets
  const targetCounts = [5, 10, 20, 100];
  const targetColors: AchievementBadgeColor[] = ['green', 'blue', 'purple', 'magic'];
  (['day', 'week', 'month'] as const).forEach((targetPeriod) => {
    const targetValue = periodTargets[targetPeriod];

    targetCounts.forEach((count, idx) => {
      const adjectiveName = capitalize(adjectivize(targetPeriod));
      achievements.push({
        id: nanoid(),
        datasetId,
        createdAt: Date.now(),
        type: 'goal',
        title: `${count} ${adjectiveName} Targets`,
        description: `Complete ${count} ${adjectivize(targetPeriod)} targets`,
        badge: createBadge('bolt_shield', targetColors[idx], 'target'),
        target: createTarget(metric, source, condition, targetValue),
        timePeriod: targetPeriod,
        count,
      });
    });
  });

  // Multiple target achievements (Double, Triple, etc.) - for all periods
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
  (['day', 'week', 'month'] as const).forEach((targetPeriod) => {
    const targetPeriodName = capitalize(targetPeriod);
    const targetValue = periodTargets[targetPeriod];

    multiples.forEach((multiple, idx) => {
      const multipleValue = roundToClean(targetValue * multiple);
      const color: AchievementBadgeColor = multiple <= 3 ? 'gold' : multiple <= 6 ? 'purple' : 'magic';

      achievements.push({
        id: nanoid(),
        datasetId,
        createdAt: Date.now(),
        type: 'goal',
        title: `${multipleNames[idx]} ${targetPeriodName}`,
        description: `Reach ${formatValue(multipleValue, { delta: source === 'deltas' })} in a ${targetPeriod}`,
        badge: createBadge('star_formation', color, 'trophy'),
        target: createTarget(metric, source, condition, multipleValue),
        timePeriod: targetPeriod,
        count: 1,
      });
    });
  });

  // Good Year - using monthly target
  achievements.push({
    id: nanoid(),
    datasetId,
    createdAt: Date.now(),
    type: 'goal',
    title: `${valenceTerm} Year`,
    description: `Have a ${valenceTerm.toLowerCase()} year`,
    badge: createBadge('laurel_trophy', 'magic', 'trophy'),
    target: createTarget(metric, source, condition, roundToClean(periodTargets.month * 12)),
    timePeriod: 'year',
    count: 1,
  });

  // Day streaks - using day target
  const dayStreaks = [5, 10, 20];
  const dayStreakColors: AchievementBadgeColor[] = ['red', 'red', 'magic'];
  dayStreaks.forEach((days, idx) => {
    achievements.push({
      id: nanoid(),
      datasetId,
      createdAt: Date.now(),
      type: 'goal',
      title: `${days}-Day Streak`,
      description: `Maintain ${days} ${valenceTerm.toLowerCase()} days in a row`,
      badge: createBadge('fire', dayStreakColors[idx], 'flame'),
      target: createTarget(metric, source, condition, periodTargets.day),
      timePeriod: 'day',
      count: days,
      consecutive: true,
    });
  });

  // Week/Month streaks - using respective targets
  const periodStreaks = [2, 3, 4, 5, 6, 7, 8, 9, 10];
  (['week', 'month'] as const).forEach((streakPeriod) => {
    const streakPeriodName = capitalize(streakPeriod);
    const targetValue = periodTargets[streakPeriod];
    
    periodStreaks.forEach((count) => {
      const color: AchievementBadgeColor = count <= 3 ? 'red' : count <= 6 ? 'red' : 'magic';
      achievements.push({
        id: nanoid(),
        datasetId,
        createdAt: Date.now(),
        type: 'goal',
        title: `${count}-${streakPeriodName} Streak`,
        description: `Maintain ${count} ${valenceTerm.toLowerCase()} ${streakPeriod}s in a row`,
        badge: createBadge('fire', color, 'flame'),
        target: createTarget(metric, source, condition, targetValue),
        timePeriod: streakPeriod,
        count,
        consecutive: true,
      });
    });
  });

  // Legend - 100 good periods using user's period
  achievements.push({
    id: nanoid(),
    datasetId,
    createdAt: Date.now(),
    type: 'goal',
    title: 'Legend',
    description: `Complete 100 ${valenceTerm.toLowerCase()} ${period}s`,
    badge: createBadge('laurel_trophy', 'magic', 'crown'),
    target: createTarget(metric, source, condition, periodTargets[period]),
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
  // Phase 1: Calculate baseline values
  const baselines = calculateBaselines(input);
  
  // Phase 2: Generate goals using baselines
  return {
    milestones: generateMilestones(input, baselines),
    targets: generateTargets(input, baselines),
    achievements: generateAchievements(input, baselines),
  };
}
