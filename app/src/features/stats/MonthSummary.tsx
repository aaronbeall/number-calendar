import React, { useMemo } from 'react';
import { CheckCircle, XCircle, Clock, TrendingUp, TrendingDown } from 'lucide-react';
import { computeNumberStats, type StatsExtremes, getPrimaryMetric, getPrimaryMetricLabel, getPrimaryMetricHighFromExtremes, getPrimaryMetricLowFromExtremes } from '@/lib/stats';
import { NumberText } from '@/components/ui/number-text';
import type { Valence, Tracking } from '@/features/db/localdb';
import { getValueForValence } from '@/lib/valence';

export interface MonthSummaryProps {
  numbers: number[];
  monthName?: string;
  isCurrentMonth?: boolean;
  yearExtremes?: StatsExtremes;
  valence: Valence;
  tracking: Tracking;
}

export const MonthSummary: React.FC<MonthSummaryProps> = ({ numbers, monthName, isCurrentMonth, yearExtremes, valence, tracking }) => {
  const rawStats = useMemo(() => computeNumberStats(numbers), [numbers]);
  if (!rawStats) return (
    <div className="text-sm text-slate-500">No data</div>
  );
  const stats = { ...rawStats, mean: rawStats.mean };
  const primaryMetric = stats[getPrimaryMetric(tracking)];
  const primaryLabel = getPrimaryMetricLabel(tracking);
  // Check if this month has any extreme values across the year
  const isHighestPrimary = yearExtremes && primaryMetric === getPrimaryMetricHighFromExtremes(yearExtremes, tracking);
  const isLowestPrimary = yearExtremes && primaryMetric === getPrimaryMetricLowFromExtremes(yearExtremes, tracking);
  const isHighestMean = yearExtremes?.highestMean !== undefined && stats.mean === yearExtremes.highestMean;
  const isLowestMean = yearExtremes?.lowestMean !== undefined && stats.mean === yearExtremes.lowestMean;
  const isHighestMedian = yearExtremes?.highestMedian !== undefined && stats.median === yearExtremes.highestMedian;
  const isLowestMedian = yearExtremes?.lowestMedian !== undefined && stats.median === yearExtremes.lowestMedian;
  const isHighestMin = yearExtremes?.highestMin !== undefined && stats.min === yearExtremes.highestMin;
  const isLowestMin = yearExtremes?.lowestMin !== undefined && stats.min === yearExtremes.lowestMin;
  const isHighestMax = yearExtremes?.highestMax !== undefined && stats.max === yearExtremes.highestMax;
  const isLowestMax = yearExtremes?.lowestMax !== undefined && stats.max === yearExtremes.lowestMax;

  const bgClasses = getValueForValence(primaryMetric, valence, {
    good: 'bg-green-100 dark:bg-[#1a3a2a]',
    bad: 'bg-red-100 dark:bg-[#3a1a1a]',
    neutral: 'bg-slate-200 dark:bg-slate-800',
  });

  const bottomBorderClasses = getValueForValence(primaryMetric, valence, {
    good: 'border-b-4 border-green-400 dark:border-green-600',
    bad: 'border-b-4 border-red-400 dark:border-red-600',
    neutral: 'border-b-4 border-slate-400 dark:border-slate-600',
  });

  // Value coloring handled by NumberText with valence

  // Determine icon based on valence, primary metric, and current month status
  const getStatusIcon = () => {
    if (isCurrentMonth) {
      return <Clock className="w-5 h-5 text-blue-600" />;
    }
    return getValueForValence(primaryMetric, valence, {
      good: <CheckCircle className="w-5 h-5 text-green-600" />,
      bad: <XCircle className="w-5 h-5 text-red-600" />,
      neutral: primaryMetric > 0 ? <TrendingUp className="w-5 h-5 text-blue-600" /> : primaryMetric < 0 ? <TrendingDown className="w-5 h-5 text-blue-600" /> : <Clock className="w-5 h-5 text-blue-600" />,
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
              <NumberText value={stats.mean} isHighest={isHighestMean} isLowest={isLowestMean} valence={valence} className="font-mono text-sm sm:text-base font-bold" formatOptions={{ minimumFractionDigits: 1, maximumFractionDigits: 1 }} />
            </div>
            <div className="text-right">
              <div className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400 font-medium">Median</div>
              <NumberText value={stats.median} isHighest={isHighestMedian} isLowest={isLowestMedian} valence={valence} className="font-mono text-sm sm:text-base font-bold" />
            </div>
          </div>

          <div className="hidden md:block w-px h-7 bg-slate-300/50 dark:bg-slate-700/50" />

          {/* Min / Max (tertiary) */}
          <div className="hidden md:flex items-center gap-4">
            <div className="text-right">
              <div className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400 font-medium">Min</div>
              <NumberText value={stats.min} isHighest={isHighestMin} isLowest={isLowestMin} valence={valence} className="font-mono text-base font-bold" />
            </div>
            <div className="text-right">
              <div className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400 font-medium">Max</div>
              <NumberText value={stats.max} isHighest={isHighestMax} isLowest={isLowestMax} valence={valence} className="font-mono text-base font-bold" />
            </div>
          </div>

          <div className="hidden sm:block w-px h-7 bg-slate-300/50 dark:bg-slate-700/50" />

          {/* Primary metric (most prominent, right-most, own container) */}
          <div className={`flex items-center gap-3 px-5 py-4 rounded-lg font-mono font-black shadow-lg dark:shadow-xl ${getValueForValence(primaryMetric, valence, {
            good: 'bg-green-200 dark:bg-green-950 text-green-700 dark:text-green-300 shadow-green-200/50 dark:shadow-green-900/50',
            bad: 'bg-red-200 dark:bg-red-950 text-red-700 dark:text-red-300 shadow-red-200/50 dark:shadow-red-900/50',
            neutral: 'bg-slate-300 dark:bg-slate-800 text-slate-700 dark:text-slate-200 shadow-slate-200/50 dark:shadow-slate-900/50',
          })}`}>
            <div className="text-[11px] uppercase tracking-wide text-slate-600 dark:text-slate-400 font-bold">{primaryLabel}</div>
            <NumberText value={primaryMetric} isHighest={!!isHighestPrimary} isLowest={!!isLowestPrimary} valence={valence} className="text-2xl sm:text-3xl font-black tracking-tight" />
          </div>
        </div>
      </div>
    </div>
  );
};

