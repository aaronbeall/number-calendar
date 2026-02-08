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
import { Plus, Sparkles, Target } from 'lucide-react';
import { useMemo } from 'react';
import { useParams } from 'react-router-dom';

export default function Targets() {
  const [dialogOpen, setDialogOpen] = useSearchParamState('add', false);
  const [builderOpen, setBuilderOpen] = useSearchParamState('goal-builder', false);

  const { datasetId } = useParams();
  const { data: dataset, isLoading: datasetLoading } = useDataset(datasetId ?? '');
  const { data: allDays } = useAllDays(datasetId ?? '');
  const { data: allGoals = [], isLoading: isGoalsLoading } = useGoals(datasetId ?? '');

  const allData = useMemo(() => getDaysMap(allDays ?? []), [allDays]);

  if (datasetLoading || isGoalsLoading) {
    return <LoadingState title="Loading targets" />;
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
  
  // Filter goals by type 'target'
  const targets = allGoals.filter(g => g.type === 'target');
  
  // Compute achievement results from goals
  const achievementResults = processAchievements({
    goals: targets,
    achievements: [],
    data: allData,
    datasetId: datasetId ?? '',
  });
  const unlockedTargets = achievementResults.filter(result => result.completedCount > 0).length;
  const totalCompletions = achievementResults.reduce((sum, result) => sum + result.completedCount, 0);
  const totalTargets = achievementResults.length;
  const hasTargets = targets.length > 0;
  const headerActions = hasTargets
    ? [
        { label: 'Add Target', onClick: () => setDialogOpen(true), icon: Plus },
        { label: 'Goal Builder', onClick: () => setBuilderOpen(true), variant: 'secondary' as const, icon: Sparkles, iconOnly: true, tooltip: 'Goal Builder' },
      ]
    : [];

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-8">
      <PageHeader
        title="Targets"
        description="Set focused goals for specific time periods and stay on track."
        backTo={`/dataset/${dataset?.id ?? datasetId ?? ''}`}
        icon={Target}
        variant="targets"
        actions={headerActions}
        completedSummary={{
          unlocked: unlockedTargets,
          completions: totalCompletions,
          total: totalTargets,
        }}
      />
      <AchievementDialog key={`add-${dialogOpen}`} open={!!dialogOpen} onOpenChange={setDialogOpen} type="target" dataset={dataset} />
      <GoalBuilderDialog key={`builder-${builderOpen}`} open={!!builderOpen} onOpenChange={setBuilderOpen} dataset={dataset} />
      {!hasTargets ? (
        <EmptyState type="target" onAddClick={() => setDialogOpen(true)} onGoalBuilderClick={() => setBuilderOpen(true)} />
      ) : (
        <AchievementsGrid results={achievementResults} dataset={dataset} />
      )}
    </div>
  );
}
