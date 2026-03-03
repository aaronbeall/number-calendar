import { useTheme } from '@/components/ThemeProvider';
import { NumberText } from '@/components/ui/number-text';
import type { Tracking, Valence } from '@/features/db/localdb';
import type { AggregationType } from '@/lib/analysis';
import { formatFriendlyDate, parseDateKey } from '@/lib/friendly-date';
import { formatValue } from '@/lib/friendly-numbers';
import type { PeriodAggregateData } from '@/lib/period-aggregate';
import { METRIC_DISPLAY_INFO, type NumberMetric } from '@/lib/stats';
import { getPrimaryMetric } from '@/lib/tracking';
import { getValueForValence } from '@/lib/valence';
import { format } from 'date-fns';
import { useMemo, useState } from 'react';
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
  selectedMetrics?: NumberMetric[];
}

interface BarDataPoint {
  dateKey: string;
  label: string;
  value: number;
  statsValue?: Partial<Record<NumberMetric, number>>;
  deltaValue?: Partial<Record<NumberMetric, number>>;
}

const SECONDARY_COLORS = ['#8b5cf6', '#06b6d4', '#f59e0b', '#ec4899', '#14b8a6', '#6366f1'];

export function AggregationBarChart({
  periods,
  aggregationType,
  tracking,
  valence,
  selectedMetrics = [],
}: AggregationBarChartProps) {
  const { theme } = useTheme();
  const isDark =
    theme === 'dark' ||
    (theme === 'system' &&
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches);

  const primaryMetric = getPrimaryMetric(tracking);

  const valenceSource: 'stats' | 'deltas' = tracking === 'series' ? 'stats' : 'deltas';

  const displayMetrics: NumberMetric[] = useMemo(() => {
    const defaults: NumberMetric[] = [primaryMetric, 'count', 'mean'];
    const extras = selectedMetrics.filter(
      (metric) => metric !== primaryMetric && metric !== 'count' && metric !== 'mean'
    );
    return [...new Set<NumberMetric>([...defaults, ...extras])];
  }, [primaryMetric, selectedMetrics]);

  const [visibleMetrics, setVisibleMetrics] = useState<Set<NumberMetric>>(
    () => new Set<NumberMetric>([primaryMetric, 'count', 'mean'])
  );

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
        const statsValue: Partial<Record<NumberMetric, number>> = {};
        const deltaValue: Partial<Record<NumberMetric, number>> = {};

        for (const metric of displayMetrics) {
          statsValue[metric] = period.stats?.[metric];
          deltaValue[metric] = period.deltas?.[metric];
        }

        const value =
          valenceSource === 'stats'
            ? (statsValue[primaryMetric] ?? 0)
            : (deltaValue[primaryMetric] ?? 0);

        return {
          dateKey: period.dateKey,
          label: formatPeriodLabel(period.dateKey),
          value,
          statsValue,
          deltaValue,
        };
      });
  }, [periods, displayMetrics, primaryMetric, valenceSource, aggregationType]);

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

  const latestValenceValue =
    data.length > 0
      ? (valenceSource === 'stats'
          ? data[data.length - 1].statsValue?.[primaryMetric]
          : data[data.length - 1].deltaValue?.[primaryMetric]) ?? 0
      : 0;

  const primaryColor = getBarColor(latestValenceValue);

  const getSwatchColor = (metric: NumberMetric): string => {
    if (metric === primaryMetric) return primaryColor;
    const metricIndex = displayMetrics.indexOf(metric);
    return SECONDARY_COLORS[Math.max(0, metricIndex - 1) % SECONDARY_COLORS.length];
  };

  const toggleMetric = (metric: NumberMetric) => {
    setVisibleMetrics((prev) => {
      const next = new Set(prev);
      if (next.has(metric)) {
        next.delete(metric);
      } else {
        next.add(metric);
      }
      return next;
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

    const visibleTooltipMetrics = displayMetrics.filter((metric) => visibleMetrics.has(metric));

    return (
      <div className="rounded-md bg-white dark:bg-slate-900 px-2 py-1 shadow-lg dark:shadow-xl border border-gray-200 dark:border-slate-700">
        <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">
          {formatFriendlyDate(point.dateKey as any)}
        </div>
        <div className="space-y-1">
          {visibleTooltipMetrics.map((metric) => {
            const metricValue =
              valenceSource === 'stats'
                ? (point.statsValue?.[metric] ?? 0)
                : (point.deltaValue?.[metric] ?? 0);
            const metricValence = METRIC_DISPLAY_INFO[metric].valenceless ? 'neutral' : valence;

            return (
              <div key={metric} className="flex items-center gap-2 text-xs">
                <span
                  className="inline-block h-2 w-2 rounded-full"
                  style={{ backgroundColor: getSwatchColor(metric) }}
                />
                <div className="flex items-center gap-1 text-slate-700 dark:text-slate-300">
                  <span className="text-slate-600 dark:text-slate-400">
                    {METRIC_DISPLAY_INFO[metric].label}
                  </span>
                  <span className="font-semibold">
                    <NumberText
                      value={metricValue}
                      valenceValue={metricValue}
                      valence={metricValence}
                      delta
                      className="inline"
                    />
                  </span>
                </div>
              </div>
            );
          })}
          {visibleTooltipMetrics.length === 0 && (
            <div className="text-xs text-slate-500 dark:text-slate-400">No metrics selected</div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="h-80 w-full flex flex-col">
      <div className="min-h-0 flex-1 w-full">
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
      <div className="mt-2 max-h-20 overflow-y-auto flex flex-wrap gap-2 pr-1">
        {displayMetrics.map((metric) => {
          const isVisible = visibleMetrics.has(metric);
          return (
            <button
              key={metric}
              type="button"
              onClick={() => toggleMetric(metric)}
              className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs transition-colors ${isVisible ? 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700' : 'bg-transparent border-slate-200 dark:border-slate-800 opacity-70'}`}
              title={isVisible ? 'Hide tooltip metric' : 'Show tooltip metric'}
            >
              <span
                className="inline-block h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: getSwatchColor(metric) }}
              />
              <span className="text-slate-700 dark:text-slate-300">{METRIC_DISPLAY_INFO[metric].label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
