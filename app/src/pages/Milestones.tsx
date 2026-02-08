import { PageHeader } from '@/components/PageHeader';
import { ErrorState, LoadingState } from '@/components/PageStates';
import { AchievementDialog } from '@/features/achievements/AchievementDialog';
import { AchievementsGrid } from '@/features/achievements/AchievementsGrid';
import { EmptyState } from '@/features/achievements/EmptyState';
import { GoalBuilderDialog } from '@/features/achievements/GoalBuilderDialog';
import { useAllDays } from '@/features/db/useCalendarData';
import { useDataset } from '@/features/db/useDatasetData';
import { useGoals } from '@/features/db/useGoalsData';
import { useSearchParamState } from '@/hooks/useSearchParamState';
import { getDaysMap } from '@/lib/calendar';
import { processAchievements } from '@/lib/goals';
import { Flag, Plus, Sparkles } from 'lucide-react';
import { useMemo } from 'react';
import { useParams } from 'react-router-dom';

export default function Milestones() {
  const [dialogOpen, setDialogOpen] = useSearchParamState('add', false);
  const [builderOpen, setBuilderOpen] = useSearchParamState('goal-builder', false);
  const { datasetId } = useParams();
  const { data: dataset, isLoading: datasetLoading } = useDataset(datasetId ?? '');
  const { data: allDays } = useAllDays(datasetId ?? '');
  const { data: allGoals = [], isLoading: isGoalsLoading } = useGoals(datasetId ?? '');

  const allData = useMemo(() => getDaysMap(allDays ?? []), [allDays]);

  if (datasetLoading || isGoalsLoading) {
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
  
  // Filter goals by type 'milestone'
  const milestones = allGoals.filter(g => g.type === 'milestone');
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
      <AchievementDialog key={`add-${dialogOpen}`} open={!!dialogOpen} onOpenChange={setDialogOpen} type="milestone" dataset={dataset} />
      <GoalBuilderDialog key={`builder-${builderOpen}`} open={!!builderOpen} onOpenChange={setBuilderOpen} dataset={dataset} />
      {!hasMilestones ? (
        <EmptyState type="milestone" onAddClick={() => setDialogOpen(true)} onGoalBuilderClick={() => setBuilderOpen(true)} />
      ) : (
        <AchievementsGrid results={achievementResults} dataset={dataset} />
      )}
    </div>
  );
}
