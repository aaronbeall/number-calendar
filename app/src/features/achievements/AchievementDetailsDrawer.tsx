import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import type { Achievement, Goal } from '@/features/db/localdb';
import { formatFriendlyDate } from '@/lib/friendly-date';
import { formatValue, isRangeCondition, type GoalResults } from '@/lib/goals';
import { getMetricDisplayName, getMetricSourceDisplayName } from '@/lib/stats';
import { adjectivize, capitalize, cn, pluralize } from '@/lib/utils';
import { Award, CalendarCheck2, CheckCircle, ChevronDown, Clock, Lock, MoreHorizontal, Pencil, Share2, Trash2, Trophy, Unlock } from 'lucide-react';
import AchievementBadge from './AchievementBadge';

interface AchievementDetailsDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  result: GoalResults | null;
}

type TimelineItem = {
  id: string;
  title: string;
  subtitle?: string;
  meta?: string;
  icon: React.ReactNode;
  tone: 'neutral' | 'success' | 'progress';
};

const periodLabelMap: Record<Goal['timePeriod'], string> = {
  anytime: 'One-time',
  day: 'Daily',
  week: 'Weekly',
  month: 'Monthly',
  year: 'Yearly',
};

export function AchievementDetailsDrawer({ open, onOpenChange, result }: AchievementDetailsDrawerProps) {
  if (!result) return null;

  const { goal, achievements, completedCount, currentProgress, lastCompletedAt, firstCompletedAt } = result;
  const badge = goal.badge;
  const inProgress = achievements.find((achievement) => !!achievement.startedAt && !achievement.completedAt);
  const completedAchievements = achievements
    .filter((achievement) => achievement.completedAt)
    .sort((a, b) => (b.completedAt ?? '').localeCompare(a.completedAt ?? ''));

  const timelineItems = buildTimelineItems({
    inProgress,
    completedAchievements,
    goal,
    currentProgress,
    createdAt: goal.createdAt,
  });

  const periodLabel = periodLabelMap[goal.timePeriod] ?? capitalize(adjectivize(goal.timePeriod));
  const summaryTags = buildSummaryTags(goal);
  const hasCompletions = completedCount > 0;
  const showUnlocked = completedCount > 1 && firstCompletedAt;
  const completedLabel = completedCount > 1 ? 'Last completed' : 'Completed';
  const completedDateLabel = lastCompletedAt ? formatFriendlyDate(lastCompletedAt) : '';
  const completionsLabel = completedCount.toString();
  const showProgress = currentProgress > 0 && goal.count > 1;
  const progressPct = showProgress ? Math.min(100, Math.round((currentProgress / goal.count) * 100)) : 0;

  return (
    <Sheet open={open} onOpenChange={onOpenChange} modal={false}>
      <SheetContent className="w-full max-w-md flex flex-col">
        <SheetHeader className="flex flex-row items-start justify-between gap-3 text-left">
          <div>
            <SheetTitle className="text-slate-700">Achievement Details</SheetTitle>
            <div className="text-xs text-slate-500">{periodLabel} goal</div>
          </div>
        </SheetHeader>

        <ScrollArea className="flex-1 mt-4">
          <div className="flex flex-col gap-5 pb-6">
            {/* Achievement Badge and Title */}
            <div className="relative rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-4 shadow-sm">
              <div className="absolute top-3 right-3">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" aria-label="Achievement settings">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>
                      <Share2 className="h-4 w-4" />
                      Share
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem>
                      <Pencil className="h-4 w-4" />
                      Edit {capitalize(goal.type)}
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Award className="h-4 w-4" />
                      Edit Badge
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-red-600 focus:text-red-700 dark:text-red-400 dark:focus:text-red-300">
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <div className="flex flex-col items-center gap-3 text-center">
                <div className="rounded-2xl bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-900 dark:via-slate-950 dark:to-slate-900 p-4 shadow-inner">
                  <AchievementBadge
                    badge={badge}
                    size="large"
                    shine={hasCompletions}
                    pulse={hasCompletions}
                    floating={hasCompletions}
                    grayscale={!hasCompletions}
                  />
                </div>
                <div>
                  <div className="text-lg font-semibold text-slate-900 dark:text-slate-50">{goal.title}</div>
                  {goal.description && (
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">{goal.description}</div>
                  )}
                </div>
                {!hasCompletions ? (
                  <div className="flex flex-col items-center gap-3 w-full">
                    <Badge variant="outline" className="mt-1 gap-2 border-slate-300 text-slate-500 bg-white/80 dark:bg-slate-900/70 dark:border-slate-700 dark:text-slate-300">
                    <Lock className="h-3.5 w-3.5" />
                    Locked
                  </Badge>
                    {showProgress && (
                      <div className="w-full max-w-xs">
                        <div className="flex items-center justify-between text-[11px] uppercase tracking-wide text-slate-500">
                          <span className="flex items-center gap-1">
                            In progress
                          </span>
                          <span>{currentProgress}/{goal.count}</span>
                        </div>
                        <div className="mt-1 h-2 w-full rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                          <div className="h-full rounded-full bg-blue-500 dark:bg-blue-400" style={{ width: `${progressPct}%` }} />
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-3 w-full">
                    <div className="flex flex-wrap justify-center gap-2">
                      {showUnlocked && (
                        <Badge variant="outline" className="gap-2 border-emerald-200 bg-emerald-50/70 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-200">
                          <Unlock className="h-3.5 w-3.5" />
                          Unlocked {formatFriendlyDate(firstCompletedAt)}
                        </Badge>
                      )}
                      <Badge
                        variant="outline"
                        className={cn(
                          'gap-2',
                          completedCount > 1
                            ? 'border-slate-200 bg-white/80 text-slate-600 dark:border-slate-800 dark:bg-slate-950/70 dark:text-slate-300'
                            : 'border-amber-200 bg-amber-50/70 text-amber-700 dark:border-amber-900 dark:bg-amber-950/60 dark:text-amber-200'
                        )}
                      >
                        {completedCount > 1 ? (
                          <CalendarCheck2 className="h-3.5 w-3.5" />
                        ) : (
                          <Trophy className="h-3.5 w-3.5" />
                        )}
                        {completedLabel} {completedDateLabel}
                      </Badge>
                      {completedCount > 1 && (
                        <Badge variant="outline" className="gap-2 border-amber-200 bg-amber-50/70 text-amber-700 dark:border-amber-900 dark:bg-amber-950/60 dark:text-amber-200">
                          <Trophy className="h-3.5 w-3.5" />
                          {completionsLabel} completions
                        </Badge>
                      )}
                    </div>
                    {showProgress && (
                      <div className="w-full max-w-xs">
                        <div className="flex items-center justify-between text-[11px] uppercase tracking-wide text-slate-500">
                          <span className="flex items-center gap-1">
                            In progress
                          </span>
                          <span>{currentProgress}/{goal.count}</span>
                        </div>
                        <div className="mt-1 h-2 w-full rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                          <div className="h-full rounded-full bg-blue-500 dark:bg-blue-400" style={{ width: `${progressPct}%` }} />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Goal Summary and Timeline */}
            <Collapsible defaultOpen={false}>
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/40 p-4">
                <CollapsibleTrigger asChild>
                  <button className="group flex w-full items-center justify-between text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Requirements
                    <ChevronDown className="h-4 w-4 transition-transform group-data-[state=open]:rotate-180" />
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-3">
                  <div className="flex flex-wrap gap-2">
                    {summaryTags.map((tag) => (
                      <Badge key={tag.label} variant="outline" className="bg-white/80 dark:bg-slate-950/80 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800">
                        <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500 mr-1">
                          {tag.label}
                        </span>
                        <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">{tag.value}</span>
                      </Badge>
                    ))}
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>

            {hasCompletions && (
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Timeline</div>
                </div>
                {timelineItems.length > 0 ? (
                  <div className="relative flex flex-col gap-4">
                    <div className="absolute left-3 top-1 bottom-1 w-px bg-slate-200 dark:bg-slate-800" />
                    {timelineItems.map((item) => (
                      <div key={item.id} className="relative flex gap-3">
                        <div
                          className={cn(
                            'mt-1 flex h-6 w-6 items-center justify-center rounded-full border',
                            item.tone === 'success' && 'border-emerald-200 bg-emerald-50 text-emerald-600 dark:border-emerald-900 dark:bg-emerald-950/60',
                            item.tone === 'progress' && 'border-blue-200 bg-blue-50 text-blue-600 dark:border-blue-900 dark:bg-blue-950/60',
                            item.tone === 'neutral' && 'border-slate-200 bg-white text-slate-400 dark:border-slate-800 dark:bg-slate-950'
                          )}
                        >
                          {item.icon}
                        </div>
                        <div className="flex-1">
                          <div className="text-sm font-semibold text-slate-800 dark:text-slate-100">{item.title}</div>
                          {item.subtitle && <div className="text-xs text-slate-500">{item.subtitle}</div>}
                          {item.meta && <div className="text-[11px] text-slate-400 mt-1">{item.meta}</div>}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-slate-400">No progress tracked yet.</div>
                )}
              </div>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

function buildTimelineItems({
  inProgress,
  completedAchievements,
  goal,
  currentProgress,
  createdAt,
}: {
  inProgress?: Achievement;
  completedAchievements: Achievement[];
  goal: Goal;
  currentProgress: number;
  createdAt: number;
}): TimelineItem[] {
  const items: TimelineItem[] = [];

  if (inProgress) {
    const progressMeta = goal.count > 1 ? `Progress: ${inProgress.progress}/${goal.count}` : undefined;
    items.push({
      id: inProgress.id,
      title: 'In progress',
      subtitle: inProgress.startedAt ? formatFriendlyDate(inProgress.startedAt) : 'Started',
      meta: progressMeta,
      icon: <Clock className="h-3.5 w-3.5" />,
      tone: 'progress',
    });
  } else if (currentProgress > 0 && goal.count > 1) {
    items.push({
      id: 'progress',
      title: 'In progress',
      subtitle: 'Currently active',
      meta: `Progress: ${currentProgress}/${goal.count}`,
      icon: <Clock className="h-3.5 w-3.5" />,
      tone: 'progress',
    });
  }

  for (const achievement of completedAchievements) {
    const dateLabel = buildAchievementDateLabel(achievement);
    const rangeMeta = goal.count > 1
      ? `Completed ${goal.count} ${goal.timePeriod === 'anytime' ? 'periods' : pluralize(goal.timePeriod, goal.count)}`
      : undefined;
    items.push({
      id: achievement.id,
      title: 'Completed',
      subtitle: dateLabel,
      meta: rangeMeta,
      icon: <CheckCircle className="h-3.5 w-3.5" />,
      tone: 'success',
    });
  }

  items.push({
    id: `created-${goal.id}`,
    title: 'Created',
    subtitle: formatCreatedAt(createdAt),
    icon: <CalendarCheck2 className="h-3.5 w-3.5" />,
    tone: 'neutral',
  });

  return items;
}

function buildAchievementDateLabel(achievement: Achievement): string {
  if (achievement.startedAt && achievement.completedAt) {
    return formatFriendlyDate(achievement.startedAt, achievement.completedAt);
  }
  if (achievement.completedAt) {
    return formatFriendlyDate(achievement.completedAt);
  }
  if (achievement.startedAt) {
    return formatFriendlyDate(achievement.startedAt);
  }
  return 'Unknown date';
}

function formatCreatedAt(createdAt: number): string {
  return new Intl.DateTimeFormat(undefined, {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(createdAt));
}

function buildSummaryTags(goal: Goal) {
  const delta = goal.target.source === 'deltas';
  const percent = goal.target.source === 'percents';
  const isRange = isRangeCondition(goal.target.condition);
  const valueLabel = isRange
    ? `${formatValue(goal.target.range?.[0], { short: true })}-${formatValue(goal.target.range?.[1], { short: true, delta, percent })}`
    : formatValue(goal.target.value, { short: true, delta, percent });

  const tags = [
    { label: 'Period', value: periodLabelMap[goal.timePeriod] ?? capitalize(adjectivize(goal.timePeriod)) },
    goal.timePeriod !== 'anytime' ? { label: 'Count', value: goal.count.toString() } : null,
    goal.consecutive ? { label: 'Consecutive', value: 'Yes' } : null,
    { label: 'Metric', value: getMetricDisplayName(goal.target.metric) },
    { label: 'Source', value: getMetricSourceDisplayName(goal.target.source) },
    { label: 'Condition', value: capitalize(goal.target.condition) },
    valueLabel ? { label: isRange ? 'Range' : 'Value', value: valueLabel } : null,
  ].filter(Boolean) as { label: string; value: string }[];

  return tags;
}

export default AchievementDetailsDrawer;
