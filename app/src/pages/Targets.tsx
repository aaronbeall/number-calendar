import { PageHeader } from '@/components/PageHeader';
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
import { Plus, Sparkles, Target } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';

export default function Targets() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [builderOpen, setBuilderOpen] = useState(false);

  const { datasetId } = useParams();
  const { data: dataset } = useDataset(datasetId ?? '');
  const { data: allDays } = useAllDays(datasetId ?? '');
  const { data: allGoals = [], refetch: refetchGoals } = useGoals(datasetId ?? '');
  const [searchParams] = useSearchParams();
  const isPreview = searchParams.has('preview');

  const handleBuilderComplete = () => {
    refetchGoals();
  };

  const allData = useMemo(() => getDaysMap(allDays ?? []), [allDays]);
  
  // Dummy targets (only in preview mode)
  const demoTargets: Goal[] = isPreview ? [
    {
      id: 't1',
      datasetId: datasetId ?? '',
      createdAt: Date.now(),
      title: 'Weekly 5k',
      description: 'Hit 5,000 in a week',
      badge: { style: 'ribbon', icon: 'target', color: 'emerald', label: '5k' },
      target: { condition: 'above', metric: 'total', source: 'stats', value: 5000 },
      type: 'target',
      timePeriod: 'week',
      count: 1,
    },
    {
      id: 't2',
      datasetId: datasetId ?? '',
      createdAt: Date.now(),
      title: 'Monthly 20k',
      description: 'Hit 20,000 in a month',
      badge: { style: 'star', icon: 'calendar', color: 'sapphire', label: '20k' },
      target: { condition: 'above', metric: 'total', source: 'stats', value: 20000 },
      type: 'target',
      timePeriod: 'month',
      count: 1,
    },
    {
      id: 't3',
      datasetId: datasetId ?? '',
      createdAt: Date.now(),
      title: 'Monthly 5k',
      description: 'Hit 5,000 in a month',
      badge: { style: 'star', icon: 'calendar', color: 'sapphire', label: '5k' },
      target: { condition: 'above', metric: 'total', source: 'stats', value: 5000 },
      type: 'target',
      timePeriod: 'month',
      count: 1,
    },
    {
      id: 't4',
      datasetId: datasetId ?? '',
      createdAt: Date.now(),
      title: 'Daily 1k',
      description: 'Hit 1,000 in a day',
      badge: { style: 'star', icon: 'calendar', color: 'sapphire', label: '1k' },
      target: { condition: 'above', metric: 'total', source: 'stats', value: 1000 },
      type: 'target',
      timePeriod: 'day',
      count: 1,
    },
    {
      id: 't5',
      datasetId: datasetId ?? '',
      createdAt: Date.now(),
      title: 'Daily 200',
      description: 'Hit 200 in a day',
      badge: { style: 'trophy', icon: 'trophy', color: 'gold', label: '200' },
      target: { condition: 'above', metric: 'total', source: 'stats', value: 200 },
      type: 'target',
      timePeriod: 'day',
      count: 1,
    }
  ] : [];
  
  // Filter goals by type 'target', combine demo and real data
  const targets = isPreview ? demoTargets : (allGoals.filter(g => g.type === 'target') as Goal[]);
  
  // Compute achievement results from goals
  const achievementResults = processAchievements({
    goals: targets,
    achievements: [],
    data: allData,
    datasetId: datasetId ?? '',
  });
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
      />
      { dataset && <AchievementDialog key={`add-${dialogOpen}`} open={dialogOpen} onOpenChange={setDialogOpen} type="target" dataset={dataset} /> }
      { dataset && <GoalBuilderDialog key={`builder-${builderOpen}`} open={builderOpen} onOpenChange={setBuilderOpen} dataset={dataset} onComplete={handleBuilderComplete} /> }
      {!hasTargets ? (
        <EmptyState type="target" onAddClick={() => setDialogOpen(true)} onGoalBuilderClick={() => setBuilderOpen(true)} />
      ) : (
        <AchievementsGrid results={achievementResults} />
      )}
    </div>
  );
}
