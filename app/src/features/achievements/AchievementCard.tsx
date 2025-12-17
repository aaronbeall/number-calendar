import { formatFriendlyDate } from '@/lib/friendly-date';
import { cn } from '@/lib/utils';
import type { DateKey, Goal, GoalBadge } from '../db/localdb';
import AchievementBadge from './AchievementBadge';
import { CheckCircle, Lock, Unlock } from 'lucide-react';


export interface AchievementCardProps {
  id: string;
  title: string;
  description?: string;
  badge: GoalBadge;
  completedAt?: DateKey;
  startedAt?: DateKey;
  progress?: number;
  goalCount?: number;
  completedCount?: number;
  firstCompletedAt?: DateKey;
  goalType?: Goal['type'];
  locked?: boolean;
  repeatable?: boolean;
  createdAt?: number;
}

export function AchievementCard({
  title,
  description,
  badge,
  completedAt,
  startedAt,
  progress,
  goalCount,
  completedCount,
  firstCompletedAt,
  goalType,
  repeatable
}: AchievementCardProps & { timePeriod?: string }) {
  let status: 'completed' | 'in-progress' | 'locked' = 'locked';
  if (completedAt) status = 'completed';
  else if (startedAt || progress) status = 'in-progress';

  // Determine border/theme color by goal type
  let borderColor = '';
  let completedLabelColor = '';
  let backgroundColor = '';
  if (goalType === 'target') {
    backgroundColor = 'bg-green-50/50 dark:bg-green-900/50';
    borderColor = 'border-green-400 dark:border-green-700';
    completedLabelColor = 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-200 border-green-200 dark:border-green-700';
  } else if (goalType === 'milestone') {
    backgroundColor = 'bg-blue-50/50 dark:bg-blue-900/50';
    borderColor = 'border-blue-300 dark:border-blue-700';
    completedLabelColor = 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200 border-blue-200 dark:border-blue-700';
  } else {
    backgroundColor = 'bg-yellow-50/50 dark:bg-yellow-900/50';
    borderColor = 'border-yellow-300 dark:border-yellow-700'; // achievement (default)
    completedLabelColor = 'bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-200 border-yellow-200 dark:border-yellow-700';
  }

  return (
    <div
      className={cn(
        backgroundColor,
        'rounded-xl border dark:bg-slate-900/80 shadow-sm p-4 flex flex-col gap-2 h-full transition-all items-center relative',
        borderColor,
        status === 'locked' && 'opacity-60 grayscale',
        (status === 'locked' || status === 'in-progress') && 'border-slate-200 dark:border-slate-700',
        status === 'in-progress' && 'opacity-60'
      )}
    >
      {/* Count notification bubble */}
      {status === 'completed' && completedCount && repeatable && (
        <span className="absolute top-2 right-2 z-10 px-2 py-0.5 rounded-full bg-red-500 text-white text-xs font-bold shadow-md border-2 border-white dark:border-slate-900 select-none pointer-events-none">
          × {completedCount}
        </span>
      )}
      <div className={cn(
        "flex flex-col items-center w-full mb-2",
        status === "in-progress" && "opacity-60 grayscale"
      )}>
        <AchievementBadge badge={badge} size="medium" />
      </div>
      <span className="font-bold text-lg text-center w-full">{title}</span>
      {description && <div className="text-xs text-slate-500 mb-1 text-center w-full">{description}</div>}
      <div className="flex flex-col items-center gap-1 mt-auto w-full">
        <div className="flex flex-row items-center gap-2 flex-wrap justify-center w-full">
          {status === 'completed' && completedAt && firstCompletedAt && firstCompletedAt !== completedAt && (
            <span className="ml-2 text-xs text-slate-400 italic flex items-center gap-1">
              <Unlock className="w-4 h-4 text-slate-400" />
              {formatFriendlyDate(firstCompletedAt)}
            </span>
          )}
          {status === 'completed' && completedAt && (
            <span className={cn(
              'inline-block px-2 py-0.5 rounded-full text-xs font-semibold border flex items-center gap-1',
              completedLabelColor
            )}>
              <CheckCircle className={cn("w-4 h-4 text-green-500", completedLabelColor)} />
              {formatFriendlyDate(completedAt)}
            </span>
          )}
          {status === 'locked' && (
            <span className=" flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-900 text-slate-400 text-xs font-semibold border border-slate-200 dark:border-slate-700">
              <Lock className="w-4 h-4 text-slate-400" />
              Locked
            </span>
          )}
          {(status === 'in-progress' || (repeatable && progress != goalCount)) && progress && goalCount && (
            <div className="w-full flex flex-col items-center" title={`Progress: ${progress} / ${goalCount}`}>
              <div className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-2 bg-blue-500 dark:bg-blue-400 rounded-full transition-all"
                  style={{ width: `${Math.min(100, Math.round((progress / goalCount) * 100))}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}