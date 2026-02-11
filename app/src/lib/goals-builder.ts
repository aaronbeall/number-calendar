import type { Goal, GoalCondition, GoalTarget, Tracking, Valence } from '@/features/db/localdb';
import { nanoid } from 'nanoid';
import type { AchievementBadgeColor, AchievementBadgeIcon, AchievementBadgeStyle } from './achievements';
import { countSignificantDigits, roundToClean } from './friendly-numbers';
import { formatValue } from './friendly-numbers';
import type { NumberMetric } from './stats';
import { getMetricDisplayName } from './stats';
import { formatGoalConditionLabel } from './goals';
import { adjectivize, capitalize, pluralize, randomValueOf, sequenceFromNow } from './utils';
import { getValueForGood } from './valence';

// User input for the goal builder
export interface GoalBuilderInput {
  datasetId: string;
  tracking: Tracking;
  valence: Valence;
  period: 'day' | 'week' | 'month';
  value: number;
  targetType: 'period-total' | 'alltime-total' | 'period-change' | 'alltime-target' | 'period-range';
  valueRange?: {
    min?: number;
    max?: number;
  };
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

function createTargetFromCondition(
  metric: NumberMetric,
  source: 'stats' | 'deltas',
  condition: GoalCondition
): GoalTarget {
  return {
    metric,
    source,
    ...condition,
  };
}

// Helper to get appropriate metric and source based on value type
function getMetricAndSource(
  targetType: 'period-total' | 'alltime-total' | 'period-change' | 'alltime-target' | 'period-range',
  goalType: 'milestone' | 'target',
  tracking: Tracking
): { metric: NumberMetric; source: 'stats' | 'deltas' } {
  if (targetType === 'period-range') {
    return {
      metric: tracking === 'trend' ? 'last' : 'total',
      source: 'stats',
    };
  }
  const isTrend = targetType === 'period-change' || targetType === 'alltime-target';
  
  return isTrend
    ? {
        // For Trend tracking, use 'last' metric
        // Milestones use 'stats' source, targets use 'deltas' source
        metric: 'last',
        source: goalType === 'milestone' ? 'stats' : 'deltas',
      }
    : {
        // For Series tracking (period-total and alltime-total), use total
        metric: 'total',
        source: 'stats',
      };
}

// Helper to get condition based on valence
function getCondition(valence: Valence, target: number): 'above' | 'below' {
  if (valence === 'neutral') {
    return target >= 0 ? 'above' : 'below';
  }
  return valence === 'negative' ? 'below' : 'above';
}

// Helper to get the term for valence
function getValenceTerm(targetType: 'period-total' | 'alltime-total' | 'period-change' | 'alltime-target' | 'period-range', valence: Valence): string {
  if (targetType === 'period-range') return 'In Range';
  return (targetType === 'period-change' || targetType === 'alltime-target')
    ? getValueForGood(valence, { positive: 'Uptrend', negative: 'Downtrend', neutral: 'Target' })
    : getValueForGood(valence, { positive: 'Positive', negative: 'Negative', neutral: 'Target' });
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

// Calculate baseline values based on user input
export function calculateBaselines(input: GoalBuilderInput): BaselineValues {
  const { period, value: goodValue, targetType, activePeriods, startingValue, targetDays } = input;
  if (targetType === 'period-range') {
    throw new Error('calculateBaselines does not support period-range goals');
  }
  const isAllTime = targetType === 'alltime-total' || targetType === 'alltime-target';
  
  // Determine base significant digits from user input
  const baseSigDigits = countSignificantDigits(goodValue);
  
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
      dayTarget: roundToClean(dailyRate, baseSigDigits + 1),
      weekTarget: roundToClean(dailyRate * 7, baseSigDigits + 1),
      monthTarget: roundToClean(dailyRate * 30, baseSigDigits + 1),
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
      dayTarget = roundToClean(goodValue, baseSigDigits);
      weekTarget = roundToClean(goodValue * activePeriods, baseSigDigits + 1);
      monthTarget = roundToClean(weekTarget * WEEKS_PER_MONTH, baseSigDigits + 1);
    } else if (period === 'week') {
      // activePeriods = weeks per month
      dayTarget = roundToClean(goodValue / 7, baseSigDigits + 1);
      weekTarget = roundToClean(goodValue, baseSigDigits);
      monthTarget = roundToClean(goodValue * activePeriods, baseSigDigits + 1);
    } else {
      // period === 'month', activePeriods = months per year
      dayTarget = roundToClean(goodValue / 30, baseSigDigits + 1);
      weekTarget = roundToClean(goodValue / WEEKS_PER_MONTH, baseSigDigits + 1);
      monthTarget = roundToClean(goodValue, baseSigDigits);
    }

    // Calculate baseline milestone as 3 months of monthTarget
    const baselineMilestone = roundToClean(startingValue + (monthTarget * 3), baseSigDigits + 1);
    
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
  const { datasetId, targetType, valence, tracking, startingValue } = input;
  const { metric, source } = getMetricAndSource(targetType, 'milestone', tracking);
  const condition = getCondition(valence, baselines.baselineMilestone - startingValue);
  const nextCreatedAt = sequenceFromNow();

  const milestones: Goal[] = [];
  const metricName = tracking == 'trend' ? '' : ` ${getMetricDisplayName(metric).toLowerCase()}`;
  
  const baseValue = baselines.baselineMilestone;
  const startValue = startingValue ?? 0;
  const delta = baseValue - startValue;

  // Create milestone series using interpolation from start to baseline,
  // then extend past baseline using the same direction.
  const preBaselineFractions = [0.25, 0.5, 0.75];
  let extendedMultipliers = [2, 4, 10, 20, 50, 100];

  const approachingZeroDown = tracking === 'trend' && condition === 'below' && (startingValue ?? 0) > 0;
  const approachingZeroUp = tracking === 'trend' && condition === 'above' && (startingValue ?? 0) < 0;

  // Special case: if trending towards zero, adjust extended multipliers to just overshoot the target a bit,
  // otherwise the default milestone multipliers will likely create too many milestones past zero. For example
  // on a weight loss trend going from 200 to 150, having milestones at -100, -400, etc. doesn't make sense.
  if (approachingZeroDown || approachingZeroUp) {
    extendedMultipliers = [1.25, 1.5, 1.75, 2, 2.5, 3];
  }

  // Generate full range of milestones: firsts, pre-baseline, baseline, extended
  const milestonesValues = [
    roundToClean(startValue + baselines.dayTarget, 2),
    roundToClean(startValue + baselines.weekTarget, 2),
    ...preBaselineFractions.map((fraction) => roundToClean(startValue + delta * fraction, 2)),
    baseValue,
    ...extendedMultipliers.map((multiplier) => roundToClean(startValue + delta * multiplier, 1)),
  ];

  // Fun names! 😎
  const spiritualNames = [
    // Start milestones
    'First Steps',
    'Baptism',
    // Pre-baseline
    'Awakening',
    'Redemption',
    'Transcendence',
    // Baseline
    'Enlightenment',
    // Extended
    'Ascension',
    'Eschaton',
    'Apotheosis',
    'Nirvana',
    'Eternity',
    'Divinity',
  ]
  const cosmicNames = [
    // Start milestones
    'First Steps',
    'Ignition',
    // Pre-baseline
    'Blast Off',
    'Locked In',
    'Diamond Hands',
    // Baseline
    'Bullseye',
    // Extended
    'Trailblazer',
    'Moonwalker',
    'Meteoric Rise',
    'Comet Chaser',
    'Galactic Legend',
    'Supernova',
  ];
  const tieredNames = [
    // Start milestones
    'Rookie',
    'Apprentice',
    // Pre-baseline
    'Adept',
    'Expert',
    'Master',
    // Baseline
    'Grandmaster',
    // Extended
    'Legendary',
    'Mythic',
    'Epic',
    'Heroic',
    'Ultimate',
    'Immortal',
  ];
  const rarityNames = [
    // Start milestones
    'First Steps',
    'Getting Started',
    // Pre-baseline
    'Excellent',
    'Epic',
    'Legendary',
    // Baseline
    'Mythic',
    // Extended
    'Exotic',
    'Exquisite',
    'Radiant',
    'Celestial',
    'Ethereal',
    'Divine',
  ];
  const destructiveNames = [
    // Start milestones
    'Initiate',
    'Catalyst',
    // Pre-baseline
    'Annihilator',
    'Obliterator',
    'Devastator',
    // Baseline
    'Apocalypse',
    // Extended
    'Worldbreaker',
    'Doombringer',
    'Cataclysm',
    'Armageddon',
    'Endbringer',
    'Singularity',
  ]
  const growthNames = [
    // Start milestones
    'Seedling',
    'Sprout',
    // Pre-baseline
    'Sapling',
    'Youngling',
    'Matured',
    // Baseline
    'Blooming',
    // Extended
    'Flourishing',
    'Thriving',
    'Prospering',
    'Abundant',
    'Evergreen',
    'Eternal',
  ]
  const climbingNames = [
    // Start milestones
    'Base Camp',
    'Trailhead',
    // Pre-baseline
    'Climber',
    'Mountaineer',
    'Alpinist',
    // Baseline
    'Summit',
    // Extended
    'Peak Performer',
    'Skyward',
    'Stratosphere',
    'Apex',
    'Zenith',
    'Pinnacle',
  ]
  const mindBendingNames = [
    // Start milestones
    'Novice',
    'Seeker',
    // Pre-baseline
    'Thinker',
    'Philosopher',
    'Sage',
    // Baseline
    'Enlightened',
    // Extended
    'Illuminated',
    'Transcendent',
    'Ascended',
    'Cosmic Mind',
    'Universal',
    'Omniscient',
  ];
  const atomicNames = [
    // Start milestones
    'Particle',
    'Atom',
    // Pre-baseline
    'Molecule',
    'Compound',
    'Element',
    // Baseline
    'Reaction',
    // Extended
    'Catalyst',
    'Fusion',
    'Quantum Leap',
    'Singularity',
    'Event Horizon',
    'Big Bang',
  ]
  const classicNames = [
    // Start milestones
    'Bronze',
    'Silver',
    // Pre-baseline
    'Gold',
    'Platinum',
    'Diamond',
    // Baseline
    'Emerald',
    // Extended
    'Sapphire',
    'Amethyst',
    'Ruby',
    'Exotic',
    'Mythic',
    'Legendary',
  ]
  const colors: AchievementBadgeColor[] = [
    // Starting milestones
    'bronze',
    'silver',
    // Pre-baseline
    'gold',
    'platinum',
    'diamond',
    // Baseline
    'emerald',
    // Extended
    'sapphire',
    'amethyst',
    'ruby',
    'magic',
    'mystic',
    'cosmic',
  ];
  const styles: AchievementBadgeStyle[] = [
    // Starting milestones
    'laurel',
    'laurel',
    // Pre-baseline
    'laurel_trophy',
    'laurel_trophy',
    'laurel_trophy',
    // Baseline
    'award_wings',
    // Extended
    'laurel_crown',
    'laurel_crown',
    'laurel_crown',
    'laurel_crown',
    'laurel_crown',
    'laurel_crown',
  ];
  const milestoneNames = randomValueOf({
    spiritualNames,
    cosmicNames,
    tieredNames,
    rarityNames,
    destructiveNames,
    growthNames,
    climbingNames,
    mindBendingNames,
    atomicNames,
    classicNames,
  });

  // Generate milestones
  milestonesValues.forEach((value, idx) => {
    const name = milestoneNames[idx];
    const color = colors[idx];
    const style = styles[idx];

    milestones.push({
      id: nanoid(),
      datasetId,
      createdAt: nextCreatedAt(),
      type: 'milestone',
      title: name,
      description: `Reach ${formatValue(value, { delta: source === 'deltas' })}${metricName}`,
      badge: createBadge(style, color, 'flag', formatValue(value, { short: true, delta: source === 'deltas' })),
      target: createTarget(metric, source, condition, value),
      timePeriod: 'anytime',
      count: 1,
    });
  });
  
  // Filter out any duplicate milestone targets
  const uniqueMilestones = Array.from(new Set(milestones.map(m => m.target.value))).map(value => {
      return milestones.find(m => m.target.value === value);
  }).filter(Boolean) as Goal[];

  // Special case: if trending towards zero remove milestones past zero
  if (approachingZeroDown || approachingZeroUp) {
    return uniqueMilestones.filter(m => approachingZeroDown ? m.target.value! >= 0 : m.target.value! <= 0);
  }

  return uniqueMilestones;
}

// Generate target goals
function generateTargets(input: GoalBuilderInput, baselines: BaselineValues): Goal[] {
  const { datasetId, targetType, valence, tracking } = input;
  const { metric, source } = getMetricAndSource(targetType, 'target', tracking);
  const condition = getCondition(valence, baselines.baselineMilestone - input.startingValue);
  const nextCreatedAt = sequenceFromNow();
  
  const targets: Goal[] = [];
  const periods: Array<{ period: 'day' | 'week' | 'month'; value: number; color: AchievementBadgeColor }> = [
    { period: 'day', value: baselines.dayTarget, color: 'emerald' },
    { period: 'week', value: baselines.weekTarget, color: 'sapphire' },
    { period: 'month', value: baselines.monthTarget, color: 'amethyst' },
  ];
  const completeTerm = source === 'deltas' ? 'Achieve' : 'Reach';

  periods.forEach(({ period, value, color }, idx) => {
    const adjectiveName = capitalize(adjectivize(period));
    const style = (['bolt_shield', 'vibrating_shield', 'wing_shield'] as const)[idx];
    
    targets.push({
      id: nanoid(),
      datasetId,
      createdAt: nextCreatedAt(),
      type: 'target',
      title: `${adjectiveName} Target`,
      description: `${completeTerm} ${formatValue(value, { delta: source === 'deltas' })} in a ${period}`,
      badge: createBadge(style, color, 'target', formatValue(value, { short: true, delta: source === 'deltas' })),
      target: createTarget(metric, source, condition, value),
      timePeriod: period,
      count: 1,
    });
  });

  return targets;
}

// Generate achievement goals
function generateAchievements(input: GoalBuilderInput, baselines: BaselineValues): Goal[] {
  const { datasetId, period, targetType, valence, tracking } = input;
  const { metric, source } = getMetricAndSource(targetType, 'target', tracking);
  const condition = getCondition(valence, baselines.baselineMilestone - input.startingValue);
  const nextCreatedAt = sequenceFromNow();

  const achievements: Goal[] = [];
  const valenceTerm = getValenceTerm(targetType, valence);

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
    createdAt: nextCreatedAt(),
    type: 'goal',
    title: 'First Entry',
    description: 'Record your first data point',
    badge: createBadge('ribbon_medal', 'jade', 'trophy', '1ˢᵗ'),
    target: createTarget('count', 'stats', 'above', 0),
    timePeriod: 'anytime',
    count: 1,
  });

  // First Win - use the user's selected period target
  achievements.push({
    id: nanoid(),
    datasetId,
    createdAt: nextCreatedAt(),
    type: 'goal',
    title: 'First Win',
    description: `Record your first ${valenceTerm.toLowerCase()} entry`,
    badge: createBadge('sports_medal', 'gold', 'trophy', '1ˢᵗ'),
    target: createTarget(metric, source, condition, periodTargets[period]),
    timePeriod: 'anytime',
    count: 1,
  });

  // Good Days/Weeks/Months completed (non-consecutive)
  const goodPeriodCounts = [1, 5, 10, 20, 50, 100];
  const goodPeriodColors: AchievementBadgeColor[] = ['copper', 'bronze', 'silver', 'gold', 'diamond', 'magic'];
  (['day', 'week', 'month'] as const).forEach((p, idx, periods) => {
    if (idx < periods.indexOf(period)) return; // Skip periods before user's selected period
    const periodName = capitalize(p);
    const style = (['medal', 'star_medal', 'wings'] as const)[idx];
    goodPeriodCounts.forEach((count, idx) => {
      achievements.push({
        id: nanoid(),
        datasetId,
        createdAt: nextCreatedAt(),
        type: 'goal',
        title: `${count > 1 ? `${count} ` : ''} ${valenceTerm} ${pluralize(periodName, count)}`,
        description: `Complete ${count == 1 ? 'a' : count} ${valenceTerm.toLowerCase()} ${pluralize(p, count)}`,
        badge: createBadge(style, goodPeriodColors[idx], 'crown', count > 1 ? `${formatValue(count, { short: true })}` : undefined),
        target: createTarget(metric, source, condition, 0),
        timePeriod: p,
        count,
      });
    });
  });

  // Good Year
  achievements.push({
    id: nanoid(),
    datasetId,
    createdAt: nextCreatedAt(),
    type: 'goal',
    title: `${valenceTerm} Year`,
    description: `Complete a ${valenceTerm.toLowerCase()} year`,
    badge: createBadge('angel', 'gold', 'crown'),
    target: createTarget(metric, source, condition, 0),
    timePeriod: 'year',
    count: 1,
  });

  // Targets Completed
  const targetCounts = [5, 10, 20, 50, 100];
  const targetColors: AchievementBadgeColor[] = ['emerald', 'sapphire', 'amethyst', 'celestial', 'aether'];
  (['day', 'week', 'month'] as const).forEach((targetPeriod, idx, periods) => {
    if (idx < periods.indexOf(period)) return; // Skip periods before user's selected period

    const targetValue = periodTargets[targetPeriod];
    const style = (['bolt_shield', 'vibrating_shield', 'wing_shield'] as const)[idx];

    targetCounts.forEach((count, idx) => {
      const adjectiveName = capitalize(adjectivize(targetPeriod));
      achievements.push({
        id: nanoid(),
        datasetId,
        createdAt: nextCreatedAt(),
        type: 'goal',
        title: `${count} ${adjectiveName} Targets`,
        description: `Complete ${count} ${adjectivize(targetPeriod)} targets`,
        badge: createBadge(style, targetColors[idx], 'target', `${count}`),
        target: createTarget(metric, source, condition, targetValue),
        timePeriod: targetPeriod,
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
  const multipleColors: AchievementBadgeColor[] = [
    // 'copper_medallion',
    // 'bronze_medallion',
    // 'silver_medallion',
    'gold_medallion',
    'platinum_medallion',
    'diamond_medallion',
    'magic_medallion',
    'rose_quartz',
    'angelic',
    'iridescent',
    'obsidian',
    'mystic',
    'fanatic',
  ];
  const multipleStyles: AchievementBadgeStyle[] = [
    'star_formation',
    'star_stack',
    'staryu',
  ];
  const targetTerm = source === 'deltas' ? 'Achieve' : 'Reach';
  (['day', 'week', 'month'] as const).forEach((targetPeriod, idx, periods) => {
    if (idx < periods.indexOf(period)) return; // Skip periods before user's selected period
    const targetPeriodName = capitalize(targetPeriod);
    const targetValue = periodTargets[targetPeriod];
    const style = multipleStyles[idx];

    multiples.forEach((multiple, idx) => {
      const multipleValue = roundToClean(targetValue * multiple);
      const color = multipleColors[idx];

      achievements.push({
        id: nanoid(),
        datasetId,
        createdAt: nextCreatedAt(),
        type: 'goal',
        title: `${multipleNames[idx]} ${targetPeriodName}`,
        // description: `${targetTerm} ${formatValue(multipleValue, { delta: source === 'deltas' })} in a ${targetPeriod}`,
        description: `${targetTerm} ${formatValue(multiple)}× ${adjectivize(targetPeriod)} target`, // (${formatValue(multipleValue, { delta: source === 'deltas' })})
        badge: createBadge(style, color, 'trophy', `${multiple}×`),
        target: createTarget(metric, source, condition, multipleValue),
        timePeriod: targetPeriod,
        count: 1,
      });
    });
  });

  // Day/Week/Month streaks
  const streakColors: AchievementBadgeColor[] = ['hellfire', 'flame', 'intense_flame', 'raging_flame', 'infernal_flame', 'consuming_flame', 'legendary_flame'];
  const streakStyles: AchievementBadgeStyle[] = ['fire', 'flamed', 'heart_flame'];
  const streaks = {
    day: [2, 3, 4, 5, 10, 20, 50],
    week: [2, 3, 4, 5, 6, 9, 12],
    month: [2, 3, 4, 5, 6, 9, 12],
  };
  (['day', 'week', 'month'] as const).forEach((streakPeriod, idx, periods) => {
    if (idx < periods.indexOf(streakPeriod)) return; // Skip periods before user's selected period
    const streakPeriodName = capitalize(streakPeriod);
    const periodStreaks = streaks[streakPeriod];
    const style = streakStyles[idx];

    periodStreaks.forEach((count, idx) => {
      const color = streakColors[idx];
      achievements.push({
        id: nanoid(),
        datasetId,
        createdAt: nextCreatedAt(),
        type: 'goal',
        title: `${count}-${streakPeriodName} Streak`,
        description: `Maintain ${count} ${valenceTerm.toLowerCase()} ${streakPeriod}s in a row`,
        badge: createBadge(style, color, 'flame', `${count}`),
        target: createTarget(metric, source, condition, 0),
        timePeriod: streakPeriod,
        count,
        consecutive: true,
      });
    });
  });

  // Perfect day/week/month (min entry in a day/week/month is good)
  const perfectStyles: AchievementBadgeStyle[] = ['ribbon_shield', 'chevron_shield', 'castle_shield'];
  const perfectColors: AchievementBadgeColor[] = ['gold_medallion', 'diamond_medallion', 'magic_medallion'];
  (['day', 'week', 'month'] as const).forEach((perfectPeriod, idx, periods) => {
    if (idx < periods.indexOf(perfectPeriod)) return; // Skip periods before user's selected period

    achievements.push({
      id: nanoid(),
      datasetId,
      createdAt: nextCreatedAt(),
      type: 'goal',
      title: `Perfect ${capitalize(perfectPeriod)}`,
      description: `All entries in a ${perfectPeriod} are ${valenceTerm.toLowerCase()}`,
      badge: createBadge(perfectStyles[idx], perfectColors[idx], 'sparkles'),
      target: createTarget("min", source, condition, 0),
      timePeriod: perfectPeriod,
      count: 1,
    });
  });

  return achievements;
}

function resolveRangeCondition(valueRange?: { min?: number; max?: number }): GoalCondition | null {
  const min = valueRange?.min;
  const max = valueRange?.max;
  const hasMin = typeof min === 'number' && !Number.isNaN(min);
  const hasMax = typeof max === 'number' && !Number.isNaN(max);

  if (hasMin && hasMax) {
    if (min <= max) return { condition: 'inside', range: [min, max] };
    return { condition: 'inside', range: [max, min] };
  }
  if (hasMin) return { condition: 'above', value: min };
  if (hasMax) return { condition: 'below', value: max };
  return null;
}

function generateRangeTargets(input: GoalBuilderInput, rangeCondition: GoalCondition): Goal[] {
  const { datasetId, period, tracking } = input;
  const { metric, source } = getMetricAndSource('period-range', 'target', tracking);
  const nextCreatedAt = sequenceFromNow();
  const rangeLabel = formatGoalConditionLabel(rangeCondition);
  const adjectiveName = capitalize(adjectivize(period));

  return [
    {
      id: nanoid(),
      datasetId,
      createdAt: nextCreatedAt(),
      type: 'target',
      title: `${adjectiveName} Range`,
      description: rangeLabel
        ? `Stay ${rangeLabel.toLowerCase()} in a ${period}`
        : `Stay within range each ${period}`,
      badge: createBadge('bolt_shield', 'emerald', 'target'),
      target: createTargetFromCondition(metric, source, rangeCondition),
      timePeriod: period,
      count: 1,
    },
  ];
}

function generateRangeAchievements(input: GoalBuilderInput, rangeCondition: GoalCondition): Goal[] {
  const { datasetId, period, tracking } = input;
  const { metric, source } = getMetricAndSource('period-range', 'target', tracking);
  const nextCreatedAt = sequenceFromNow();

  const achievements: Goal[] = [];
  const periodName = capitalize(period);
  const rangeTerm = 'In Range';

  achievements.push({
    id: nanoid(),
    datasetId,
    createdAt: nextCreatedAt(),
    type: 'goal',
    title: 'First Entry',
    description: 'Record your first data point',
    badge: createBadge('ribbon_medal', 'jade', 'trophy', '1ˢᵗ'),
    target: createTarget('count', 'stats', 'above', 0),
    timePeriod: 'anytime',
    count: 1,
  });

  achievements.push({
    id: nanoid(),
    datasetId,
    createdAt: nextCreatedAt(),
    type: 'goal',
    title: 'First In Range',
    description: `Record your first in-range ${period}`,
    badge: createBadge('sports_medal', 'gold', 'trophy', '1ˢᵗ'),
    target: createTargetFromCondition(metric, source, rangeCondition),
    timePeriod: 'anytime',
    count: 1,
  });

  const goodPeriodCounts = [1, 5, 10, 20, 50, 100];
  const goodPeriodColors: AchievementBadgeColor[] = ['copper', 'bronze', 'silver', 'gold', 'diamond', 'magic'];
  const goodPeriodStyles: AchievementBadgeStyle[] = ['medal', 'star_medal', 'wings', 'wings', 'wings', 'wings'];
  goodPeriodCounts.forEach((count, idx) => {
    achievements.push({
      id: nanoid(),
      datasetId,
      createdAt: nextCreatedAt(),
      type: 'goal',
      title: `${count > 1 ? `${count} ` : ''}${rangeTerm} ${pluralize(periodName, count)}`,
      description: `Complete ${count === 1 ? 'a' : count} in-range ${pluralize(period, count)}`,
      badge: createBadge(goodPeriodStyles[idx % goodPeriodStyles.length], goodPeriodColors[idx], 'crown', count > 1 ? `${formatValue(count, { short: true })}` : undefined),
      target: createTargetFromCondition(metric, source, rangeCondition),
      timePeriod: period,
      count,
    });
  });

  const streaksByPeriod = {
    day: [2, 3, 4, 5, 10, 20, 50],
    week: [2, 3, 4, 5, 6, 9, 12],
    month: [2, 3, 4, 5, 6, 9, 12],
  } as const;
  const streakColors: AchievementBadgeColor[] = ['hellfire', 'flame', 'intense_flame', 'raging_flame', 'infernal_flame', 'consuming_flame', 'legendary_flame'];
  const streakStyles: AchievementBadgeStyle[] = ['fire', 'flamed', 'heart_flame'];

  streaksByPeriod[period].forEach((count, idx) => {
    achievements.push({
      id: nanoid(),
      datasetId,
      createdAt: nextCreatedAt(),
      type: 'goal',
      title: `${count}-${periodName} In Range Streak`,
      description: `Maintain ${count} in-range ${period}s in a row`,
      badge: createBadge(streakStyles[idx % streakStyles.length], streakColors[idx], 'flame', `${count}`),
      target: createTargetFromCondition(metric, source, rangeCondition),
      timePeriod: period,
      count,
      consecutive: true,
    });
  });

  return achievements;
}

// Main function to generate all goals
export function generateGoals(input: GoalBuilderInput): GeneratedGoals {
  if (input.targetType === 'period-range') {
    const rangeCondition = resolveRangeCondition(input.valueRange);
    if (!rangeCondition) {
      return { milestones: [], targets: [], achievements: [] };
    }
    return {
      milestones: [],
      targets: generateRangeTargets(input, rangeCondition),
      achievements: generateRangeAchievements(input, rangeCondition),
    };
  }

  // Phase 1: Calculate baseline values
  const baselines = calculateBaselines(input);

  // Phase 2: Generate goals using baselines
  return {
    milestones: generateMilestones(input, baselines),
    targets: generateTargets(input, baselines),
    achievements: generateAchievements(input, baselines),
  };
}