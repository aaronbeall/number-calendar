import { NumberText } from '@/components/ui/number-text';
import type { Tracking, Valence } from '@/features/db/localdb';
import { getCalendarData } from '@/lib/calendar';
import type { PeriodAggregateData } from '@/lib/period-aggregate';
import { getValueForSign, getValueForValence } from '@/lib/valence';
import { Minus, TrendingDown, TrendingUp } from 'lucide-react';
import { useMemo, useState } from 'react';
import { MetricChip } from './MetricChip';
import AchievementBadge from '@/features/achievements/AchievementBadge';
import { PopoverTip, PopoverTipTrigger, PopoverTipContent } from '@/components/ui/popover-tip';
import type { CompletedAchievementResult } from '@/lib/goals';
import { cn } from '@/lib/utils';

interface YearSummaryProps {
  data: PeriodAggregateData<'year'>;
  yearName: string;
  valence: Valence;
  tracking: Tracking;
  isPanelOpen?: boolean;
  onSelect?: () => void;
  achievementResults?: CompletedAchievementResult[];
}

export function YearSummary({ data, yearName, valence, tracking, isPanelOpen = false, onSelect, achievementResults = [] }: YearSummaryProps) {
  const [hoveredAchievementId, setHoveredAchievementId] = useState<string | null>(null);
  const { stats, valenceStats, primaryMetric, primaryMetricLabel, primaryValenceMetric, secondaryMetric, secondaryMetricLabel, secondaryMetricFormat, changeMetric } = useMemo(
    () => getCalendarData(data, undefined, tracking),
    [data, tracking]
  );

  if (!stats) {
    return null;
  }

  // Choose icon based on valence and primary metric
  const IconComponent = getValueForSign(primaryValenceMetric, {
    positive: TrendingUp,
    negative: TrendingDown,
    zero: Minus,
  });

  // Color classes for background
  const bgClasses = getValueForValence(primaryValenceMetric, valence, {
    good: 'bg-gradient-to-r from-white to-emerald-100 dark:from-slate-900 dark:to-emerald-950',
    bad: 'bg-gradient-to-r from-white to-rose-100 dark:from-slate-900 dark:to-rose-950',
    neutral: 'bg-gradient-to-r from-white to-slate-100 dark:from-slate-900 dark:to-slate-700',
  });

  // Color classes for bottom border
  const bottomBorderClasses = getValueForValence(primaryValenceMetric, valence, {
    good: 'border-b-4 border-green-400 dark:border-green-700',
    bad: 'border-b-4 border-red-400 dark:border-red-700',
    neutral: 'border-b-4 border-slate-400 dark:border-slate-600',
  });

  const selectedRing = isPanelOpen ? 'ring-2 ring-blue-400/80 ring-offset-2 ring-offset-white dark:ring-blue-300/70 dark:ring-offset-slate-900' : '';

  return (
  <div 
    className={`${bgClasses} ${bottomBorderClasses} rounded-lg shadow-lg dark:shadow-xl p-6 ${selectedRing} ${onSelect ? 'cursor-pointer hover:shadow-xl dark:hover:shadow-2xl transition-shadow' : ''}`}
    onClick={onSelect}
    role={onSelect ? 'button' : undefined}
    tabIndex={onSelect ? 0 : undefined}
    aria-label="Year summary"
  >
  <div className="flex flex-col md:flex-row md:items-center gap-4">
    {/* Title/entries and achievements - stays together on small screens */}
    <div className="flex items-center justify-between md:justify-start gap-3 flex-shrink-0">
      <div className="flex items-center gap-3">
        <div className={`p-3 rounded-full ${getValueForValence(primaryValenceMetric, valence, {
          good: 'bg-green-100 dark:bg-[#1a3a2a] text-green-600 dark:text-green-200',
          bad: 'bg-red-100 dark:bg-[#3a1a1a] text-red-600 dark:text-red-200',
          neutral: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300',
        })}`}>
          <IconComponent className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-200">{yearName}</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">{stats.count} entries</p>
        </div>
      </div>

      {/* Achievements (graphic) - right side on small, inline on large */}
      {achievementResults.length > 0 && (
        <div className="flex items-center gap-1">
          {achievementResults.map(({ goal, achievement }) => (
            <PopoverTip key={achievement.id}>
              <PopoverTipTrigger asChild>
                <button
                  type="button"
                  className="flex items-center justify-center rounded-md p-0.5 outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
                  aria-label={goal.title}
                  onMouseEnter={() => setHoveredAchievementId(achievement.id)}
                  onMouseLeave={() => setHoveredAchievementId(null)}
                >
                  <AchievementBadge badge={goal.badge} size="small" animate={hoveredAchievementId === achievement.id} floating={false} className={cn(
                    hoveredAchievementId === achievement.id && "scale-120 z-10",
                    "transition-transform"
                  )} />
                </button>
              </PopoverTipTrigger>
              <PopoverTipContent>
                <div className="text-xs font-semibold text-slate-900 dark:text-slate-50">
                  {goal.title}
                </div>
                {goal.description && (
                  <div className="mt-0.5 text-[11px] text-slate-600 dark:text-slate-300">
                    {goal.description}
                  </div>
                )}
              </PopoverTipContent>
            </PopoverTip>
          ))}
        </div>
      )}
    </div>

    {/* Stats - full width on small, right-aligned on large */}
    <div className="flex flex-row w-full md:w-auto justify-between md:justify-start gap-0 md:gap-6 md:items-center md:ml-auto">
      <div className="flex-1 md:flex-none text-center md:text-right">
        <div className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400 font-medium">Mean</div>
        <NumberText
          value={stats.mean ?? null}
          valenceValue={valenceStats?.mean ?? primaryValenceMetric}
          valence={valence}
          className="font-mono text-lg font-bold"
          short
        />
      </div>
      <div className="flex-1 md:flex-none text-center md:text-right">
        <div className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400 font-medium">Median</div>
        <NumberText
          value={stats.median ?? null}
          valenceValue={valenceStats?.median ?? primaryValenceMetric}
          valence={valence}
          className="font-mono text-lg font-bold"
          short
        />
      </div>
      <div className="hidden md:block w-px h-7 bg-slate-300/50 dark:bg-slate-700/50" />
      <div className="flex-1 md:flex-none text-center md:text-right">
        <div className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400 font-medium">Min</div>
        <NumberText
          value={stats.min}
          valenceValue={valenceStats?.min ?? primaryValenceMetric}
          valence={valence}
          className="font-mono text-base font-bold"
          short
        />
      </div>
      <div className="flex-1 md:flex-none text-center md:text-right">
        <div className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400 font-medium">Max</div>
        <NumberText
          value={stats.max}
          valenceValue={valenceStats?.max ?? primaryValenceMetric}
          valence={valence}
          className="font-mono text-base font-bold"
          short
        />
      </div>
    </div>

    <div className="hidden md:block w-px h-7 bg-slate-300/50 dark:bg-slate-700/50" />

    {/* Primary metric - full width on small, inline on large */}
    <div className="w-full md:w-auto">
      <MetricChip
        primaryMetric={primaryMetric}
        primaryMetricLabel={primaryMetricLabel}
        primaryValenceMetric={primaryValenceMetric}
        secondaryMetric={secondaryMetric}
        secondaryMetricLabel={secondaryMetricLabel}
        secondaryMetricFormat={secondaryMetricFormat}
        changePercent={changeMetric}
        valence={valence}
      />
    </div>
  </div>
    </div>
  );
};