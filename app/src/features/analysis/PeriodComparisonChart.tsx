import { useTheme } from '@/components/ThemeProvider';
import type { NumberMetric } from '@/lib/stats';
import { getMetricValence, METRIC_DISPLAY_INFO } from '@/lib/stats';
import { formatPeriodLabel, getMetricColorForValence, METRIC_COLORS, type AggregationType } from '@/lib/analysis';
import type { PeriodAggregateData } from '@/lib/period-aggregate';
import { formatFriendlyDate, type DateKeyType } from '@/lib/friendly-date';
import { formatValue } from '@/lib/friendly-numbers';
import type { Valence, Tracking } from '@/features/db/localdb';
import { getValenceSource, getPrimaryMetric } from '@/lib/tracking';
import { getValueForValence } from '@/lib/valence';
import { useMemo } from 'react';
import { usePreference } from '@/hooks/usePreference';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

interface PeriodComparisonChartProps {
  periods: PeriodAggregateData<DateKeyType>[];
  aggregationType: AggregationType;
  selectedMetrics?: NumberMetric[];
  valence: Valence;
  tracking: Tracking;
  datasetId: string;
}

type ComparisonDataPoint = {
  label: string;
  dateKey: string;
} & Partial<Record<NumberMetric, number>>;

export function PeriodComparisonChart({
  periods,
  aggregationType,
  selectedMetrics = [],
  valence,
  tracking,
  datasetId,
}: PeriodComparisonChartProps) {
  const { isDark } = useTheme();

  const primaryMetric = getPrimaryMetric(tracking);

  // Display all metrics from selectedMetrics, with primary metric first
  const displayMetrics: NumberMetric[] = useMemo(() => {
    const baseMetrics = selectedMetrics.length === 0
      ? (Object.keys(METRIC_DISPLAY_INFO) as NumberMetric[])
      : selectedMetrics.filter((metric) => metric in METRIC_DISPLAY_INFO);
    
    // Put primary metric first
    const metricsWithoutPrimary = baseMetrics.filter((m) => m !== primaryMetric);
    return [primaryMetric, ...metricsWithoutPrimary];
  }, [selectedMetrics, primaryMetric]);

  const defaultVisibleMetrics = useMemo(() => {
    const defaults: NumberMetric[] = [primaryMetric, 'min', 'max', 'mean'];
    return defaults.filter((metric) => displayMetrics.includes(metric));
  }, [primaryMetric, displayMetrics]);

  const [visibleMetricsArray, setVisibleMetricsArray] = usePreference<NumberMetric[]>(
    `analysis_comparisonVisibleMetrics_${datasetId}`,
    defaultVisibleMetrics,
  );

  const visibleMetrics = useMemo(() => new Set(visibleMetricsArray), [visibleMetricsArray]);

  const setVisibleMetrics = (updater: (prev: Set<NumberMetric>) => Set<NumberMetric>) => {
    setVisibleMetricsArray((prev) => {
      const prevSet = new Set(prev);
      const newSet = updater(prevSet);
      return Array.from(newSet);
    });
  };

  const data: ComparisonDataPoint[] = useMemo(() => {
    return periods
      .filter((period) => period.stats.count > 0)
      .map((period) => {
        const point: ComparisonDataPoint = {
          label: formatPeriodLabel(period.dateKey, aggregationType),
          dateKey: period.dateKey,
        };

        // Add all metrics from period stats
        displayMetrics.forEach((metric) => {
          const value = period.stats[metric];
          if (value !== null && value !== undefined) {
            point[metric] = value;
          }
        });

        return point;
      });
  }, [periods, displayMetrics, aggregationType]);

  // Get first values for each metric to calculate deltas
  const firstValues = useMemo(() => {
    const first: Partial<Record<NumberMetric, number>> = {};
    if (data.length > 0) {
      displayMetrics.forEach((metric) => {
        first[metric] = (data[0][metric] as number) ?? 0;
      });
    }
    return first;
  }, [data, displayMetrics]);

  // Calculate the valence color value based on valence source
  const getValenceColorValue = (metric: NumberMetric, value: number): number => {
    const valenceSource = getValenceSource(tracking);
    let colorValue = value ?? 0;
    if (valenceSource === 'deltas' && !METRIC_DISPLAY_INFO[metric].valenceless) {
      // For deltas mode, use difference from first value
      const firstValue = firstValues[metric] ?? 0;
      colorValue = colorValue - firstValue;
    }
    // For stats mode, use value as-is (vs 0)
    return colorValue;
  };

  if (data.length === 0) {
    return <div>No data available</div>;
  }

  const axisColor = isDark ? '#64748b' : '#334155';
  const gridColor = isDark ? '#334155' : '#e5e7eb';

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

  const getSwatchColor = (metric: NumberMetric): string => {
    return METRIC_COLORS[metric];
  };

  const getMetricLabel = (metric: NumberMetric): string => {
    return METRIC_DISPLAY_INFO[metric].label;
  };

  const hasVisibleMetrics = visibleMetrics.size > 0;

  const renderTooltip = ({
    active,
    payload,
    label,
  }: any) => {
    if (!active || !payload?.length) return null;

    const dataPoint = data.find((d) => d.label === label);
    if (!dataPoint) return null;

    return (
      <div className="rounded-md bg-white dark:bg-slate-900 px-2 py-1 shadow-lg dark:shadow-xl border border-gray-200 dark:border-slate-700">
        <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">
          {formatFriendlyDate(dataPoint.dateKey as any)}
        </div>
        <div className="space-y-0.5">
          {displayMetrics.filter((metric) => visibleMetrics.has(metric)).map((metric) => {
            const value = dataPoint[metric] as number;
            const metricValence = getMetricValence(metric, valence);
            const colorValue = getValenceColorValue(metric, value ?? 0);
            
            // Use traditional green/red/blue valence coloring
            const valueColor = getValueForValence(colorValue, metricValence, {
              good: '#22c55e',
              bad: '#ef4444',
              neutral: '#3b82f6',
            });
            
            return (
              <div key={metric} className="flex items-center gap-2 text-xs">
                <span
                  className="inline-block h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: getSwatchColor(metric) }}
                />
                <span className="text-slate-600 dark:text-slate-300">
                  <span className="font-semibold" style={{ color: valueColor }}>{typeof value === 'number' ? formatValue(value) : '—'}</span>{' '}
                  <span className="text-slate-500 dark:text-slate-400">{getMetricLabel(metric)}</span>
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="h-80 w-full flex flex-col">
      <div className="min-h-0 flex-1 w-full relative">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
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
            <Tooltip content={renderTooltip as any} />
            <Legend wrapperStyle={{ display: 'none' }} />
            {displayMetrics.map((metric) => {
              // Only render bars for metrics that have data in at least one point
              const hasData = data.some((point) => typeof point[metric] === 'number' && !isNaN(point[metric] as number));
              const isPrimary = metric === primaryMetric;
              return hasData ? (
                <Bar
                  key={metric}
                  dataKey={metric}
                  fill={isPrimary ? '#8884d8' : getSwatchColor(metric)}
                  name={getMetricLabel(metric)}
                  isAnimationActive={true}
                  radius={[8, 8, 0, 0]}
                  hide={!visibleMetrics.has(metric)}
                >
                  {valence && tracking && data.map((point) => {
                    const metricValence = getMetricValence(metric, valence);
                    const colorValue = getValenceColorValue(metric, (point[metric] as number) ?? 0);
                    
                    const cellColor = isPrimary
                      ? getValueForValence(colorValue, metricValence, {
                          good: '#22c55e',
                          bad: '#ef4444',
                          neutral: '#3b82f6',
                        })
                      : getMetricColorForValence(metric, colorValue, metricValence);
                    
                    return (
                      <Cell
                        key={`cell-${metric}-${point.dateKey}`}
                        fill={cellColor}
                      />
                    );
                  })}
                </Bar>
              ) : null;
            })}
          </BarChart>
        </ResponsiveContainer>
        {!hasVisibleMetrics && (
          <div className="absolute inset-0 z-10 flex items-center justify-center rounded-md bg-white/65 text-center text-xs text-slate-700 dark:bg-slate-900/65 dark:text-slate-300 pointer-events-none px-4">
            No metrics selected. Use the controls below to enable one or more bars.
          </div>
        )}
      </div>
      <div className="mt-2 max-h-20 overflow-y-auto flex flex-wrap gap-2 pr-1">
        {displayMetrics.map((metric) => {
          // Only show metrics in legend if they have data
          const hasData = data.some((point) => typeof point[metric] === 'number' && !isNaN(point[metric] as number));
          if (!hasData) return null;
          
          const isVisible = visibleMetrics.has(metric);
          const isPrimary = metric === primaryMetric;
          const swatchColor = isPrimary ? getValueForValence(true, valence, {
            good: '#22c55e',
            bad: '#ef4444',
            neutral: '#3b82f6',
          }) : getSwatchColor(metric);
          return (
            <button
              key={metric}
              type="button"
              onClick={() => toggleMetric(metric)}
              className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs transition-colors ${isVisible ? 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700' : 'bg-transparent border-slate-200 dark:border-slate-800 opacity-70'}`}
              title={isVisible ? 'Hide bar' : 'Show bar'}
            >
              <span
                className="inline-block h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: swatchColor }}
              />
              <span className="text-slate-700 dark:text-slate-300">{getMetricLabel(metric)}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
