import type { GoalResults } from '@/lib/goals';
import { Loader2 } from 'lucide-react';
import { Fragment } from 'react';
import { AchievementCard, type AchievementCardProps } from './AchievementCard';


interface AchievementsGridProps {
  results: GoalResults[];
  loading?: boolean;
}

export function AchievementsGrid({ results, loading }: AchievementsGridProps) {
  // Flatten to a single achievement per goal for grid (show the most relevant achievement)
  const gridItems = results.map((result): AchievementCardProps => {
    const ach = result.achievements.slice(-1)[0] ?? {};
    let firstCompletedAt = undefined;
    let lastCompletedAt = undefined;
    if (result.achievements && result.achievements.length > 0) {
      const completed = result.achievements.filter(a => a.completedAt);
      if (completed.length > 0) {
        firstCompletedAt = completed[0].completedAt;
        lastCompletedAt = completed[completed.length - 1].completedAt;
      }
    }
    return {
      id: result.goal.id,
      title: result.goal.title,
      description: result.goal.description,
      badge: result.goal.badge,
      completedAt: lastCompletedAt,
      startedAt: ach.startedAt,
      progress: ach.progress,
      goalCount: result.goal.count,
      completedCount: result.completedCount,
      locked: !ach.completedAt && !ach.startedAt && !ach.progress,
      firstCompletedAt,
      goalType: result.goal.type,
      createdAt: result.goal.createdAt,
      repeatable: result.goal.timePeriod !== 'anytime',
    };
  });

  // Grouping
  const unlocked: AchievementCardProps[] = [];
  const inProgress: AchievementCardProps[] = [];
  const locked: AchievementCardProps[] = [];
  for (const item of gridItems) {
    if (item.completedAt) unlocked.push(item);
    else if (item.startedAt || item.progress) inProgress.push(item);
    else locked.push(item);
  }
  unlocked.sort(sortAchievements);
  inProgress.sort(sortAchievements);
  locked.sort(sortAchievements);

  console.log({ results, gridItems });

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="animate-spin w-8 h-8 text-slate-400" />
      </div>
    );
  }

  if (!gridItems.length) {
    return <div className="text-center text-slate-400 py-16">No achievements yet.</div>;
  }

  return (
    <div className="space-y-8">
      {/* Completed */}
      {unlocked.length > 0 && (
        <Fragment>
          <div className="flex items-center gap-2 mb-4 mt-8">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-2">
              Completed
              <span className="inline-block px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-[10px] font-semibold align-middle border border-slate-200 dark:border-slate-700 ml-1">
                {unlocked.length}
              </span>
            </span>
            <span className="flex-1"><span className="block h-[1px] w-full bg-slate-200 dark:bg-slate-800" /></span>
          </div>
          <ul className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {unlocked.map((item, i) => (
              <li key={item.id || i}>
                <AchievementCard {...item} />
              </li>
            ))}
          </ul>
        </Fragment>
      )}
      {/* In Progress */}
      {inProgress.length > 0 && (
        <Fragment>
          <div className="flex items-center gap-2 mb-4 mt-8">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-2">
              In Progress
              <span className="inline-block px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-[10px] font-semibold align-middle border border-slate-200 dark:border-slate-700 ml-1">
                {inProgress.length}
              </span>
            </span>
            <span className="flex-1"><span className="block h-[1px] w-full bg-slate-200 dark:bg-slate-800" /></span>
          </div>
          <ul className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {inProgress.map((item, i) => (
              <li key={item.id || i}>
                <AchievementCard {...item} />
              </li>
            ))}
          </ul>
        </Fragment>
      )}
      {/* Locked */}
      {locked.length > 0 && (
        <Fragment>
          <div className="flex items-center gap-2 mb-4 mt-8">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-2">
              Locked
              <span className="inline-block px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-[10px] font-semibold align-middle border border-slate-200 dark:border-slate-700 ml-1">
                {locked.length}
              </span>
            </span>
            <span className="flex-1"><span className="block h-[1px] w-full bg-slate-200 dark:bg-slate-800" /></span>
          </div>
          <ul className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {locked.map((item, i) => (
              <li key={item.id || i}>
                <AchievementCard {...item} />
              </li>
            ))}
          </ul>
        </Fragment>
      )}
    </div>
  );
}

// Sorting function for each group
function sortAchievements(a: AchievementCardProps, b: AchievementCardProps) {
  // 1. completedAt (desc)
  if (a.completedAt && b.completedAt && a.completedAt !== b.completedAt) {
    return b.completedAt.localeCompare(a.completedAt);
  }
  // 2. progress percent (desc)
  const aPct = a.progress && a.goalCount ? a.progress / a.goalCount : 0;
  const bPct = b.progress && b.goalCount ? b.progress / b.goalCount : 0;
  if (bPct !== aPct) return bPct - aPct;
  // 3. type (target < milestone < goal)
  const typeOrder = { target: 0, milestone: 1, goal: 2 };
  if ((a.goalType && b.goalType) && typeOrder[a.goalType] !== typeOrder[b.goalType]) {
    return typeOrder[a.goalType] - typeOrder[b.goalType];
  }
  // 4. createdAt (desc)
  if (a.createdAt && b.createdAt && a.createdAt !== b.createdAt) {
    return b.createdAt - a.createdAt;
  }
  return 0;
}

export default AchievementsGrid;
