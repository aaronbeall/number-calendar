import { NumberText, shortNumberFormat } from '@/components/ui/number-text';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useDatasetContext } from '@/context/DatasetContext';
import AchievementBadgeIcon from '@/features/achievements/AchievementBadgeIcon';
import AchievementBadge from '@/features/achievements/AchievementBadge';
import type { DateKey, DateKeyByPeriod, DayKey, MonthKey, TimePeriod, Tracking, Valence, WeekKey, YearKey } from '@/features/db/localdb';
import { useAllPeriodsAggregateData } from '@/hooks/useAllPeriodsAggregateData';
import { useNotes } from '@/features/db/useNotesData';
import { NotesDisplay } from '@/features/notes/NotesDisplay';
import { NumbersPanel } from '@/features/panel/NumbersPanel';
import { useAchievements } from '@/hooks/useAchievements';
import { ChartContainer } from '@/components/ui/chart';
import { getCalendarData, getMonthDays, getMonthWeeks, getWeekDays, getYearDays, getYearMonths } from '@/lib/calendar';
import { dateToDayKey, formatFriendlyDate, isDayKey, parseDateKey, parseMonthKey, parseWeekKey, toMonthKey, toYearKey } from '@/lib/friendly-date';
import { formatValue } from '@/lib/friendly-numbers';
import { getCompletedAchievementsByDateKey, type CompletedAchievementResult } from '@/lib/goals';
import { getChartData, getChartNumbers, type NumbersChartDataPoint } from '@/lib/charts';
import type { PeriodAggregateData } from '@/lib/period-aggregate';
import type { StatsExtremes } from '@/lib/stats';
import { computeNumberStats, emptyStats } from '@/lib/stats';
import { getPrimaryMetric, getValenceValueForNumber, getValenceValueFromData } from '@/lib/tracking';
import { cn, pluralize } from '@/lib/utils';
import { getValueForSign, getValueForValence } from '@/lib/valence';
import { ArrowDownRight, ArrowRight, ArrowUpRight, Ellipsis } from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Line, LineChart, Tooltip as ChartTooltip} from 'recharts';

type TimelineEntryKind = 'year' | 'month' | 'week' | 'day';

type TimelineEntry = {
  kind: TimelineEntryKind;
  dateKey: DateKey;
  title: string;
  data?: PeriodAggregateData<'day' | 'week' | 'month' | 'year'>;
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

type PanelProps = {
  isOpen: boolean;
  title: string;
  data: PeriodAggregateData<'day' | 'week' | 'month' | 'year'>;
  priorData?: PeriodAggregateData<'day' | 'week' | 'month' | 'year'>;
  extremes?: StatsExtremes;
  daysData?: Record<DayKey, PeriodAggregateData<'day'>>;
  dateKey: DateKey;
};

const createEmptyAggregate = <T extends TimePeriod>(
  dateKey: DateKeyByPeriod<T>,
  period: T,
): PeriodAggregateData<T> => ({
  dateKey,
  period,
  numbers: [],
  stats: emptyStats(),
  deltas: emptyStats(),
  percents: {},
  cumulatives: emptyStats(),
  cumulativeDeltas: emptyStats(),
  cumulativePercents: {},
  extremes: undefined,
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
  valenceStats,
  secondaryMetricLabel,
  secondaryMetric,
  changePercent,
}: {
  stats: NonNullable<ReturnType<typeof computeNumberStats>>;
  valence: Valence;
  primaryMetric: number | undefined;
  primaryMetricLabel: string;
  primaryValenceMetric: number;
  valenceStats?: NonNullable<ReturnType<typeof computeNumberStats>>;
  secondaryMetricLabel: string;
  secondaryMetric?: number;
  changePercent?: number;
}) {
  const primaryClasses = getValueForValence(primaryValenceMetric, valence, {
    good: 'bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-300',
    bad: 'bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300',
    neutral: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200',
  });
  const formattedChange = changePercent !== undefined
    ? formatValue(changePercent, { percent: true, delta: true })
    : '';
  const changeClass = getValueForValence(changePercent ?? 0, valence, {
    good: 'text-green-600 dark:text-green-400',
    bad: 'text-red-600 dark:text-red-400',
    neutral: 'text-slate-500 dark:text-slate-400',
  });

  return (
    <div className="flex items-center gap-3 sm:gap-5 justify-end">
      <div className="hidden sm:flex items-center gap-3">
        <div className="text-right">
          <div className="text-[10px] uppercase tracking-wide text-slate-500 dark:text-slate-400">Mean</div>
          <NumberText
            value={stats.mean}
            valenceValue={valenceStats?.mean ?? 0}
            valence={valence}
            className="font-mono text-xs sm:text-sm font-semibold"
            formatOptions={shortNumberFormat}
          />
        </div>
        <div className="text-right">
          <div className="text-[10px] uppercase tracking-wide text-slate-500 dark:text-slate-400">Median</div>
          <NumberText
            value={stats.median}
            valenceValue={valenceStats?.median ?? 0}
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
            valenceValue={valenceStats?.min ?? 0}
            valence={valence}
            className="font-mono text-sm font-semibold"
            formatOptions={shortNumberFormat}
          />
        </div>
        <div className="text-right">
          <div className="text-[10px] uppercase tracking-wide text-slate-500 dark:text-slate-400">Max</div>
          <NumberText
            value={stats.max}
            valenceValue={valenceStats?.max ?? 0}
            valence={valence}
            className="font-mono text-sm font-semibold"
            formatOptions={shortNumberFormat}
          />
        </div>
      </div>

      <div className="hidden sm:block w-px h-6 bg-slate-300/40 dark:bg-slate-700/40" />

      <div className={cn('flex items-center gap-2 px-3 py-2 rounded font-mono font-bold', primaryClasses)}>
        <div className="flex flex-col items-end">
          <div className="text-[10px] uppercase tracking-wide text-slate-500 dark:text-slate-400">
            {primaryMetricLabel}
          </div>
          <NumberText
            value={primaryMetric ?? null}
            valenceValue={primaryValenceMetric}
            valence={valence}
            className="text-lg sm:text-xl font-extrabold"
          />
          <div className="text-[10px] font-medium text-slate-500 dark:text-slate-400">
            <span className="uppercase tracking-wide">{secondaryMetricLabel}</span>{' '}
            <NumberText
              value={secondaryMetric ?? null}
              valenceValue={secondaryMetric ?? 0}
              valence={valence}
              className="font-semibold"
              formatOptions={shortNumberFormat}
            />{' '}
            { formattedChange && (
              <span className={changeClass}>({formattedChange})</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const renderTimelineChartTooltip = (valence: Valence) => ({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload?: NumbersChartDataPoint }>;
}) => {
  if (active && payload && payload.length) {
    if (!payload[0].payload) return null;
    const { value, valenceValue, format, secondaryValue, secondaryFormat, secondaryLabel } = payload[0].payload;
    return (
      <div className="rounded-md bg-white dark:bg-slate-900 px-2 py-1 shadow-lg dark:shadow-xl border border-gray-200 dark:border-slate-700">
        <div style={{ fontWeight: 600, fontSize: 14 }}>
          <NumberText value={value} valenceValue={valenceValue} valence={valence} formatOptions={format ?? undefined} />
        </div>
        {secondaryValue !== undefined && secondaryValue !== null ? (
          <div style={{ fontSize: 12, opacity: 0.7 }}>
            {secondaryLabel && <span className="mr-1">{secondaryLabel}</span>}
            <NumberText value={secondaryValue} valenceValue={secondaryValue} valence={valence} formatOptions={secondaryFormat ?? undefined} />
          </div>
        ) : null}
      </div>
    );
  }
  return null;
};

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
  const stats = entry.data?.stats;
  const {
    valenceStats,
    primaryMetric,
    primaryMetricLabel,
    primaryValenceMetric = 0,
    secondaryMetric,
    secondaryMetricLabel,
    changeMetric,
  } = useMemo(
    () => getCalendarData(entry.data ?? null, entry.data?.extremes, tracking),
    [entry.data, tracking]
  );
  const isDay = entry.kind === 'day';
  const isYear = entry.kind === 'year';
  const isMonth = entry.kind === 'month';
  const isWeek = entry.kind === 'week';
  const isToday = isDay && entry.isToday;
  const numbers = entry.data?.numbers ?? [];
  const showMicroChart = (isYear || isMonth) && numbers.length > 1;
  const entryChartData = useMemo(() => {
    if (!showMicroChart) return [] as NumbersChartDataPoint[];
    const chartNumbers = getChartNumbers(numbers, undefined, tracking);
    return getChartData(chartNumbers, tracking);
  }, [numbers, showMicroChart, tracking]);
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
  const isEmptyEntry = isDay ? isEmptyDay : numbers.length === 0;
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
                    valenceStats={valenceStats}
                    secondaryMetricLabel={secondaryMetricLabel}
                    secondaryMetric={secondaryMetric}
                    changePercent={changeMetric}
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
                  <span>{entry.data?.stats.count ?? 0} entries</span>
                </div>
              ) : (
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  {entry.data?.stats.count ?? 0} entries
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
              valenceStats={valenceStats}
              secondaryMetricLabel={secondaryMetricLabel}
              secondaryMetric={secondaryMetric}
              changePercent={changeMetric}
            />
          )}
        </div>
        <NotesDisplay text={noteText} className="mt-3 text-[13px]" />
        {showMicroChart && entryChartData.length > 1 && (
          <ChartContainer
            config={{ numbers: { color: getValueForValence(primaryValenceMetric, valence, {
              good: '#22c55e',
              bad: '#ef4444',
              neutral: '#3b82f6',
            }) } }}
            className="mt-3 h-14 w-full"
          >
            <LineChart width={260} height={56} data={entryChartData} margin={{ top: 6, right: 4, left: 0, bottom: 6 }}>
              <Line
                type="monotone"
                dataKey="y"
                stroke={getValueForValence(primaryValenceMetric, valence, {
                  good: '#22c55e',
                  bad: '#ef4444',
                  neutral: '#3b82f6',
                })}
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
              <ChartTooltip
                cursor={{
                  fill: getValueForValence(primaryValenceMetric, valence, {
                    good: 'rgba(16,185,129,0.08)',
                    bad: 'rgba(239,68,68,0.08)',
                    neutral: 'rgba(59,130,246,0.08)',
                  }),
                }}
                content={renderTimelineChartTooltip(valence)}
              />
            </LineChart>
          </ChartContainer>
        )}
      </div>
    </div>
  );
});

TimelineEntryCard.displayName = 'TimelineEntryCard';

const buildEntry = (
  kind: TimelineEntryKind,
  dateKey: DateKey,
  title: string,
  data?: PeriodAggregateData<'day' | 'week' | 'month' | 'year'>,
  meta?: Pick<TimelineEntry, 'hasData' | 'hasNote' | 'isToday'>
): TimelineEntry => ({
  kind,
  dateKey,
  title,
  data,
  ...meta,
});

export function Timeline() {
  const { dataset } = useDatasetContext();
  const { days: periodDays, weeks: periodWeeks, months: periodMonths, years: periodYears, alltime: alltimeAggregate } = useAllPeriodsAggregateData();
  const { data: notes = [] } = useNotes(dataset.id);
  const achievementResults = useAchievements(dataset.id);
  const achievementResultsByDateKey = useMemo(
    () => getCompletedAchievementsByDateKey(achievementResults.all),
    [achievementResults.all]
  );

  const dayAggByKey = useMemo(() => new Map(periodDays.map((day) => [day.dateKey, day])), [periodDays]);
  const weekAggByKey = useMemo(() => new Map(periodWeeks.map((week) => [week.dateKey, week])), [periodWeeks]);
  const monthAggByKey = useMemo(() => new Map(periodMonths.map((month) => [month.dateKey, month])), [periodMonths]);
  const yearAggByKey = useMemo(() => new Map(periodYears.map((year) => [year.dateKey, year])), [periodYears]);

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
  const todayDate = useMemo(() => new Date(), []);
  const [activeMonthKey, setActiveMonthKey] = useState<MonthKey | null>(null);
  const [activeYearKey, setActiveYearKey] = useState<YearKey | null>(null);

  const allTimeNumbers = useMemo(() => {
    return periodDays
      .slice()
      .sort((a, b) => a.dateKey.localeCompare(b.dateKey))
      .flatMap((entry) => entry.numbers);
  }, [periodDays]);

  const allTimePrimaryMetric = useMemo(
    () => alltimeAggregate?.stats?.[getPrimaryMetric(dataset.tracking)] ?? 0,
    [alltimeAggregate, dataset.tracking]
  );

  const allTimePrimaryValence = useMemo(
    () => (alltimeAggregate ? (getValenceValueFromData(alltimeAggregate, dataset.tracking) ?? 0) : 0),
    [alltimeAggregate, dataset.tracking]
  );

  const allTimeChartData = useMemo(() => {
    const chartNumbers = getChartNumbers(allTimeNumbers, undefined, dataset.tracking);
    return getChartData(chartNumbers, dataset.tracking);
  }, [allTimeNumbers, dataset.tracking]);

  const [panelProps, setPanelProps] = useState<PanelProps>(() => ({
    isOpen: false,
    title: '',
    data: createEmptyAggregate(todayKey as DateKeyByPeriod<'day'>, 'day'),
    priorData: undefined as PeriodAggregateData<'day' | 'week' | 'month' | 'year'> | undefined,
    extremes: undefined as StatsExtremes | undefined,
    daysData: undefined as Record<DayKey, PeriodAggregateData<'day'>> | undefined,
    dateKey: todayKey as DateKey,
  }));

  const latestKey = useMemo(() => {
    for (const entry of periodDays) {
      if (entry.dateKey === todayKey) {
        return todayKey;
      }
    }
    for (const dayKey of noteDaySet) {
      if (dayKey === todayKey) {
        return todayKey;
      }
    }
  }, [periodDays, noteDaySet]);

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
    periodDays.forEach((entry) => {
      yearSet.add(parseDateKey(entry.dateKey).getFullYear());
    });
    notes.forEach((note) => {
      yearSet.add(parseDateKey(note.date).getFullYear());
    });
    if (yearSet.size === 0) {
      yearSet.add(new Date().getFullYear());
    }
    return Array.from(yearSet).sort((a, b) => b - a);
  }, [periodDays, notes]);

  useEffect(() => {
    if (!activeYearKey && years.length > 0) {
      setActiveYearKey(toYearKey(years[0]));
    }
  }, [activeYearKey, years]);


  const entriesByYear = useMemo(() => {
    const todayKey = dateToDayKey(new Date());
    const maxVisibleYear = parseDateKey(maxVisibleDayKey).getFullYear();
    const maxVisibleMonthKey = maxVisibleDayKey.slice(0, 7) as MonthKey;

    return years.map((year) => {
      const yearKey = toYearKey(year);
      const yearAggregate = yearAggByKey.get(yearKey) ?? createEmptyAggregate(yearKey, 'year');
      const yearEntry = buildEntry(
        'year',
        yearKey,
        `${year}`,
        yearAggregate
      );

      const monthEntries = getYearMonths(year).map((monthKey) => {
          if (year === maxVisibleYear && monthKey > maxVisibleMonthKey) {
            return null;
          }
          const { month: monthNumber } = parseMonthKey(monthKey);
          const monthAggregate = monthAggByKey.get(monthKey) ?? createEmptyAggregate(monthKey, 'month');
        const monthEntry = buildEntry(
          'month',
          monthKey as MonthKey,
          formatFriendlyDate(monthKey as MonthKey),
          monthAggregate
        );

        const weekResults: { weekKey: WeekKey; weekEntry: TimelineEntry | null; dayEntries: TimelineEntry[] }[] = [];
        let emptyRangeStart: DayKey | null = null;
        let emptyRangeEnd: DayKey | null = null;
        let emptyRangeWeekIndex: number | null = null;
        const flushEmptyRange = () => {
          if (!emptyRangeStart || !emptyRangeEnd) return;
          const label =
            emptyRangeStart === emptyRangeEnd
              ? formatFriendlyDate(emptyRangeStart)
              : formatFriendlyDate(emptyRangeStart, emptyRangeEnd);
          const targetIndex = emptyRangeWeekIndex ?? Math.max(0, weekResults.length - 1);
          const target = weekResults[targetIndex];
          if (target) {
            target.dayEntries.push(
              buildEntry(
                'day',
                emptyRangeStart,
                label,
                undefined,
                { hasData: false, hasNote: false }
              )
            );
          }
          emptyRangeStart = null;
          emptyRangeEnd = null;
          emptyRangeWeekIndex = null;
        };

        getMonthWeeks(year, monthNumber).forEach((weekKey) => {
          const { week } = parseWeekKey(weekKey);
          const weekDays = getWeekDays(year, week);
          const weekAggregate = weekAggByKey.get(weekKey) ?? createEmptyAggregate(weekKey, 'week');
          const weekHasData = weekAggregate.numbers.length > 0;
          const weekEntry = weekHasData
            ? buildEntry(
                'week',
                weekKey as WeekKey,
                formatFriendlyDate(weekKey as WeekKey),
                weekAggregate
              )
            : null;

          const dayEntries: TimelineEntry[] = [];
          const weekIndex = weekResults.length;
          weekResults.push({ weekKey: weekKey as WeekKey, weekEntry, dayEntries });

          const monthWeekDays = weekDays
            .filter((dayKey) => dayKey.startsWith(toMonthKey(year, monthNumber)))
            .filter((dayKey) => {
              if (year !== maxVisibleYear) return true;
              if (toMonthKey(year, monthNumber) !== maxVisibleMonthKey) return true;
              return dayKey <= maxVisibleDayKey;
            });

          monthWeekDays.forEach((dayKey) => {
            const dayAggregate = dayAggByKey.get(dayKey);
            const dayNumbers = dayAggregate?.numbers ?? [];
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
                    formatFriendlyDate(dayKey),
                    undefined,
                    { hasData: false, hasNote: false, isToday: true }
                  )
                );
                return;
              }
              if (!emptyRangeStart) {
                emptyRangeStart = dayKey;
                emptyRangeWeekIndex = weekIndex;
              }
              emptyRangeEnd = dayKey;
              return;
            }
            flushEmptyRange();
            dayEntries.push(
              buildEntry(
                'day',
                dayKey,
                formatFriendlyDate(dayKey),
                dayAggregate,
                { hasData, hasNote, isToday: isTodayKey }
              )
            );
          });
        });

        flushEmptyRange();

        const weekEntries = weekResults
          .filter(({ weekEntry, dayEntries }) => weekEntry || dayEntries.length > 0)
          .map(({ weekKey, weekEntry, dayEntries }) => ({
            weekKey,
            weekEntry,
            dayEntries: dayEntries.slice().reverse(),
          }))
          .reverse();

        return { monthEntry, weekEntries };
        })
          .filter((entry): entry is { monthEntry: TimelineEntry; weekEntries: { weekKey: WeekKey; weekEntry: TimelineEntry | null; dayEntries: TimelineEntry[] }[] } => Boolean(entry))
          .reverse();

      return { yearEntry, monthEntries };
    });
  }, [dayAggByKey, monthAggByKey, noteDaySet, weekAggByKey, yearAggByKey, years, maxVisibleDayKey]);

  useEffect(() => {
    const monthNodes = Array.from(document.querySelectorAll<HTMLElement>('[data-month-key]'));
    if (monthNodes.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((entry) => entry.isIntersecting);
        if (visible.length === 0) return;

        visible.sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        const target = visible[0]?.target as HTMLElement | undefined;
        const monthKey = target?.dataset.monthKey as MonthKey | undefined;
        if (monthKey) {
          setActiveMonthKey(monthKey);
          setActiveYearKey(toYearKey(parseMonthKey(monthKey).year));
        }
      },
      { rootMargin: '0px 0px -65% 0px', threshold: 0.1 }
    );

    monthNodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, [entriesByYear]);

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
      const aggregate = dayAggByKey.get(dayKey);
      if (aggregate && aggregate.numbers.length > 0) {
        acc[dayKey] = aggregate;
      }
      return acc;
    }, {} as Record<DayKey, PeriodAggregateData<'day'>>);
  }, [dayAggByKey]);

  const handleOpenEntry = useCallback((entry: TimelineEntry) => {
    const data = entry.data ?? createEmptyAggregate(entry.dateKey as DateKeyByPeriod<'day' | 'week' | 'month' | 'year'>, entry.kind);
    setPanelProps({
      isOpen: true,
      title: getPanelTitleForEntry(entry),
      data,
      priorData: undefined,
      extremes: undefined,
      daysData: getDaysDataForEntry(entry),
      dateKey: entry.dateKey,
    });
  }, [getDaysDataForEntry, getPanelTitleForEntry]);

  const activeYearMonthDots = useMemo(() => {
    if (!activeYearKey) return {} as Record<MonthKey, React.ReactElement[]>;
    const year = parseInt(activeYearKey, 10);
    const result: Record<MonthKey, React.ReactElement[]> = {} as Record<MonthKey, React.ReactElement[]>;
    let priorDayValue: number | undefined = undefined;

    const getDotColor = (valenceValue: number, isFuture: boolean, hasData: boolean) => {
      if (isFuture) {
        return 'bg-slate-200 dark:bg-slate-700/40 opacity-40';
      }
      if (!hasData) {
        return 'bg-slate-400 dark:bg-slate-700/40 opacity-40';
      }
      return getValueForValence(valenceValue, dataset.valence, {
        good: 'bg-green-500 dark:bg-green-800/70 opacity-90',
        bad: 'bg-red-500 dark:bg-red-800/70 opacity-90',
        neutral: 'bg-blue-500 dark:bg-blue-800/70 opacity-90',
      });
    };

    for (let month = 1; month <= 12; month++) {
      const daysInMonth = new Date(year, month, 0).getDate();
      const dayDots: React.ReactElement[] = [];
      for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month - 1, day);
        const dateKey = dateToDayKey(date);
        const dayAggregate = dayAggByKey.get(dateKey);
        const numbers = dayAggregate?.numbers ?? [];
        const value = dayAggregate?.stats?.[getPrimaryMetric(dataset.tracking)] ?? 0;
        const isFuture = date > todayDate;
        const hasData = numbers.length > 0;
        const valenceValue = hasData && dayAggregate
          ? (getValenceValueFromData(dayAggregate, dataset.tracking) ?? 0)
          : 0;
        const color = getDotColor(valenceValue, isFuture, hasData);

        dayDots.push(
          <div
            key={dateKey}
            className={cn('h-1 w-1 rounded-full transition-all duration-200', color)}
            title={`${formatFriendlyDate(dateKey)}${hasData ? `: ${value}` : ''}`}
          />
        );
        if (hasData) priorDayValue = value;
      }

      const firstDayOfWeek = new Date(year, month - 1, 1).getDay();
      const lastDayOfWeek = new Date(year, month, 0).getDay();
      const padStart = firstDayOfWeek;
      const padEnd = 6 - lastDayOfWeek;

      const paddedDots: React.ReactElement[] = [
        ...Array.from({ length: padStart }, (_, index) => (
          <div key={`pad-start-${month}-${index}`} className="h-1 w-1 rounded-full opacity-0" aria-hidden />
        )),
        ...dayDots,
        ...Array.from({ length: padEnd }, (_, index) => (
          <div key={`pad-end-${month}-${index}`} className="h-1 w-1 rounded-full opacity-0" aria-hidden />
        )),
      ];

      result[toMonthKey(year, month)] = paddedDots;
    }

    return result;
  }, [activeYearKey, dayAggByKey, dataset.tracking, dataset.valence, todayDate]);

  return (
    <div className="min-h-screen py-6">
      <div className="mx-auto flex w-full max-w-6xl gap-6 px-6">
        <aside className="hidden w-56 shrink-0 lg:block">
          <div className="sticky top-24 space-y-3">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Timeline
            </div>
            {allTimeChartData.length > 1 && (
              <div className="rounded-lg border border-slate-200 bg-white p-2 shadow-sm dark:border-slate-800 dark:bg-slate-950">
                <div className="mb-2 flex items-center justify-between text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  <span>All-time trend</span>
                  <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-semibold', getValueForValence(allTimePrimaryValence, dataset.valence, {
                    good: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200',
                    bad: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-200',
                    neutral: 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-200',
                  }))}>
                    <NumberText
                      value={allTimePrimaryMetric}
                      valenceValue={allTimePrimaryValence}
                      valence={dataset.valence}
                      formatOptions={shortNumberFormat}
                    />
                  </span>
                </div>
                <ChartContainer
                  config={{ numbers: { color: getValueForValence(allTimePrimaryValence, dataset.valence, {
                    good: '#22c55e',
                    bad: '#ef4444',
                    neutral: '#3b82f6',
                  }) } }}
                  className="h-16 w-full"
                >
                  <LineChart width={180} height={56} data={allTimeChartData} margin={{ top: 6, right: 0, left: 0, bottom: 6 }}>
                    <Line
                      type="monotone"
                      dataKey="y"
                      stroke={getValueForValence(allTimePrimaryValence, dataset.valence, {
                        good: '#22c55e',
                        bad: '#ef4444',
                        neutral: '#3b82f6',
                      })}
                      strokeWidth={2}
                      dot={false}
                      isAnimationActive={false}
                    />
                    <ChartTooltip
                      cursor={{
                        fill: getValueForValence(allTimePrimaryValence, dataset.valence, {
                          good: 'rgba(16,185,129,0.08)',
                          bad: 'rgba(239,68,68,0.08)',
                          neutral: 'rgba(59,130,246,0.08)',
                        }),
                      }}
                      content={renderTimelineChartTooltip(dataset.valence)}
                    />
                  </LineChart>
                </ChartContainer>
              </div>
            )}
            {entriesByYear.map(({ yearEntry, monthEntries }) => {
              const stats = yearEntry.data?.stats;
              const primaryMetric = stats ? stats[getPrimaryMetric(dataset.tracking)] : 0;
              const primaryValenceMetric = stats
                ? getValenceValueForNumber(primaryMetric ?? 0, undefined, dataset.tracking)
                : 0;
              const yearNumbers = yearEntry.data?.numbers ?? [];
              const yearChartNumbers = getChartNumbers(yearNumbers, undefined, dataset.tracking);
              const yearChartData = getChartData(yearChartNumbers, dataset.tracking);
              const isActiveYear = activeYearKey === yearEntry.dateKey;
              const badgeClasses = getValueForValence(primaryValenceMetric, dataset.valence, {
                good: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200',
                bad: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-200',
                neutral: 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-200',
              });

              return (
                <div key={yearEntry.dateKey} className="space-y-2">
                  <a
                    href={`#year-${yearEntry.dateKey}`}
                    onClick={() => setActiveYearKey(yearEntry.dateKey as YearKey)}
                    className={cn(
                      'block rounded-lg border px-3 py-2 text-sm shadow-sm transition',
                      isActiveYear
                        ? 'border-blue-300/80 bg-blue-50/80 dark:border-blue-400/40 dark:bg-blue-950/40'
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:hover:border-slate-700'
                    )}
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
                    <div className="text-[11px] text-slate-400">{yearEntry.data?.stats.count ?? 0} entries</div>
                    {yearChartData.length > 1 && (
                      <ChartContainer
                        config={{ numbers: { color: getValueForValence(primaryValenceMetric, dataset.valence, {
                          good: '#22c55e',
                          bad: '#ef4444',
                          neutral: '#3b82f6',
                        }) } }}
                        className="mt-2 h-8 w-full"
                      >
                        <LineChart width={180} height={32} data={yearChartData} margin={{ top: 6, right: 0, left: 0, bottom: 4 }}>
                          <Line
                            type="monotone"
                            dataKey="y"
                            stroke={getValueForValence(primaryValenceMetric, dataset.valence, {
                              good: '#22c55e',
                              bad: '#ef4444',
                              neutral: '#3b82f6',
                            })}
                            strokeWidth={2}
                            dot={false}
                            isAnimationActive={false}
                          />
                          <ChartTooltip
                            cursor={{
                              fill: getValueForValence(primaryValenceMetric, dataset.valence, {
                                good: 'rgba(16,185,129,0.08)',
                                bad: 'rgba(239,68,68,0.08)',
                                neutral: 'rgba(59,130,246,0.08)',
                              }),
                            }}
                            content={renderTimelineChartTooltip(dataset.valence)}
                          />
                        </LineChart>
                      </ChartContainer>
                    )}
                  </a>
                  {isActiveYear && (
                    <div className="space-y-2 border-l border-slate-200 pl-3 dark:border-slate-800">
                      {monthEntries.map(({ monthEntry }) => {
                        const isActiveMonth = activeMonthKey === monthEntry.dateKey;
                        const monthDots = activeYearMonthDots[monthEntry.dateKey as MonthKey] ?? [];
                        const monthStats = monthEntry.data?.stats;
                        const monthPrimaryMetric = monthStats ? monthStats[getPrimaryMetric(dataset.tracking)] : 0;
                        const monthPrimaryValence = monthStats
                          ? getValenceValueForNumber(monthPrimaryMetric ?? 0, undefined, dataset.tracking)
                          : 0;
                        const monthBadgeClasses = getValueForValence(monthPrimaryValence, dataset.valence, {
                          good: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200',
                          bad: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-200',
                          neutral: 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-200',
                        });
                        return (
                          <a
                            key={monthEntry.dateKey}
                            href={`#month-${monthEntry.dateKey}`}
                            className={cn(
                              'relative flex gap-2 rounded-md px-2 py-1 transition',
                              isActiveMonth
                                ? 'bg-blue-50/70 text-blue-700 dark:bg-blue-950/40 dark:text-blue-200'
                                : 'text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-900/40'
                            )}
                          >
                            <span
                              className={cn(
                                'mt-1 h-2 w-2 rounded-full border',
                                isActiveMonth
                                  ? 'border-blue-500 bg-blue-500'
                                  : 'border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-900'
                              )}
                            />
                            <div className="flex min-w-0 flex-1 flex-col gap-1">
                              <div className="flex items-center justify-between gap-2">
                                <div className={cn('text-xs font-medium', isActiveMonth && 'font-semibold')}>
                                  {monthEntry.title}
                                </div>
                                <div className={cn('rounded-full px-2 py-0.5 text-[10px] font-semibold', monthBadgeClasses)}>
                                  <NumberText
                                    value={monthPrimaryMetric}
                                    valenceValue={monthPrimaryValence}
                                    valence={dataset.valence}
                                    formatOptions={shortNumberFormat}
                                  />
                                </div>
                              </div>
                              <div className="grid grid-cols-7 gap-0.5 w-fit">
                                {monthDots}
                              </div>
                            </div>
                          </a>
                        );
                      })}
                    </div>
                  )}
                </div>
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
                  <div
                    key={monthEntry.dateKey}
                    id={`month-${monthEntry.dateKey}`}
                    data-month-key={monthEntry.dateKey}
                    className="space-y-5"
                  >
                    {(monthEntry.data?.numbers.length ?? 0) > 0 && (
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
                    {weekEntries.map(({ weekKey, weekEntry, dayEntries }) => (
                      <div key={weekKey} className="space-y-3">
                        {weekEntry && (
                          <TimelineEntryCard
                            entry={weekEntry}
                            achievements={achievementResultsByDateKey[weekEntry.dateKey] ?? []}
                            noteText={notesByDateKey.get(weekEntry.dateKey)}
                            valence={dataset.valence}
                            tracking={dataset.tracking}
                            onOpen={handleOpenEntry}
                            isSelected={panelProps.isOpen && panelProps.dateKey === weekEntry.dateKey}
                          />
                        )}
                        {dayEntries.length > 0 && (
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
                        )}
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
