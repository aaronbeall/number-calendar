import { useMemo } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { computeNumberStats } from '@/lib/stats';

interface YearSummaryProps {
  numbers: number[];
  yearName: string;
  isCurrentYear: boolean;
}

export function YearSummary({ numbers, yearName, isCurrentYear }: YearSummaryProps) {
  const stats = useMemo(() => computeNumberStats(numbers), [numbers]);

  if (!stats) {
    return null;
  }

  // Choose icon based on total
  const IconComponent = stats.total > 0 ? TrendingUp : stats.total < 0 ? TrendingDown : Minus;

  // Color classes for background
  const bgClasses = isCurrentYear 
    ? 'bg-gradient-to-r from-white to-blue-50' 
    : 'bg-white';

  // Color classes for bottom border
  const bottomBorderClasses = stats.total > 0
    ? 'border-b-4 border-green-400'
    : stats.total < 0
    ? 'border-b-4 border-red-400'
    : 'border-b-4 border-slate-400';

  return (
    <div className={`${bgClasses} ${bottomBorderClasses} rounded-lg shadow-lg p-6`}>
      <div className="flex items-center justify-between gap-4">
        {/* Left: Year name and entries */}
        <div className="flex items-center gap-3">
          <div className={`p-3 rounded-full ${
            stats.total > 0 
              ? 'bg-green-100 text-green-600' 
              : stats.total < 0
              ? 'bg-red-100 text-red-600'
              : 'bg-slate-100 text-slate-600'
          }`}>
            <IconComponent className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-700">{yearName}</h3>
            <p className="text-xs text-slate-500">{stats.count} entries</p>
          </div>
        </div>

        {/* Right: Stats aligned to the end */}
        <div className="hidden sm:flex items-center gap-6 ml-auto justify-end">
          {/* Mean / Median (secondary) */}
          <div className="hidden sm:flex items-center gap-6">
            <div className="text-right">
              <div className="text-[11px] uppercase tracking-wide text-slate-500 font-medium">Mean</div>
              <div className={`font-mono text-lg font-bold ${stats.mean && stats.mean >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                {stats.mean?.toFixed(1) ?? '-'}
              </div>
            </div>
            <div className="text-right">
              <div className="text-[11px] uppercase tracking-wide text-slate-500 font-medium">Median</div>
              <div className={`font-mono text-lg font-bold ${stats.median && stats.median >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                {stats.median?.toFixed(1) ?? '-'}
              </div>
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