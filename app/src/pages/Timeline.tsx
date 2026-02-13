import { NumberText, shortNumberFormat } from '@/components/ui/number-text';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useDatasetContext } from '@/context/DatasetContext';
import AchievementBadgeIcon from '@/features/achievements/AchievementBadgeIcon';
import AchievementBadge from '@/features/achievements/AchievementBadge';
import type { DateKey, DayKey, MonthKey, Tracking, Valence, WeekKey } from '@/features/db/localdb';
import { useAllDays } from '@/features/db/useDayEntryData';
import { useNotes } from '@/features/db/useNotesData';
import { NotesDisplay } from '@/features/notes/NotesDisplay';
import { NumbersPanel } from '@/features/panel/NumbersPanel';
import { useAchievements } from '@/hooks/useAchievements';
import { getMonthDays, getMonthWeeks, getWeekDays, getYearDays, getYearMonths } from '@/lib/calendar';
import { dateToDayKey, formatFriendlyDate, isDayKey, parseDateKey, parseMonthKey, parseWeekKey, toMonthKey, toYearKey } from '@/lib/friendly-date';
import { getCompletedAchievementsByDateKey, type CompletedAchievementResult } from '@/lib/goals';
import { computeNumberStats } from '@/lib/stats';
import { getPrimaryMetric, getPrimaryMetricLabel, getValenceValueForNumber } from '@/lib/tracking';
import { cn, pluralize } from '@/lib/utils';
import { getValueForSign, getValueForValence } from '@/lib/valence';
import { ArrowDownRight, ArrowRight, ArrowUpRight, Ellipsis } from 'lucide-react';
import React, { useCallback, useMemo, useState } from 'react';

type TimelineEntryKind = 'year' | 'month' | 'week' | 'day';

type TimelineEntry = {
  kind: TimelineEntryKind;
  dateKey: DateKey;
  title: string;
  numbers: number[];
  dayCount: number;
  hasData?: boolean;
  hasNote?: boolean;
  isToday?: boolean;
};

const PeriodAchievements = React.memo(function PeriodAchievements({ achievements }: { achievements: CompletedAchievementResult[] }) {
  const [isOpen, setIsOpen] = useState(false);
  if (!achievements.length) return null;
  const maxEmblems = 5;
  const visibleAchievements = achievements.slice(0, maxEmblems);
  const remainingCount = achievements.length - visibleAchievements.length;

  const hoverStaggerMs = 20;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="group flex items-center gap-1 transition hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/40"
          aria-label={`View ${achievements.length} achievements`}
        >
          <div className="flex items-center transition-all duration-200 group-hover:brightness-115 group-hover:drop-shadow-[0_10px_28px_rgba(15,23,42,0.45)] dark:group-hover:drop-shadow-[0_10px_28px_rgba(15,23,42,0.75)] [--stack-gap:-10px] [--stack-scale:1] group-hover:[--stack-gap:-3px] group-hover:[--stack-scale:1.12]">
            {visibleAchievements.map((achievement, index) => (
              <AchievementBadgeIcon
                key={achievement.achievement.id}
                badge={achievement.goal.badge}
                title={achievement.goal.title}
                className={cn(
                  'transition-transform duration-200 ease-out'
                )}
                style={{
                  transform: `translateX(calc(${index} * var(--stack-gap))) scale(var(--stack-scale))`,
                  transitionDelay: `${index * hoverStaggerMs}ms`,
                }}
              />
            ))}
            {remainingCount > 0 && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span
                    className="flex h-4 px-1 items-center justify-center rounded-full border border-slate-300/80 bg-white/80 text-[10px] font-semibold text-slate-700 shadow-sm transition-transform duration-200 ease-out dark:border-slate-600/80 dark:bg-slate-900/80 dark:text-slate-200"
                    style={{
                      transform: `translateX(calc(${visibleAchievements.length} * var(--stack-gap))) scale(var(--stack-scale))`,
                      transitionDelay: `${visibleAchievements.length * hoverStaggerMs}ms`,
                    }}
                    aria-label={`${remainingCount} more achievements`}
                  >
                    +{remainingCount}
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  {remainingCount} more {pluralize('achievement', remainingCount)}
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[320px] max-h-[60vh] overflow-y-auto">
        {isOpen && (
          <div className="space-y-3">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Achievements
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {achievements.map((achievement) => (
                <div
                  key={achievement.achievement.id}
                  className="flex flex-col items-center gap-2 rounded-lg border border-slate-200 bg-white/80 p-3 text-center text-slate-900 shadow-sm dark:border-slate-800 dark:bg-slate-950/80 dark:text-slate-50"
                >
                  <AchievementBadge
                    badge={achievement.goal.badge}
                    size="small"
                    animate={false}
                    floating={false}
                  />
                  <div>
                    <div className="text-xs font-semibold">
                      {achievement.goal.title}
                    </div>
                    {achievement.goal.description && (
                      <div className="text-[11px] text-slate-600 dark:text-slate-300">
                        {achievement.goal.description}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
});

PeriodAchievements.displayName = 'PeriodAchievements';

function TimelineDividerHeading({ title, className }: { title: string; className?: string }) {
  return (
    <div className={cn('flex items-center gap-3 text-[11px] font-semibold uppercase tracking-wide text-slate-400', className)}>
      <span className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
      <span>{title}</span>
      <span className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
    </div>
  );
}

function TimelineStatsRow({
  stats,
  valence,
  primaryMetric,
  primaryMetricLabel,
  primaryValenceMetric,
}: {
  stats: NonNullable<ReturnType<typeof computeNumberStats>>;
  valence: Valence;
  primaryMetric: number | undefined;
  primaryMetricLabel: string;
  primaryValenceMetric: number;
}) {
  const primaryClasses = getValueForValence(primaryValenceMetric, valence, {
    good: 'bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-300',
    bad: 'bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300',
    neutral: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200',
  });

  return (
    <div className="flex items-center gap-3 sm:gap-5 justify-end">
      <div className="hidden sm:flex items-center gap-3">
        <div className="text-right">
          <div className="text-[10px] uppercase tracking-wide text-slate-500 dark:text-slate-400">Mean</div>
          <NumberText
            value={stats.mean}
            valenceValue={primaryValenceMetric}
            valence={valence}
            className="font-mono text-xs sm:text-sm font-semibold"
            formatOptions={shortNumberFormat}
          />
        </div>
        <div className="text-right">
          <div className="text-[10px] uppercase tracking-wide text-slate-500 dark:text-slate-400">Median</div>
          <NumberText
            value={stats.median}
            valenceValue={primaryValenceMetric}
            valence={valence}
            className="font-mono text-xs sm:text-sm font-semibold"
            formatOptions={shortNumberFormat}
          />
        </div>
      </div>

      <div className="hidden md:block w-px h-6 bg-slate-300/40 dark:bg-slate-700/40" />

      <div className="hidden md:flex items-center gap-3">
        <div className="text-right">
          <div className="text-[10px] uppercase tracking-wide text-slate-500 dark:text-slate-400">Min</div>
          <NumberText
            value={stats.min}
            valenceValue={primaryValenceMetric}
            valence={valence}
            className="font-mono text-sm font-semibold"
            formatOptions={shortNumberFormat}
          />
        </div>
        <div className="text-right">
          <div className="text-[10px] uppercase tracking-wide text-slate-500 dark:text-slate-400">Max</div>
          <NumberText
            value={stats.max}
            valenceValue={primaryValenceMetric}
            valence={valence}
            className="font-mono text-sm font-semibold"
            formatOptions={shortNumberFormat}
          />
        </div>
      </div>

      <div className="hidden sm:block w-px h-6 bg-slate-300/40 dark:bg-slate-700/40" />

      <div className={cn('flex items-center gap-2 px-3 py-2 rounded font-mono font-bold', primaryClasses)}>
        <div className="text-[10px] uppercase tracking-wide text-slate-500 dark:text-slate-400">
          {primaryMetricLabel}
        </div>
        <NumberText
          value={primaryMetric ?? null}
          valenceValue={primaryValenceMetric}
          valence={valence}
          className="text-lg sm:text-xl font-extrabold"
        />
      </div>
    </div>
  );
}

const TimelineEntryCard = React.memo(({
  entry,
  achievements,
  noteText,
  valence,
  tracking,
  onOpen,
  isSelected,
}: {
  entry: TimelineEntry;
  achievements: CompletedAchievementResult[];
  noteText?: string;
  valence: Valence;
  tracking: Tracking;
  onOpen?: (entry: TimelineEntry) => void;
  isSelected?: boolean;
}) => {
  const stats = useMemo(() => computeNumberStats(entry.numbers), [entry.numbers]);
  const primaryMetricLabel = getPrimaryMetricLabel(tracking);
  const primaryMetricKey = getPrimaryMetric(tracking);
  const primaryMetric = stats ? stats[primaryMetricKey] : undefined;
  const primaryValenceMetric = stats
    ? getValenceValueForNumber(primaryMetric ?? 0, undefined, tracking)
    : 0;
  const isDay = entry.kind === 'day';
  const isYear = entry.kind === 'year';
  const isMonth = entry.kind === 'month';
  const isWeek = entry.kind === 'week';
  const isToday = isDay && entry.isToday;
  const yearClasses = getValueForValence(primaryValenceMetric, valence, {
    good: 'border-green-400/90 bg-gradient-to-r from-green-50 via-green-100 to-green-200 shadow-[0_10px_30px_rgba(16,185,129,0.25)] dark:border-green-700/80 dark:from-[#163322] dark:via-[#1a3a2a] dark:to-[#1f4a33] dark:shadow-[0_10px_30px_rgba(16,185,129,0.35)]',
    bad: 'border-red-400/90 bg-gradient-to-r from-red-50 via-red-100 to-red-200 shadow-[0_10px_30px_rgba(239,68,68,0.25)] dark:border-red-700/80 dark:from-[#2b1616] dark:via-[#3a1a1a] dark:to-[#4a1f1f] dark:shadow-[0_10px_30px_rgba(239,68,68,0.35)]',
    neutral: 'border-slate-400/90 bg-gradient-to-r from-slate-50 via-slate-100 to-slate-200 shadow-[0_10px_30px_rgba(15,23,42,0.18)] dark:border-slate-600/80 dark:from-[#1a2027] dark:via-[#232a31] dark:to-[#2c333b] dark:shadow-[0_10px_30px_rgba(15,23,42,0.35)]',
  });
  const monthClasses = getValueForValence(primaryValenceMetric, valence, {
    good: 'border-green-200/80 bg-green-50 dark:border-green-900/80 dark:bg-[#1a3a2a]',
    bad: 'border-red-200/80 bg-red-50 dark:border-red-900/80 dark:bg-[#3a1a1a]',
    neutral: 'border-slate-200/80 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/60',
  });
  const weekClasses = getValueForValence(primaryValenceMetric, valence, {
    good: 'border-green-200/60 bg-green-50/40 dark:border-green-900/70 dark:bg-[#1a3a2a]/50',
    bad: 'border-red-200/60 bg-red-50/40 dark:border-red-900/70 dark:bg-[#3a1a1a]/50',
    neutral: 'border-slate-200/60 bg-slate-50/40 dark:border-slate-800/70 dark:bg-slate-900/40',
  });
  const accentClasses = cn(isYear ? yearClasses : isMonth ? monthClasses : weekClasses);
  const weekMeta = isWeek ? parseWeekKey(entry.dateKey as WeekKey) : null;
  const weekRangeLabel = isWeek ? formatFriendlyDate(entry.dateKey as WeekKey) : null;
  const isEmptyDay = isDay && !entry.hasData && !entry.hasNote;
  const isEmptyEntry = isDay ? isEmptyDay : entry.numbers.length === 0;
  const dotClasses = isEmptyEntry
    ? 'border-slate-200 bg-slate-100 text-slate-400 dark:border-slate-800/70 dark:bg-slate-900/60 dark:text-slate-500'
    : getValueForValence(primaryValenceMetric, valence, {
        good: 'border-green-200 bg-green-50 text-green-600 dark:border-green-900 dark:bg-green-950/60 dark:text-green-300',
        bad: 'border-red-200 bg-red-50 text-red-600 dark:border-red-900 dark:bg-red-950/60 dark:text-red-300',
        neutral: 'border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-300',
      });
  const dotIcon = isEmptyEntry
    ? Ellipsis
    : getValueForSign(primaryValenceMetric, {
        positive: ArrowUpRight,
        negative: ArrowDownRight,
        zero: ArrowRight,
      });

  const interactiveSelector = 'button, a, input, textarea, select, [data-no-panel]';
  const handleOpen = (event: React.MouseEvent | React.KeyboardEvent) => {
    if (!onOpen) return;
    const target = event.target as HTMLElement | null;
    if (target?.closest(interactiveSelector)) return;
    onOpen(entry);
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (!onOpen) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleOpen(event);
    }
  };

  if (isDay) {
    return (
      <div
        role={onOpen ? 'button' : undefined}
        tabIndex={onOpen ? 0 : undefined}
        onClick={handleOpen}
        onKeyDown={handleKeyDown}
        className={cn(
          'space-y-2 rounded-lg px-2 py-1 transition-colors -mx-2',
          onOpen && 'cursor-pointer hover:bg-slate-50/70 dark:hover:bg-slate-900/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/40 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-blue-300/60 dark:focus-visible:ring-offset-slate-900',
          isSelected && 'bg-blue-50/70 dark:bg-blue-950/30 ring-2 ring-blue-400/60 ring-offset-2 ring-offset-white dark:ring-blue-300/60 dark:ring-offset-slate-900'
        )}
      >
        <div className="relative flex gap-3">
          <div
            className={cn(
              'mt-1 flex h-6 w-6 items-center justify-center rounded-full border',
              dotClasses,
              isToday && 'ring-2 ring-blue-400/70 ring-offset-2 ring-offset-white dark:ring-blue-300/70 dark:ring-offset-slate-900'
            )}
          >
            {React.createElement(dotIcon, { className: 'h-3.5 w-3.5' })}
          </div>
          <div className="flex min-w-0 flex-1 items-center justify-between gap-3">
            {isEmptyDay ? (
              <div className="flex min-w-0 items-center gap-2 text-slate-400 dark:text-slate-500">
                <span className={cn('truncate text-sm font-medium', isToday && 'text-blue-600 dark:text-blue-300')}>
                  {entry.title}
                </span>
                {isToday && (
                  <span className="inline-flex h-1.5 w-1.5 rounded-full bg-blue-500 dark:bg-blue-400" aria-label="Today" />
                )}
                <span className="rounded-full border border-slate-200/70 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide dark:border-slate-800/70">
                  No data
                </span>
              </div>
            ) : (
              <>
                <div className="flex min-w-0 items-center gap-2 text-slate-700 dark:text-slate-100">
                  <span className={cn('truncate text-sm font-medium', isToday && 'text-blue-600 dark:text-blue-300')}>
                    {entry.title}
                  </span>
                  {isToday && (
                    <span className="inline-flex h-1.5 w-1.5 rounded-full bg-blue-500 dark:bg-blue-400" aria-label="Today" />
                  )}
                  {achievements.length > 0 && (
                    <PeriodAchievements achievements={achievements} />
                  )}
                </div>
                {stats && (
                  <TimelineStatsRow
                    stats={stats}
                    valence={valence}
                    primaryMetric={primaryMetric}
                    primaryMetricLabel={primaryMetricLabel}
                    primaryValenceMetric={primaryValenceMetric}
                  />
                )}
              </>
            )}
          </div>
        </div>
        {!isEmptyDay && (
          <div className="ml-9">
            <NotesDisplay text={noteText} className="text-[13px]" />
          </div>
        )}
      </div>
    );
  }

  if (isMonth && isEmptyEntry) {
    return (
      <div
        role={onOpen ? 'button' : undefined}
        tabIndex={onOpen ? 0 : undefined}
        onClick={handleOpen}
        onKeyDown={handleKeyDown}
        className={cn(
          'relative flex gap-3 rounded-lg px-2 py-1 transition-colors -mx-2',
          onOpen && 'cursor-pointer hover:bg-slate-50/70 dark:hover:bg-slate-900/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/40 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-blue-300/60 dark:focus-visible:ring-offset-slate-900',
          isSelected && 'bg-blue-50/70 dark:bg-blue-950/30 ring-2 ring-blue-400/60 ring-offset-2 ring-offset-white dark:ring-blue-300/60 dark:ring-offset-slate-900'
        )}
      >
        <div className={cn('mt-1 flex h-6 w-6 items-center justify-center rounded-full border', dotClasses)}>
          {React.createElement(dotIcon, { className: 'h-3.5 w-3.5' })}
        </div>
        <div className="flex min-w-0 flex-1 items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2 text-slate-400 dark:text-slate-500">
            <span className="truncate text-sm font-medium">{entry.title}</span>
            <span className="rounded-full border border-slate-200/70 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide dark:border-slate-800/70">
              No data
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      role={onOpen ? 'button' : undefined}
      tabIndex={onOpen ? 0 : undefined}
      onClick={handleOpen}
      onKeyDown={handleKeyDown}
      className={cn(
        'relative flex gap-3 group',
        onOpen && 'cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/40 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-blue-300/60 dark:focus-visible:ring-offset-slate-900'
      )}
    >
      <div className={cn('mt-1 flex h-6 w-6 items-center justify-center rounded-full border', dotClasses)}>
        {React.createElement(dotIcon, { className: 'h-3.5 w-3.5' })}
      </div>
      <div
        className={cn(
          'flex-1 rounded-xl border border-t-4 shadow-sm transition-shadow',
          isYear && 'px-6 py-5',
          isMonth && 'px-5 py-4',
          isWeek && 'px-4 py-3',
          accentClasses,
          onOpen && 'group-hover:shadow-md',
          isSelected && 'ring-2 ring-blue-400/60 ring-offset-2 ring-offset-white dark:ring-blue-300/60 dark:ring-offset-slate-900'
        )}
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div>
              <div
                className={cn(
                  'font-semibold text-slate-800 dark:text-slate-100',
                  isYear ? 'text-2xl' : isMonth ? 'text-lg' : 'text-base'
                )}
              >
                {isWeek && weekMeta ? (
                  <span>Week {weekMeta.week}</span>
                ) : (
                  entry.title
                )}
              </div>
              {isWeek && weekRangeLabel ? (
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  <span>{weekRangeLabel}</span>
                  <span className="mx-1 text-slate-400 dark:text-slate-600" aria-hidden="true">&middot;</span>
                  <span>{entry.dayCount} entries</span>
                </div>
              ) : (
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  {entry.dayCount} entries
                </div>
              )}
            </div>
            {achievements.length > 0 && (
              <PeriodAchievements achievements={achievements} />
            )}
          </div>
          {stats && (
            <TimelineStatsRow
              stats={stats}
              valence={valence}
              primaryMetric={primaryMetric}
              primaryMetricLabel={primaryMetricLabel}
              primaryValenceMetric={primaryValenceMetric}
            />
          )}
        </div>
        <NotesDisplay text={noteText} className="mt-3 text-[13px]" />
      </div>
    </div>
  );
});

TimelineEntryCard.displayName = 'TimelineEntryCard';

const buildEntry = (
  kind: TimelineEntryKind,
  dateKey: DateKey,
  numbers: number[],
  dayCount: number,
  title: string,
  meta?: Pick<TimelineEntry, 'hasData' | 'hasNote' | 'isToday'>
): TimelineEntry => ({
  kind,
  dateKey,
  numbers,
  dayCount,
  title,
  ...meta,
});

export function Timeline() {
  const { dataset } = useDatasetContext();
  const { data: allDays = [] } = useAllDays(dataset.id);
  const { data: notes = [] } = useNotes(dataset.id);
  const achievementResults = useAchievements(dataset.id);
  const achievementResultsByDateKey = useMemo(
    () => getCompletedAchievementsByDateKey(achievementResults.all),
    [achievementResults.all]
  );

  const dayMap = useMemo(() => {
    const map = new Map<DayKey, number[]>();
    allDays.forEach((entry) => {
      map.set(entry.date, entry.numbers);
    });
    return map;
  }, [allDays]);

  const noteDaySet = useMemo(() => {
    const set = new Set<DayKey>();
    notes.forEach((note) => {
      if (isDayKey(note.date)) {
        set.add(note.date);
      }
    });
    return set;
  }, [notes]);

  const todayKey = useMemo(() => dateToDayKey(new Date()), []);

  const [panelProps, setPanelProps] = useState({
    isOpen: false,
    title: '',
    numbers: [] as number[],
    priorNumbers: undefined as number[] | undefined,
    extremes: undefined,
    daysData: undefined as Record<DayKey, number[]> | undefined,
    dateKey: todayKey as DateKey,
  });

  const latestKey = useMemo(() => {
    for (const entry of allDays) {
      if (entry.date === todayKey) {
        return todayKey;
      }
    }
    for (const dayKey of noteDaySet) {
      if (dayKey === todayKey) {
        return todayKey;
      }
    }
  }, [allDays, noteDaySet]);

  const maxVisibleDayKey = !latestKey || todayKey > latestKey ? todayKey : latestKey;

  const notesByDateKey = useMemo(() => {
    const map = new Map<DateKey, string>();
    notes.forEach((note) => {
      map.set(note.date, note.text);
    });
    return map;
  }, [notes]);

  const years = useMemo(() => {
    const yearSet = new Set<number>();
    allDays.forEach((entry) => {
      yearSet.add(parseDateKey(entry.date).getFullYear());
    });
    notes.forEach((note) => {
      yearSet.add(parseDateKey(note.date).getFullYear());
    });
    if (yearSet.size === 0) {
      yearSet.add(new Date().getFullYear());
    }
    return Array.from(yearSet).sort((a, b) => b - a);
  }, [allDays, notes]);

  const entriesByYear = useMemo(() => {
    const todayKey = dateToDayKey(new Date());
    const maxVisibleYear = parseDateKey(maxVisibleDayKey).getFullYear();
    const maxVisibleMonthKey = maxVisibleDayKey.slice(0, 7) as MonthKey;

    return years.map((year) => {
      const yearKey = toYearKey(year);
      const yearDayKeys = getYearDays(year);
      const yearNumbers = yearDayKeys.flatMap((day) => dayMap.get(day) ?? []);
      const yearEntry = buildEntry(
        'year',
        yearKey,
        yearNumbers,
        yearNumbers.length,
        `${year}`
      );

      const monthEntries = getYearMonths(year).map((monthKey) => {
          if (year === maxVisibleYear && monthKey > maxVisibleMonthKey) {
            return null;
          }
          const { month: monthNumber } = parseMonthKey(monthKey);
          const monthDayKeys = getMonthDays(year, monthNumber);
          const monthNumbers = monthDayKeys.flatMap((day) => dayMap.get(day) ?? []);
        const monthEntry = buildEntry(
          'month',
          monthKey as MonthKey,
          monthNumbers,
          monthNumbers.length,
          formatFriendlyDate(monthKey as MonthKey)
        );

        const weekEntries = getMonthWeeks(year, monthNumber)
          .map((weekKey) => {
          const { week } = parseWeekKey(weekKey);
          const weekDays = getWeekDays(year, week);
          const weekNumbers = weekDays.flatMap((day) => dayMap.get(day) ?? []);
          const weekHasNotes = weekDays.some((day) => noteDaySet.has(day));
          const includesMaxVisible = weekDays.includes(maxVisibleDayKey as DayKey);
          const weekHasContent = weekNumbers.length > 0 || weekHasNotes || includesMaxVisible;
          if (!weekHasContent) return null;
          const weekEntry = buildEntry(
            'week',
            weekKey as WeekKey,
            weekNumbers,
            weekNumbers.length,
            formatFriendlyDate(weekKey as WeekKey)
          );

          const dayEntries: TimelineEntry[] = [];
          const monthWeekDays = weekDays
            .filter((dayKey) => dayKey.startsWith(toMonthKey(year, monthNumber)))
            .filter((dayKey) => {
              if (year !== maxVisibleYear) return true;
              if (toMonthKey(year, monthNumber) !== maxVisibleMonthKey) return true;
              return dayKey <= maxVisibleDayKey;
            });
          let emptyRangeStart: DayKey | null = null;
          let emptyRangeEnd: DayKey | null = null;
          const flushEmptyRange = () => {
            if (!emptyRangeStart || !emptyRangeEnd) return;
            const label =
              emptyRangeStart === emptyRangeEnd
                ? formatFriendlyDate(emptyRangeStart)
                : formatFriendlyDate(emptyRangeStart, emptyRangeEnd);
            dayEntries.push(
              buildEntry(
                'day',
                emptyRangeStart,
                [],
                0,
                label,
                { hasData: false, hasNote: false }
              )
            );
            emptyRangeStart = null;
            emptyRangeEnd = null;
          };

          monthWeekDays.forEach((dayKey) => {
            const dayNumbers = dayMap.get(dayKey) ?? [];
            const hasData = dayNumbers.length > 0;
            const hasNote = noteDaySet.has(dayKey);
            const isTodayKey = dayKey === todayKey;
            if (!hasData && !hasNote) {
              if (isTodayKey) {
                flushEmptyRange();
                dayEntries.push(
                  buildEntry(
                    'day',
                    dayKey,
                    [],
                    0,
                    formatFriendlyDate(dayKey),
                    { hasData: false, hasNote: false, isToday: true }
                  )
                );
                return;
              }
              if (!emptyRangeStart) {
                emptyRangeStart = dayKey;
              }
              emptyRangeEnd = dayKey;
              return;
            }
            flushEmptyRange();
            dayEntries.push(
              buildEntry(
                'day',
                dayKey,
                dayNumbers,
                dayNumbers.length,
                formatFriendlyDate(dayKey),
                { hasData, hasNote, isToday: isTodayKey }
              )
            );
          });
          flushEmptyRange();

          return { weekEntry, dayEntries: dayEntries.slice().reverse() };
        })
          .filter((entry): entry is { weekEntry: TimelineEntry; dayEntries: TimelineEntry[] } => Boolean(entry));

          return { monthEntry, weekEntries: weekEntries.slice().reverse() };
        })
          .filter((entry): entry is { monthEntry: TimelineEntry; weekEntries: { weekEntry: TimelineEntry; dayEntries: TimelineEntry[] }[] } => Boolean(entry))
          .reverse();

      return { yearEntry, monthEntries };
    });
  }, [dayMap, noteDaySet, years, maxVisibleDayKey]);

  const getPanelTitleForEntry = useCallback((entry: TimelineEntry) => {
    if (entry.kind === 'year') {
      return `${entry.title} Year Summary`;
    }
    if (entry.kind === 'week') {
      const { week } = parseWeekKey(entry.dateKey as WeekKey);
      return `Week ${week}`;
    }
    return entry.title;
  }, []);

  const getDaysDataForEntry = useCallback((entry: TimelineEntry) => {
    if (entry.kind === 'day') return undefined;

    let dayKeys: DayKey[] = [];
    if (entry.kind === 'year') {
      const year = parseDateKey(entry.dateKey).getFullYear();
      dayKeys = getYearDays(year);
    } else if (entry.kind === 'month') {
      const { year, month } = parseMonthKey(entry.dateKey as MonthKey);
      dayKeys = getMonthDays(year, month);
    } else {
      const { year, week } = parseWeekKey(entry.dateKey as WeekKey);
      dayKeys = getWeekDays(year, week);
    }

    return dayKeys.reduce((acc, dayKey) => {
      const numbers = dayMap.get(dayKey);
      if (numbers && numbers.length > 0) {
        acc[dayKey] = numbers;
      }
      return acc;
    }, {} as Record<DayKey, number[]>);
  }, [dayMap]);

  const handleOpenEntry = useCallback((entry: TimelineEntry) => {
    setPanelProps({
      isOpen: true,
      title: getPanelTitleForEntry(entry),
      numbers: entry.numbers,
      priorNumbers: undefined,
      extremes: undefined,
      daysData: getDaysDataForEntry(entry),
      dateKey: entry.dateKey,
    });
  }, [getDaysDataForEntry, getPanelTitleForEntry]);

  return (
    <div className="min-h-screen py-6">
      <div className="mx-auto flex w-full max-w-6xl gap-6 px-6">
        <aside className="hidden w-56 shrink-0 lg:block">
          <div className="sticky top-24 space-y-3">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Timeline
            </div>
            {entriesByYear.map(({ yearEntry }) => {
              const stats = computeNumberStats(yearEntry.numbers);
              const primaryMetric = stats ? stats[getPrimaryMetric(dataset.tracking)] : 0;
              const primaryValenceMetric = stats
                ? getValenceValueForNumber(primaryMetric ?? 0, undefined, dataset.tracking)
                : 0;
              const badgeClasses = getValueForValence(primaryValenceMetric, dataset.valence, {
                good: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200',
                bad: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-200',
                neutral: 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-200',
              });

              return (
                <a
                  key={yearEntry.dateKey}
                  href={`#year-${yearEntry.dateKey}`}
                  className="block rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm transition hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:hover:border-slate-700"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-base font-semibold text-slate-700 dark:text-slate-100">
                      {yearEntry.title}
                    </div>
                    <div className={cn('rounded-full px-2 py-0.5 text-xs font-semibold', badgeClasses)}>
                      <NumberText
                        value={primaryMetric}
                        valenceValue={primaryValenceMetric}
                        valence={dataset.valence}
                        formatOptions={shortNumberFormat}
                      />
                    </div>
                  </div>
                  <div className="text-[11px] text-slate-400">{yearEntry.dayCount} entries</div>
                </a>
              );
            })}
          </div>
        </aside>

        <main className="relative flex-1">
          <div className="absolute left-3 top-1 bottom-1 w-px bg-slate-200 dark:bg-slate-800" />
          <div className="space-y-10">
            {entriesByYear.map(({ yearEntry, monthEntries }) => (
              <section key={yearEntry.dateKey} id={`year-${yearEntry.dateKey}`} className="space-y-6">
                <TimelineDividerHeading title={yearEntry.title} className="text-slate-500 dark:text-slate-400" />
                <TimelineEntryCard
                  entry={yearEntry}
                  achievements={achievementResultsByDateKey[yearEntry.dateKey] ?? []}
                  noteText={notesByDateKey.get(yearEntry.dateKey)}
                  valence={dataset.valence}
                  tracking={dataset.tracking}
                  onOpen={handleOpenEntry}
                  isSelected={panelProps.isOpen && panelProps.dateKey === yearEntry.dateKey}
                />
                {monthEntries.map(({ monthEntry, weekEntries }) => (
                  <div key={monthEntry.dateKey} className="space-y-5">
                    {monthEntry.numbers.length > 0 && (
                      <TimelineDividerHeading title={monthEntry.title} />
                    )}
                    <TimelineEntryCard
                      entry={monthEntry}
                      achievements={achievementResultsByDateKey[monthEntry.dateKey] ?? []}
                      noteText={notesByDateKey.get(monthEntry.dateKey)}
                      valence={dataset.valence}
                      tracking={dataset.tracking}
                      onOpen={handleOpenEntry}
                      isSelected={panelProps.isOpen && panelProps.dateKey === monthEntry.dateKey}
                    />
                    {weekEntries.map(({ weekEntry, dayEntries }) => (
                      <div key={weekEntry.dateKey} className="space-y-3">
                        <TimelineEntryCard
                          entry={weekEntry}
                          achievements={achievementResultsByDateKey[weekEntry.dateKey] ?? []}
                          noteText={notesByDateKey.get(weekEntry.dateKey)}
                          valence={dataset.valence}
                          tracking={dataset.tracking}
                          onOpen={handleOpenEntry}
                          isSelected={panelProps.isOpen && panelProps.dateKey === weekEntry.dateKey}
                        />
                        <div className="space-y-2">
                          {dayEntries.map((dayEntry) => (
                            <TimelineEntryCard
                              key={dayEntry.dateKey}
                              entry={dayEntry}
                              achievements={achievementResultsByDateKey[dayEntry.dateKey] ?? []}
                              noteText={notesByDateKey.get(dayEntry.dateKey)}
                              valence={dataset.valence}
                              tracking={dataset.tracking}
                              onOpen={handleOpenEntry}
                              isSelected={panelProps.isOpen && panelProps.dateKey === dayEntry.dateKey}
                            />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </section>
            ))}
          </div>
        </main>
      </div>
      <NumbersPanel
        {...panelProps}
        valence={dataset.valence}
        tracking={dataset.tracking}
        achievementResults={achievementResultsByDateKey[panelProps.dateKey] ?? []}
        onClose={() => setPanelProps(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
