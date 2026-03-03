import { useTheme } from '@/components/ThemeProvider';
import type { Tracking } from '@/features/db/localdb';
import { formatValue } from '@/lib/friendly-numbers';
import type { PeriodAggregateData } from '@/lib/period-aggregate';
import { getPrimaryMetric } from '@/lib/tracking';
import { useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

interface DistributionHistogramProps {
  periods: PeriodAggregateData<any>[];
  tracking: Tracking;
}

interface HistogramBucket {
  range: string;
  rangeMin: number;
  rangeMax: number;
  count: number;
  positiveCount: number;
  negativeCount: number;
  midpoint: number;
}

export function DistributionHistogram({
  periods,
  tracking,
}: DistributionHistogramProps) {
  const { theme } = useTheme();
  const isDark =
    theme === 'dark' ||
    (theme === 'system' &&
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches);

  const primaryMetric = getPrimaryMetric(tracking);
  const valenceSource: 'stats' | 'deltas' = tracking === 'series' ? 'stats' : 'deltas';

  const numbers = useMemo(() => {
    return periods
      .filter((period) => period.stats.count > 0)
      .map((period) => {
        const value =
          valenceSource === 'stats'
            ? period.stats[primaryMetric]
            : (period.deltas?.[primaryMetric] ?? 0);
        return value;
      })
      .filter((value): value is number => typeof value === 'number');
  }, [periods, primaryMetric, valenceSource]);

  // Calculate optimal bin count using Freedman-Diaconis rule with sensible bounds
  const optimalBinCount = useMemo(() => {
    if (numbers.length === 0) return 10;
    
    // Freedman-Diaconis rule: binWidth = 2 * IQR / n^(1/3)
    const sorted = [...numbers].sort((a, b) => a - b);
    const q1 = sorted[Math.floor(sorted.length * 0.25)];
    const q3 = sorted[Math.floor(sorted.length * 0.75)];
    const iqr = q3 - q1;
    const range = Math.max(...numbers) - Math.min(...numbers);
    
    if (iqr > 0 && range > 0) {
      const binWidth = (2 * iqr) / Math.pow(numbers.length, 1/3);
      const fdBins = Math.ceil(range / binWidth);
      // Constrain to reasonable bounds: at least 5, at most 30
      return Math.max(5, Math.min(30, fdBins));
    }
    
    // Fallback: use square root rule with better bounds
    return Math.max(5, Math.min(20, Math.ceil(Math.sqrt(numbers.length))));
  }, [numbers]);

  const [binCount, setBinCount] = useState<number | null>(null);
  const activeBinCount = binCount ?? optimalBinCount;

  const bins: HistogramBucket[] = useMemo(() => {
    if (numbers.length === 0) return [];

    const min = Math.min(...numbers);
    const max = Math.max(...numbers);
    const range = max - min || 1;
    const binSize = range / activeBinCount;

    const buckets: HistogramBucket[] = [];
    for (let i = 0; i < activeBinCount; i++) {
      const binMin = min + i * binSize;
      const binMax = binMin + binSize;
      const binMid = (binMin + binMax) / 2;
      const binNumbers = numbers.filter((n) => n >= binMin && (i === activeBinCount - 1 ? n <= binMax : n < binMax));
      const count = binNumbers.length;
      const positiveCount = binNumbers.filter((n) => n > 0).length;
      const negativeCount = binNumbers.filter((n) => n < 0).length;

      buckets.push({
        range: `${formatValue(binMin, { short: true })}–${formatValue(binMax, { short: true })}`,
        rangeMin: binMin,
        rangeMax: binMax,
        count,
        positiveCount,
        negativeCount,
        midpoint: binMid,
      });
    }
    return buckets;
  }, [numbers, activeBinCount]);

  if (bins.length === 0) {
    return <div>No data available</div>;
  }

  const axisColor = isDark ? '#64748b' : '#334155';
  const gridColor = isDark ? '#334155' : '#e5e7eb';

  const renderTooltip = ({
    active,
    payload,
  }: {
    active?: boolean;
    payload?: Array<{ payload?: HistogramBucket }>;
  }) => {
    if (!active || !payload?.length || !payload[0].payload) return null;
    const bin = payload[0].payload;

    return (
      <div className="rounded-md bg-white dark:bg-slate-900 px-2 py-1 shadow-lg dark:shadow-xl border border-gray-200 dark:border-slate-700">
        <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">
          {formatValue(bin.rangeMin)} – {formatValue(bin.rangeMax)}
        </div>
        <div className="space-y-0.5">
          {bin.positiveCount > 0 && (
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <span className="text-sm text-slate-900 dark:text-slate-100">
                Positive: {bin.positiveCount}
              </span>
            </div>
          )}
          {bin.negativeCount > 0 && (
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-red-500" />
              <span className="text-sm text-slate-900 dark:text-slate-100">
                Negative: {bin.negativeCount}
              </span>
            </div>
          )}
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 pt-1 border-t border-slate-200 dark:border-slate-700">
            Total: {bin.count}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="h-80 w-full flex flex-col">
      <div className="min-h-0 flex-1 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={bins} margin={{ top: 5, right: 20, bottom: 40, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
            <XAxis
              dataKey="range"
              stroke={axisColor}
              style={{ fontSize: '12px' }}
              tick={{ fill: axisColor }}
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis
              stroke={axisColor}
              style={{ fontSize: '12px' }}
              tick={{ fill: axisColor }}
              tickFormatter={(value) => formatValue(Number(value), { short: true })}
              label={{ value: 'Frequency', angle: -90, position: 'insideLeft', style: { fill: axisColor } }}
            />
            <Tooltip content={renderTooltip} />
            <Bar dataKey="positiveCount" stackId="a" fill="#22c55e" isAnimationActive={true} radius={[8, 8, 8, 8]} />
            <Bar dataKey="negativeCount" stackId="a" fill="#ef4444" isAnimationActive={true} radius={[8, 8, 8, 8]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      
      {/* Bin count control */}
      <div className="mt-2 flex items-center gap-3 px-1">
        <span className="text-xs text-slate-600 dark:text-slate-400 whitespace-nowrap">
          Bins: {activeBinCount}
        </span>
        <input
          type="range"
          min="3"
          max="30"
          value={activeBinCount}
          onChange={(e) => setBinCount(Number(e.target.value))}
          className="flex-1 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
        />
        <button
          type="button"
          onClick={() => setBinCount(null)}
          className="text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 underline decoration-dotted whitespace-nowrap"
          title="Reset to optimal bin count"
        >
          Auto ({optimalBinCount})
        </button>
      </div>
    </div>
  );
}

