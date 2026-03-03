import { useTheme } from '@/components/ThemeProvider';
import type { Tracking, Valence } from '@/features/db/localdb';
import type { AggregationType } from '@/lib/analysis';
import { formatFriendlyDate, parseDateKey } from '@/lib/friendly-date';
import { formatValue } from '@/lib/friendly-numbers';
import type { PeriodAggregateData } from '@/lib/period-aggregate';
import { getPrimaryMetric } from '@/lib/tracking';
import { getValueForValence } from '@/lib/valence';
import { format } from 'date-fns';
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

interface AggregationBarChartProps {
  periods: PeriodAggregateData<any>[];
  aggregationType: AggregationType;
  tracking: Tracking;
  valence: Valence;
}

interface BarDataPoint {
  dateKey: string;
  label: string;
  value: number;
  // For tooltip context
  statsValue?: number;
  deltaValue?: number;
}

export function AggregationBarChart({
  periods,
  aggregationType,
  tracking,
  valence,
}: AggregationBarChartProps) {
  const { theme } = useTheme();
  const isDark =
    theme === 'dark' ||
    (theme === 'system' &&
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches);

  const primaryMetric = getPrimaryMetric(tracking);
  
  // Determine valence source from tracking mode
  // Series tracking: valence source = stats
  // Trend tracking: valence source = deltas
  const valenceSource: 'stats' | 'deltas' = tracking === 'series' ? 'stats' : 'deltas';

  const formatPeriodLabel = (dateKey: string): string => {
    try {
      const date = parseDateKey(dateKey as any);
      switch (aggregationType) {
        case 'week':
          return `W${format(date, 'ww')} '${format(date, 'yy')}`;
        case 'month':
          return format(date, "MMM ''yy");
        case 'year':
          return format(date, 'yyyy');
        case 'none':
        case 'day':
        default:
          return format(date, "MMM d, ''yy");
      }
    } catch {
      return dateKey;
    }
  };

  const data: BarDataPoint[] = useMemo(() => {
    return periods
      .filter((period) => period.stats.count > 0)
      .map((period) => {
        const statsValue = period.stats[primaryMetric];
        const deltaValue = period.deltas?.[primaryMetric];
        const value = valenceSource === 'stats' ? statsValue : deltaValue ?? 0;

        return {
          dateKey: period.dateKey,
          label: formatPeriodLabel(period.dateKey),
          value,
          statsValue,
          deltaValue,
        };
      });
  }, [periods, primaryMetric, valenceSource, aggregationType]);

  if (data.length === 0) {
    return <div>No data available</div>;
  }

  const axisColor = isDark ? '#64748b' : '#334155';
  const gridColor = isDark ? '#334155' : '#e5e7eb';
  
  // Get bar color based on valence
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

    const displayValue = point.value;

    return (
      <div className="rounded-md bg-white dark:bg-slate-900 px-2 py-1 shadow-lg dark:shadow-xl border border-gray-200 dark:border-slate-700">
        <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">
          {formatFriendlyDate(point.dateKey as any)}
        </div>
        <div className="flex items-center gap-2">
          <div
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: getBarColor(point.value) }}
          />
          <span
            className="text-sm font-medium"
            style={{ color: getBarColor(displayValue) }}
          >
            {formatValue(displayValue, { delta: true })}
          </span>
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
          <Tooltip content={renderTooltip} />
          <Bar dataKey="value" fill="#8884d8" isAnimationActive={true} radius={[8, 8, 0, 0]}>
            {data.map((entry, index) => (
              <Cell key={`bar-${index}`} fill={getBarColor(entry.value)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
