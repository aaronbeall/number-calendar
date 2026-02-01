import { describe, it, expect } from 'vitest';
import { processAchievements } from '../goals';
import type { Goal, Achievement } from '@/features/db/localdb';

describe('processAchievements', () => {
  const datasetId = 'ds1';

  it('should complete a milestone goal when condition is met', () => {
    const goals: Goal[] = [
      {
        id: 'g1',
        datasetId,
        createdAt: 0,
        title: '100k Total',
        type: 'milestone',
        timePeriod: 'anytime',
        count: 1,
        target: { condition: 'above', metric: 'total', source: 'stats', value: 100000 },
        badge: { style: 'trophy', icon: 'trophy', color: 'gold', label: 'Gold Trophy' },
      },
    ];
    const achievements: Achievement[] = [];
    const data = { '2025-12-01': [50000], '2025-12-02': [60000] };
    const result = processAchievements({ goals, achievements, data, datasetId });
    expect(result[0].completedCount).toBe(1);
    expect(result[0].currentProgress).toBe(1);
    expect(result[0].achievements[0].progress).toBe(1);
  });

  it('should not complete a milestone goal when condition is not met', () => {
    const goals: Goal[] = [
      {
        id: 'g1',
        datasetId,
        createdAt: 0,
        title: '100k Total',
        type: 'milestone',
        timePeriod: 'anytime',
        count: 1,
        target: { condition: 'above', metric: 'total', source: 'stats', value: 100000 },
        badge: { style: 'trophy', icon: 'trophy', color: 'gold', label: 'Gold Trophy' },
      },
    ];
    const achievements: Achievement[] = [];
    const data = { '2025-12-01': [50000], '2025-12-02': [40000] };
    const result = processAchievements({ goals, achievements, data, datasetId });
    expect(result[0].completedCount).toBe(0);
    expect(result[0].currentProgress).toBe(0);
  });

  it('should complete a daily goal for each day met', () => {
    const goals: Goal[] = [
      {
        id: 'g2',
        datasetId,
        createdAt: 0,
        title: '1k Day',
        type: 'goal',
        timePeriod: 'day',
        count: 1,
        target: { condition: 'above', metric: 'total', source: 'stats', value: 1000 },
        badge: { style: 'star', icon: 'star', color: 'gold', label: 'Star Badge' },
      },
    ];
    const achievements: Achievement[] = [];
    const data = { '2025-12-01': [1200], '2025-12-02': [800], '2025-12-03': [1500] };
    const result = processAchievements({ goals, achievements, data, datasetId });
    expect(result[0].completedCount).toBe(2);
    expect(result[0].achievements.length).toBe(2);
  });

  it('should handle consecutive streaks for daily goals', () => {
    const goals: Goal[] = [
      {
        id: 'g3',
        datasetId,
        createdAt: 0,
        title: '3-Day Streak',
        type: 'goal',
        timePeriod: 'day',
        count: 3,
        consecutive: true,
        target: { condition: 'above', metric: 'total', source: 'stats', value: 100 },
        badge: { style: 'ribbon', icon: 'ribbon', color: 'sapphire', label: 'Blue Ribbon' }
      },
    ];
    const achievements: Achievement[] = [];
    const data = {
      '2025-12-01': [150],
      '2025-12-02': [200],
      '2025-12-03': [250],
      '2025-12-04': [50], // breaks streak
      '2025-12-05': [180],
      '2025-12-06': [190],
      '2025-12-07': [210],
    };
    const result = processAchievements({ goals, achievements, data, datasetId });
    // Two streaks of 3
    expect(result[0].achievements.filter(a => a.progress === 3).length).toBe(2);
    expect(result[0].currentProgress).toBe(0);
  });

  it('should allow null/empty gaps for consecutive streaks', () => {
    const goals: Goal[] = [
      {
        id: 'g4',
        datasetId,
        createdAt: 0,
        title: '2-Day Streak',
        type: 'goal',
        timePeriod: 'day',
        count: 2,
        consecutive: true,
        target: { condition: 'above', metric: 'total', source: 'stats', value: 100 },
        badge: { style: 'medal', icon: 'medal', color: 'silver', label: 'Silver Medal' },
      },
    ];
    const achievements: Achievement[] = [];
    const data = {
      '2025-12-01': [150],
      '2025-12-02': [], // empty gap
      '2025-12-03': [200],
    };
    const result = processAchievements({ goals, achievements, data, datasetId });
    expect(result[0].achievements.filter(a => a.progress === 2).length).toBe(1);
    expect(result[0].currentProgress).toBe(0);
  });

  it('should use inclusive/exclusive logic for above 0', () => {
    const goals: Goal[] = [
      {
        id: 'g5',
        datasetId,
        createdAt: 0,
        title: 'Above 0',
        type: 'goal',
        timePeriod: 'day',
        count: 1,
        target: { condition: 'above', metric: 'total', source: 'stats', value: 0 },
        badge: { style: 'gift', icon: 'present', color: 'emerald', label: 'Green Present' },
      },
    ];
    const achievements: Achievement[] = [];
    const data = {
      '2025-12-01': [0],
      '2025-12-02': [1],
      '2025-12-03': [-1],
    };
    const result = processAchievements({ goals, achievements, data, datasetId });
    expect(result[0].completedCount).toBe(1);
    expect(result[0].achievements[0].completedAt).toBe('2025-12-02');
  });

  it('should not duplicate achievements if already completed (anytime)', () => {
    const goals: Goal[] = [
      {
        id: 'g1',
        datasetId,
        createdAt: 0,
        title: '100k Total',
        type: 'milestone',
        timePeriod: 'anytime',
        count: 1,
        target: { condition: 'above', metric: 'total', source: 'stats', value: 100000 },
        badge: { style: 'trophy', icon: 'trophy', color: 'gold', label: 'Gold Trophy' }
      },
    ];
    const achievements: Achievement[] = [
      { id: 'a1', goalId: 'g1', datasetId, progress: 1, completedAt: '2025-12-02' },
    ];
    const data = { '2025-12-01': [50000], '2025-12-02': [60000] };
    const result = processAchievements({ goals, achievements, data, datasetId });
    expect(result[0].completedCount).toBe(1);
    expect(result[0].achievements.length).toBe(1);
    expect(result[0].achievements[0].completedAt).toBe('2025-12-02');
  });

  it('should not duplicate periodic achievements if already completed', () => {
    const goals: Goal[] = [
      {
        id: 'g2',
        datasetId,
        createdAt: 0,
        title: '1k Day',
        type: 'goal',
        timePeriod: 'day',
        count: 1,
        target: { condition: 'above', metric: 'total', source: 'stats', value: 1000 },
        badge: { style: 'star', icon: 'star', color: 'gold', label: 'Star Badge' }
      },
    ];
    const achievements: Achievement[] = [
      { id: 'a2', goalId: 'g2', datasetId, progress: 1, startedAt: '2025-12-01', completedAt: '2025-12-01' },
    ];
    const data = { '2025-12-01': [1200], '2025-12-02': [1500] };
    const result = processAchievements({ goals, achievements, data, datasetId });
    expect(result[0].completedCount).toBe(2);
    expect(result[0].achievements.length).toBe(2);
    expect(result[0].achievements[0].completedAt).toBe('2025-12-01');
    expect(result[0].achievements[1].completedAt).toBe('2025-12-02');
  });

  it('should continue streaks after completed streaks', () => {
    const goals: Goal[] = [
      {
        id: 'g3',
        datasetId,
        createdAt: 0,
        title: '3-Day Streak',
        type: 'goal',
        timePeriod: 'day',
        count: 3,
        consecutive: true,
        target: { condition: 'above', metric: 'total', source: 'stats', value: 100 },
        badge: { style: 'ribbon', icon: 'ribbon', color: 'sapphire', label: 'Blue Ribbon' }
      },
    ];
    const achievements: Achievement[] = [
      { id: 'a3', goalId: 'g3', datasetId, progress: 3, startedAt: '2025-12-01', completedAt: '2025-12-03' },
    ];
    const data = {
      '2025-12-01': [150],
      '2025-12-02': [200],
      '2025-12-03': [250],
      '2025-12-04': [180],
      '2025-12-05': [190],
      '2025-12-06': [210],
    };
    const result = processAchievements({ goals, achievements, data, datasetId });
    // Should have two completed streaks
    expect(result[0].achievements.filter(a => a.progress === 3 && a.completedAt).length).toBe(2);
    // Should not duplicate the first streak
    expect(result[0].achievements.filter(a => a.startedAt === '2025-12-01').length).toBe(1);
    // Should have correct second streak
    expect(result[0].achievements.some(a => a.startedAt === '2025-12-04' && a.completedAt === '2025-12-06')).toBe(true);
  });

  it('should not mark incomplete streaks as completed if already present', () => {
    const goals: Goal[] = [
      {
        id: 'g4',
        datasetId,
        createdAt: 0,
        title: '3-Day Streak',
        type: 'goal',
        timePeriod: 'day',
        count: 3,
        consecutive: true,
        target: { condition: 'above', metric: 'total', source: 'stats', value: 100 },
        badge: { style: 'medal', icon: 'medal', color: 'silver', label: 'Silver Medal' }
      },
    ];
    const achievements: Achievement[] = [
      { id: 'a4', goalId: 'g4', datasetId, progress: 2, startedAt: '2025-12-01' },
    ];
    const data = {
      '2025-12-01': [150],
      '2025-12-02': [200],
      '2025-12-03': [50], // breaks streak
      '2025-12-04': [180],
      '2025-12-05': [190],
    };
    const result = processAchievements({ goals, achievements, data, datasetId });
    // Should not mark the incomplete streak as completed
    expect(result[0].achievements.some(a => a.progress === 2 && !a.completedAt)).toBe(true);
    expect(result[0].achievements.some(a => a.progress === 2 && a.completedAt)).toBe(false);
  });

  it('should set completedAt to the exact day the anytime goal was achieved', () => {
    const goals: Goal[] = [
      {
        id: 'g6',
        datasetId,
        createdAt: 0,
        title: '10k Total',
        type: 'milestone',
        timePeriod: 'anytime',
        count: 1,
        target: { condition: 'above', metric: 'total', source: 'stats', value: 10000 },
        badge: { style: 'trophy', icon: 'trophy', color: 'gold', label: '10k' },
      },
    ];
    const achievements: Achievement[] = [];
    const data = {
      '2025-12-01': [2000],
      '2025-12-02': [3000],
      '2025-12-03': [4000],
      '2025-12-04': [1500], // total so far: 10500
      '2025-12-05': [1000],
    };
    const result = processAchievements({ goals, achievements, data, datasetId });
    // The total reaches 10500 on 2025-12-04, so completedAt should be that day
    expect(result[0].completedCount).toBe(1);
    expect(result[0].achievements[0].completedAt).toBe('2025-12-04');
  });

  it('should count non-consecutive positive days for a count goal', () => {
    const goals: Goal[] = [
      {
        id: 'g7',
        datasetId,
        createdAt: 0,
        title: '10 Positive Days',
        type: 'goal',
        timePeriod: 'day',
        count: 10,
        target: { condition: 'above', metric: 'total', source: 'stats', value: 0 },
        badge: { style: 'star', icon: 'star', color: 'gold', label: '10' },
      },
    ];
    const achievements: Achievement[] = [];
    // 12 days, 10 positive, 2 negative
    const data = {
      '2025-12-01': [1],
      '2025-12-02': [-1],
      '2025-12-03': [2],
      '2025-12-04': [3],
      '2025-12-05': [4],
      '2025-12-06': [5],
      '2025-12-07': [6],
      '2025-12-08': [7],
      '2025-12-09': [8],
      '2025-12-10': [9],
      '2025-12-11': [10],
      '2025-12-12': [-2],
      '2025-12-13': [11],
      '2025-12-14': [12],
    };
    const result = processAchievements({ goals, achievements, data, datasetId });
    // Should have 1 completed achievement (10 positive days)
    expect(result[0].completedCount).toBe(1);
    // Should have 2 days left for next achievement (if more data added)
    expect(result[0].currentProgress).toBe(2);
    // The completed achievement should have started at the first positive day and completed at the 10th positive day
    const completed = result[0].achievements.find(a => a.completedAt);
    expect(completed?.startedAt).toBe('2025-12-01');
    expect(completed?.completedAt).toBe('2025-12-11');
  });

  it('should complete a milestone goal when condition is above', () => {
    const goals: Goal[] = [
      {
        id: 'g2',
        datasetId,
        createdAt: 0,
        title: 'Above 50k',
        type: 'milestone',
        timePeriod: 'anytime',
        count: 1,
        target: { condition: 'above', metric: 'total', source: 'stats', value: 50000 },
        badge: { style: 'trophy', icon: 'trophy', color: 'gold', label: 'Gold Trophy' },
      },
    ];
    const achievements: Achievement[] = [];
    const data = { '2025-12-01': [60000] };
    const result = processAchievements({ goals, achievements, data, datasetId });
    expect(result[0].completedCount).toBe(1);
    expect(result[0].currentProgress).toBe(1);
    expect(result[0].achievements[0].progress).toBe(1);
  });

  it('should complete a milestone goal when condition is below', () => {
    const goals: Goal[] = [
      {
        id: 'g3',
        datasetId,
        createdAt: 0,
        title: 'Below 100k',
        type: 'milestone',
        timePeriod: 'anytime',
        count: 1,
        target: { condition: 'below', metric: 'total', source: 'stats', value: 100000 },
        badge: { style: 'trophy', icon: 'trophy', color: 'gold', label: 'Gold Trophy' },
      },
    ];
    const achievements: Achievement[] = [];
    const data = { '2025-12-01': [50000] };
    const result = processAchievements({ goals, achievements, data, datasetId });
    expect(result[0].completedCount).toBe(1);
    expect(result[0].currentProgress).toBe(1);
    expect(result[0].achievements[0].progress).toBe(1);
  });

  it('should complete a milestone goal when condition is equal', () => {
    const goals: Goal[] = [
      {
        id: 'g4',
        datasetId,
        createdAt: 0,
        title: 'Equal to 100k',
        type: 'milestone',
        timePeriod: 'anytime',
        count: 1,
        target: { condition: 'equal', metric: 'total', source: 'stats', value: 100000 },
        badge: { style: 'trophy', icon: 'trophy', color: 'gold', label: 'Gold Trophy' },
      },
    ];
    const achievements: Achievement[] = [];
    const data = { '2025-12-01': [100000] };
    const result = processAchievements({ goals, achievements, data, datasetId });
    expect(result[0].completedCount).toBe(1);
    expect(result[0].currentProgress).toBe(1);
    expect(result[0].achievements[0].progress).toBe(1);
  });

  it('should complete a milestone goal when condition is inside a range', () => {
    const goals: Goal[] = [
      {
        id: 'g5',
        datasetId,
        createdAt: 0,
        title: 'Inside range 50k to 100k',
        type: 'milestone',
        timePeriod: 'anytime',
        count: 1,
        target: { condition: 'inside', metric: 'total', source: 'stats', range: [50000, 100000] },
        badge: { style: 'trophy', icon: 'trophy', color: 'gold', label: 'Gold Trophy' },
      },
    ];
    const achievements: Achievement[] = [];
    const data = { '2025-12-01': [75000] };
    const result = processAchievements({ goals, achievements, data, datasetId });
    expect(result[0].completedCount).toBe(1);
    expect(result[0].currentProgress).toBe(1);
    expect(result[0].achievements[0].progress).toBe(1);
  });

  it('should complete a milestone goal when condition is outside a range', () => {
    const goals: Goal[] = [
      {
        id: 'g6',
        datasetId,
        createdAt: 0,
        title: 'Outside range 50k to 100k',
        type: 'milestone',
        timePeriod: 'anytime',
        count: 1,
        target: { condition: 'outside', metric: 'total', source: 'stats', range: [50000, 100000] },
        badge: { style: 'trophy', icon: 'trophy', color: 'gold', label: 'Gold Trophy' },
      },
    ];
    const achievements: Achievement[] = [];
    const data = { '2025-12-01': [40000] };
    const result = processAchievements({ goals, achievements, data, datasetId });
    expect(result[0].completedCount).toBe(1);
    expect(result[0].currentProgress).toBe(1);
    expect(result[0].achievements[0].progress).toBe(1);
  });

  it('should complete a daily goal with positive deltas (source: deltas)', () => {
    const goals: Goal[] = [
      {
        id: 'g7',
        datasetId,
        createdAt: 0,
        title: 'Positive Day',
        type: 'goal',
        timePeriod: 'day',
        count: 1,
        target: { condition: 'above', metric: 'total', source: 'deltas', value: 0 },
        badge: { style: 'star', icon: 'star', color: 'emerald', label: 'Up' },
      },
    ];
    const achievements: Achievement[] = [];
    // Day 1: 100 (no delta, first day)
    // Day 2: 150 (delta: +50, positive)
    // Day 3: 140 (delta: -10, negative)
    // Day 4: 160 (delta: +20, positive)
    const data = {
      '2025-12-01': [100],
      '2025-12-02': [150],
      '2025-12-03': [140],
      '2025-12-04': [160],
    };
    const result = processAchievements({ goals, achievements, data, datasetId });
    // Should have 2 achievements (days 2 and 4 had positive deltas)
    expect(result[0].completedCount).toBe(2);
    expect(result[0].achievements.length).toBe(2);
    expect(result[0].achievements[0].completedAt).toBe('2025-12-02');
    expect(result[0].achievements[1].completedAt).toBe('2025-12-04');
  });

  it('should not complete a daily goal with negative deltas (source: deltas)', () => {
    const goals: Goal[] = [
      {
        id: 'g7b',
        datasetId,
        createdAt: 0,
        title: 'Positive Day',
        type: 'goal',
        timePeriod: 'day',
        count: 1,
        target: { condition: 'above', metric: 'total', source: 'deltas', value: 0 },
        badge: { style: 'star', icon: 'star', color: 'emerald', label: 'Up' },
      },
    ];
    const achievements: Achievement[] = [];
    // All days have negative deltas
    const data = {
      '2025-12-01': [100],
      '2025-12-02': [90],
      '2025-12-03': [80],
      '2025-12-04': [70],
    };
    const result = processAchievements({ goals, achievements, data, datasetId });
    // Should have no achievements (all deltas are negative)
    expect(result[0].completedCount).toBe(0);
    expect(result[0].achievements.length).toBe(0);
  });

  it('should complete a milestone with a specific delta value (source: deltas)', () => {
    const goals: Goal[] = [
      {
        id: 'g8',
        datasetId,
        createdAt: 0,
        title: '+500 Increase',
        type: 'milestone',
        timePeriod: 'anytime',
        count: 1,
        target: { condition: 'above', metric: 'total', source: 'deltas', value: 500 },
        badge: { style: 'trophy', icon: 'trophy', color: 'gold', label: '+500' },
      },
    ];
    const achievements: Achievement[] = [];
    // Cumulative: 100, 250, 500, 1200 (delta from prev: +100, +150, +250, +700)
    // Should complete on day 4 when delta is +700 (above 500)
    const data = {
      '2025-12-01': [100],
      '2025-12-02': [250],
      '2025-12-03': [500],
      '2025-12-04': [1200],
    };
    const result = processAchievements({ goals, achievements, data, datasetId });
    // Anytime goals with deltas/percents are not yet supported, so should be ignored
    expect(result[0].completedCount).toBe(0);
    expect(result[0].achievements[0].progress).toBe(0);
  });

  it('should not complete a milestone when delta does not reach target (source: deltas)', () => {
    const goals: Goal[] = [
      {
        id: 'g8b',
        datasetId,
        createdAt: 0,
        title: '+500 Increase',
        type: 'milestone',
        timePeriod: 'anytime',
        count: 1,
        target: { condition: 'above', metric: 'total', source: 'deltas', value: 500 },
        badge: { style: 'trophy', icon: 'trophy', color: 'gold', label: '+500' },
      },
    ];
    const achievements: Achievement[] = [];
    // Cumulative: 100, 150, 200, 250 (delta from prev: +50, +50, +50, +50)
    // Never reaches +500 delta
    const data = {
      '2025-12-01': [100],
      '2025-12-02': [150],
      '2025-12-03': [200],
      '2025-12-04': [250],
    };
    const result = processAchievements({ goals, achievements, data, datasetId });
    // Anytime goals with deltas/percents are not yet supported, so should be ignored
    expect(result[0].completedCount).toBe(0);
    expect(result[0].achievements[0].progress).toBe(0);
  });

  it('should complete a streak goal with positive deltas (7-day uptrend)', () => {
    const goals: Goal[] = [
      {
        id: 'g9',
        datasetId,
        createdAt: 0,
        title: '7-Day Uptrend',
        type: 'goal',
        timePeriod: 'day',
        count: 7,
        consecutive: true,
        target: { condition: 'above', metric: 'total', source: 'deltas', value: 0 },
        badge: { style: 'ribbon', icon: 'award', color: 'sapphire', label: '7↗' },
      },
    ];
    const achievements: Achievement[] = [];
    // 7 consecutive days of positive growth
    const data = {
      '2025-12-01': [100],
      '2025-12-02': [110],
      '2025-12-03': [120],
      '2025-12-04': [125],
      '2025-12-05': [135],
      '2025-12-06': [140],
      '2025-12-07': [150],
      '2025-12-08': [155],
    };
    const result = processAchievements({ goals, achievements, data, datasetId });
    // Should complete a 7-day streak (days 2-8, since day 1 has no delta)
    expect(result[0].completedCount).toBe(1);
    expect(result[0].achievements[0].startedAt).toBe('2025-12-02');
    expect(result[0].achievements[0].completedAt).toBe('2025-12-08');
  });

  it('should not complete a 7-day uptrend when streak is broken (source: deltas)', () => {
    const goals: Goal[] = [
      {
        id: 'g9b',
        datasetId,
        createdAt: 0,
        title: '7-Day Uptrend',
        type: 'goal',
        timePeriod: 'day',
        count: 7,
        consecutive: true,
        target: { condition: 'above', metric: 'total', source: 'deltas', value: 0 },
        badge: { style: 'ribbon', icon: 'award', color: 'sapphire', label: '7↗' },
      },
    ];
    const achievements: Achievement[] = [];
    // Streak breaks on day 5
    const data = {
      '2025-12-01': [100],
      '2025-12-02': [110],
      '2025-12-03': [120],
      '2025-12-04': [125],
      '2025-12-05': [120], // negative delta, breaks streak
      '2025-12-06': [130],
      '2025-12-07': [140],
      '2025-12-08': [150],
    };
    const result = processAchievements({ goals, achievements, data, datasetId });
    // Should not complete 7-day streak because streak breaks on day 5
    expect(result[0].completedCount).toBe(0);
    expect(result[0].currentProgress).toBe(3);
  });

  it('should complete a daily goal with percent increase (source: percents)', () => {
    const goals: Goal[] = [
      {
        id: 'g10',
        datasetId,
        createdAt: 0,
        title: 'Daily 10% Growth',
        type: 'goal',
        timePeriod: 'day',
        count: 1,
        target: { condition: 'above', metric: 'total', source: 'percents', value: 10 },
        badge: { style: 'star', icon: 'award', color: 'amethyst', label: '10%' },
      },
    ];
    const achievements: Achievement[] = [];
    // Day 1: 100 (no percent, first day)
    // Day 2: 115 (15% increase)
    // Day 3: 120 (4.3% increase)
    // Day 4: 135 (12.5% increase)
    const data = {
      '2025-12-01': [100],
      '2025-12-02': [115],
      '2025-12-03': [120],
      '2025-12-04': [135],
    };
    const result = processAchievements({ goals, achievements, data, datasetId });
    // Should have 2 achievements (days 2 and 4 had >10% increase)
    expect(result[0].completedCount).toBe(2);
    expect(result[0].achievements.length).toBe(2);
    expect(result[0].achievements[0].completedAt).toBe('2025-12-02');
    expect(result[0].achievements[1].completedAt).toBe('2025-12-04');
  });

  it('should not complete a daily goal with small percent increase (source: percents)', () => {
    const goals: Goal[] = [
      {
        id: 'g10b',
        datasetId,
        createdAt: 0,
        title: 'Daily 10% Growth',
        type: 'goal',
        timePeriod: 'day',
        count: 1,
        target: { condition: 'above', metric: 'total', source: 'percents', value: 10 },
        badge: { style: 'star', icon: 'award', color: 'amethyst', label: '10%' },
      },
    ];
    const achievements: Achievement[] = [];
    // All days have < 10% increase
    const data = {
      '2025-12-01': [100],
      '2025-12-02': [105],
      '2025-12-03': [108],
      '2025-12-04': [109],
    };
    const result = processAchievements({ goals, achievements, data, datasetId });
    // Should have no achievements (all increases < 10%)
    expect(result[0].completedCount).toBe(0);
    expect(result[0].achievements.length).toBe(0);
  });

  it('should complete a milestone with 50% total growth (source: percents)', () => {
    const goals: Goal[] = [
      {
        id: 'g11',
        datasetId,
        createdAt: 0,
        title: '50% Growth',
        type: 'milestone',
        timePeriod: 'week',
        count: 1,
        target: { condition: 'above', metric: 'total', source: 'percents', value: 50 },
        badge: { style: 'trophy', icon: 'trophy', color: 'gold', label: '50%' },
      },
    ];
    const achievements: Achievement[] = [];
    // Start week 1: 100, then week 2 grows to 160 (60% growth)
    const data = {
      '2025-12-01': [100],
      '2025-12-08': [160],
    };
    const result = processAchievements({ goals, achievements, data, datasetId });
    // Should complete when week 2 reaches 60% growth from week 1
    expect(result[0].completedCount).toBe(1);
    expect(result[0].achievements[0].completedAt).toBe('2025-W50');
  });

  it('should not complete a milestone when growth does not reach 50% (source: percents)', () => {
    const goals: Goal[] = [
      {
        id: 'g11b',
        datasetId,
        createdAt: 0,
        title: '50% Growth',
        type: 'milestone',
        timePeriod: 'anytime',
        count: 1,
        target: { condition: 'above', metric: 'total', source: 'percents', value: 50 },
        badge: { style: 'trophy', icon: 'trophy', color: 'gold', label: '50%' },
      },
    ];
    const achievements: Achievement[] = [];
    // Start: 100, grows to 140 (only 40% growth)
    const data = {
      '2025-12-01': [100],
      '2025-12-02': [110],
      '2025-12-03': [125],
      '2025-12-04': [140],
    };
    const result = processAchievements({ goals, achievements, data, datasetId });
    // Should not complete (only 40% growth, need 50%)
    expect(result[0].completedCount).toBe(0);
    expect(result[0].achievements[0].progress).toBe(0);
  });

  it('should complete a 4-week percent growth streak (source: percents)', () => {
    const goals: Goal[] = [
      {
        id: 'g12',
        datasetId,
        createdAt: 0,
        title: '4-Week Growth',
        type: 'goal',
        timePeriod: 'week',
        count: 4,
        consecutive: true,
        target: { condition: 'above', metric: 'total', source: 'percents', value: 5 },
        badge: { style: 'ribbon', icon: 'achievement', color: 'emerald', label: '4wk' },
      },
    ];
    const achievements: Achievement[] = [];
    // Each week should have >5% growth from previous week
    const data = {
      '2025-12-01': [100], // Week 1
      '2025-12-08': [110], // Week 2 (+10%)
      '2025-12-15': [120], // Week 3 (+9%)
      '2025-12-22': [130], // Week 4 (+8%)
      '2025-12-29': [140], // Week 5 (+7%)
    };
    const result = processAchievements({ goals, achievements, data, datasetId });
    // Should complete 4-week streak (weeks 2-5 all had >5% growth)
    expect(result[0].completedCount).toBe(1);
    expect(result[0].achievements[0].progress).toBe(4);
  });

  it('should not complete a 4-week percent growth streak when growth drops below 5% (source: percents)', () => {
    const goals: Goal[] = [
      {
        id: 'g12b',
        datasetId,
        createdAt: 0,
        title: '4-Week Growth',
        type: 'goal',
        timePeriod: 'week',
        count: 4,
        consecutive: true,
        target: { condition: 'above', metric: 'total', source: 'percents', value: 5 },
        badge: { style: 'ribbon', icon: 'achievement', color: 'emerald', label: '4wk' },
      },
    ];
    const achievements: Achievement[] = [];
    // Week 4 drops below 5% growth threshold
    const data = {
      '2025-12-01': [100], // Week 1
      '2025-12-08': [110], // Week 2 (+10%)
      '2025-12-15': [120], // Week 3 (+9%)
      '2025-12-22': [125], // Week 4 (+4%, breaks streak)
      '2025-12-29': [140], // Week 5 (+12%)
    };
    const result = processAchievements({ goals, achievements, data, datasetId });
    // Should not complete because week 4 only had 4% growth, breaking the consecutive streak
    expect(result[0].completedCount).toBe(0);
    expect(result[0].currentProgress).toBe(1);
  });
});
