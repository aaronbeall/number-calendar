import { NumberText, shortNumberFormat } from '@/components/ui/number-text';
import type { Tracking, Valence } from '@/features/db/localdb';
import { type StatsExtremes } from '@/lib/stats';
import { getValueForValence } from '@/lib/valence';
import { getCalendarData } from '@/lib/calendar';
import type { PeriodAggregateData } from '@/lib/period-aggregate';
import { CheckCircle, Clock, TrendingDown, TrendingUp, XCircle } from 'lucide-react';
import React, { useMemo } from 'react';

export interface MonthSummaryProps {
  data: PeriodAggregateData<'month'>;
  monthName?: string;
  isCurrentMonth?: boolean;
  yearExtremes?: StatsExtremes;
  valence: Valence;
  tracking: Tracking;
}

export const MonthSummary: React.FC<MonthSummaryProps> = ({ data, monthName, isCurrentMonth, yearExtremes, valence, tracking }) => {
  // Use getCalendarData for all stats, deltas, valence, etc.
  const {
    stats,
    valenceStats,
    primaryMetric,
    primaryMetricLabel,
    primaryValenceMetric,
    isHighestPrimary,
    isLowestPrimary,
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

  return (
    <div className={`rounded-lg ${bgClasses} ${bottomBorderClasses} shadow-lg dark:shadow-xl`} aria-label="Monthly summary">
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
              <NumberText value={stats.mean} valenceValue={valenceStats?.mean ?? primaryValenceMetric} isHighest={!!isHighestMean} isLowest={!!isLowestMean} valence={valence} className="font-mono text-sm sm:text-base font-bold" formatOptions={{ minimumFractionDigits: 1, maximumFractionDigits: 1 }} />
            </div>
            <div className="text-right">
              <div className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400 font-medium">Median</div>
              <NumberText value={stats.median} valenceValue={valenceStats?.median ?? primaryValenceMetric} isHighest={!!isHighestMedian} isLowest={!!isLowestMedian} valence={valence} className="font-mono text-sm sm:text-base font-bold" formatOptions={shortNumberFormat} />
            </div>
          </div>

          <div className="hidden md:block w-px h-7 bg-slate-300/50 dark:bg-slate-700/50" />

          {/* Min / Max (tertiary) */}
          <div className="hidden md:flex items-center gap-4">
            <div className="text-right">
              <div className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400 font-medium">Min</div>
              <NumberText value={stats.min} valenceValue={valenceStats?.min ?? primaryValenceMetric} isHighest={!!isHighestMin} isLowest={!!isLowestMin} valence={valence} className="font-mono text-base font-bold" formatOptions={shortNumberFormat} />
            </div>
            <div className="text-right">
              <div className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400 font-medium">Max</div>
              <NumberText value={stats.max} valenceValue={valenceStats?.max ?? primaryValenceMetric} isHighest={!!isHighestMax} isLowest={!!isLowestMax} valence={valence} className="font-mono text-base font-bold" formatOptions={shortNumberFormat} />
            </div>
          </div>

          <div className="hidden sm:block w-px h-7 bg-slate-300/50 dark:bg-slate-700/50" />

          {/* Primary metric (most prominent, right-most, own container) */}
          <div className={`flex items-center gap-3 px-5 py-4 rounded-lg font-mono font-black shadow-lg dark:shadow-xl ${getValueForValence(primaryValenceMetric, valence, {
            good: 'bg-green-200 dark:bg-green-950 text-green-700 dark:text-green-300 shadow-green-200/50 dark:shadow-green-900/50',
            bad: 'bg-red-200 dark:bg-red-950 text-red-700 dark:text-red-300 shadow-red-200/50 dark:shadow-red-900/50',
            neutral: 'bg-slate-300 dark:bg-slate-800 text-slate-700 dark:text-slate-200 shadow-slate-200/50 dark:shadow-slate-900/50',
          })}`}>
            <div className="text-[11px] uppercase tracking-wide text-slate-600 dark:text-slate-400 font-bold">{primaryMetricLabel}</div>
            <NumberText value={primaryMetric} valenceValue={primaryValenceMetric} isHighest={!!isHighestPrimary} isLowest={!!isLowestPrimary} valence={valence} className="text-2xl sm:text-3xl font-black tracking-tight" />
          </div>
        </div>
      </div>
    </div>
  );
};

