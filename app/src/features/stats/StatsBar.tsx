import React from 'react';

export interface StatsBarProps {
  numbers: number[];
  monthName?: string;
}

function calcStats(numbers: number[]) {
  if (!numbers.length) return null;
  const total = numbers.reduce((a, b) => a + b, 0);
  const mean = total / numbers.length;
  const sorted = [...numbers].sort((a, b) => a - b);
  const median = sorted.length % 2 === 0
    ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
    : sorted[Math.floor(sorted.length / 2)];
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  return { total, mean, median, min, max, count: numbers.length };
}

export const StatsBar: React.FC<StatsBarProps> = ({ numbers, monthName }) => {
  const stats = calcStats(numbers);
  if (!stats) return (
    <div className="text-sm text-slate-500">No data</div>
  );

  const bgClasses = stats.total > 0
    ? 'bg-green-50 border-green-200'
    : stats.total < 0
    ? 'bg-red-50 border-red-200'
    : 'bg-slate-50 border-slate-200';

  const meanText = stats.mean > 0 ? 'text-green-700' : stats.mean < 0 ? 'text-red-700' : 'text-slate-700';
  const medianText = stats.median > 0 ? 'text-green-700' : stats.median < 0 ? 'text-red-700' : 'text-slate-700';

  return (
    <div className={`rounded-md border ${bgClasses} shadow-sm hover:shadow-md transition-shadow`} aria-label="Monthly summary">
      <div className="w-full flex items-center justify-between gap-3 sm:gap-5 px-3 py-2">
        {/* Month Label */}
        <div className="text-xs font-medium text-slate-600 flex-shrink-0">
          {monthName || 'Month'}
        </div>

        <div className="flex items-center gap-3 sm:gap-5">
          {/* Count (secondary) */}
          <div className="text-right">
            <div className="text-[10px] uppercase tracking-wide text-slate-500">Count</div>
            <div className="font-mono text-sm font-semibold text-slate-700">{stats.count}</div>
          </div>

          <div className="hidden sm:block w-px h-6 bg-slate-300/40" />

          {/* Mean / Median (secondary) */}
          <div className="hidden sm:flex items-center gap-3">
            <div className="text-right">
              <div className="text-[10px] uppercase tracking-wide text-slate-500">Mean</div>
              <div className={`font-mono text-xs sm:text-sm font-semibold ${meanText}`}>{Number.isFinite(stats.mean) ? stats.mean.toFixed(1) : '-'}</div>
            </div>
            <div className="text-right">
              <div className="text-[10px] uppercase tracking-wide text-slate-500">Median</div>
              <div className={`font-mono text-xs sm:text-sm font-semibold ${medianText}`}>{Number.isFinite(stats.median) ? stats.median : '-'}</div>
            </div>
          </div>

          <div className="hidden md:block w-px h-6 bg-slate-300/40" />

          {/* Min / Max (tertiary) */}
          <div className="hidden md:flex items-center gap-3">
            <div className="text-right">
              <div className="text-[10px] uppercase tracking-wide text-slate-500">Min</div>
              <div className={`font-mono text-sm font-semibold ${stats.min >= 0 ? 'text-green-700' : 'text-red-700'}`}>{stats.min}</div>
            </div>
            <div className="text-right">
              <div className="text-[10px] uppercase tracking-wide text-slate-500">Max</div>
              <div className={`font-mono text-sm font-semibold ${stats.max >= 0 ? 'text-green-700' : 'text-red-700'}`}>{stats.max}</div>
            </div>
          </div>

          <div className="hidden sm:block w-px h-6 bg-slate-300/40" />

          {/* Total (most prominent, right-most, own container) */}
          <div className={`flex items-center gap-2 px-3 py-2 rounded font-mono font-bold ${
            stats.total > 0
              ? 'bg-green-100 text-green-700'
              : stats.total < 0
              ? 'bg-red-100 text-red-700'
              : 'bg-slate-100 text-slate-700'
          }`}>
            <div className="text-[10px] uppercase tracking-wide text-slate-500">Total</div>
            <div className={`text-lg sm:text-xl font-extrabold`}>{stats.total}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

