import React from 'react';
import { CheckCircle, XCircle, Minus, Clock } from 'lucide-react';
import { computeNumberStats } from '@/lib/stats';

export interface WeekSummaryProps {
  numbers: number[];
  weekNumber?: number;
  isCurrentWeek?: boolean;
}

export const WeekSummary: React.FC<WeekSummaryProps> = ({ numbers, weekNumber, isCurrentWeek }) => {
  if (!numbers || numbers.length === 0) return null;

  const stats = computeNumberStats(numbers);
  if (!stats) return null;
  const { count, total, mean, median, min, max } = stats;

  const bgClasses = total > 0
    ? 'bg-green-50'
    : total < 0
    ? 'bg-red-50'
    : 'bg-slate-50';

  const borderClasses = total > 0
    ? 'border-r-4 border-green-400'
    : total < 0
    ? 'border-r-4 border-red-400'
    : 'border-r-4 border-slate-400';

  const meanText = mean > 0 ? 'text-green-700' : mean < 0 ? 'text-red-700' : 'text-slate-700';
  const medianText = median > 0 ? 'text-green-700' : median < 0 ? 'text-red-700' : 'text-slate-700';

  // Choose icon based on total
  const getStatusIcon = () => {
    if (isCurrentWeek) {
      return <Clock className="w-4 h-4 text-blue-600" />;
    } else if (total > 0) {
      return <CheckCircle className="w-4 h-4 text-green-600" />;
    } else if (total < 0) {
      return <XCircle className="w-4 h-4 text-red-600" />;
    } else {
      return <Minus className="w-4 h-4 text-slate-600" />;
    }
  };

  return (
  <div className={`rounded-md ${bgClasses} ${borderClasses} shadow-sm hover:shadow-md transition-shadow`} aria-label="Weekly summary">
      <div className="w-full flex items-center justify-between gap-3 sm:gap-5 px-3 py-2">
        {/* Week Label + entries */}
        <div className="flex-shrink-0">
          <div className="flex items-center gap-2">
            {getStatusIcon()}
            <div>
              <div className="text-xs font-medium text-slate-600">Week {weekNumber || '?'}</div>
              <div className="text-[10px] text-slate-500">{count} entries</div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 sm:gap-5">
          {/* spacer removed */}

          {/* Mean / Median (secondary) */}
          <div className="hidden sm:flex items-center gap-3">
            <div className="text-right">
              <div className="text-[10px] uppercase tracking-wide text-slate-500">Mean</div>
              <div className={`font-mono text-xs sm:text-sm font-semibold ${meanText}`}>{Number.isFinite(mean) ? mean.toFixed(1) : '-'}</div>
            </div>
            <div className="text-right">
              <div className="text-[10px] uppercase tracking-wide text-slate-500">Median</div>
              <div className={`font-mono text-xs sm:text-sm font-semibold ${medianText}`}>{Number.isFinite(median) ? median : '-'}</div>
            </div>
          </div>

          <div className="hidden md:block w-px h-6 bg-slate-300/40" />

          {/* Min / Max (tertiary) */}
          <div className="hidden md:flex items-center gap-3">
            <div className="text-right">
              <div className="text-[10px] uppercase tracking-wide text-slate-500">Min</div>
              <div className={`font-mono text-sm font-semibold ${min >= 0 ? 'text-green-700' : 'text-red-700'}`}>{min}</div>
            </div>
            <div className="text-right">
              <div className="text-[10px] uppercase tracking-wide text-slate-500">Max</div>
              <div className={`font-mono text-sm font-semibold ${max >= 0 ? 'text-green-700' : 'text-red-700'}`}>{max}</div>
            </div>
          </div>

          <div className="hidden sm:block w-px h-6 bg-slate-300/40" />

          {/* Total (most prominent, right-most, own container) */}
          <div className={`flex items-center gap-2 px-3 py-2 rounded font-mono font-bold ${
            total > 0
              ? 'bg-green-100 text-green-700'
              : total < 0
              ? 'bg-red-100 text-red-700'
              : 'bg-slate-100 text-slate-700'
          }`}>
            <div className="text-[10px] uppercase tracking-wide text-slate-500">Total</div>
            <div className={`text-lg sm:text-xl font-extrabold`}>{total}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WeekSummary;
