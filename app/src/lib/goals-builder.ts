import { nanoid } from 'nanoid';
import type { Goal, GoalTarget, Tracking, Valence } from '@/features/db/localdb';
import type { NumberMetric } from './stats';
import { getMetricDisplayName } from './stats';
import type { AchievementBadgeColor, AchievementBadgeIcon, AchievementBadgeStyle } from './achievements';
import { adjectivize, capitalize, pluralize, randomValueOf } from './utils';
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

  const milestonesValues = [
    roundToClean(startValue + baselines.dayTarget, 2),
    roundToClean(startValue + baselines.weekTarget, 2),
    ...preBaselineFractions.map((fraction) => roundToClean(startValue + delta * fraction, 2)),
    baseValue,
    ...extendedMultipliers.map((multiplier) => roundToClean(startValue + delta * multiplier, 1)),
  ];

  const funNames = randomValueOf({
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

  milestonesValues.forEach((value, idx) => {
    const name = funNames[idx];
    const color = colors[idx];
    const style = styles[idx];

    milestones.push({
      id: nanoid(),
      datasetId,
      createdAt: Date.now(),
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
    { period: 'day', value: baselines.dayTarget, color: 'emerald' },
    { period: 'week', value: baselines.weekTarget, color: 'sapphire' },
    { period: 'month', value: baselines.monthTarget, color: 'amethyst' },
  ];

  periods.forEach(({ period, value, color }, idx) => {
    const adjectiveName = capitalize(adjectivize(period));
    const style = (['bolt_shield', 'vibrating_shield', 'wing_shield'] as const)[idx];
    
    targets.push({
      id: nanoid(),
      datasetId,
      createdAt: Date.now(),
      type: 'target',
      title: `${adjectiveName} Target`,
      description: `Reach ${formatValue(value, { delta: source === 'deltas' })} in a ${period}`,
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
  const { datasetId, period, valueType, valence } = input;
  const { metric, source } = getMetricAndSource(valueType, 'target');
  const condition = getCondition(valence);

  const achievements: Goal[] = [];
  const valenceTerm = (valueType === 'period-change' || valueType === 'alltime-target')
    ? getValueForValence(1, valence, { good: 'Uptrend', bad: 'Downtrend', neutral: 'Steady' })
    : getValueForValence(1, valence, { good: 'Positive', bad: 'Negative', neutral: 'Consistent' });

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
    badge: createBadge('ribbon_medal', 'honor', 'trophy', '1ˢᵗ'),
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
        createdAt: Date.now(),
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
    createdAt: Date.now(),
    type: 'goal',
    title: `${valenceTerm} Year`,
    description: `Have a ${valenceTerm.toLowerCase()} year`,
    badge: createBadge('angel', 'gold', 'crown'),
    target: createTarget(metric, source, condition, 0),
    timePeriod: 'year',
    count: 1,
  });

  // Targets Completed
  const targetCounts = [5, 10, 20, 50, 100];
  const targetColors: AchievementBadgeColor[] = ['emerald', 'sapphire', 'amethyst', 'synthwave', 'cyberpunk'];
  (['day', 'week', 'month'] as const).forEach((targetPeriod, idx, periods) => {
    if (idx < periods.indexOf(period)) return; // Skip periods before user's selected period

    const targetValue = periodTargets[targetPeriod];
    const style = (['bolt_shield', 'vibrating_shield', 'wing_shield'] as const)[idx];

    targetCounts.forEach((count, idx) => {
      const adjectiveName = capitalize(adjectivize(targetPeriod));
      achievements.push({
        id: nanoid(),
        datasetId,
        createdAt: Date.now(),
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
    'copper',
    'bronze',
    'silver',
    'gold',
    'platinum',
    'diamond',
    'magic',
    'cosmic',
    'mystic',
    'passion',
  ];
  const multipleStyles: AchievementBadgeStyle[] = [
    'star_formation',
    'star_stack',
    'staryu',
  ];
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
        createdAt: Date.now(),
        type: 'goal',
        title: `${multipleNames[idx]} ${targetPeriodName}`,
        description: `Reach ${formatValue(multipleValue, { delta: source === 'deltas' })} in a ${targetPeriod}`,
        badge: createBadge(style, color, 'trophy', `${multiple}×`),
        target: createTarget(metric, source, condition, multipleValue),
        timePeriod: targetPeriod,
        count: 1,
      });
    });
  });

  // Day/Week/Month streaks
  const streakColors: AchievementBadgeColor[] = ['rage', 'flame', 'intense_flame', 'raging_flame', 'infernal_flame', 'consuming_flame', 'legendary_flame'];
  const streakStyles: AchievementBadgeStyle[] = ['fire', 'flamed', 'heart_flame'];
  const streaks = {
    day: [2, 3, 4, 5, 10, 50, 100],
    week: [2, 3, 4, 8, 12, 32, 52],
    month: [2, 3, 4, 5, 6, 12, 24],
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
        createdAt: Date.now(),
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

  // TODO: Perfect Day/Week/Month achievements

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
