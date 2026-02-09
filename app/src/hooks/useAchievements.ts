import { useAllDays } from '@/features/db/useDayEntryData';
import { useGoals } from '@/features/db/useGoalsData';
import { getDaysMap } from '@/lib/calendar';
import { processAchievements, sortGoalResults, type AchievementResult, type GoalResults } from '@/lib/goals';
import { useEffect, useMemo, useRef } from 'react';

export type UseAchievementsResult = {
  milestones: GoalResults[];
  targets: GoalResults[];
  achievements: GoalResults[];
  all: GoalResults[];
  new: NewAchievementResult[];
  isLoading: boolean;
};

export type NewAchievementResult = AchievementResult & { goal: GoalResults['goal'] };

export function useAchievements(datasetId: string): UseAchievementsResult {
  const { data: allDays, isLoading: isDaysLoading } = useAllDays(datasetId);
  const { data: allGoals = [], isLoading: isGoalsLoading } = useGoals(datasetId);
  const previousResultsRef = useRef<GoalResults[] | null>(null);

  const allData = useMemo(() => getDaysMap(allDays ?? []), [allDays]);

  const allResults = useMemo(() => {
    if (!datasetId) return [];
    const previousAchievements = previousResultsRef.current
      ? previousResultsRef.current.flatMap(result => result.achievements)
      : [];
    return sortGoalResults(processAchievements({
      goals: allGoals,
      priorResults: previousAchievements,
      data: allData,
      datasetId,
    }));
  }, [allGoals, allData, datasetId]);

  const newResults = useMemo(() => {
    const previousResults = previousResultsRef.current;
    if (!previousResults?.length) return [];
    const previousById = new Map(
      previousResults.flatMap(result => result.achievements.map(ach => [ach.id, ach]))
    );
    return allResults.flatMap(result =>
      result.achievements
        .filter(ach => {
          if (!ach.completedAt) return false;
          const previous = previousById.get(ach.id);
          return !previous?.completedAt;
        })
        .map(ach => ({ ...ach, goal: result.goal }))
    );
  }, [allResults]);

  useEffect(() => {
    previousResultsRef.current = allResults;
  }, [allResults]);

  const milestones = useMemo(
    () => allResults.filter(result => result.goal.type === 'milestone'),
    [allResults]
  );
  const targets = useMemo(
    () => allResults.filter(result => result.goal.type === 'target'),
    [allResults]
  );
  const achievements = useMemo(
    () => allResults.filter(result => result.goal.type === 'goal'),
    [allResults]
  );

  return {
    milestones,
    targets,
    achievements,
    all: allResults,
    new: newResults,
    isLoading: isDaysLoading || isGoalsLoading,
  };
}
