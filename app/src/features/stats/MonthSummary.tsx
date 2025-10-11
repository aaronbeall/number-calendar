import React from 'react';
import { CheckCircle, XCircle, Clock } from 'lucide-react';
import { computeNumberStats } from '@/lib/stats';

export interface MonthSummaryProps {
  numbers: number[];
  monthName?: string;
  isCurrentMonth?: boolean;
}

export const MonthSummary: React.FC<MonthSummaryProps> = ({ numbers, monthName, isCurrentMonth }) => {
  const s = computeNumberStats(numbers);
  if (!s) return (
    <div className="text-sm text-slate-500">No data</div>
  );
  const stats = { ...s, mean: s.mean };

  const bgClasses = stats.total > 0
    ? 'bg-green-100 border-green-200'
    : stats.total < 0
    ? 'bg-red-100 border-red-200'
    : 'bg-slate-200 border-slate-300';

  const bottomBorderClasses = stats.total > 0
    ? 'border-b-4 border-green-400'
    : stats.total < 0
    ? 'border-b-4 border-red-400'
    : 'border-b-4 border-slate-400';

  const meanText = stats.mean > 0 ? 'text-green-700' : stats.mean < 0 ? 'text-red-700' : 'text-slate-700';
  const medianText = stats.median > 0 ? 'text-green-700' : stats.median < 0 ? 'text-red-700' : 'text-slate-700';

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
    <div className={`rounded-lg ${bgClasses} ${bottomBorderClasses} shadow-lg`} aria-label="Monthly summary">
      <div className="w-full flex items-center justify-between gap-3 sm:gap-6 px-4 py-3">
        {/* Month Label - Header Style */}
        <div className="flex-shrink-0">
          <div className="flex items-center gap-2">
            {getStatusIcon()}
            <div>
              <h3 className="text-lg font-bold text-slate-800 tracking-tight">
                {monthName || 'Month'}
              </h3>
              <p className="text-[11px] text-slate-500 font-medium">{stats.count} entries</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 sm:gap-6">

          {/* Mean / Median (secondary) */}
          <div className="hidden sm:flex items-center gap-4">
            <div className="text-right">
              <div className="text-[11px] uppercase tracking-wide text-slate-500 font-medium">Mean</div>
              <div className={`font-mono text-sm sm:text-base font-bold ${meanText}`}>{Number.isFinite(stats.mean) ? stats.mean.toFixed(1) : '-'}</div>
            </div>
            <div className="text-right">
              <div className="text-[11px] uppercase tracking-wide text-slate-500 font-medium">Median</div>
              <div className={`font-mono text-sm sm:text-base font-bold ${medianText}`}>{Number.isFinite(stats.median) ? stats.median : '-'}</div>
            </div>
          </div>

          <div className="hidden md:block w-px h-7 bg-slate-300/50" />

          {/* Min / Max (tertiary) */}
          <div className="hidden md:flex items-center gap-4">
            <div className="text-right">
              <div className="text-[11px] uppercase tracking-wide text-slate-500 font-medium">Min</div>
              <div className={`font-mono text-base font-bold ${stats.min >= 0 ? 'text-green-700' : 'text-red-700'}`}>{stats.min}</div>
            </div>
            <div className="text-right">
              <div className="text-[11px] uppercase tracking-wide text-slate-500 font-medium">Max</div>
              <div className={`font-mono text-base font-bold ${stats.max >= 0 ? 'text-green-700' : 'text-red-700'}`}>{stats.max}</div>
            </div>
          </div>

          <div className="hidden sm:block w-px h-7 bg-slate-300/50" />

          {/* Total (most prominent, right-most, own container) */}
          <div className={`flex items-center gap-3 px-5 py-4 rounded-lg font-mono font-black shadow-lg ${
            stats.total > 0
              ? 'bg-green-200 text-green-700 shadow-green-200/50'
              : stats.total < 0
              ? 'bg-red-200 text-red-700 shadow-red-200/50'
              : 'bg-slate-300 text-slate-700 shadow-slate-200/50'
          }`}>
            <div className="text-[11px] uppercase tracking-wide text-slate-600 font-bold">Total</div>
            <div className={`text-2xl sm:text-3xl font-black tracking-tight`}>{stats.total}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

