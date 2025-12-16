import { describe, it, expect } from 'vitest';
import { updateAchievements } from '../goals';
import type { Goal, Achievement } from '@/features/db/localdb';

describe('updateAchievements', () => {
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
        goal: { condition: 'above', metric: 'total', source: 'stats', value: 100000 },
      },
    ];
    const achievements: Achievement[] = [];
    const data = { '2025-12-01': [50000], '2025-12-02': [60000] };
    const result = updateAchievements({ goals, achievements, data, datasetId });
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
        goal: { condition: 'above', metric: 'total', source: 'stats', value: 100000 },
      },
    ];
    const achievements: Achievement[] = [];
    const data = { '2025-12-01': [50000], '2025-12-02': [40000] };
    const result = updateAchievements({ goals, achievements, data, datasetId });
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
        goal: { condition: 'above', metric: 'total', source: 'stats', value: 1000 },
      },
    ];
    const achievements: Achievement[] = [];
    const data = { '2025-12-01': [1200], '2025-12-02': [800], '2025-12-03': [1500] };
    const result = updateAchievements({ goals, achievements, data, datasetId });
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
        goal: { condition: 'above', metric: 'total', source: 'stats', value: 100 },
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
    const result = updateAchievements({ goals, achievements, data, datasetId });
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
        goal: { condition: 'above', metric: 'total', source: 'stats', value: 100 },
      },
    ];
    const achievements: Achievement[] = [];
    const data = {
      '2025-12-01': [150],
      '2025-12-02': [], // empty gap
      '2025-12-03': [200],
    };
    const result = updateAchievements({ goals, achievements, data, datasetId });
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
        goal: { condition: 'above', metric: 'total', source: 'stats', value: 0 },
      },
    ];
    const achievements: Achievement[] = [];
    const data = {
      '2025-12-01': [0],
      '2025-12-02': [1],
      '2025-12-03': [-1],
    };
    const result = updateAchievements({ goals, achievements, data, datasetId });
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
        goal: { condition: 'above', metric: 'total', source: 'stats', value: 100000 },
      },
    ];
    const achievements: Achievement[] = [
      { goalId: 'g1', datasetId, progress: 1, completedAt: '2025-12-02' },
    ];
    const data = { '2025-12-01': [50000], '2025-12-02': [60000] };
    const result = updateAchievements({ goals, achievements, data, datasetId });
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
        goal: { condition: 'above', metric: 'total', source: 'stats', value: 1000 },
      },
    ];
    const achievements: Achievement[] = [
      { goalId: 'g2', datasetId, progress: 1, startedAt: '2025-12-01', completedAt: '2025-12-01' },
    ];
    const data = { '2025-12-01': [1200], '2025-12-02': [1500] };
    const result = updateAchievements({ goals, achievements, data, datasetId });
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
        goal: { condition: 'above', metric: 'total', source: 'stats', value: 100 },
      },
    ];
    const achievements: Achievement[] = [
      { goalId: 'g3', datasetId, progress: 3, startedAt: '2025-12-01', completedAt: '2025-12-03' },
    ];
    const data = {
      '2025-12-01': [150],
      '2025-12-02': [200],
      '2025-12-03': [250],
      '2025-12-04': [180],
      '2025-12-05': [190],
      '2025-12-06': [210],
    };
    const result = updateAchievements({ goals, achievements, data, datasetId });
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
        goal: { condition: 'above', metric: 'total', source: 'stats', value: 100 },
      },
    ];
    const achievements: Achievement[] = [
      { goalId: 'g4', datasetId, progress: 2, startedAt: '2025-12-01' },
    ];
    const data = {
      '2025-12-01': [150],
      '2025-12-02': [200],
      '2025-12-03': [50], // breaks streak
      '2025-12-04': [180],
      '2025-12-05': [190],
    };
    const result = updateAchievements({ goals, achievements, data, datasetId });
    // Should not mark the incomplete streak as completed
    expect(result[0].achievements.some(a => a.progress === 2 && !a.completedAt)).toBe(true);
    expect(result[0].achievements.some(a => a.progress === 2 && a.completedAt)).toBe(false);
  });
});
