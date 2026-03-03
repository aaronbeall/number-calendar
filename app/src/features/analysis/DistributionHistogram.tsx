import { useTheme } from '@/components/ThemeProvider';
import type { Tracking, Valence } from '@/features/db/localdb';
import { formatValue } from '@/lib/friendly-numbers';
import type { PeriodAggregateData } from '@/lib/period-aggregate';
import { getPrimaryMetric } from '@/lib/tracking';
import { getValueForValence } from '@/lib/valence';
import { useMemo } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

interface DistributionHistogramProps {
  periods: PeriodAggregateData<any>[];
  tracking: Tracking;
  valence?: Valence;
}

interface HistogramBucket {
  range: string;
  rangeMin: number;
  rangeMax: number;
  count: number;
  midpoint: number;
}

export function DistributionHistogram({
  periods,
  tracking,
  valence = 'neutral',
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

  const bins: HistogramBucket[] = useMemo(() => {
    if (numbers.length === 0) return [];

    const min = Math.min(...numbers);
    const max = Math.max(...numbers);
    const range = max - min || 1;
    const binCount = Math.min(20, Math.ceil(Math.sqrt(numbers.length)));
    const binSize = range / binCount;

    const buckets: HistogramBucket[] = [];
    for (let i = 0; i < binCount; i++) {
      const binMin = min + i * binSize;
      const binMax = binMin + binSize;
      const binMid = (binMin + binMax) / 2;
      const count = numbers.filter((n) => n >= binMin && n < binMax).length;

      if (count > 0 || i === 0 || i === binCount - 1) {
        buckets.push({
          range: `${formatValue(binMin, { short: true })}–${formatValue(binMax, { short: true })}`,
          rangeMin: binMin,
          rangeMax: binMax,
          count,
          midpoint: binMid,
        });
      }
    }
    return buckets;
  }, [numbers]);

  if (bins.length === 0) {
    return <div>No data available</div>;
  }

  const axisColor = isDark ? '#64748b' : '#334155';
  const gridColor = isDark ? '#334155' : '#e5e7eb';

  const getBarColor = (midpoint: number): string => {
    return getValueForValence(midpoint, valence, {
      good: '#22c55e',
      bad: '#ef4444',
      neutral: '#3b82f6',
    });
  };

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
        <div className="flex items-center gap-2">
          <div
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: getBarColor(bin.midpoint) }}
          />
          <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
            {bin.count} {bin.count === 1 ? 'occurrence' : 'occurrences'}
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="h-80 w-full">
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
          <Bar dataKey="count" isAnimationActive={true} radius={[8, 8, 0, 0]}>
            {bins.map((bin, index) => (
              <Cell key={`bar-${index}`} fill={getBarColor(bin.midpoint)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

