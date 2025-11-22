import { useMemo } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { computeNumberStats } from '@/lib/stats';
import { NumberText } from '@/components/ui/number-text';

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
    ? stats.total > 0
      ? 'bg-gradient-to-r from-white to-blue-50 dark:from-[#232a26] dark:to-[#1a3a2a]'
      : stats.total < 0
      ? 'bg-gradient-to-r from-white to-red-50 dark:from-[#232a26] dark:to-[#3a1a1a]'
      : 'bg-gradient-to-r from-white to-slate-50 dark:from-[#232a26] dark:to-slate-800'
    : stats.total > 0
    ? 'bg-white dark:bg-[#232a26]'
    : stats.total < 0
    ? 'bg-white dark:bg-[#232a26]'
    : 'bg-white dark:bg-[#232a26]';

  // Color classes for bottom border
  const bottomBorderClasses = stats.total > 0
    ? 'border-b-4 border-green-400 dark:border-green-700'
    : stats.total < 0
    ? 'border-b-4 border-red-400 dark:border-red-700'
    : 'border-b-4 border-slate-400 dark:border-slate-600';

  return (
  <div className={`${bgClasses} ${bottomBorderClasses} rounded-lg shadow-lg dark:shadow-xl p-6`}>
  <div className="flex items-center justify-between gap-4">
        {/* Left: Year name and entries */}
        <div className="flex items-center gap-3">
          <div className={`p-3 rounded-full ${
            stats.total > 0 
              ? 'bg-green-100 dark:bg-[#1a3a2a] text-green-600 dark:text-green-200' 
              : stats.total < 0
              ? 'bg-red-100 dark:bg-[#3a1a1a] text-red-600 dark:text-red-200'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
          }`}>
            <IconComponent className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-200">{yearName}</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">{stats.count} entries</p>
          </div>
        </div>

        {/* Right: Stats aligned to the end */}
        <div className="hidden sm:flex items-center gap-6 ml-auto justify-end">
          {/* Mean / Median (secondary) */}
          <div className="hidden sm:flex items-center gap-6">
            <div className="text-right">
              <div className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400 font-medium">Mean</div>
              <NumberText
                value={stats.mean ?? null}
                className="font-mono text-lg font-bold"
                formatOptions={{ maximumFractionDigits: 1 }}
              />
            </div>
            <div className="text-right">
              <div className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400 font-medium">Median</div>
              <NumberText
                value={stats.median ?? null}
                className="font-mono text-lg font-bold"
                formatOptions={{ maximumFractionDigits: 1 }}
              />
            </div>
          </div>

          <div className="hidden md:block w-px h-7 bg-slate-300/50 dark:bg-slate-700/50" />

          {/* Min / Max (tertiary) */}
          <div className="hidden md:flex items-center gap-4">
            <div className="text-right">
              <div className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400 font-medium">Min</div>
              <NumberText value={stats.min} className="font-mono text-base font-bold" />
            </div>
            <div className="text-right">
              <div className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400 font-medium">Max</div>
              <NumberText value={stats.max} className="font-mono text-base font-bold" />
            </div>
          </div>

          <div className="hidden sm:block w-px h-7 bg-slate-300/50 dark:bg-slate-700/50" />

          {/* Total (most prominent, right-most, own container) */}
          <div className={`flex items-center gap-3 px-5 py-4 rounded-lg font-mono font-black shadow-lg ${
            stats.total > 0
              ? 'bg-green-200 dark:bg-[#1a3a2a] text-green-700 dark:text-green-200 shadow-green-200/50 dark:shadow-green-900/30'
              : stats.total < 0
              ? 'bg-red-200 dark:bg-[#3a1a1a] text-red-700 dark:text-red-200 shadow-red-200/50 dark:shadow-red-900/30'
              : 'bg-slate-300 dark:bg-slate-800 text-slate-700 dark:text-slate-300 shadow-slate-200/50 dark:shadow-slate-900/30'
          }`}>
            <div className="text-[11px] uppercase tracking-wide text-slate-600 dark:text-slate-400 font-bold">Total</div>
            <NumberText value={stats.total} className="text-2xl sm:text-3xl font-black tracking-tight" />
          </div>
        </div>
      </div>
    </div>
  );
};