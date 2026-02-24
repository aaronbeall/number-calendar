import { describe, it, expect } from 'vitest';
import { generateGoals, calculateBaselines, type GoalBuilderInput, createGoalTextReplacements, applyGoalTextReplacements } from '../goals-builder';
import type { GoalRequirements } from '@/features/db/localdb';

describe('goals-builder: Series Tracking', () => {
  const baseInput: Omit<GoalBuilderInput, 'period' | 'valueType' | 'targetDays' | 'startingValue'> = {
    datasetId: 'test-dataset',
    tracking: 'series',
    valence: 'positive',
    value: 100,
    activePeriods: 5, // 5 periods per parent (e.g., 5 days per week)
    targetType: 'period-target' as const,
  };

  describe('Daily Period', () => {
    it('should generate correct goals for period', () => {
      const input: GoalBuilderInput = {
        ...baseInput,
        period: 'day',
        targetType: 'period-target' as const,
        startingValue: 5
      };

      const result = generateGoals(input);

      // Verify milestone count (2 start + 3 pre-baseline + 1 baseline + 6 extended = 12)
      expect(result.milestones).toHaveLength(12);

      // Verify target count (day, week, month)
      expect(result.targets).toHaveLength(3);

      // Verify achievement count
      expect(result.achievements.length).toBeGreaterThan(0);

      // Verify baseline calculations for daily period with activePeriods=5
      // dayTarget = 100, weekTarget = 100 * 5 = 500, monthTarget = 500 * 4.3 = 2150 → rounded to 2200
      const dayTarget = result.targets.find((t) => t.timePeriod === 'day');
      const weekTarget = result.targets.find((t) => t.timePeriod === 'week');
      const monthTarget = result.targets.find((t) => t.timePeriod === 'month');

      expect(dayTarget?.target.value).toBe(100);
      expect(weekTarget?.target.value).toBe(500);
      expect(monthTarget?.target.value).toBe(2200); // 2150 rounded to 2 leading digits

      // Verify milestone values (baselineMilestone = roundToClean(2200*3) = 6600, startValue = 0)
      // Start: 5 + dayTarget=100, weekTarget=500
      // Pre-baseline (2 leading digits): 6600 * [0.25, 0.5, 0.75]
      // Baseline (unrounded): 5 + 6600
      // Extended (1 leading digit): 5 + 6600 * [2, 4, 10, 20, 50, 100]
      const milestoneValues = result.milestones.map((m) => m.target.value!).sort((a, b) => a - b);
      const expectedValues = [110, 510, 1700, 3300, 5000, 6600, 10000, 30000, 70000, 100000, 300000, 700000];
      expect(milestoneValues.map(v => Math.round(v))).toEqual(expectedValues);

      // Verify metric and source
      expect(dayTarget?.target.metric).toBe('total');
      expect(dayTarget?.target.source).toBe('stats');
      expect(dayTarget?.target.condition).toBe('above');
    });

    it('should generate correct goals for alltime', () => {
      const input: GoalBuilderInput = {
        ...baseInput,
        period: 'day',
        targetType: 'alltime-target' as const,
        targetDays: 90,
        startingValue: 20,
      };

      const result = generateGoals(input);

      // Verify counts (2 start + 3 pre-baseline + 1 baseline + 6 extended = 12)
      expect(result.milestones).toHaveLength(12);
      expect(result.targets).toHaveLength(3);
      expect(result.achievements.length).toBeGreaterThan(0);

      // Verify baseline calculations for alltime with targetDays=90
      // range = 100 - 20 = 80
      // dailyRate = 80 / 90 ≈ 0.89
      // dayTarget ≈ 0.9, weekTarget ≈ 6.2, monthTarget = 0.89 * 30 = 26.7 → rounded to 27
      const dayTarget = result.targets.find((t) => t.timePeriod === 'day');
      const weekTarget = result.targets.find((t) => t.timePeriod === 'week');
      const monthTarget = result.targets.find((t) => t.timePeriod === 'month');

      expect(dayTarget?.target.value).toBeCloseTo(0.89, 1);
      expect(weekTarget?.target.value).toBeCloseTo(6.2, 1);
      expect(monthTarget?.target.value).toBe(27); // 26.7 rounded to 2 leading digits

      // Verify milestone values (baselineMilestone = 100, startValue = 20, delta = 80)
      // Start: 20 + dayTarget=0.9, weekTarget=6.2
      // Pre-baseline (2 leading digits): 20 + 80 * [0.25, 0.5, 0.75]
      // Baseline (unrounded): 100
      // Extended (1 leading digit): 20 + 80 * [2, 4, 10, 20, 50, 100]
      const milestoneValues = result.milestones.map((m) => m.target.value!).sort((a, b) => a - b);
      const normalizedValues = milestoneValues.map((value) => Number(value.toFixed(1)));
      const expectedValues = [21, 26, 40, 60, 80, 100, 200, 300, 800, 2000, 4000, 8000];
      expect(normalizedValues).toEqual(expectedValues);

      // Verify metric and source
      expect(dayTarget?.target.metric).toBe('total');
      expect(dayTarget?.target.source).toBe('stats');
      expect(dayTarget?.target.condition).toBe('above');
    });
  });

  describe('Weekly Period', () => {
    it('should generate correct goals for period', () => {
      const input: GoalBuilderInput = {
        ...baseInput,
        period: 'week',
        targetType: 'period-target' as const,
        startingValue: 25,
      };

      const result = generateGoals(input);

      // Verify counts (2 start + 3 pre-baseline + 1 baseline + 6 extended = 12)
      expect(result.milestones).toHaveLength(12);
      expect(result.targets).toHaveLength(3);
      expect(result.achievements.length).toBeGreaterThan(0);

      // Verify baseline calculations for weekly period with activePeriods=5
      // weekTarget = 100, dayTarget = 100 / 7 ≈ 14.29 → rounded to 14, monthTarget = 100 * 5 = 500
      const dayTarget = result.targets.find((t) => t.timePeriod === 'day');
      const weekTarget = result.targets.find((t) => t.timePeriod === 'week');
      const monthTarget = result.targets.find((t) => t.timePeriod === 'month');

      expect(dayTarget?.target.value).toBe(14); // 14.29 rounded to 2 leading digits
      expect(weekTarget?.target.value).toBe(100);
      expect(monthTarget?.target.value).toBe(500);

      // Verify milestone values (baselineMilestone = roundToClean(500*3) = 1500, startValue = 0)
      // Start: 25 + dayTarget=14, weekTarget=100
      // Pre-baseline (2 leading digits): 25 + 1500 * [0.25, 0.5, 0.75]
      // Baseline (unrounded): 25 + 1500
      // Extended (1 leading digit): 25 + 1500 * [2, 4, 10, 20, 50, 100]
      const milestoneValues = result.milestones.map((m) => m.target.value!).sort((a, b) => a - b);
      const expectedValues = [39, 130, 390, 760, 1100, 1500, 3000, 6000, 10000, 30000, 70000, 100000];
      expect(milestoneValues.map(v => Math.round(v))).toEqual(expectedValues);

      // Verify metric and source
      expect(weekTarget?.target.metric).toBe('total');
      expect(weekTarget?.target.source).toBe('stats');
      expect(weekTarget?.target.condition).toBe('above');
    });

    it('should generate correct goals for alltime', () => {
      const input: GoalBuilderInput = {
        ...baseInput,
        period: 'week',
        targetType: 'alltime-target' as const,
        targetDays: 91, // 13 weeks
        startingValue: 20,
      };

      const result = generateGoals(input);

      // Verify counts (2 start + 3 pre-baseline + 1 baseline + 6 extended = 12)
      expect(result.milestones).toHaveLength(12);
      expect(result.targets).toHaveLength(3);
      expect(result.achievements.length).toBeGreaterThan(0);

      // Verify baseline calculations for alltime with targetDays=91
      // range = 100 - 20 = 80
      // dailyRate = 80 / 91 ≈ 0.88
      // dayTarget ≈ 0.9, weekTarget ≈ 6.2, monthTarget = 0.88 * 30 = 26.4 → rounded to 26
      const dayTarget = result.targets.find((t) => t.timePeriod === 'day');
      const weekTarget = result.targets.find((t) => t.timePeriod === 'week');
      const monthTarget = result.targets.find((t) => t.timePeriod === 'month');

      expect(dayTarget?.target.value).toBe(0.88);
      expect(weekTarget?.target.value).toBe(6.2);
      expect(monthTarget?.target.value).toBe(26); // 26 rounded to 2 leading digits

      // Verify milestone values (baselineMilestone = 100, startValue = 20, delta = 80)
      // Start: 20 + dayTarget=0.9, weekTarget=6.2
      // Pre-baseline (2 leading digits): 20 + 80 * [0.25, 0.5, 0.75]
      // Baseline (unrounded): 20 + 80
      // Extended (1 leading digit): 20 + 80 * [2, 4, 10, 20, 50, 100]
      const milestoneValues = result.milestones.map((m) => m.target.value!).sort((a, b) => a - b);
      const normalizedValues = milestoneValues.map((value) => Number(value.toFixed(1)));
      const expectedValues = [21, 26, 40, 60, 80, 100, 200, 300, 800, 2000, 4000, 8000];
      expect(normalizedValues).toEqual(expectedValues);

      // Verify metric and source
      expect(weekTarget?.target.metric).toBe('total');
      expect(weekTarget?.target.source).toBe('stats');
      expect(weekTarget?.target.condition).toBe('above');
    });
  });

  describe('Monthly Period', () => {
    it('should generate correct goals for period', () => {
      const input: GoalBuilderInput = {
        ...baseInput,
        period: 'month',
        targetType: 'period-target' as const,
        startingValue: 12,
      };

      const result = generateGoals(input);

      // Verify counts (2 start + 3 pre-baseline + 1 baseline + 6 extended = 12)
      expect(result.milestones).toHaveLength(12);
      expect(result.targets).toHaveLength(3);
      expect(result.achievements.length).toBeGreaterThan(0);

      // Verify baseline calculations for monthly period with activePeriods=5
      // monthTarget = 100, dayTarget = 100 / 30 ≈ 3.33 → rounded to 3.3, weekTarget = 100 / 4.3 ≈ 23.26 → rounded to 23
      const dayTarget = result.targets.find((t) => t.timePeriod === 'day');
      const weekTarget = result.targets.find((t) => t.timePeriod === 'week');
      const monthTarget = result.targets.find((t) => t.timePeriod === 'month');

      expect(dayTarget?.target.value).toBeCloseTo(3.3, 6); // 3.33 rounded to 2 leading digits
      expect(weekTarget?.target.value).toBe(23); // 23.26 rounded to 2 leading digits
      expect(monthTarget?.target.value).toBe(100);

      // Verify milestone values (baselineMilestone = 300, startValue = 0)
      // Start: 12 + dayTarget=3.3, weekTarget=23
      // Pre-baseline (2 leading digits): 12 + 300 * [0.25, 0.5, 0.75]
      // Baseline (unrounded): 12 + 300
      // Extended (1 leading digit): 12 + 300 * [2, 4, 10, 20, 50, 100]
      const milestoneValues = result.milestones.map((m) => m.target.value!).sort((a, b) => a - b);
      const normalizedValues = milestoneValues.map((value) => Number(value.toFixed(1)));
      const expectedValues = [15, 35, 87, 160, 240, 310, 600, 1000, 3000, 6000, 10000, 30000];
      expect(normalizedValues).toEqual(expectedValues);

      // Verify metric and source
      expect(monthTarget?.target.metric).toBe('total');
      expect(monthTarget?.target.source).toBe('stats');
      expect(monthTarget?.target.condition).toBe('above');
    });

    it('should generate correct goals for alltime', () => {
      const input: GoalBuilderInput = {
        ...baseInput,
        period: 'month',
        targetType: 'alltime-target' as const,
        targetDays: 90, // 3 months
        startingValue: 15,
      };

      const result = generateGoals(input);

      // Verify counts (2 start + 3 pre-baseline + 1 baseline + 6 extended = 12)
      expect(result.milestones).toHaveLength(12);
      expect(result.targets).toHaveLength(3);
      expect(result.achievements.length).toBeGreaterThan(0);

      // Verify baseline calculations for alltime with targetDays=90
      // range = 100 - 15 = 85
      // dailyRate = 85 / 90 ≈ 0.94
      // dayTarget ≈ 0.9, weekTarget ≈ 6.6, monthTarget = 0.94 * 30 = 28.2 → rounded to 28
      const dayTarget = result.targets.find((t) => t.timePeriod === 'day');
      const weekTarget = result.targets.find((t) => t.timePeriod === 'week');
      const monthTarget = result.targets.find((t) => t.timePeriod === 'month');

      expect(dayTarget?.target.value).toBeCloseTo(0.94, 1);
      expect(weekTarget?.target.value).toBeCloseTo(6.6, 1);
      expect(monthTarget?.target.value).toBe(28); // 28.2 rounded to 2 leading digits

      // Verify milestone values (baselineMilestone = 100, startValue = 15, delta = 85)
      // Start: 15 + dayTarget=0.9, weekTarget=6.6
      // Pre-baseline (2 leading digits): 15 + 85 * [0.25, 0.5, 0.75]
      // Baseline (unrounded): 15 + 85
      // Extended (1 leading digit): 15 + 85 * [2, 4, 10, 20, 50, 100]
      const milestoneValues = result.milestones.map((m) => m.target.value!).sort((a, b) => a - b);
      const normalizedValues = milestoneValues.map((value) => Number(value.toFixed(1)));
      const expectedValues = [16, 22, 36, 58, 79, 100, 200, 400, 900, 2000, 4000, 9000];
      expect(normalizedValues).toEqual(expectedValues);

      // Verify metric and source
      expect(monthTarget?.target.metric).toBe('total');
      expect(monthTarget?.target.source).toBe('stats');
      expect(monthTarget?.target.condition).toBe('above');
    });
  });
});

describe('calculateBaselines', () => {
  describe('all-time goals', () => {
    it('calculates baseline values for all-time total goals', () => {
      const input: GoalBuilderInput = {
        datasetId: 'test',
        tracking: 'series',
        valence: 'positive',
        period: 'day',
        value: 1000,
        targetType: 'alltime-target' as const,
        activePeriods: 5,
        startingValue: 0,
        targetDays: 90,
      };

      const result = calculateBaselines(input);

      expect(result.baselineMilestone).toBe(1000);
      expect(result.dayTarget).toBeCloseTo(11, 1); // 1000 / 90 days
      expect(result.weekTarget).toBeCloseTo(78, 1); // ~11 * 7
      expect(result.monthTarget).toBe(330); // 333 rounded to 2 sig figs
    });

    it('calculates baseline values for all-time target goals with non-zero starting value', () => {
      const input: GoalBuilderInput = {
        datasetId: 'test',
        tracking: 'trend',
        valence: 'positive',
        period: 'week',
        value: 200,
        targetType: 'alltime-target' as const,
        activePeriods: 3,
        startingValue: 50,
        targetDays: 180,
      };

      const result = calculateBaselines(input);

      expect(result.baselineMilestone).toBe(200);
      const range = 200 - 50; // 150
      const dailyRate = range / 180; // ~0.83
      expect(result.dayTarget).toBeCloseTo(dailyRate, 0);
    });

    it('throws error when targetDays is missing or invalid', () => {
      const input: GoalBuilderInput = {
        datasetId: 'test',
        tracking: 'series',
        valence: 'positive',
        period: 'day',
        value: 100,
        targetType: 'alltime-target' as const,
        activePeriods: 5,
        startingValue: 0,
        targetDays: 0,
      };

      expect(() => calculateBaselines(input)).toThrow();
    });
  });

  describe('period-based goals', () => {
    it('calculates baseline values for daily period goals', () => {
      const input: GoalBuilderInput = {
        datasetId: 'test',
        tracking: 'series',
        valence: 'positive',
        period: 'day',
        value: 50,
        targetType: 'period-target' as const,
        activePeriods: 5,
        startingValue: 0,
        targetDays: 90,
      };

      const result = calculateBaselines(input);

      expect(result.dayTarget).toBe(50); // Same as input
      expect(result.weekTarget).toBe(250); // 50 * 5 days per week
      expect(result.monthTarget).toBeGreaterThan(1000); // ~250 * 4.3 weeks
    });

    it('calculates baseline values for weekly period goals', () => {
      const input: GoalBuilderInput = {
        datasetId: 'test',
        tracking: 'series',
        valence: 'positive',
        period: 'week',
        value: 100,
        targetType: 'period-target' as const,
        activePeriods: 4,
        startingValue: 0,
        targetDays: 90,
      };

      const result = calculateBaselines(input);

      expect(result.weekTarget).toBe(100); // Same as input
      expect(result.dayTarget).toBe(14); // 14.3 rounded to 2 sig figs
      expect(result.monthTarget).toBe(400); // 100 * 4 weeks per month
    });

    it('calculates baseline values for monthly period goals', () => {
      const input: GoalBuilderInput = {
        datasetId: 'test',
        tracking: 'series',
        valence: 'positive',
        period: 'month',
        value: 300,
        targetType: 'period-target' as const,
        activePeriods: 12,
        startingValue: 0,
        targetDays: 90,
      };

      const result = calculateBaselines(input);

      expect(result.monthTarget).toBe(300); // Same as input
      expect(result.dayTarget).toBeCloseTo(300 / 30, 1); // 10
      expect(result.weekTarget).toBeCloseTo(300 / 4.3, 0); // ~70
    });

    it('respects starting value in milestone calculation', () => {
      const input: GoalBuilderInput = {
        datasetId: 'test',
        tracking: 'series',
        valence: 'positive',
        period: 'day',
        value: 50,
        targetType: 'period-target' as const,
        activePeriods: 5,
        startingValue: 1000,
        targetDays: 90,
      };

      const result = calculateBaselines(input);

      expect(result.baselineMilestone).toBeGreaterThan(1000); // Should include starting value
    });
  });

  describe('significant figure rounding', () => {
    it('rounds targets with intelligent precision based on input value', () => {
      // Input value 25 has 2 significant digits
      const input: GoalBuilderInput = {
        datasetId: 'test',
        tracking: 'series',
        valence: 'positive',
        period: 'day',
        value: 25,
        targetType: 'period-target' as const,
        activePeriods: 5,
        startingValue: 0,
        targetDays: 90,
      };

      const result = calculateBaselines(input);

      // dayTarget should match input precision
      expect(result.dayTarget).toBe(25);
      // weekTarget is scaled (5x), should have +1 sig digit flexibility
      expect(result.weekTarget).toBe(125);
    });

    it('handles single significant digit input', () => {
      // Input value 5 has 1 significant digit
      const input: GoalBuilderInput = {
        datasetId: 'test',
        tracking: 'series',
        valence: 'positive',
        period: 'day',
        value: 5,
        targetType: 'period-target' as const,
        activePeriods: 3,
        startingValue: 0,
        targetDays: 90,
      };

      const result = calculateBaselines(input);

      expect(result.dayTarget).toBe(5);
      // weekTarget should be rounded intelligently
      expect(Number.isFinite(result.weekTarget)).toBe(true);
    });

    it('handles decimal input with precision', () => {
      // Input value 2.5 has 2 significant digits
      const input: GoalBuilderInput = {
        datasetId: 'test',
        tracking: 'series',
        valence: 'positive',
        period: 'day',
        value: 2.5,
        targetType: 'period-target' as const,
        activePeriods: 5,
        startingValue: 0,
        targetDays: 90,
      };

      const result = calculateBaselines(input);

      expect(result.dayTarget).toBe(2.5);
      expect(Number.isFinite(result.weekTarget)).toBe(true);
    });
  });

  describe('different value types', () => {
    it('handles period value type', () => {
      const input: GoalBuilderInput = {
        datasetId: 'test',
        tracking: 'trend',
        valence: 'positive',
        period: 'day',
        value: 10,
        targetType: 'period-target' as const,
        activePeriods: 5,
        startingValue: 100,
        targetDays: 90,
      };

      const result = calculateBaselines(input);

      expect(result.dayTarget).toBe(10);
      expect(result.weekTarget).toBe(50);
    });

    it('handles period value type', () => {
      const input: GoalBuilderInput = {
        datasetId: 'test',
        tracking: 'series',
        valence: 'positive',
        period: 'week',
        value: 200,
        targetType: 'period-target' as const,
        activePeriods: 4,
        startingValue: 0,
        targetDays: 90,
      };

      const result = calculateBaselines(input);

      expect(result.weekTarget).toBe(200);
    });
  });

  describe('edge cases', () => {
    it('handles negative valence correctly', () => {
      const input: GoalBuilderInput = {
        datasetId: 'test',
        tracking: 'trend',
        valence: 'negative',
        period: 'day',
        value: -5,
        targetType: 'period-target' as const,
        activePeriods: 5,
        startingValue: 100,
        targetDays: 90,
      };

      const result = calculateBaselines(input);

      expect(result.dayTarget).toBe(-5);
      expect(result.weekTarget).toBe(-25);
    });

    it('handles neutral valence', () => {
      const input: GoalBuilderInput = {
        datasetId: 'test',
        tracking: 'series',
        valence: 'neutral',
        period: 'day',
        value: 50,
        targetType: 'period-target' as const,
        activePeriods: 5,
        startingValue: 0,
        targetDays: 90,
      };

      const result = calculateBaselines(input);

      expect(result.dayTarget).toBe(50);
    });

    it('handles very large values', () => {
      const input: GoalBuilderInput = {
        datasetId: 'test',
        tracking: 'series',
        valence: 'positive',
        period: 'day',
        value: 10000,
        targetType: 'period-target' as const,
        activePeriods: 5,
        startingValue: 0,
        targetDays: 90,
      };

      const result = calculateBaselines(input);

      expect(result.dayTarget).toBe(10000);
      expect(result.weekTarget).toBe(50000);
      expect(Number.isFinite(result.monthTarget)).toBe(true);
    });

    it('handles very small values', () => {
      const input: GoalBuilderInput = {
        datasetId: 'test',
        tracking: 'series',
        valence: 'positive',
        period: 'day',
        value: 0.1,
        targetType: 'period-target' as const,
        activePeriods: 5,
        startingValue: 0,
        targetDays: 90,
      };

      const result = calculateBaselines(input);

      expect(result.dayTarget).toBe(0.1);
      expect(Number.isFinite(result.weekTarget)).toBe(true);
    });
  });

  describe('period-percent goals (compound growth)', () => {
    it('calculates daily percent mode with compound growth across active periods', () => {
      // 10% daily for 5 days should compound: (1.1)^5 - 1 = 0.61051 = 61.051%
      const input: GoalBuilderInput = {
        datasetId: 'test',
        tracking: 'series',
        valence: 'positive',
        period: 'day',
        value: 10, // 10%
        targetType: 'period-percent' as const,
        activePeriods: 5,
        startingValue: 0,
        targetDays: 90,
      };

      const result = calculateBaselines(input);

      expect(result.dayTarget).toBe(10); // daily target should match input
      // weekTarget should use compound formula: (1.1)^5 - 1 = 0.61051 * 100 = 61.051%
      // After rounding to 2 sig digits: ~61
      expect(result.weekTarget).toBeCloseTo(61, 0);
      expect(Number.isFinite(result.monthTarget)).toBe(true);
    });

    it('calculates daily percent mode with 5% over 7 days (week)', () => {
      // 5% daily for 7 days: (1.05)^7 - 1 = 0.4071 = 40.71%
      const input: GoalBuilderInput = {
        datasetId: 'test',
        tracking: 'series',
        valence: 'positive',
        period: 'day',
        value: 5,
        targetType: 'period-percent' as const,
        activePeriods: 7, // 7 days per week
        startingValue: 0,
        targetDays: 90,
      };

      const result = calculateBaselines(input);

      expect(result.dayTarget).toBe(5);
      // Expected: (1.05)^7 - 1 = 0.40071 * 100 = 40.71%
      // After rounding with 2 sig digits from input: ~40-41
      expect(result.weekTarget).toBeCloseTo(41, 0);
    });

    it('calculates weekly percent mode with compound growth across months', () => {
      // 5% weekly for 4 weeks should compound: (1.05)^4 - 1 = 0.2155 = 21.55%
      const input: GoalBuilderInput = {
        datasetId: 'test',
        tracking: 'series',
        valence: 'positive',
        period: 'week',
        value: 5,
        targetType: 'period-percent' as const,
        activePeriods: 4, // 4 weeks per month
        startingValue: 0,
        targetDays: 90,
      };

      const result = calculateBaselines(input);

      expect(result.weekTarget).toBe(5);
      // Expected: (1.05)^4 - 1 = 0.2155 * 100 = 21.55%
      // After rounding with 2 sig digits from input: ~22
      expect(result.monthTarget).toBeCloseTo(22, 0);
    });

    it('compounds correctly: 10% daily for 5 days is not 50%', () => {
      // This is the key test: verify compound growth vs simple multiplication
      // Simple (wrong): 10% * 5 = 50%
      // Compound (correct): (1.1)^5 - 1 ≈ 61.05%
      const input: GoalBuilderInput = {
        datasetId: 'test_compound_check',
        tracking: 'series',
        valence: 'positive',
        period: 'day',
        value: 10,
        targetType: 'period-percent' as const,
        activePeriods: 5,
        startingValue: 0,
        targetDays: 90,
      };

      const result = calculateBaselines(input);

      // Should NOT be 50 (simple multiplication)
      expect(result.weekTarget).not.toBe(50);
      // Should be approximately 61.05 (compound)
      expect(result.weekTarget).toBeGreaterThan(60);
      expect(result.weekTarget).toBeLessThan(62);
    });

    it('handles very small percent values (0.5%)', () => {
      const input: GoalBuilderInput = {
        datasetId: 'test',
        tracking: 'series',
        valence: 'positive',
        period: 'day',
        value: 0.5,
        targetType: 'period-percent' as const,
        activePeriods: 5,
        startingValue: 0,
        targetDays: 90,
      };

      const result = calculateBaselines(input);

      expect(result.dayTarget).toBe(0.5);
      // (1.005)^5 - 1 = 0.02513 = 2.513%
      expect(result.weekTarget).toBeCloseTo(2.513, 1);
    });

    it('handles high percent values (25%)', () => {
      const input: GoalBuilderInput = {
        datasetId: 'test',
        tracking: 'series',
        valence: 'positive',
        period: 'day',
        value: 25,
        targetType: 'period-percent' as const,
        activePeriods: 5,
        startingValue: 0,
        targetDays: 90,
      };

      const result = calculateBaselines(input);

      expect(result.dayTarget).toBe(25);
      // (1.25)^5 - 1 = 3.0518 = 305.18%
      // After rounding: ~200+ (rounding is aggressive with 2 sig digits)
      expect(result.weekTarget).toBeGreaterThan(150);
      expect(result.weekTarget).toBeLessThan(400);
    });

    it('handles 100% daily percent (doubles each day)', () => {
      const input: GoalBuilderInput = {
        datasetId: 'test',
        tracking: 'series',
        valence: 'positive',
        period: 'day',
        value: 100,
        targetType: 'period-percent' as const,
        activePeriods: 5,
        startingValue: 0,
        targetDays: 90,
      };

      const result = calculateBaselines(input);

      expect(result.dayTarget).toBe(100);
      // (2)^5 - 1 = 31 = 3100%
      expect(result.weekTarget).toBe(3100);
    });

    it('month conversion compounds correctly for daily percent mode', () => {
      // 10% daily for ~30 days (4.3 weeks * 7 days per week)
      const input: GoalBuilderInput = {
        datasetId: 'test',
        tracking: 'series',
        valence: 'positive',
        period: 'day',
        value: 10,
        targetType: 'period-percent' as const,
        activePeriods: 5, // 5 days per week
        startingValue: 0,
        targetDays: 90,
      };

      const result = calculateBaselines(input);

      // Month conversion: (1.1)^(5 * 4.3) - 1 = (1.1)^21.5 - 1
      // (1.1)^21.5 ≈ 9.55, so 9.55 - 1 = 8.55 = 855%
      // After rounding with 2 sig digits: ~680 or similar
      expect(result.monthTarget).toBeGreaterThan(600);
      expect(Number.isFinite(result.monthTarget)).toBe(true);
    });

    it('month conversion compounds correctly for weekly percent mode', () => {
      // 5% weekly for 4 weeks per month
      const input: GoalBuilderInput = {
        datasetId: 'test',
        tracking: 'series',
        valence: 'positive',
        period: 'week',
        value: 5,
        targetType: 'period-percent' as const,
        activePeriods: 4,
        startingValue: 0,
        targetDays: 90,
      };

      const result = calculateBaselines(input);

      // Expected: (1.05)^4 - 1 = 0.2155 * 100 = 21.55%
      // After rounding: ~22
      expect(result.monthTarget).toBeCloseTo(22, 0);
    });

    it('percentage baseline milestone calculation includes starting value', () => {
      const input: GoalBuilderInput = {
        datasetId: 'test',
        tracking: 'series',
        valence: 'positive',
        period: 'day',
        value: 10,
        targetType: 'period-percent' as const,
        activePeriods: 5,
        startingValue: 1000,
        targetDays: 90,
      };

      const result = calculateBaselines(input);

      // baselineMilestone = startingValue + (monthTarget * 3)
      // monthTarget ≈ 855%, so baseline ≈ 1000 + (855 * 3) = 3565
      expect(result.baselineMilestone).toBeGreaterThan(1000);
      expect(Number.isFinite(result.baselineMilestone)).toBe(true);
    });

    it('non-percent additive mode uses simple multiplication (not compound)', () => {
      // Verify that non-percent period-target still uses simple multiplication
      const input: GoalBuilderInput = {
        datasetId: 'test',
        tracking: 'series',
        valence: 'positive',
        period: 'day',
        value: 10,
        targetType: 'period-target' as const, // NOT percent mode
        activePeriods: 5,
        startingValue: 0,
        targetDays: 90,
      };

      const result = calculateBaselines(input);

      // Should be simple multiplication: 10 * 5 = 50
      expect(result.weekTarget).toBe(50);
      expect(result.monthTarget).toBeGreaterThan(200); // 50 * 4.3
    });

    it('percent mode with zero percent (no growth)', () => {
      const input: GoalBuilderInput = {
        datasetId: 'test',
        tracking: 'series',
        valence: 'positive',
        period: 'day',
        value: 0,
        targetType: 'period-percent' as const,
        activePeriods: 5,
        startingValue: 0,
        targetDays: 90,
      };

      const result = calculateBaselines(input);

      // (1)^5 - 1 = 0%
      expect(result.dayTarget).toBe(0);
      expect(result.weekTarget).toBeCloseTo(0, 1);
    });

    it('percent mode comparison across different compound periods', () => {
      // Test that 10% over different timescales compounds correctly
      const base10PercentDaily: GoalBuilderInput = {
        datasetId: 'test',
        tracking: 'series',
        valence: 'positive',
        period: 'day',
        value: 10,
        targetType: 'period-percent' as const,
        activePeriods: 5,
        startingValue: 0,
        targetDays: 90,
      };

      const result = calculateBaselines(base10PercentDaily);
      const weeklyCompound = result.weekTarget;

      // (1.1)^5 ≈ 1.6105, so (1.1)^5 - 1 ≈ 0.6105 = 61.05% (rounded to ~61)
      expect(weeklyCompound).toBeCloseTo(61, 0);

      // Verify compound growth exceeds linear growth consistently
      expect(weeklyCompound).toBeGreaterThan(10 * 5); // > 50% (linear)
    });

    it('negative percent mode growth (decay)', () => {
      // Negative percent: losing value each period
      const input: GoalBuilderInput = {
        datasetId: 'test',
        tracking: 'trend',
        valence: 'negative',
        period: 'day',
        value: -10, // 10% loss daily
        targetType: 'period-percent' as const,
        activePeriods: 5,
        startingValue: 100,
        targetDays: 90,
      };

      const result = calculateBaselines(input);

      expect(result.dayTarget).toBe(-10);
      // (0.9)^5 - 1 = 0.59049 - 1 = -0.40951 = -40.951%
      expect(result.weekTarget).toBeCloseTo(-41, 0);
    });
  });
});

describe('Text Replacement Functions', () => {
  describe('createGoalTextReplacements', () => {
    it('should create value replacements for changed target values', () => {
      const prevGoal: Partial<GoalRequirements> = {
        target: { metric: 'total', source: 'stats', condition: 'above', value: 100 },
        timePeriod: 'day',
        count: 1,
      };
      const nextGoal: Partial<GoalRequirements> = {
        target: { metric: 'total', source: 'stats', condition: 'above', value: 200 },
        timePeriod: 'day',
        count: 1,
      };

      const replacements = createGoalTextReplacements(prevGoal, nextGoal);

      // Should have formatted replacements for the value change
      expect(replacements.formattedShortPreferred.length).toBeGreaterThan(0);
      expect(replacements.formattedLongPreferred.length).toBeGreaterThan(0);
    });

    it('should create word replacements for changed metric', () => {
      const prevGoal: Partial<GoalRequirements> = {
        target: { metric: 'total', source: 'stats', condition: 'above', value: 100 },
        timePeriod: 'day',
        count: 1,
      };
      const nextGoal: Partial<GoalRequirements> = {
        target: { metric: 'mean', source: 'stats', condition: 'above', value: 100 },
        timePeriod: 'day',
        count: 1,
      };

      const replacements = createGoalTextReplacements(prevGoal, nextGoal);

      const metricReplacement = replacements.wordReplacements.find(r => r.old === 'total');
      expect(metricReplacement).toBeDefined();
      expect(metricReplacement?.new).toBe('mean');
    });

    it('should create word replacements for changed source', () => {
      const prevGoal: Partial<GoalRequirements> = {
        target: { metric: 'total', source: 'stats', condition: 'above', value: 100 },
        timePeriod: 'day',
        count: 1,
      };
      const nextGoal: Partial<GoalRequirements> = {
        target: { metric: 'total', source: 'deltas', condition: 'above', value: 100 },
        timePeriod: 'day',
        count: 1,
      };

      const replacements = createGoalTextReplacements(prevGoal, nextGoal);

      const sourceReplacement = replacements.wordReplacements.find(r => r.old === 'stats');
      expect(sourceReplacement).toBeDefined();
      expect(sourceReplacement?.new).toBe('deltas');
    });

    it('should create word replacements for changed condition', () => {
      const prevGoal: Partial<GoalRequirements> = {
        target: { metric: 'total', source: 'stats', condition: 'above', value: 100 },
        timePeriod: 'day',
        count: 1,
      };
      const nextGoal: Partial<GoalRequirements> = {
        target: { metric: 'total', source: 'stats', condition: 'below', value: 100 },
        timePeriod: 'day',
        count: 1,
      };

      const replacements = createGoalTextReplacements(prevGoal, nextGoal);

      const conditionReplacement = replacements.wordReplacements.find(r => r.old === 'above');
      expect(conditionReplacement).toBeDefined();
      expect(conditionReplacement?.new).toBe('below');
    });

    it('should create word replacements for changed count', () => {
      const prevGoal: Partial<GoalRequirements> = {
        target: { metric: 'total', source: 'stats', condition: 'above', value: 100 },
        timePeriod: 'day',
        count: 5,
      };
      const nextGoal: Partial<GoalRequirements> = {
        target: { metric: 'total', source: 'stats', condition: 'above', value: 100 },
        timePeriod: 'day',
        count: 10,
      };

      const replacements = createGoalTextReplacements(prevGoal, nextGoal);

      const countReplacement = replacements.wordReplacements.find(r => r.old === '5');
      expect(countReplacement).toBeDefined();
      expect(countReplacement?.new).toBe('10');
    });

    it('should create word replacements for changed time period', () => {
      const prevGoal: Partial<GoalRequirements> = {
        target: { metric: 'total', source: 'stats', condition: 'above', value: 100 },
        timePeriod: 'day',
        count: 1,
      };
      const nextGoal: Partial<GoalRequirements> = {
        target: { metric: 'total', source: 'stats', condition: 'above', value: 100 },
        timePeriod: 'week',
        count: 1,
      };

      const replacements = createGoalTextReplacements(prevGoal, nextGoal);

      const periodReplacement = replacements.wordReplacements.find(r => r.old === 'day');
      expect(periodReplacement).toBeDefined();
      expect(periodReplacement?.new).toBe('week');
    });

    it('should handle missing targets gracefully', () => {
      const prevGoal: Partial<GoalRequirements> = {
        timePeriod: 'day',
        count: 1,
      };
      const nextGoal: Partial<GoalRequirements> = {
        timePeriod: 'week',
        count: 1,
      };

      const replacements = createGoalTextReplacements(prevGoal, nextGoal);

      expect(replacements.wordReplacements).toHaveLength(0);
      expect(replacements.formattedShortPreferred).toHaveLength(0);
      expect(replacements.formattedLongPreferred).toHaveLength(0);
    });
  });

  describe('applyGoalTextReplacements', () => {
    it('should apply formatted short replacements to title and badge label', () => {
      const text = {
        title: 'Reach 100 Daily',
        description: 'Reach 100 in a day',
        badgeLabel: '100',
      };
      const replacements = {
        wordReplacements: [],
        formattedShortPreferred: [{ old: '100', new: '200' }],
        formattedLongPreferred: [],
      };

      const result = applyGoalTextReplacements(text, replacements);

      expect(result.title).toBe('Reach 200 Daily');
      expect(result.badgeLabel).toBe('200');
      expect(result.description).toBe('Reach 100 in a day'); // Not affected by short format
    });

    it('should apply formatted long replacements to description', () => {
      const text = {
        title: 'Reach 100 Daily',
        description: 'Reach 100 in a day',
        badgeLabel: '100',
      };
      const replacements = {
        wordReplacements: [],
        formattedShortPreferred: [],
        formattedLongPreferred: [{ old: '100', new: '200' }],
      };

      const result = applyGoalTextReplacements(text, replacements);

      expect(result.title).toBe('Reach 100 Daily'); // Not affected
      expect(result.badgeLabel).toBe('100'); // Not affected
      expect(result.description).toBe('Reach 200 in a day');
    });

    it('should apply word replacements to all text', () => {
      const text = {
        title: 'day total Target',
        description: 'Reach total above 100 in a day',
        badgeLabel: 'total',
      };
      const replacements = {
        wordReplacements: [
          { old: 'day', new: 'week' },
          { old: 'total', new: 'mean' },
        ],
        formattedShortPreferred: [],
        formattedLongPreferred: [],
      };

      const result = applyGoalTextReplacements(text, replacements);

      expect(result.title).toBe('week mean Target');
      expect(result.description).toBe('Reach mean above 100 in a week');
      expect(result.badgeLabel).toBe('mean');
    });

    it('should apply all replacement types in correct order', () => {
      const text = {
        title: '100 day',
        description: 'Reach 100 in a day',
        badgeLabel: '100',
      };
      const replacements = {
        wordReplacements: [{ old: 'day', new: 'week' }],
        formattedShortPreferred: [{ old: '100', new: '200' }],
        formattedLongPreferred: [{ old: '100', new: '200' }],
      };

      const result = applyGoalTextReplacements(text, replacements);

      expect(result.title).toBe('200 week');
      expect(result.description).toBe('Reach 200 in a week');
      expect(result.badgeLabel).toBe('200');
    });

    it('should handle special characters in values', () => {
      const text = {
        title: 'Reach +10 Daily',
        description: 'Reach +10 in a day',
        badgeLabel: '+10',
      };
      const replacements = {
        wordReplacements: [],
        formattedShortPreferred: [{ old: '+10', new: '+20' }],
        formattedLongPreferred: [{ old: '+10', new: '+20' }],
      };

      const result = applyGoalTextReplacements(text, replacements);

      expect(result.title).toBe('Reach +20 Daily');
      expect(result.description).toBe('Reach +20 in a day');
      expect(result.badgeLabel).toBe('+20');
    });
  });
});
