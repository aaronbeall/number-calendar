import { useMemo } from 'react';
import { computeNumberStats } from '@/lib/stats';

interface MonthCellProps {
  monthName: string;
  numbers: number[];
  isCurrentMonth: boolean;
  isFutureMonth?: boolean;
  onClick: () => void;
}

export function MonthCell({ monthName, numbers, isCurrentMonth, isFutureMonth = false, onClick }: MonthCellProps) {
  const stats = useMemo(() => computeNumberStats(numbers), [numbers]);
  
  // Unified tile style for monthly grid, with color effect
  const getColorClasses = () => {
    if (!stats) {
      return 'bg-slate-50 dark:bg-slate-800 shadow-sm dark:shadow-md hover:shadow-md dark:hover:shadow-lg rounded-lg transition-all duration-200';
    } else if (stats.total > 0) {
      return 'bg-green-50 dark:bg-[#1a3a2a] shadow-sm dark:shadow-md hover:shadow-md dark:hover:shadow-lg rounded-lg transition-all duration-200';
    } else if (stats.total < 0) {
      return 'bg-red-50 dark:bg-[#3a1a1a] shadow-sm dark:shadow-md hover:shadow-md dark:hover:shadow-lg rounded-lg transition-all duration-200';
    } else {
      return 'bg-slate-50 dark:bg-slate-800 shadow-sm dark:shadow-md hover:shadow-md dark:hover:shadow-lg rounded-lg transition-all duration-200';
    }
  };

  // Removed: getTextColorClass (replaced by per-stat getValueColorClass)

  // Per-stat value color (positive/negative/neutral)
  const getValueColorClass = (val?: number) => {
    if (val === undefined || val === null) return 'text-slate-700 dark:text-slate-200';
    if (val > 0) return 'text-green-700 dark:text-green-300';
    if (val < 0) return 'text-red-700 dark:text-red-300';
    return 'text-slate-700 dark:text-slate-200';
  };

  // Total uses same coloring as other stats via getValueColorClass

  const ghostClasses = isFutureMonth ? 'bg-slate-100 dark:bg-slate-800/60 opacity-50 saturate-0 cursor-default hover:shadow-none' : '';

  return (
    <div
      onClick={isFutureMonth ? undefined : onClick}
      className={`h-full
        relative p-4 rounded-lg transition-all duration-200 shadow-sm dark:shadow-md
        ${isFutureMonth ? ghostClasses : 'cursor-pointer hover:scale-[1.02] hover:shadow-lg dark:hover:shadow-2xl'}
        ${!isFutureMonth ? getColorClasses() : ''}
        ${isCurrentMonth ? 'ring-2 ring-blue-400 dark:ring-blue-500 ring-opacity-60' : ''}
      `}
      tabIndex={isFutureMonth ? -1 : 0}
      aria-disabled={isFutureMonth}
    >
      {/* Month name */}
  <div className="text-sm font-semibold mb-3 text-center text-slate-700 dark:text-slate-200">
        {monthName}
      </div>

      {/* Stats grid */}
      {stats && stats.count > 0 ? (
        <div className="space-y-2">
          {/* Entries caption */}
          <div className="text-[10px] text-slate-500 dark:text-slate-400 text-center">{stats.count} entries</div>
          {/* Total (most prominent) */}
          <div className="text-center">
            <div className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide">Total</div>
            <div className={`text-lg font-bold ${getValueColorClass(stats.total)}`}>
              {stats.total}
            </div>
          </div>

          {/* Secondary stats: Median & Mean on one line (individual coloring) */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="text-center">
              <div className="text-slate-400 dark:text-slate-500 uppercase tracking-wide">Median</div>
              <div className={`font-semibold ${getValueColorClass(stats.median)}`}>
                {stats.median?.toFixed(1) ?? '-'}
              </div>
            </div>
            <div className="text-center">
              <div className="text-slate-400 dark:text-slate-500 uppercase tracking-wide">Mean</div>
              <div className={`font-semibold ${getValueColorClass(stats.mean)}`}>
                {stats.mean?.toFixed(1) ?? '-'}
              </div>
            </div>
          </div>

          {/* Tertiary stats: Min & Max on next line (individual coloring) */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="text-center">
              <div className="text-slate-400 dark:text-slate-500 uppercase tracking-wide">Min</div>
              <div className={`font-semibold ${getValueColorClass(stats.min)}`}>{stats.min}</div>
            </div>
            <div className="text-center">
              <div className="text-slate-400 dark:text-slate-500 uppercase tracking-wide">Max</div>
              <div className={`font-semibold ${getValueColorClass(stats.max)}`}>{stats.max}</div>
            </div>
          </div>
        </div>
      ) : (
  <div className="text-center text-slate-400 dark:text-slate-500 text-sm py-4"></div>
      )}

      {/* Current month indicator */}
      {isCurrentMonth && (
        <div className="absolute top-2 right-2 w-2 h-2 bg-blue-500 dark:bg-blue-400 rounded-full"></div>
      )}
    </div>
  );
}