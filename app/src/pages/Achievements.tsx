import { PageHeader } from '@/components/PageHeader';
import { ErrorState, LoadingState } from '@/components/PageStates';
import { AchievementDialog } from '@/features/achievements/AchievementDialog';
import { AchievementsGrid } from '@/features/achievements/AchievementsGrid';
import { BadgePreviews } from '@/features/achievements/BadgePreview';
import { EmptyState } from '@/features/achievements/EmptyState';
import { GoalBuilderDialog } from '@/features/achievements/GoalBuilderDialog';
import type { Goal } from '@/features/db/localdb';
import { useAllDays } from '@/features/db/useCalendarData';
import { useDataset } from '@/features/db/useDatasetData';
import { useGoals } from '@/features/db/useGoalsData';
import { useSearchParamState } from '@/hooks/useSearchParamState';
import { getDaysMap } from '@/lib/calendar';
import { processAchievements } from '@/lib/goals';
import { Plus, Sparkles, Trophy } from 'lucide-react';
import { useMemo } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';

export default function Achievements() {
  const [dialogOpen, setDialogOpen] = useSearchParamState('add', false);
  const [builderOpen, setBuilderOpen] = useSearchParamState('goal-builder', false);
  const { datasetId } = useParams();
  const { data: dataset, isLoading: datasetLoading } = useDataset(datasetId ?? '');
  const { data: allDays } = useAllDays(datasetId ?? '');
  const { data: allGoals = [], refetch: refetchGoals } = useGoals(datasetId ?? '');
  const [searchParams] = useSearchParams();
  const isPreview = searchParams.has('preview');

  const handleBuilderComplete = () => {
    refetchGoals();
  };

  if (datasetLoading) {
    return <LoadingState title="Loading achievements" />;
  }

  if (!dataset) {
    return (
      <ErrorState
        title="Dataset not found"
        message="This dataset could not be loaded. It may have been removed or the link is outdated."
        details={datasetId ? `Requested dataset id: ${datasetId}` : undefined}
        actions={[
          { label: 'Back to home', to: '/' },
        ]}
      />
    );
  }

  const allData = useMemo(() => getDaysMap(allDays ?? []), [allDays]);

  // Dummy goals for demo (only in preview mode)
  const demoGoals: Goal[] = isPreview ? [
    {
      id: 'g1',
      datasetId: datasetId ?? '',
      createdAt: Date.now(),
      title: 'First Entry',
      description: 'Add your first number',
      badge: { style: 'medal', icon: 'star', color: 'gold', label: '1' },
      target: { condition: 'above', metric: 'count', source: 'stats', value: 1 },
      type: 'goal',
      timePeriod: 'anytime',
      count: 1,
    },
    {
      id: 'g2',
      datasetId: datasetId ?? '',
      createdAt: Date.now(),
      title: '7-Day Streak',
      description: 'Positive numbers for 7 days in a row',
      badge: { style: 'ribbon', icon: 'calendar', color: 'sapphire', label: '7' },
      target: { condition: 'above', metric: 'total', source: 'stats', value: 0 },
      type: 'goal',
      timePeriod: 'day',
      count: 7,
      consecutive: true,
    },
    {
      id: 'g3',
      datasetId: datasetId ?? '',
      createdAt: Date.now(),
      title: '100k Total',
      description: 'Reach 100,000 total',
      badge: { style: 'trophy', icon: 'trophy', color: 'gold', label: '100k' },
      target: { condition: 'above', metric: 'total', source: 'stats', value: 100000 },
      type: 'milestone',
      timePeriod: 'anytime',
      count: 1,
    },
    // Additional demo goals from examples
    {
      id: 'g4',
      datasetId: datasetId ?? '',
      createdAt: Date.now(),
      title: 'Active Month',
      description: 'Add a number any day this month',
      badge: { style: 'circle', icon: 'calendar', color: 'emerald', label: 'M' },
      target: { condition: 'above', metric: 'count', source: 'stats', value: 1 },
      type: 'goal',
      timePeriod: 'month',
      count: 1,
    },
    {
      id: 'g5',
      datasetId: datasetId ?? '',
      createdAt: Date.now(),
      title: '1k Monthly Target',
      description: 'Reach 1,000 in a month',
      badge: { style: 'border_badge', icon: 'target', color: 'sapphire', label: '1k' },
      target: { condition: 'above', metric: 'total', source: 'stats', value: 1000 },
      type: 'target',
      timePeriod: 'month',
      count: 1,
    },
    {
      id: 'g6',
      datasetId: datasetId ?? '',
      createdAt: Date.now(),
      title: 'Perfect Month',
      description: 'No zero days in a month',
      badge: { style: 'border_circle', icon: 'star', color: 'amethyst', label: '★' },
      target: { condition: 'above', metric: 'min', source: 'stats', value: 0 },
      type: 'goal',
      timePeriod: 'month',
      count: 1,
    },
    {
      id: 'g7',
      datasetId: datasetId ?? '',
      createdAt: Date.now(),
      title: '10% Weekly Target',
      description: 'Increase by 10% in a week',
      badge: { style: 'ribbon', icon: 'trend', color: 'ruby', label: '10%' },
      target: { condition: 'above', metric: 'total', source: 'percents', value: 10 },
      type: 'target',
      timePeriod: 'week',
      count: 1,
    },
    {
      id: 'g8',
      datasetId: datasetId ?? '',
      createdAt: Date.now(),
      title: '100 Positive Days',
      description: 'Log a positive number on 100 days',
      badge: { style: 'circle', icon: 'star', color: 'gold', label: '100' },
      target: { condition: 'above', metric: 'total', source: 'stats', value: 0 },
      type: 'goal',
      timePeriod: 'day',
      count: 100,
    },
    {
      id: 'g9',
      datasetId: datasetId ?? '',
      createdAt: Date.now(),
      title: '1k a Day Week',
      description: 'Log at least 1,000 each day for a week',
      badge: { style: 'trophy', icon: 'calendar', color: 'sapphire', label: '1k' },
      target: { condition: 'above', metric: 'total', source: 'stats', value: 1000 },
      type: 'goal',
      timePeriod: 'day',
      count: 7,
      consecutive: true
    },
    {
      id: 'g10',
      datasetId: datasetId ?? '',
      createdAt: Date.now(),
      title: '100% Daily Growth',
      description: 'Increase by 1%',
      badge: { style: 'border_badge', icon: 'trend', color: 'emerald', label: '100%' },
      target: { condition: 'above', metric: 'total', source: 'percents', value: 1 },
      type: 'goal',
      timePeriod: 'day',
      count: 1,
    }
  ] : [];
  
  // Filter goals by type 'goal', combine demo and real data
  const goals = isPreview ? demoGoals : (allGoals.filter(g => g.type === 'goal') as Goal[]);
  
  // Compute achievement results from goals
  const achievementResults = processAchievements({
    goals,
    achievements: [],
    data: allData,
    datasetId: datasetId ?? '',
  });

  const unlockedGoals = achievementResults.filter(result => result.completedCount > 0).length;
  const totalCompletions = achievementResults.reduce((sum, result) => sum + result.completedCount, 0);
  const totalGoals = achievementResults.length;

  const hasAchievements = achievementResults.length > 0;
  const headerActions = hasAchievements
    ? [
        { label: 'Add Achievement', onClick: () => setDialogOpen(true), icon: Plus },
        { label: 'Goal Builder', onClick: () => setBuilderOpen(true), variant: 'secondary' as const, icon: Sparkles, iconOnly: true, tooltip: 'Goal Builder' },
      ]
    : [];

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-8">
      <PageHeader
        title="Achievements"
        description="Create goals to track your progress and celebrate wins."
        backTo={`/dataset/${dataset?.id ?? datasetId ?? ''}`}
        icon={Trophy}
        variant="achievements"
        actions={headerActions}
        completedSummary={{
          unlocked: unlockedGoals,
          completions: totalCompletions,
          total: totalGoals,
        }}
      />
      <AchievementDialog key={`add-${dialogOpen}`} open={!!dialogOpen} onOpenChange={setDialogOpen} type="goal" dataset={dataset} />
      <GoalBuilderDialog key={`builder-${builderOpen}`} open={!!builderOpen} onOpenChange={setBuilderOpen} dataset={dataset} onComplete={handleBuilderComplete} />

      {isPreview && <BadgePreviews />}

      {!hasAchievements ? (
        <EmptyState type="goal" onAddClick={() => setDialogOpen(true)} onGoalBuilderClick={() => setBuilderOpen(true)} />
      ) : (
        <AchievementsGrid results={achievementResults} dataset={dataset} />
      )}
    </div>
  );
}
