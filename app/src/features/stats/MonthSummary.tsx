import { NumberText } from '@/components/ui/number-text';
import type { Tracking, Valence } from '@/features/db/localdb';
import { type StatsExtremes } from '@/lib/stats';
import { getValueForValence } from '@/lib/valence';
import { getCalendarData } from '@/lib/calendar';
import type { PeriodAggregateData } from '@/lib/period-aggregate';
import { CheckCircle, Clock, TrendingDown, TrendingUp, XCircle } from 'lucide-react';
import React, { useMemo } from 'react';
import { MetricChip } from './MetricChip';

export interface MonthSummaryProps {
  data: PeriodAggregateData<'month'>;
  monthName?: string;
  isCurrentMonth?: boolean;
  yearExtremes?: StatsExtremes;
  valence: Valence;
  tracking: Tracking;
  isPanelOpen?: boolean;
  onSelect?: () => void;
}

export const MonthSummary: React.FC<MonthSummaryProps> = ({ data, monthName, isCurrentMonth, yearExtremes, valence, tracking, isPanelOpen = false, onSelect }) => {
  // Use getCalendarData for all stats, deltas, valence, etc.
  const {
    stats,
    valenceStats,
    primaryMetric,
    primaryMetricLabel,
    primaryValenceMetric,
    secondaryMetric,
    secondaryMetricLabel,
    secondaryMetricFormat,
    changeMetric,
    isHighestMean,
    isLowestMean,
    isHighestMedian,
    isLowestMedian,
    isHighestMin,
    isLowestMin,
    isHighestMax,
    isLowestMax,
  } = useMemo(() => getCalendarData(data, yearExtremes, tracking), [data, yearExtremes, tracking]);

  if (!stats) return (
    <div className="text-sm text-slate-500">No data</div>
  );

  const bgClasses = getValueForValence(primaryValenceMetric, valence, {
    good: 'bg-green-100 dark:bg-[#1a3a2a]',
    bad: 'bg-red-100 dark:bg-[#3a1a1a]',
    neutral: 'bg-slate-200 dark:bg-slate-800',
  });

  const bottomBorderClasses = getValueForValence(primaryValenceMetric, valence, {
    good: 'border-b-4 border-green-400 dark:border-green-600',
    bad: 'border-b-4 border-red-400 dark:border-red-600',
    neutral: 'border-b-4 border-slate-400 dark:border-slate-600',
  });

  // Determine icon based on valence, primary metric, and current month status
  const getStatusIcon = () => {
    if (isCurrentMonth) {
      return <Clock className="w-5 h-5 text-blue-600" />;
    }
    return getValueForValence(primaryValenceMetric, valence, {
      good: <CheckCircle className="w-5 h-5 text-green-600" />,
      bad: <XCircle className="w-5 h-5 text-red-600" />,
      neutral: (primaryValenceMetric ?? 0) > 0 ? <TrendingUp className="w-5 h-5 text-blue-600" /> : (primaryValenceMetric ?? 0) < 0 ? <TrendingDown className="w-5 h-5 text-blue-600" /> : <Clock className="w-5 h-5 text-blue-600" />,
    });
  };

  const selectedRing = isPanelOpen ? 'ring-2 ring-blue-400/80 ring-offset-2 ring-offset-white dark:ring-blue-300/70 dark:ring-offset-slate-900' : '';

  return (
    <div 
      className={`rounded-lg ${bgClasses} ${bottomBorderClasses} shadow-lg dark:shadow-xl ${selectedRing} ${onSelect ? 'cursor-pointer hover:shadow-xl dark:hover:shadow-2xl transition-shadow' : ''}`}
      onClick={onSelect}
      role={onSelect ? 'button' : undefined}
      tabIndex={onSelect ? 0 : undefined}
      aria-label="Monthly summary"
    >
      <div className="w-full flex items-center justify-between gap-3 sm:gap-6 px-4 py-3">
        {/* Month Label - Header Style */}
        <div className="flex-shrink-0">
          <div className="flex items-center gap-2">
            {getStatusIcon()}
            <div>
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 tracking-tight">
                {monthName || 'Month'}
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">{stats.count} entries</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 sm:gap-6">

          {/* Mean / Median (secondary) */}
          <div className="hidden sm:flex items-center gap-4">
            <div className="text-right">
              <div className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400 font-medium">Mean</div>
              <NumberText value={stats.mean} valenceValue={valenceStats?.mean ?? primaryValenceMetric} isHighest={!!isHighestMean} isLowest={!!isLowestMean} valence={valence} className="font-mono text-sm sm:text-base font-bold" short />
            </div>
            <div className="text-right">
              <div className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400 font-medium">Median</div>
              <NumberText value={stats.median} valenceValue={valenceStats?.median ?? primaryValenceMetric} isHighest={!!isHighestMedian} isLowest={!!isLowestMedian} valence={valence} className="font-mono text-sm sm:text-base font-bold" short />
            </div>
          </div>

          <div className="hidden md:block w-px h-7 bg-slate-300/50 dark:bg-slate-700/50" />

          {/* Min / Max (tertiary) */}
          <div className="hidden md:flex items-center gap-4">
            <div className="text-right">
              <div className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400 font-medium">Min</div>
              <NumberText value={stats.min} valenceValue={valenceStats?.min ?? primaryValenceMetric} isHighest={!!isHighestMin} isLowest={!!isLowestMin} valence={valence} className="font-mono text-base font-bold" short />
            </div>
            <div className="text-right">
              <div className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400 font-medium">Max</div>
              <NumberText value={stats.max} valenceValue={valenceStats?.max ?? primaryValenceMetric} isHighest={!!isHighestMax} isLowest={!!isLowestMax} valence={valence} className="font-mono text-base font-bold" short />
            </div>
          </div>

          <div className="hidden sm:block w-px h-7 bg-slate-300/50 dark:bg-slate-700/50" />

          {/* Primary metric (most prominent, right-most, own container) */}
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

