import type { Dataset } from '@/features/db/localdb';
import type { GoalResults } from '@/lib/goals';
import { sortGoalResults } from '@/lib/goals';
import { useAchievementDrawerParam } from '@/lib/search-params';
import { Clock, Loader2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { AchievementCard, type AchievementCardProps } from './AchievementCard';
import { AchievementDetailsDrawer } from './AchievementDetailsDrawer';
import { AchievementDialog } from './AchievementDialog';


interface AchievementsGridProps {
  results: GoalResults[];
  loading?: boolean;
  dataset?: Dataset;
}

export function AchievementsGrid({ results, loading, dataset }: AchievementsGridProps) {
  const [activeGoalId, setActiveGoalId] = useAchievementDrawerParam();
  const [editResult, setEditResult] = useState<GoalResults | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  // Sort results first, then flatten to a single achievement per goal for grid
  const gridItems = useMemo(() => {
    const sortedResults = sortGoalResults(results);
    return sortedResults.map((result): AchievementCardProps => {
      const ach = result.achievements.slice(-1)[0] ?? {};
      let firstStartedAt = undefined;
      let firstCompletedAt = undefined;
      let lastCompletedAt = undefined;
      if (result.achievements && result.achievements.length > 0) {
        const completed = result.achievements.filter(a => a.completedAt);
        if (completed.length > 0) {
          firstStartedAt = completed[0].startedAt;
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
        firstStartedAt,
        firstCompletedAt,
        goalType: result.goal.type,
        createdAt: result.goal.createdAt,
        repeatable: result.goal.timePeriod !== 'anytime',
        provisional: ach.provisional,
      };
    });
  }, [results]);

  // Grouping
  const { unlocked, inProgress, locked, provisional } = useMemo(() => {
    const unlocked: AchievementCardProps[] = [];
    const inProgress: AchievementCardProps[] = [];
    const locked: AchievementCardProps[] = [];
    const provisional: AchievementCardProps[] = [];
    for (const item of gridItems) {
      if (item.provisional) provisional.push(item);
      if (item.completedAt) { 
        const completedCount = item.completedCount ?? 0;
        const nonProvisionalCount = item.provisional ? completedCount - 1 : completedCount;
        if (nonProvisionalCount > 0){
          unlocked.push({ 
            ...item, 
            provisional: false, 
            completedCount: nonProvisionalCount
          });
        }
      } else if (item.startedAt || item.progress) inProgress.push(item);
      else locked.push(item);
    }
    return { unlocked, inProgress, locked, provisional };
  }, [gridItems]);

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="animate-spin w-8 h-8 text-slate-400" />
      </div>
    );
  }

  const activeResult = useMemo(
    () => results.find((result) => result.goal.id === activeGoalId) ?? null,
    [results, activeGoalId]
  );

  const handleEditGoal = (result: GoalResults) => {
    if (!dataset) return;
    setEditResult(result);
    setEditOpen(true);
  };

  return (
    <div className="space-y-8">
      {provisional.length > 0 && (
        <div className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-4 shadow-sm dark:border-slate-800/70 dark:bg-slate-900/40">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-200 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Active
              <span className="inline-block px-2 py-0.5 rounded-full bg-slate-100/80 text-slate-600 dark:bg-slate-800/70 dark:text-slate-200 text-[10px] font-semibold align-middle border border-slate-200/80 dark:border-slate-700/70 ml-1">
                {provisional.length}
              </span>
            </span>
            <span className="flex-1"><span className="block h-[1px] w-full bg-slate-200/80 dark:bg-slate-800/70" /></span>
          </div>
          <ul className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {provisional.map((item, i) => (
              <li key={`provisional-${item.id}-${i}`}>
                <AchievementCard {...item} onSelect={() => setActiveGoalId(item.id)} />
              </li>
            ))}
          </ul>
        </div>
      )}
      {/* Completed */}
      {unlocked.length > 0 && (
        <>
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
                <AchievementCard {...item} onSelect={() => setActiveGoalId(item.id)} />
              </li>
            ))}
          </ul>
        </>
      )}
      {/* In Progress */}
      {inProgress.length > 0 && (
        <>
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
                <AchievementCard {...item} onSelect={() => setActiveGoalId(item.id)} />
              </li>
            ))}
          </ul>
        </>
      )}
      {/* Locked */}
      {locked.length > 0 && (
        <>
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
                <AchievementCard {...item} onSelect={() => setActiveGoalId(item.id)} />
              </li>
            ))}
          </ul>
        </>
      )}
      <AchievementDetailsDrawer
        open={!!activeResult}
        onOpenChange={(open) => {
          if (!open) setActiveGoalId(null);
        }}
        result={activeResult}
        onEditGoal={dataset ? handleEditGoal : undefined}
      />
      {dataset && editResult && (
        <AchievementDialog
          open={editOpen}
          onOpenChange={(open) => {
            setEditOpen(open);
            if (!open) setEditResult(null);
          }}
          initialGoal={editResult.goal}
          completionCount={editResult.completedCount}
          type={editResult.goal.type}
          dataset={dataset}
        />
      )}
    </div>
  );
}

export default AchievementsGrid;

