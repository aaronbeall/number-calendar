import { useParams, Link } from 'react-router-dom';
import { Target } from 'lucide-react';
import { useMemo, useState } from 'react';
import { AchievementDialog } from '@/features/achievements/AchievementDialog';
import { AchievementsGrid } from '@/features/achievements/AchievementsGrid';
import { useDataset } from '@/features/db/useDatasetData';
import { processAchievements } from '@/lib/goals';
import type { Achievement, Goal } from '@/features/db/localdb';
import { useAllDays } from '@/features/db/useCalendarData';
import { getDaysMap } from '@/lib/calendar';

export default function Targets() {
  const [dialogOpen, setDialogOpen] = useState(false);

  const { datasetId } = useParams();
  const { data: dataset } = useDataset(datasetId ?? '');
  const { data: allDays } = useAllDays(datasetId ?? '');

  const allData = useMemo(() => getDaysMap(allDays ?? []), [allDays]);
  
  // Dummy targets (Goal type)
  const targets: Goal[] = [
    {
      id: 't1',
      datasetId: datasetId ?? '',
      createdAt: Date.now(),
      title: 'Weekly 5k',
      description: 'Hit 5,000 in a week',
      badge: { style: 'ribbon', icon: 'target', color: 'green', label: '5k' },
      goal: { condition: 'above', metric: 'total', source: 'stats', value: 5000 },
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
      badge: { style: 'star', icon: 'calendar', color: 'blue', label: '20k' },
      goal: { condition: 'above', metric: 'total', source: 'stats', value: 20000 },
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
      badge: { style: 'star', icon: 'calendar', color: 'blue', label: '5k' },
      goal: { condition: 'above', metric: 'total', source: 'stats', value: 5000 },
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
      badge: { style: 'star', icon: 'calendar', color: 'blue', label: '1k' },
      goal: { condition: 'above', metric: 'total', source: 'stats', value: 1000 },
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
      goal: { condition: 'above', metric: 'total', source: 'stats', value: 200 },
      type: 'target',
      timePeriod: 'day',
      count: 1,
    }
  ];
  // Compute achievement results from goals
  const achievementResults = processAchievements({
    goals: targets,
    achievements: [],
    data: allData,
    datasetId: datasetId ?? '',
  });
  const hasTargets = targets.length > 0;

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-8">
      <nav className="mb-4 text-xs text-slate-500 flex items-center gap-2">
        <Link to={`/dataset/${dataset?.id}`} className="hover:underline text-blue-600">{dataset?.name}</Link>
        <span className="mx-1">/</span>
        <span className="font-semibold text-slate-700 dark:text-slate-200">Targets</span>
      </nav>
      <h2 className="text-2xl md:text-3xl font-bold mb-6 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent flex items-center gap-2">
        <Target className="w-7 h-7 md:w-8 md:h-8 text-green-400" /> Targets
      </h2>
      <div className="mb-6 flex justify-end">
        <button className="px-4 py-2 rounded bg-green-600 text-white font-semibold hover:bg-green-700" onClick={() => setDialogOpen(true)}>
          Add Target
        </button>
      </div>
      <AchievementDialog key={`${dialogOpen}`} open={dialogOpen} onOpenChange={setDialogOpen} type="target" dataset={dataset!} />
      {!hasTargets ? (
        <div className="text-center text-slate-500 py-16">
          <p className="mb-4">No targets yet.</p>
          <button className="px-4 py-2 rounded bg-green-600 text-white font-semibold hover:bg-green-700" onClick={() => setDialogOpen(true)}>
            Create your first target
          </button>
        </div>
      ) : (
        <AchievementsGrid results={achievementResults} />
      )}
    </div>
  );
}
