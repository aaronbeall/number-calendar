import { PageHeader } from '@/components/PageHeader';
import { ErrorState, LoadingState } from '@/components/PageStates';
import { AchievementDialog } from '@/features/achievements/AchievementDialog';
import { AchievementsGrid } from '@/features/achievements/AchievementsGrid';
import { BadgePreviews } from '@/features/achievements/BadgePreview';
import { EmptyState } from '@/features/achievements/EmptyState';
import { GoalBuilderDialog } from '@/features/achievements/GoalBuilderDialog';
import { useDataset } from '@/features/db/useDatasetData';
import { useAchievements } from '@/hooks/useAchievements';
import { useSearchParamState } from '@/hooks/useSearchParamState';
import { Plus, Sparkles, Trophy } from 'lucide-react';
import { useParams, useSearchParams } from 'react-router-dom';

export default function Achievements() {
  const [dialogOpen, setDialogOpen] = useSearchParamState('add', false);
  const [builderOpen, setBuilderOpen] = useSearchParamState('goal-builder', false);
  const { datasetId } = useParams();
  const { data: dataset, isLoading: datasetLoading } = useDataset(datasetId ?? '');
  const { achievements: achievementResults, isLoading: isGoalsLoading } = useAchievements(datasetId ?? '');
  const [searchParams] = useSearchParams();
  const isPreview = searchParams.has('preview');

  if (datasetLoading || isGoalsLoading) {
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
    <div className="max-w-5xl mx-auto p-4 md:p-8 overflow-hidden">
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
      <GoalBuilderDialog key={`builder-${builderOpen}`} open={!!builderOpen} onOpenChange={setBuilderOpen} dataset={dataset} />

      {isPreview && <BadgePreviews />}

      {!hasAchievements ? (
        <EmptyState type="goal" onAddClick={() => setDialogOpen(true)} onGoalBuilderClick={() => setBuilderOpen(true)} />
      ) : (
        <AchievementsGrid results={achievementResults} dataset={dataset} />
      )}
    </div>
  );
}
