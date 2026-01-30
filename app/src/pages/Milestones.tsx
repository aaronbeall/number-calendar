import { AchievementDialog } from '@/features/achievements/AchievementDialog';
import { AchievementsGrid } from '@/features/achievements/AchievementsGrid';
import type { Goal } from '@/features/db/localdb';
import { useAllDays } from '@/features/db/useCalendarData';
import { useDataset } from '@/features/db/useDatasetData';
import { useGoals } from '@/features/db/useGoalsData';
import { getDaysMap } from '@/lib/calendar';
import { processAchievements } from '@/lib/goals';
import { Flag } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';

export default function Milestones() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { datasetId } = useParams();
  const { data: dataset } = useDataset(datasetId ?? '');
  const { data: allDays } = useAllDays(datasetId ?? '');
  const { data: allGoals = [] } = useGoals(datasetId ?? '');
  const [searchParams] = useSearchParams();
  const isPreview = searchParams.has('preview');

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
      badge: { style: 'trophy', icon: 'trophy', color: 'purple', label: '50k' },
      target: { condition: 'above', metric: 'total', source: 'stats', value: 50000 },
      type: 'milestone',
      timePeriod: 'anytime',
      count: 1,
    },
  ] : [];
  
  // Filter goals by type 'milestone', combine demo and real data
  const milestones = isPreview ? demoMilestones : (allGoals.filter(g => g.type === 'milestone') as Goal[]);
  const hasMilestones = milestones.length > 0;

  // Compute achievement results from goals
  const achievementResults = processAchievements({
    goals: milestones,
    achievements: [],
    data: allData,
    datasetId: datasetId ?? '',
  });

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-8">
      <nav className="mb-4 text-xs text-slate-500 flex items-center gap-2">
        <Link to={`/dataset/${dataset?.id}`} className="hover:underline text-blue-600">{dataset?.name}</Link>
        <span className="mx-1">/</span>
        <span className="font-semibold text-slate-700 dark:text-slate-200">Milestones</span>
      </nav>
      <h2 className="text-2xl md:text-3xl font-bold mb-6 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent flex items-center gap-2">
        <Flag className="w-7 h-7 md:w-8 md:h-8 text-blue-400" /> Milestones
      </h2>
      <div className="mb-6 flex justify-end">
        <button className="px-4 py-2 rounded bg-blue-600 text-white font-semibold hover:bg-blue-700" onClick={() => setDialogOpen(true)}>
          Add Milestone
        </button>
      </div>
      { dataset && <AchievementDialog key={`${dialogOpen}`} open={dialogOpen} onOpenChange={setDialogOpen} type="milestone" dataset={dataset} /> }
      {!hasMilestones ? (
        <div className="text-center text-slate-500 py-16">
          <p className="mb-4">No milestones yet.</p>
          <button className="px-4 py-2 rounded bg-blue-600 text-white font-semibold hover:bg-blue-700" onClick={() => setDialogOpen(true)}>
            Create your first milestone
          </button>
        </div>
      ) : (
        <AchievementsGrid results={achievementResults} />
      )}
    </div>
  );
}
