import { describe, it, expect } from 'vitest';
import { generateGoals, calculateBaselines, type GoalBuilderInput } from '../goals-builder';

describe('goals-builder: Series Tracking', () => {
  const baseInput: Omit<GoalBuilderInput, 'period' | 'valueType' | 'targetDays' | 'startingValue'> = {
    datasetId: 'test-dataset',
    tracking: 'series',
    valence: 'positive',
    value: 100,
    activePeriods: 5, // 5 periods per parent (e.g., 5 days per week)
  };

  describe('Daily Period', () => {
    it('should generate correct goals for period-total', () => {
      const input: GoalBuilderInput = {
        ...baseInput,
        period: 'day',
        targetType: 'period-total',
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

    it('should generate correct goals for alltime-total', () => {
      const input: GoalBuilderInput = {
        ...baseInput,
        period: 'day',
        targetType: 'alltime-total',
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
    it('should generate correct goals for period-total', () => {
      const input: GoalBuilderInput = {
        ...baseInput,
        period: 'week',
        targetType: 'period-total',
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

    it('should generate correct goals for alltime-total', () => {
      const input: GoalBuilderInput = {
        ...baseInput,
        period: 'week',
        targetType: 'alltime-total',
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
    it('should generate correct goals for period-total', () => {
      const input: GoalBuilderInput = {
        ...baseInput,
        period: 'month',
        targetType: 'period-total',
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

    it('should generate correct goals for alltime-total', () => {
      const input: GoalBuilderInput = {
        ...baseInput,
        period: 'month',
        targetType: 'alltime-total',
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
        targetType: 'alltime-total',
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
        targetType: 'alltime-target',
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
        targetType: 'alltime-total',
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
        targetType: 'period-total',
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
        targetType: 'period-total',
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
        targetType: 'period-total',
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
        targetType: 'period-total',
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
        targetType: 'period-total',
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
        targetType: 'period-total',
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
        targetType: 'period-total',
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
    it('handles period-change value type', () => {
      const input: GoalBuilderInput = {
        datasetId: 'test',
        tracking: 'trend',
        valence: 'positive',
        period: 'day',
        value: 10,
        targetType: 'period-change',
        activePeriods: 5,
        startingValue: 100,
        targetDays: 90,
      };

      const result = calculateBaselines(input);

      expect(result.dayTarget).toBe(10);
      expect(result.weekTarget).toBe(50);
    });

    it('handles period-total value type', () => {
      const input: GoalBuilderInput = {
        datasetId: 'test',
        tracking: 'series',
        valence: 'positive',
        period: 'week',
        value: 200,
        targetType: 'period-total',
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
        targetType: 'period-change',
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
        targetType: 'period-total',
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
        targetType: 'period-total',
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
        targetType: 'period-total',
        activePeriods: 5,
        startingValue: 0,
        targetDays: 90,
      };

      const result = calculateBaselines(input);

      expect(result.dayTarget).toBe(0.1);
      expect(Number.isFinite(result.weekTarget)).toBe(true);
    });
  });
});
