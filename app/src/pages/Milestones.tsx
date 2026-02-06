import { PageHeader } from '@/components/PageHeader';
import { ErrorState, LoadingState } from '@/components/PageStates';
import { AchievementDialog } from '@/features/achievements/AchievementDialog';
import { AchievementsGrid } from '@/features/achievements/AchievementsGrid';
import { EmptyState } from '@/features/achievements/EmptyState';
import { GoalBuilderDialog } from '@/features/achievements/GoalBuilderDialog';
import type { Goal } from '@/features/db/localdb';
import { useAllDays } from '@/features/db/useCalendarData';
import { useDataset } from '@/features/db/useDatasetData';
import { useGoals } from '@/features/db/useGoalsData';
import { getDaysMap } from '@/lib/calendar';
import { processAchievements } from '@/lib/goals';
import { Flag, Plus, Sparkles } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';

export default function Milestones() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [builderOpen, setBuilderOpen] = useState(false);
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
    return <LoadingState title="Loading milestones" />;
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

  // Dummy milestones (only in preview mode)
  const demoMilestones: Goal[] = isPreview ? [
    {
      id: 'm1',
      datasetId: datasetId ?? '',
      createdAt: Date.now(),
      title: 'First 10k',
      description: 'Reach 10,000 total',
      badge: { style: 'medal', icon: 'star', color: 'gold', label: '10k' },
      target: { condition: 'above', metric: 'total', source: 'stats', value: 10000 },
      type: 'milestone',
      timePeriod: 'anytime',
      count: 1,
    },
    {
      id: 'm2',
      datasetId: datasetId ?? '',
      createdAt: Date.now(),
      title: 'First 50k',
      description: 'Reach 50,000 total',
      badge: { style: 'trophy', icon: 'trophy', color: 'amethyst', label: '50k' },
      target: { condition: 'above', metric: 'total', source: 'stats', value: 50000 },
      type: 'milestone',
      timePeriod: 'anytime',
      count: 1,
    },
  ] : [];
  
  // Filter goals by type 'milestone', combine demo and real data
  const milestones = isPreview ? demoMilestones : (allGoals.filter(g => g.type === 'milestone') as Goal[]);
  const hasMilestones = milestones.length > 0;
  const headerActions = hasMilestones
    ? [
        { label: 'Add Milestone', onClick: () => setDialogOpen(true), icon: Plus },
        { label: 'Goal Builder', onClick: () => setBuilderOpen(true), variant: 'secondary' as const, icon: Sparkles, iconOnly: true, tooltip: 'Goal Builder' },
      ]
    : [];

  // Compute achievement results from goals
  const achievementResults = processAchievements({
    goals: milestones,
    achievements: [],
    data: allData,
    datasetId: datasetId ?? '',
  });
  const unlockedMilestones = achievementResults.filter(result => result.completedCount > 0).length;
  const totalCompletions = achievementResults.reduce((sum, result) => sum + result.completedCount, 0);
  const totalMilestones = achievementResults.length;

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-8">
      <PageHeader
        title="Milestones"
        description="Celebrate major achievements and long-term progress."
        backTo={`/dataset/${dataset?.id ?? datasetId ?? ''}`}
        icon={Flag}
        variant="milestones"
        actions={headerActions}
        completedSummary={{
          unlocked: unlockedMilestones,
          completions: totalCompletions,
          total: totalMilestones,
        }}
      />
      <AchievementDialog key={`add-${dialogOpen}`} open={dialogOpen} onOpenChange={setDialogOpen} type="milestone" dataset={dataset} />
      <GoalBuilderDialog key={`builder-${builderOpen}`} open={builderOpen} onOpenChange={setBuilderOpen} dataset={dataset} onComplete={handleBuilderComplete} />
      {!hasMilestones ? (
        <EmptyState type="milestone" onAddClick={() => setDialogOpen(true)} onGoalBuilderClick={() => setBuilderOpen(true)} />
      ) : (
        <AchievementsGrid results={achievementResults} dataset={dataset} />
      )}
    </div>
  );
}
