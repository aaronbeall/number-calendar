import { AchievementsGrid } from '@/features/achievements/AchievementsGrid';
import { BadgePreviews } from '@/features/achievements/BadgePreview';
import type { Goal } from '@/features/db/localdb';
import { useAllDays } from '@/features/db/useCalendarData';
import { useDataset } from '@/features/db/useDatasetData';
import { getDaysData } from '@/lib/calendar';
import { updateAchievements } from '@/lib/goals';
import { Trophy } from 'lucide-react';
import { useMemo } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';

export default function Achievements() {
  const { datasetId } = useParams();
  const { data: dataset } = useDataset(datasetId ?? '');
  const { data: allDays } = useAllDays(datasetId ?? '');
  const [searchParams] = useSearchParams();
  const isPreview = searchParams.has('badges-preview');

  const allData = useMemo(() => getDaysData(allDays ?? []), [allDays]);

  // Dummy goals for demo
  const goals: Goal[] = [
    {
      id: 'g1',
      datasetId: datasetId ?? '',
      createdAt: Date.now(),
      title: 'First Entry',
      description: 'Add your first number',
      badge: { style: 'medal', icon: 'star', color: 'gold', label: '1' },
      goal: { condition: 'above', metric: 'count', source: 'stats', value: 1 },
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
      badge: { style: 'ribbon', icon: 'calendar', color: 'blue', label: '7' },
      goal: { condition: 'above', metric: 'total', source: 'stats', value: 0 },
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
      goal: { condition: 'above', metric: 'total', source: 'stats', value: 100000 },
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
      badge: { style: 'circle', icon: 'calendar', color: 'green', label: 'M' },
      goal: { condition: 'above', metric: 'count', source: 'stats', value: 1 },
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
      badge: { style: 'border_badge', icon: 'target', color: 'blue', label: '1k' },
      goal: { condition: 'above', metric: 'total', source: 'stats', value: 1000 },
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
      badge: { style: 'border_circle', icon: 'star', color: 'purple', label: '★' },
      goal: { condition: 'above', metric: 'min', source: 'stats', value: 0 },
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
      badge: { style: 'ribbon', icon: 'trend', color: 'red', label: '10%' },
      goal: { condition: 'above', metric: 'total', source: 'percents', value: 0.1 },
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
      goal: { condition: 'above', metric: 'total', source: 'stats', value: 0 },
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
      badge: { style: 'trophy', icon: 'calendar', color: 'blue', label: '1k' },
      goal: { condition: 'above', metric: 'total', source: 'stats', value: 1000 },
      type: 'goal',
      timePeriod: 'day',
      count: 7,
      consecutive: true,
      resets: 'week',
    },
  ];
  // Compute achievement results from goals
  const achievementResults = updateAchievements({
    goals,
    achievements: [],
    data: allData,
    datasetId: datasetId ?? '',
  });

  const hasAchievements = achievementResults.length > 0;

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-8">
      <nav className="mb-4 text-xs text-slate-500 flex items-center gap-2">
        <Link to={`/dataset/${dataset?.id}`} className="hover:underline text-blue-600">{dataset?.name}</Link>
        <span className="mx-1">/</span>
        <span className="font-semibold text-slate-700 dark:text-slate-200">Achievements</span>
      </nav>
      <h2 className="text-2xl md:text-3xl font-bold mb-6 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent flex items-center gap-2">
        <Trophy className="w-7 h-7 md:w-8 md:h-8 text-yellow-400" /> Achievements
      </h2>

      {isPreview && <BadgePreviews />}

      {!hasAchievements ? (
        <div className="text-center text-slate-500 py-16">
          <p className="mb-4">No achievements yet.</p>
        </div>
      ) : (
        <AchievementsGrid results={achievementResults} />
      )}
    </div>
  );
}
