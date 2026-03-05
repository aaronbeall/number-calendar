import { useTheme } from '@/components/ThemeProvider';
import { NumberText } from '@/components/ui/number-text';
import type { Tracking, Valence } from '@/features/db/localdb';
import { formatPeriodLabel, type AggregationType } from '@/lib/analysis';
import { formatFriendlyDate, type DateKeyType } from '@/lib/friendly-date';
import { formatValue } from '@/lib/friendly-numbers';
import type { PeriodAggregateData } from '@/lib/period-aggregate';
import { METRIC_DISPLAY_INFO } from '@/lib/stats';
import { getPrimaryMetric, getValenceSource } from '@/lib/tracking';
import { getValueForValence } from '@/lib/valence';
import { useMemo } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

interface DeviationBarChartProps {
  periods: PeriodAggregateData<DateKeyType>[];
  aggregationType: AggregationType;
  tracking: Tracking;
  valence: Valence;
}

interface BarDataPoint {
  dateKey: string;
  label: string;
  entryNumber?: number;
  value: number;
  deviationFromMean: number;
  deviationFromMedian: number;
  mean: number;
  median: number;
}

export function DeviationBarChart({
  periods,
  aggregationType,
  tracking,
  valence,
}: DeviationBarChartProps) {
  const { theme } = useTheme();
  const isDark =
    theme === 'dark' ||
    (theme === 'system' &&
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches);

  const primaryMetric = getPrimaryMetric(tracking);

  const valenceSource = getValenceSource(tracking);

  const data: BarDataPoint[] = useMemo(() => {
    const periodValues = periods
      .filter((period) => period.stats.count > 0)
      .map((period, index) => {
        const value =
          valenceSource === 'stats'
            ? (period.stats[primaryMetric] ?? 0)
            : (period.deltas?.[primaryMetric] ?? 0);

        return {
          period,
          index,
          value,
        };
      });

    // Calculate mean and median across all periods in range
    const values = periodValues.map(pv => pv.value);
    const mean = values.length > 0
      ? values.reduce((sum, v) => sum + v, 0) / values.length
      : 0;
    
    const sortedValues = [...values].sort((a, b) => a - b);
    const median = sortedValues.length > 0
      ? sortedValues.length % 2 === 0
        ? (sortedValues[sortedValues.length / 2 - 1] + sortedValues[sortedValues.length / 2]) / 2
        : sortedValues[Math.floor(sortedValues.length / 2)]
      : 0;

    return periodValues.map(({ period, index, value }) => ({
      dateKey: period.dateKey,
      label: formatPeriodLabel(period.dateKey, aggregationType),
      ...(aggregationType === 'none' && { entryNumber: index + 1 }),
      value,
      deviationFromMean: value - mean,
      deviationFromMedian: value - median,
      mean,
      median,
    }));
  }, [periods, primaryMetric, valenceSource, aggregationType]);

  if (data.length === 0) {
    return <div>No data available</div>;
  }

  const axisColor = isDark ? '#64748b' : '#334155';
  const gridColor = isDark ? '#334155' : '#e5e7eb';

  const getBarColor = (value: number): string => {
    return getValueForValence(value, valence, {
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
    payload?: Array<{ payload?: BarDataPoint }>;
  }) => {
    if (!active || !payload?.length || !payload[0].payload) return null;
    const point = payload[0].payload;

    const metricLabel = METRIC_DISPLAY_INFO[primaryMetric].label;

    return (
      <div className="rounded-md bg-white dark:bg-slate-900 px-2.5 py-2 shadow-lg dark:shadow-xl border border-gray-200 dark:border-slate-700">
        {aggregationType === 'none' && (
          <div className="text-xs text-slate-500 dark:text-slate-400 mb-2">{point.label} (#{point.entryNumber})</div>
        )}
        {aggregationType !== 'none' && (
          <div className="text-xs text-slate-500 dark:text-slate-400 mb-2">
            {formatFriendlyDate(point.dateKey as any)}
          </div>
        )}
        
        {/* Primary value */}
        <div className="flex items-center justify-between gap-3 mb-2 pb-2 border-b border-slate-200 dark:border-slate-700">
          <span className="text-xs text-slate-600 dark:text-slate-400">{metricLabel}</span>
          <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            <NumberText
              value={point.value}
              valenceValue={point.value}
              valence={valence}
              delta={valenceSource === 'deltas'}
              className="inline"
            />
          </span>
        </div>

        {/* Deviation from mean */}
        <div className="flex items-center justify-between gap-3 mb-1.5">
          <span className="text-xs text-slate-600 dark:text-slate-400">vs Mean</span>
          <span className="text-sm font-semibold">
            <NumberText
              value={point.deviationFromMean}
              valenceValue={point.deviationFromMean}
              valence={valence}
              delta
              className="inline"
            />
          </span>
        </div>
        <div className="flex items-center justify-between gap-3 mb-2 text-[11px] text-slate-500 dark:text-slate-500">
          <span>Range mean:</span>
          <span>{formatValue(point.mean)}</span>
        </div>

        {/* Deviation from median */}
        <div className="flex items-center justify-between gap-3 mb-1.5">
          <span className="text-xs text-slate-600 dark:text-slate-400">vs Median</span>
          <span className="text-sm font-semibold">
            <NumberText
              value={point.deviationFromMedian}
              valenceValue={point.deviationFromMedian}
              valence={valence}
              delta
              className="inline"
            />
          </span>
        </div>
        <div className="flex items-center justify-between gap-3 text-[11px] text-slate-500 dark:text-slate-500">
          <span>Range median:</span>
          <span>{formatValue(point.median)}</span>
        </div>
      </div>
    );
  };

  return (
    <div className="h-80 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 5, right: 20, bottom: 40, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
          <XAxis
            dataKey="label"
            stroke={axisColor}
            style={{ fontSize: '12px' }}
            tick={{ fill: axisColor }}
            interval={Math.floor(data.length / 8) || 0}
          />
          <YAxis
            stroke={axisColor}
            style={{ fontSize: '12px' }}
            tick={{ fill: axisColor }}
            tickFormatter={(value) => formatValue(Number(value), { short: true })}
          />
          <ReferenceLine y={0} stroke={axisColor} strokeOpacity={0.5} strokeWidth={1.5} />
          <Tooltip content={renderTooltip} />
          <Bar dataKey="deviationFromMean" fill="#8884d8" isAnimationActive={true} radius={[8, 8, 0, 0]}>
            {data.map((entry, index) => (
              <Cell key={`bar-${index}`} fill={getBarColor(entry.value)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
