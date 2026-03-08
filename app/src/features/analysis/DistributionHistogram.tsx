import { useTheme } from '@/components/ThemeProvider';
import type { Tracking, Valence } from '@/features/db/localdb';
import type { DateKeyType } from '@/lib/friendly-date';
import { formatValue } from '@/lib/friendly-numbers';
import type { PeriodAggregateData } from '@/lib/period-aggregate';
import { getPrimaryMetric, getValenceSource } from '@/lib/tracking';
import { getValueForValence } from '@/lib/valence';
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
  periods: PeriodAggregateData<DateKeyType>[];
  tracking: Tracking;
  valence?: Valence;
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
  valence = 'neutral',
}: DistributionHistogramProps) {
  const { isDark } = useTheme();

  const primaryMetric = getPrimaryMetric(tracking);
  const valenceSource = getValenceSource(tracking);

  // Always use stats for binning (actual value range)
  const numbers = useMemo(() => {
    return periods
      .filter((period) => period.stats.count > 0)
      .map((period) => period.stats[primaryMetric])
      .filter((value): value is number => typeof value === 'number');
  }, [periods, primaryMetric]);

  // Extract numbers with their source context for proper positive/negative categorization
  const numbersWithContext = useMemo(() => {
    return periods
      .filter((period) => period.stats.count > 0)
      .map((period) => {
        const binValue = period.stats[primaryMetric]; // Stat value for binning
        const valenceValue = period[valenceSource][primaryMetric] ?? 0; // Value for pos/neg categorization
        return { 
          value: binValue, 
          isPositive: valenceValue > 0, 
          isNegative: valenceValue < 0 
        };
      })
      .filter((item): item is { value: number; isPositive: boolean; isNegative: boolean } => 
        typeof item.value === 'number'
      );
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
      const binValues = numbersWithContext.filter(
        (item) => item.value >= binMin && (i === activeBinCount - 1 ? item.value <= binMax : item.value < binMax)
      );
      const count = binValues.length;
      const positiveCount = binValues.filter((item) => item.isPositive).length;
      const negativeCount = binValues.filter((item) => item.isNegative).length;

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
  }, [numbers, numbersWithContext, activeBinCount]);

  if (bins.length === 0) {
    return <div>No data available</div>;
  }

  const axisColor = isDark ? '#64748b' : '#334155';
  const gridColor = isDark ? '#334155' : '#e5e7eb';

  // Determine colors based on valence
  const positiveColor = getValueForValence(1, valence, { good: '#22c55e', bad: '#ef4444', neutral: '#3b82f6' });
  const negativeColor = getValueForValence(-1, valence, { good: '#22c55e', bad: '#ef4444', neutral: '#64748b' });

  // Determine labels based on tracking type
  const positiveLabel = tracking === 'trend' ? 'Uptrend' : 'Positive';
  const negativeLabel = tracking === 'trend' ? 'Downtrend' : 'Negative';

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
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: positiveColor }} />
              <span className="text-sm text-slate-900 dark:text-slate-100">
                {positiveLabel}: {bin.positiveCount}
              </span>
            </div>
          )}
          {bin.negativeCount > 0 && (
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: negativeColor }} />
              <span className="text-sm text-slate-900 dark:text-slate-100">
                {negativeLabel}: {bin.negativeCount}
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
            <Bar dataKey="positiveCount" stackId="a" fill={positiveColor} isAnimationActive={true} radius={[8, 8, 8, 8]} />
            <Bar dataKey="negativeCount" stackId="a" fill={negativeColor} isAnimationActive={true} radius={[8, 8, 8, 8]} />
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

