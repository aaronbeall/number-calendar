import React from 'react';
import { CheckCircle, XCircle, Clock, Trophy, Skull } from 'lucide-react';
import { computeNumberStats, type StatsExtremes } from '@/lib/stats';

export interface MonthSummaryProps {
  numbers: number[];
  monthName?: string;
  isCurrentMonth?: boolean;
  yearExtremes?: StatsExtremes;
}

export const MonthSummary: React.FC<MonthSummaryProps> = ({ numbers, monthName, isCurrentMonth, yearExtremes }) => {
  const s = computeNumberStats(numbers);
  if (!s) return (
    <div className="text-sm text-slate-500">No data</div>
  );
  const stats = { ...s, mean: s.mean };

  // Check if this month has any extreme values across the year
  const isHighestTotal = yearExtremes?.highestTotal !== undefined && stats.total === yearExtremes.highestTotal;
  const isLowestTotal = yearExtremes?.lowestTotal !== undefined && stats.total === yearExtremes.lowestTotal;
  const isHighestMean = yearExtremes?.highestMean !== undefined && stats.mean === yearExtremes.highestMean;
  const isLowestMean = yearExtremes?.lowestMean !== undefined && stats.mean === yearExtremes.lowestMean;
  const isHighestMedian = yearExtremes?.highestMedian !== undefined && stats.median === yearExtremes.highestMedian;
  const isLowestMedian = yearExtremes?.lowestMedian !== undefined && stats.median === yearExtremes.lowestMedian;
  const isHighestMin = yearExtremes?.highestMin !== undefined && stats.min === yearExtremes.highestMin;
  const isLowestMin = yearExtremes?.lowestMin !== undefined && stats.min === yearExtremes.lowestMin;
  const isHighestMax = yearExtremes?.highestMax !== undefined && stats.max === yearExtremes.highestMax;
  const isLowestMax = yearExtremes?.lowestMax !== undefined && stats.max === yearExtremes.lowestMax;

  const bgClasses = stats.total > 0
  ? 'bg-green-100 dark:bg-[#1a3a2a]'
  : stats.total < 0
  ? 'bg-red-100 dark:bg-[#3a1a1a]'
  : 'bg-slate-200 dark:bg-slate-800';

  const bottomBorderClasses = stats.total > 0
    ? 'border-b-4 border-green-400 dark:border-green-600'
    : stats.total < 0
    ? 'border-b-4 border-red-400 dark:border-red-600'
    : 'border-b-4 border-slate-400 dark:border-slate-600';

  const meanText = stats.mean > 0 ? 'text-green-700 dark:text-green-300' : stats.mean < 0 ? 'text-red-700 dark:text-red-300' : 'text-slate-700 dark:text-slate-200';
  const medianText = stats.median > 0 ? 'text-green-700 dark:text-green-300' : stats.median < 0 ? 'text-red-700 dark:text-red-300' : 'text-slate-700 dark:text-slate-200';

  // Determine icon based on total and current month status
  const getStatusIcon = () => {
    if (isCurrentMonth) {
      return <Clock className="w-5 h-5 text-blue-600" />;
    } else if (stats.total > 0) {
      return <CheckCircle className="w-5 h-5 text-green-600" />;
    } else {
      return <XCircle className="w-5 h-5 text-red-600" />;
    }
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
              {(isHighestMean || isLowestMean) ? (
                <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border ${
                  isHighestMean
                    ? 'bg-green-50/40 dark:bg-green-950/20 border-green-200/40 dark:border-green-800/40'
                    : 'bg-red-50/40 dark:bg-red-950/20 border-red-200/40 dark:border-red-800/40'
                }`}>
                  <span className={`font-mono text-sm sm:text-base font-bold ${meanText}`}>
                    {Number.isFinite(stats.mean) ? stats.mean.toFixed(1) : '-'}
                  </span>
                  {isHighestMean ? (
                    <Trophy className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
                  ) : (
                    <Skull className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
                  )}
                </div>
              ) : (
                <div className={`font-mono text-sm sm:text-base font-bold ${meanText}`}>
                  {Number.isFinite(stats.mean) ? stats.mean.toFixed(1) : '-'}
                </div>
              )}
            </div>
            <div className="text-right">
              <div className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400 font-medium">Median</div>
              {(isHighestMedian || isLowestMedian) ? (
                <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border ${
                  isHighestMedian
                    ? 'bg-green-50/40 dark:bg-green-950/20 border-green-200/40 dark:border-green-800/40'
                    : 'bg-red-50/40 dark:bg-red-950/20 border-red-200/40 dark:border-red-800/40'
                }`}>
                  <span className={`font-mono text-sm sm:text-base font-bold ${medianText}`}>
                    {Number.isFinite(stats.median) ? stats.median : '-'}
                  </span>
                  {isHighestMedian ? (
                    <Trophy className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
                  ) : (
                    <Skull className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
                  )}
                </div>
              ) : (
                <div className={`font-mono text-sm sm:text-base font-bold ${medianText}`}>
                  {Number.isFinite(stats.median) ? stats.median : '-'}
                </div>
              )}
            </div>
          </div>

          <div className="hidden md:block w-px h-7 bg-slate-300/50 dark:bg-slate-700/50" />

          {/* Min / Max (tertiary) */}
          <div className="hidden md:flex items-center gap-4">
            <div className="text-right">
              <div className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400 font-medium">Min</div>
              {(isHighestMin || isLowestMin) ? (
                <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border ${
                  isHighestMin
                    ? 'bg-green-50/40 dark:bg-green-950/20 border-green-200/40 dark:border-green-800/40'
                    : 'bg-red-50/40 dark:bg-red-950/20 border-red-200/40 dark:border-red-800/40'
                }`}>
                  <span className={`font-mono text-base font-bold ${stats.min >= 0 ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}`}>
                    {stats.min}
                  </span>
                  {isHighestMin ? (
                    <Trophy className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
                  ) : (
                    <Skull className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
                  )}
                </div>
              ) : (
                <div className={`font-mono text-base font-bold ${stats.min >= 0 ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}`}>
                  {stats.min}
                </div>
              )}
            </div>
            <div className="text-right">
              <div className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400 font-medium">Max</div>
              {(isHighestMax || isLowestMax) ? (
                <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border ${
                  isHighestMax
                    ? 'bg-green-50/40 dark:bg-green-950/20 border-green-200/40 dark:border-green-800/40'
                    : 'bg-red-50/40 dark:bg-red-950/20 border-red-200/40 dark:border-red-800/40'
                }`}>
                  <span className={`font-mono text-base font-bold ${stats.max >= 0 ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}`}>
                    {stats.max}
                  </span>
                  {isHighestMax ? (
                    <Trophy className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
                  ) : (
                    <Skull className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
                  )}
                </div>
              ) : (
                <div className={`font-mono text-base font-bold ${stats.max >= 0 ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}`}>
                  {stats.max}
                </div>
              )}
            </div>
          </div>

          <div className="hidden sm:block w-px h-7 bg-slate-300/50 dark:bg-slate-700/50" />

          {/* Total (most prominent, right-most, own container) */}
          <div className={`flex items-center gap-3 px-5 py-4 rounded-lg font-mono font-black shadow-lg dark:shadow-xl ${
            stats.total > 0
              ? 'bg-green-200 dark:bg-green-950 text-green-700 dark:text-green-300 shadow-green-200/50 dark:shadow-green-900/50'
              : stats.total < 0
              ? 'bg-red-200 dark:bg-red-950 text-red-700 dark:text-red-300 shadow-red-200/50 dark:shadow-red-900/50'
              : 'bg-slate-300 dark:bg-slate-800 text-slate-700 dark:text-slate-200 shadow-slate-200/50 dark:shadow-slate-900/50'
          }`}>
            <div className="text-[11px] uppercase tracking-wide text-slate-600 dark:text-slate-400 font-bold">Total</div>
            {(isHighestTotal || isLowestTotal) ? (
              <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded border ${
                isHighestTotal
                  ? 'bg-green-50/40 dark:bg-green-950/20 border-green-200/40 dark:border-green-800/40'
                  : 'bg-red-50/40 dark:bg-red-950/20 border-red-200/40 dark:border-red-800/40'
              }`}>
                <span className="text-2xl sm:text-3xl font-black tracking-tight">{stats.total}</span>
                {isHighestTotal ? (
                  <Trophy className="w-5 h-5 text-green-600 dark:text-green-400" />
                ) : (
                  <Skull className="w-5 h-5 text-red-600 dark:text-red-400" />
                )}
              </div>
            ) : (
              <div className="text-2xl sm:text-3xl font-black tracking-tight">{stats.total}</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

