import { useMemo } from 'react';
import { computeNumberStats } from '@/lib/stats';

interface MonthCellProps {
  monthName: string;
  numbers: number[];
  isCurrentMonth: boolean;
  onClick: () => void;
}

export function MonthCell({ monthName, numbers, isCurrentMonth, onClick }: MonthCellProps) {
  const stats = useMemo(() => computeNumberStats(numbers), [numbers]);
  
  // Color styling based on total
  const getColorClasses = () => {
    if (!stats) {
      return 'bg-slate-50 border-slate-200 hover:bg-slate-100';
    } else if (stats.total > 0) {
      return 'bg-green-50 border-green-200 hover:bg-green-100';
    } else if (stats.total < 0) {
      return 'bg-red-50 border-red-200 hover:bg-red-100';
    } else {
      return 'bg-slate-50 border-slate-200 hover:bg-slate-100';
    }
  };

  const getTextColorClass = () => {
    if (!stats) return 'text-slate-700';
    if (stats.total > 0) return 'text-green-700';
    if (stats.total < 0) return 'text-red-700';
    return 'text-slate-700';
  };

  const getTotalColorClass = () => {
    if (!stats) return 'text-slate-800';
    if (stats.total > 0) return 'text-green-800';
    if (stats.total < 0) return 'text-red-800';
    return 'text-slate-800';
  };

  return (
    <div
      onClick={onClick}
      className={`
        relative p-4 rounded-lg border-2 cursor-pointer transition-all duration-200
        ${getColorClasses()}
        ${isCurrentMonth ? 'ring-2 ring-blue-400 ring-opacity-60' : ''}
        hover:shadow-md
      `}
    >
      {/* Month name */}
      <div className="text-sm font-semibold mb-3 text-center">
        {monthName}
      </div>

      {/* Stats grid */}
      {stats && stats.count > 0 ? (
        <div className="space-y-2">
          {/* Entries caption */}
          <div className="text-[10px] text-slate-500 text-center">{stats.count} entries</div>
          {/* Total (most prominent) */}
          <div className="text-center">
            <div className="text-xs text-slate-500 uppercase tracking-wide">Total</div>
            <div className={`text-lg font-bold ${getTotalColorClass()}`}>
              {stats.total}
            </div>
          </div>

          {/* Secondary stats in grid */}
          <div className="grid grid-cols-1 gap-2 text-xs">
            <div className="text-center">
              <div className="text-slate-400 uppercase tracking-wide">Mean</div>
              <div className={`font-semibold ${getTextColorClass()}`}>
                {stats.mean?.toFixed(1) ?? '-'}
              </div>
            </div>
          </div>

          {/* Tertiary stats */}
          <div className="grid grid-cols-3 gap-1 text-xs">
            <div className="text-center">
              <div className="text-slate-400 uppercase tracking-wide">Med</div>
              <div className={`font-semibold ${getTextColorClass()}`}>
                {stats.median?.toFixed(1) ?? '-'}
              </div>
            </div>
            <div className="text-center">
              <div className="text-slate-400 uppercase tracking-wide">Min</div>
              <div className={`font-semibold ${getTextColorClass()}`}>{stats.min}</div>
            </div>
            <div className="text-center">
              <div className="text-slate-400 uppercase tracking-wide">Max</div>
              <div className={`font-semibold ${getTextColorClass()}`}>{stats.max}</div>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center text-slate-400 text-sm py-4">
          No data
        </div>
      )}

      {/* Current month indicator */}
      {isCurrentMonth && (
        <div className="absolute top-2 right-2 w-2 h-2 bg-blue-500 rounded-full"></div>
      )}
    </div>
  );
}