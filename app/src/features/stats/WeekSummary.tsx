import React from 'react';

export interface WeekSummaryProps {
  numbers: number[];
}

export const WeekSummary: React.FC<WeekSummaryProps> = ({ numbers }) => {
  if (!numbers || numbers.length === 0) return null;

  const count = numbers.length;
  const total = numbers.reduce((a, b) => a + b, 0);
  const sorted = [...numbers].sort((a, b) => a - b);
  const mean = total / count;
  const median = count % 2 === 0
    ? (sorted[count / 2 - 1] + sorted[count / 2]) / 2
    : sorted[Math.floor(count / 2)];
  const min = sorted[0];
  const max = sorted[sorted.length - 1];

  const bgClasses = total > 0
    ? 'bg-green-50 border-green-200'
    : total < 0
    ? 'bg-red-50 border-red-200'
    : 'bg-slate-50 border-slate-200';

  const meanText = mean > 0 ? 'text-green-700' : mean < 0 ? 'text-red-700' : 'text-slate-700';
  const medianText = median > 0 ? 'text-green-700' : median < 0 ? 'text-red-700' : 'text-slate-700';

  return (
    <div className={`mt-1 rounded-md border ${bgClasses} shadow-sm hover:shadow-md transition-shadow`} aria-label="Weekly summary">
      <div className="w-full flex items-center justify-end gap-3 sm:gap-5 px-3 py-2">
        {/* Count (secondary) */}
        <div className="text-right">
          <div className="text-[10px] uppercase tracking-wide text-slate-500">Count</div>
          <div className="font-mono text-sm font-semibold text-slate-700">{count}</div>
        </div>

        <div className="hidden sm:block w-px h-6 bg-slate-300/40" />

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
  );
};

export default WeekSummary;
