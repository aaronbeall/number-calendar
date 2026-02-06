import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import type { DateKey, Goal } from '@/features/db/localdb';
import { useArchiveGoal, useUpdateGoal } from '@/features/db/useGoalsData';
import { formatFriendlyDate, parseDateKey } from '@/lib/friendly-date';
import { formatValue, isRangeCondition, type GoalAchievement, type GoalResults } from '@/lib/goals';
import { getMetricDisplayName, getMetricSourceDisplayName } from '@/lib/stats';
import { adjectivize, capitalize, cn, pluralize } from '@/lib/utils';
import { Award, CalendarCheck2, CheckCircle, ChevronDown, Clock, Lock, MoreHorizontal, Pencil, Share2, Trash2, Trophy, Unlock } from 'lucide-react';
import { useRef, useState } from 'react';
import { toBlob } from 'html-to-image';
import AchievementBadge from './AchievementBadge';
import { BadgeEditDialog } from './BadgeEditDialog';

interface AchievementDetailsDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  result: GoalResults | null;
  onEditGoal?: (result: GoalResults) => void;
}

type TimelineItem =
  | {
      kind: 'heading';
      id: string;
      title?: string;
      variant?: 'divider';
    }
  | {
      kind?: 'event';
      id: string;
      title: string;
      subtitle?: string;
      meta?: string;
      icon: React.ReactNode;
      tone: 'neutral' | 'success' | 'progress' | 'provisional';
    };

const periodLabelMap: Record<Goal['timePeriod'], string> = {
  anytime: 'One-time',
  day: 'Daily',
  week: 'Weekly',
  month: 'Monthly',
  year: 'Yearly',
};

type BadgeLabelVariant = 'success' | 'neutral' | 'warning' | 'provisional';

const badgeLabelStyles: Record<BadgeLabelVariant, string> = {
  success: 'border-emerald-200 bg-emerald-50/70 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-200',
  neutral: 'border-slate-200 bg-white/80 text-slate-600 dark:border-slate-800 dark:bg-slate-950/70 dark:text-slate-300',
  warning: 'border-amber-200 bg-amber-50/70 text-amber-700 dark:border-amber-900 dark:bg-amber-950/60 dark:text-amber-200',
  provisional: 'border-amber-200 bg-amber-50 text-amber-600 dark:border-yellow-400 dark:bg-yellow-900/70 dark:text-yellow-400',
};

function BadgeLabel({
  variant,
  icon,
  children,
  className,
}: {
  variant: BadgeLabelVariant;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Badge variant="outline" className={cn('gap-2', badgeLabelStyles[variant], className)}>
      {icon}
      {children}
    </Badge>
  );
}

export function AchievementDetailsDrawer({ open, onOpenChange, result, onEditGoal }: AchievementDetailsDrawerProps) {
  if (!result) return null;

  const { goal, achievements, completedCount, currentProgress, lastCompletedAt, firstCompletedAt } = result;
  const archiveGoalMutation = useArchiveGoal();
  const updateGoalMutation = useUpdateGoal();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [badgeEditOpen, setBadgeEditOpen] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const shareRef = useRef<HTMLDivElement | null>(null);
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

  const periodTitle = capitalize(goal.timePeriod);
  const periodLabel = periodLabelMap[goal.timePeriod] ?? capitalize(adjectivize(goal.timePeriod));
  const summaryTags = buildSummaryTags(goal);
  const provisionalAchievements = achievements.filter((achievement) => achievement.provisional);
  const hasProvisional = provisionalAchievements.length > 0;
  const provisionalDate = hasProvisional
    ? formatFriendlyDate(provisionalAchievements[0]?.completedAt!, provisionalAchievements[0]?.startedAt!)
    : '';
  const confirmedCompletions = achievements
    .filter((achievement) => achievement.completedAt && !achievement.provisional)
    .sort((a, b) => (b.completedAt ?? '').localeCompare(a.completedAt ?? ''));
  const lastConfirmedCompletedAt = confirmedCompletions[0]?.completedAt;
  const hasCompletions = completedCount > 0;
  const confirmedCompletedCount = confirmedCompletions.length;
  const showNewBadge = hasProvisional && completedCount === 1;
  const showUnlocked = confirmedCompletedCount > 1 && firstCompletedAt;
  const completedLabel = completedCount > 1 ? 'Last completed' : 'Completed';
  const completedDateLabel = lastCompletedAt ? formatFriendlyDate(lastCompletedAt) : '';
  const showProgress = currentProgress > 0 && goal.count > 1;
  const progressPct = showProgress ? Math.min(100, Math.round((currentProgress / goal.count) * 100)) : 0;
  const handleArchive = () => {
    archiveGoalMutation.mutate(goal, {
      onSuccess: () => {
        setDeleteOpen(false);
        onOpenChange(false);
      },
    });
  };

  const handleShare = async () => {
    if (typeof navigator === 'undefined' || typeof navigator.share !== 'function') return;
    const target = shareRef.current;
    if (!target || isSharing) return;

    setIsSharing(true);
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

    try {
      const blob = await toBlob(target, { cacheBust: true, pixelRatio: 2 });
      if (!blob) throw new Error('Failed to generate image');

      const file = new File([blob], `achievement-${goal.id}.png`, { type: blob.type || 'image/png' });
      const shareTitle = `Numbers Achievement: ${goal.title}`;
      const shareText = hasCompletions
        ? `I just accomplished a ${periodLabel.toLowerCase()} goal in Numbers Go Up!`
        : inProgress || currentProgress > 0
          ? `I'm working on a ${periodLabel.toLowerCase()} goal in Numbers Go Up!`
          : `I just set a ${periodLabel.toLowerCase()} goal in Numbers Go Up!`;
      const shareUrl = 'https://numbers.metamodernmonkey.com';

      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: shareUrl,
          files: [file],
        });
      } else {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: shareUrl,
        });
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        console.error('Share failed:', err);
      }
    } finally {
      setIsSharing(false);
    }
  };

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
            <div
              ref={shareRef}
              className="relative rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-4 shadow-sm"
            >
              {!isSharing && (
                <div className="absolute top-3 right-3">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" aria-label="Achievement settings">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={handleShare}
                        disabled={isSharing || typeof navigator === 'undefined' || typeof navigator.share !== 'function'}
                      >
                        <Share2 className="h-4 w-4" />
                        Share
                      </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => onEditGoal?.(result)}
                      disabled={!onEditGoal}
                    >
                      <Pencil className="h-4 w-4" />
                      Edit {capitalize(goal.type)}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => setBadgeEditOpen(true)}
                      disabled={updateGoalMutation.isPending}
                    >
                      <Award className="h-4 w-4" />
                      Edit Badge
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-red-600 focus:text-red-700 dark:text-red-400 dark:focus:text-red-300"
                      onClick={() => setDeleteOpen(true)}
                      disabled={archiveGoalMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              )}
              <div className="flex flex-col items-center gap-3 text-center">
                <div className="relative rounded-2xl bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-900 dark:via-slate-950 dark:to-slate-900 p-4 shadow-inner">
                  {showNewBadge && (
                    <span className="absolute -top-2 -right-2 z-10 inline-flex items-center justify-center min-w-6 h-6 px-2 rounded-lg bg-red-500 text-white text-[10px] font-bold uppercase tracking-wide shadow-md border-2 border-white dark:border-slate-900">
                      New
                    </span>
                  )}
                  <AchievementBadge
                    badge={badge}
                    size="large"
                    shine={hasCompletions}
                    pulse={hasCompletions}
                    floating={hasCompletions && !isSharing}
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
                    <div className="flex flex-col items-center gap-2">
                      <div className="flex flex-wrap justify-center gap-2">
                      {hasProvisional && (
                        <BadgeLabel
                          variant="provisional"
                          icon={<Clock className="h-3.5 w-3.5" />}
                        >
                          Active This {periodTitle}
                        </BadgeLabel>
                      )}
                      {provisionalDate && (
                        <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                          <CalendarCheck2 className="h-3.5 w-3.5" />
                          {provisionalDate}
                        </div>
                      )}
                      {showUnlocked && (
                        <BadgeLabel
                          variant="neutral"
                          icon={<Unlock className="h-3.5 w-3.5" />}
                        >
                          Unlocked {formatFriendlyDate(firstCompletedAt)}
                        </BadgeLabel>
                      )}
                      {(!hasProvisional || lastConfirmedCompletedAt) && (
                        <BadgeLabel
                          variant="success"
                          icon={
                            hasProvisional || completedCount > 1
                              ? <CalendarCheck2 className="h-3.5 w-3.5" />
                              : <Trophy className="h-3.5 w-3.5" />
                          }
                        >
                          {completedLabel}{' '}
                          {hasProvisional && lastConfirmedCompletedAt
                            ? formatFriendlyDate(lastConfirmedCompletedAt)
                            : completedDateLabel}
                        </BadgeLabel>
                      )}
                      {confirmedCompletedCount > 1 && (
                        <BadgeLabel
                          variant="warning"
                          icon={<Trophy className="h-3.5 w-3.5" />}
                        >
                          {formatValue(confirmedCompletedCount)} {hasProvisional ? 'past' : ''} completions
                        </BadgeLabel>
                      )}
                      </div>
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

            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Timeline</div>
              </div>
              {timelineItems.length > 0 ? (
                <div className="relative flex flex-col gap-4">
                  <div className="absolute left-3 top-1 bottom-1 w-px bg-slate-200 dark:bg-slate-800" />
                  {timelineItems.map((item) => (
                    item.kind === 'heading' ? (
                      <div key={item.id} className="pl-8 pr-2 text-center text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                        {item.variant === 'divider' || !item.title ? (
                          <span className="mx-auto block h-px w-10 bg-slate-200 dark:bg-slate-800" aria-hidden="true" />
                        ) : (
                          <span className="block">{item.title}</span>
                        )}
                      </div>
                    ) : (
                      <div key={item.id} className="relative flex gap-3">
                        <div
                          className={cn(
                            'mt-1 flex h-6 w-6 items-center justify-center rounded-full border',
                            item.tone === 'success' && 'border-emerald-200 bg-emerald-50 text-emerald-600 dark:border-emerald-900 dark:bg-emerald-950/60',
                            item.tone === 'progress' && 'border-blue-200 bg-blue-50 text-blue-600 dark:border-blue-900 dark:bg-blue-950/60',
                            item.tone === 'neutral' && 'border-slate-200 bg-white text-slate-400 dark:border-slate-800 dark:bg-slate-950',
                            item.tone === 'provisional' && 'border-amber-200 bg-amber-50 text-amber-600 dark:border-yellow-400 dark:bg-yellow-900/70 dark:text-yellow-400'
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
                    )
                  ))}
                </div>
              ) : (
                <div className="text-sm text-slate-400">No progress tracked yet.</div>
              )}
            </div>
          </div>
        </ScrollArea>
        <BadgeEditDialog
          open={badgeEditOpen}
          onOpenChange={setBadgeEditOpen}
          badge={goal.badge}
          saveLabel="Update"
          onSave={(updatedBadge) => {
            updateGoalMutation.mutate({
              ...goal,
              badge: updatedBadge,
            });
          }}
        />
        <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete {goal.title}?</AlertDialogTitle>
              <AlertDialogDescription className="text-slate-600 dark:text-slate-400">
                {hasCompletions ? (
                  <span className="text-red-600 dark:text-red-400 font-semibold">
                    This will permanently remove the goal and all {completedCount} recorded completions. This cannot be undone.
                  </span>
                ) : (
                  'This will remove the goal from your lists. You can recreate it later if needed.'
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={archiveGoalMutation.isPending}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleArchive}
                className="bg-red-600 text-white hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600"
                disabled={archiveGoalMutation.isPending}
              >
                {archiveGoalMutation.isPending ? 'Deleting…' : 'Delete'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
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
  inProgress?: GoalAchievement;
  completedAchievements: GoalAchievement[];
  goal: Goal;
  currentProgress: number;
  createdAt: number;
}): TimelineItem[] {
  const items: TimelineItem[] = [];
  let currentHeading: string | null = null;
  let latestEventDate: Date | null = null;

  const addHeading = (date: Date | null) => {
    if (!date) return;
    const heading = formatTimelineHeading(date, goal.timePeriod);
    if (!heading || heading === currentHeading) return;
    currentHeading = heading;
    items.push({
      kind: 'heading',
      id: `heading-${heading}-${items.length}`,
      title: heading,
    });
  };

  const addDividerHeading = () => {
    items.push({
      kind: 'heading',
      id: `heading-divider-${items.length}`,
      variant: 'divider',
    });
  };

  const toDateFromKey = (key?: DateKey) => {
    if (!key) return null;
    try {
      return parseDateKey(key);
    } catch {
      return null;
    }
  };

  if (inProgress) {
    const progressMeta = goal.count > 1 ? `Progress: ${inProgress.progress}/${goal.count}` : undefined;
    const progressDate = toDateFromKey(inProgress.startedAt ?? inProgress.completedAt);
    addHeading(progressDate);
    // @ts-ignore -- control flow analysis is broken here
    if (progressDate && (!latestEventDate || progressDate > latestEventDate)) {
      latestEventDate = progressDate;
    }
    items.push({
      kind: 'event',
      id: inProgress.id,
      title: 'In progress',
      subtitle: inProgress.startedAt ? formatFriendlyDate(inProgress.startedAt) : 'Started',
      meta: progressMeta,
      icon: <Clock className="h-3.5 w-3.5" />,
      tone: 'progress',
    });
  } else if (currentProgress > 0 && goal.count > 1) {
    items.push({
      kind: 'event',
      id: 'progress',
      title: 'In progress',
      subtitle: 'Currently active',
      meta: `Progress: ${currentProgress}/${goal.count}`,
      icon: <Clock className="h-3.5 w-3.5" />,
      tone: 'progress',
    });
  }

  for (const achievement of completedAchievements) {
    const completedDate = toDateFromKey(achievement.completedAt ?? achievement.startedAt);
    addHeading(completedDate);
    if (completedDate && (!latestEventDate || completedDate > latestEventDate)) {
      latestEventDate = completedDate;
    }
    const dateLabel = buildAchievementDateLabel(achievement);
    const rangeMeta = goal.count > 1
      ? `Completed ${goal.count} ${goal.timePeriod === 'anytime' ? 'periods' : pluralize(goal.timePeriod, goal.count)}`
      : undefined;
    const provisionalMeta = achievement.provisional ? `Provisional until this ${goal.timePeriod} ends` : undefined;
    const meta = [rangeMeta, provisionalMeta].filter(Boolean).join(' · ') || undefined;
    const title = achievement.provisional ? 'Achieved' : 'Completed';
    const icon = achievement.provisional ? <Trophy className="h-3.5 w-3.5" /> : <CheckCircle className="h-3.5 w-3.5" />;
    items.push({
      kind: 'event',
      id: achievement.id,
      title,
      subtitle: dateLabel,
      meta,
      icon,
      tone: achievement.provisional ? 'provisional' : 'success',
    });
  }

  const createdDate = new Date(createdAt);
  if (latestEventDate && createdDate > latestEventDate) {
    addDividerHeading();
  } else {
    addHeading(createdDate);
  }
  items.push({
    kind: 'event',
    id: `created-${goal.id}`,
    title: 'Created',
    subtitle: formatCreatedAt(createdAt),
    icon: <CalendarCheck2 className="h-3.5 w-3.5" />,
    tone: 'neutral',
  });

  return items;
}

function formatTimelineHeading(date: Date, timePeriod: Goal['timePeriod']): string | null {
  if (timePeriod === 'day' || timePeriod === 'week') {
    return new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' }).format(date);
  }
  if (timePeriod === 'month') {
    return new Intl.DateTimeFormat(undefined, { year: 'numeric' }).format(date);
  }
  return null;
}

function buildAchievementDateLabel(achievement: GoalAchievement): string {
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
    goal.timePeriod !== 'anytime' ? { label: 'Count', value: formatValue(goal.count) } : null,
    goal.consecutive ? { label: 'Consecutive', value: 'Yes' } : null,
    { label: 'Metric', value: getMetricDisplayName(goal.target.metric) },
    { label: 'Source', value: getMetricSourceDisplayName(goal.target.source) },
    { label: 'Condition', value: capitalize(goal.target.condition) },
    valueLabel ? { label: isRange ? 'Range' : 'Value', value: valueLabel } : null,
  ].filter(Boolean) as { label: string; value: string }[];

  return tags;
}

export default AchievementDetailsDrawer;
