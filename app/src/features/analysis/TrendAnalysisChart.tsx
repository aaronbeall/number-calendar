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
import { useId, useMemo, useState } from 'react';
import {
  CartesianGrid,
  ReferenceLine,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

interface TrendAnalysisChartProps {
  periods: PeriodAggregateData<any>[];
  aggregationType: AggregationType;
  tracking: Tracking;
  mode: TrendDataMode;
  valence?: Valence;
  selectedMetrics?: NumberMetric[];
}

export type TrendDataMode = 'trend' | 'change';

type TrendPoint = {
  dateKey: string;
  label: string;
  entryNumber?: number;
  cumulativeValue?: Partial<Record<NumberMetric, number>>;
  statsValue?: Partial<Record<NumberMetric, number>>;
  deltaValue?: Partial<Record<NumberMetric, number>>;
} & Partial<Record<NumberMetric, number>>;

const SECONDARY_COLORS = ['#8b5cf6', '#06b6d4', '#f59e0b', '#ec4899', '#14b8a6', '#6366f1'];
const SECONDARY_DASHES = ['4 2', '2 2', '6 3', '3 2', '5 2', '2 1'];

export function TrendAnalysisChart({
  periods,
  aggregationType,
  tracking,
  mode,
  valence = 'neutral',
  selectedMetrics = [],
}: TrendAnalysisChartProps) {
  const { theme } = useTheme();
  const isDark =
    theme === 'dark' ||
    (theme === 'system' &&
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches);
  const gradientId = useId();

  const primaryMetric = getPrimaryMetric(tracking);
  
  // Determine valence source from tracking mode
  // Series tracking: valence source = stats
  // Trend tracking: valence source = deltas
  const valenceSource: 'stats' | 'deltas' = tracking === 'series' ? 'stats' : 'deltas';

  const suppressMetricOptions = aggregationType === 'none' && mode === 'change';

  const displayMetrics = useMemo(() => {
    if (suppressMetricOptions) {
      return [primaryMetric];
    }
    const unique = [
      primaryMetric,
      ...selectedMetrics.filter((metric): metric is NumberMetric => metric !== primaryMetric),
    ];
    return unique.length > 0 ? unique : [primaryMetric];
  }, [primaryMetric, selectedMetrics, suppressMetricOptions]);

  const [visibleMetrics, setVisibleMetrics] = useState<Set<NumberMetric>>(() => {
    const defaults = new Set<NumberMetric>([primaryMetric]);
    if (!suppressMetricOptions && displayMetrics.includes('mean')) {
      defaults.add('mean');
    }
    return defaults;
  });

  const formatPeriodLabel = (dateKey: string): string => {
    try {
      const date = parseDateKey(dateKey as any);
      switch (aggregationType) {
        case 'none':
          return format(date, "MMM d");
        case 'week':
          return `W${format(date, 'ww')} '${format(date, 'yy')}`;
        case 'month':
          return format(date, "MMM ''yy");
        case 'year':
          return format(date, 'yyyy');
        case 'day':
        default:
          return format(date, "MMM d, ''yy");
      }
    } catch {
      return dateKey;
    }
  };

  const data: TrendPoint[] = useMemo(() => {
    return periods
      .filter((period) => period.stats.count > 0)
      .map((period, index) => {
        const point: TrendPoint = {
          dateKey: period.dateKey,
          label: formatPeriodLabel(period.dateKey),
          ...(aggregationType === 'none' && { entryNumber: index + 1 }),
          cumulativeValue: {},
          statsValue: {},
          deltaValue: {},
        };

        for (const metric of displayMetrics) {
          // Always populate all sources for tooltip context
          point.cumulativeValue![metric] = period.cumulatives?.[metric];
          point.statsValue![metric] = period.stats?.[metric];
          point.deltaValue![metric] = period.deltas?.[metric];

          // Unified data model: display value based on valence source + mode
          // Valence source = stats:
          //   Trend: show cumulatives
          //   Change: show stats
          // Valence source = deltas:
          //   Trend: show stats
          //   Change: show deltas
          if (valenceSource === 'stats') {
            point[metric] = 
              mode === 'trend' 
                ? period.cumulatives?.[metric]
                : period.stats?.[metric];
          } else {
            point[metric] = 
              mode === 'trend'
                ? period.stats?.[metric]
                : period.deltas?.[metric];
          }
        }

        return point;
      });
  }, [periods, valenceSource, mode, displayMetrics]);

  if (data.length === 0) {
    return <div>No data available</div>;
  }

  const axisColor = isDark ? '#64748b' : '#334155';
  const gridColor = isDark ? '#334155' : '#e5e7eb';

  // Extract valence source values for color calculations
  const valenceSourceValues = data
    .map((point) =>
      valenceSource === 'stats'
        ? point.statsValue?.[primaryMetric]
        : point.deltaValue?.[primaryMetric]
    )
    .filter((value): value is number => typeof value === 'number');
  
  const latestValenceValue = valenceSourceValues.length > 0
    ? valenceSourceValues[valenceSourceValues.length - 1]
    : 0;
  
  // Extract displayed values for gradient positioning
  const displayedValues = data
    .map((point) => point[primaryMetric])
    .filter((value): value is number => typeof value === 'number');
  
  const minDisplayed = displayedValues.length ? Math.min(...displayedValues) : 0;
  const maxDisplayed = displayedValues.length ? Math.max(...displayedValues) : 0;
  
  // Gradient center point:
  // - Most cases: center on 0
  // - Valence source = deltas + trend mode: center on first data point's value
  const gradientCenterValue = valenceSource === 'deltas' && mode === 'trend'
    ? (data.length > 0 ? data[0][primaryMetric] ?? 0 : 0)
    : 0;
  
  // Calculate gradient offset based on displayed values (not valence source)
  const zeroOffset =
    maxDisplayed <= gradientCenterValue 
      ? 0 
      : minDisplayed >= gradientCenterValue 
        ? 1 
        : (maxDisplayed - gradientCenterValue) / (maxDisplayed - minDisplayed);

  // Always use gradient with proper valence coloring
  const shouldUseGradientPrimary = true;

  const primaryColor = getValueForValence(latestValenceValue, valence, {
    good: '#22c55e',
    bad: '#ef4444',
    neutral: '#3b82f6',
  });

  const positiveColor = getValueForValence(1, valence, {
    good: '#22c55e',
    bad: '#ef4444',
    neutral: '#3b82f6',
  });
  const negativeColor = getValueForValence(-1, valence, {
    good: '#22c55e',
    bad: '#ef4444',
    neutral: '#3b82f6',
  });

  const getLineColor = (metric: NumberMetric): string => {
    if (metric === primaryMetric) {
      if (shouldUseGradientPrimary) {
        return `url(#trend-gradient-${gradientId})`;
      }
      return primaryColor;
    }
    const metricIndex = displayMetrics.indexOf(metric);
    return SECONDARY_COLORS[Math.max(0, metricIndex - 1) % SECONDARY_COLORS.length];
  };

  const getSwatchColor = (metric: NumberMetric): string => {
    if (metric === primaryMetric) return primaryColor;
    const metricIndex = displayMetrics.indexOf(metric);
    return SECONDARY_COLORS[Math.max(0, metricIndex - 1) % SECONDARY_COLORS.length];
  };

  const getLineDash = (metric: NumberMetric): string | undefined => {
    if (metric === primaryMetric) return undefined;
    const metricIndex = displayMetrics.indexOf(metric);
    return SECONDARY_DASHES[Math.max(0, metricIndex - 1) % SECONDARY_DASHES.length];
  };

  const getMetricLabel = (metric: NumberMetric): string => {
    if (aggregationType === 'none' && metric === primaryMetric) {
      return 'Entry';
    }
    return METRIC_DISPLAY_INFO[metric].label;
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

  const hasVisibleMetrics = suppressMetricOptions || displayMetrics.some((metric) => visibleMetrics.has(metric));

  const renderTooltip = ({
    active,
    payload,
  }: {
    active?: boolean;
    payload?: Array<{ payload?: TrendPoint }>;
  }) => {
    if (!active || !payload?.length || !payload[0].payload) return null;
    const point = payload[0].payload;

    return (
      <div className="rounded-md bg-white dark:bg-slate-900 px-2 py-1 shadow-lg dark:shadow-xl border border-gray-200 dark:border-slate-700">
        {aggregationType === 'none' && (
          <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">{point.label} (#{point.entryNumber})</div>
        )}
        {aggregationType !== 'none' && (
          <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">{formatFriendlyDate(point.dateKey as any)}</div>
        )}
        <div className="space-y-1">
          {displayMetrics.filter((metric) => visibleMetrics.has(metric)).map((metric) => {
            const dash = getLineDash(metric);
            
            // Unified tooltip model based on valence source and mode
            // Valence = stats + trend: primary=cumulative/color-by-cumulative, secondary=stats/color-by-stats
            // Valence = stats + change: primary=stats/color-by-stats, secondary=cumulative/color-by-cumulative
            // Valence = deltas + trend: primary=stats/color-by-deltas, secondary=deltas/color-by-deltas
            // Valence = deltas + change: primary=deltas/color-by-deltas, secondary=stats/color-by-deltas
            let primaryValue = 0;
            let secondaryValue = 0;
            let primaryValenceValue = 0;
            let secondaryValenceValue = 0;
            let primaryShowDelta = false;
            let secondaryShowDelta = false;
            
            if (valenceSource === 'stats') {
              if (mode === 'trend') {
                primaryValue = point.cumulativeValue?.[metric] ?? 0;
                secondaryValue = point.statsValue?.[metric] ?? 0;
                primaryValenceValue = point.cumulativeValue?.[metric] ?? 0;
                secondaryValenceValue = point.statsValue?.[metric] ?? 0;
                primaryShowDelta = false;
                secondaryShowDelta = true; // stats are daily values (changes)
              } else {
                primaryValue = point.statsValue?.[metric] ?? 0;
                secondaryValue = point.cumulativeValue?.[metric] ?? 0;
                primaryValenceValue = point.statsValue?.[metric] ?? 0;
                secondaryValenceValue = point.cumulativeValue?.[metric] ?? 0;
                primaryShowDelta = true; // stats are daily values (changes)
                secondaryShowDelta = false;
              }
            } else {
              // Valence source = deltas: use deltas for valence coloring
              if (mode === 'trend') {
                primaryValue = point.statsValue?.[metric] ?? 0;
                secondaryValue = point.deltaValue?.[metric] ?? 0;
                primaryValenceValue = point.deltaValue?.[metric] ?? 0;
                secondaryValenceValue = point.deltaValue?.[metric] ?? 0;
                primaryShowDelta = false;
                secondaryShowDelta = true;
              } else {
                primaryValue = point.deltaValue?.[metric] ?? 0;
                secondaryValue = point.statsValue?.[metric] ?? 0;
                primaryValenceValue = point.deltaValue?.[metric] ?? 0;
                secondaryValenceValue = point.deltaValue?.[metric] ?? 0;
                primaryShowDelta = true;
                secondaryShowDelta = false;
              }
            }
            
            // Check if metric has valence
            const metricValence = METRIC_DISPLAY_INFO[metric].valenceless ? 'neutral' : valence;
            
            // Calculate swatch color (primary uses valence, secondary uses static colors)
            const swatchColor = metric === primaryMetric
              ? getValueForValence(primaryValenceValue, metricValence, {
                  good: '#22c55e',
                  bad: '#ef4444',
                  neutral: '#3b82f6',
                })
              : getSwatchColor(metric);

            // Calculate secondary color based on secondary valence value
            const secondaryColor = getValueForValence(secondaryValenceValue, metricValence, {
              good: '#22c55e',
              bad: '#ef4444',
              neutral: '#3b82f6',
            });

            return (
              <div key={metric} className="flex items-center gap-2 text-xs">
                <span
                  className="inline-block h-0.5 w-3"
                  style={{
                    backgroundColor: swatchColor,
                    borderTopStyle: dash ? 'dashed' : 'solid',
                    borderTopWidth: dash ? 1 : 0,
                  }}
                />
                <div className="flex items-center gap-1 text-slate-700 dark:text-slate-300">
                  <span className="font-semibold">
                    <NumberText value={primaryValue} valenceValue={primaryValenceValue} valence={metricValence} delta={primaryShowDelta} />
                  </span>
                  <span className="text-slate-600 dark:text-slate-400">
                    {getMetricLabel(metric)}
                  </span>
                  <span style={{ color: secondaryColor }}>
                    (<NumberText value={secondaryValue} valenceValue={secondaryValenceValue} valence={metricValence} delta={secondaryShowDelta} className="inline" />)
                  </span>
                </div>
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
          <LineChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
          {shouldUseGradientPrimary && (
            <defs>
              <linearGradient id={`trend-gradient-${gradientId}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={positiveColor} />
                <stop offset={`${zeroOffset * 100}%`} stopColor={positiveColor} />
                <stop offset={`${zeroOffset * 100}%`} stopColor={negativeColor} />
                <stop offset="100%" stopColor={negativeColor} />
              </linearGradient>
            </defs>
          )}
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
            {valenceSource === 'stats' && mode === 'trend' && (
              <ReferenceLine y={0} stroke={axisColor} strokeOpacity={0.35} strokeDasharray="3 3" />
            )}
            <Tooltip content={renderTooltip} />
            <Legend wrapperStyle={{ display: 'none' }} />
            {displayMetrics.map((metric) => (
              <Line
                key={metric}
                type="monotone"
                dataKey={metric}
                stroke={getLineColor(metric)}
                strokeDasharray={getLineDash(metric)}
                dot={false}
                strokeWidth={metric === primaryMetric ? 2.5 : 1.75}
                isAnimationActive
                name={getMetricLabel(metric)}
                hide={!visibleMetrics.has(metric)}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
        {!hasVisibleMetrics && (
          <div className="absolute inset-0 z-10 flex items-center justify-center rounded-md bg-white/65 text-center text-xs text-slate-700 dark:bg-slate-900/65 dark:text-slate-300 pointer-events-none px-4">
            No metrics selected. Use the legend below to enable one or more lines.
          </div>
        )}
      </div>
      {!suppressMetricOptions && (
        <div className="mt-2 max-h-20 overflow-y-auto flex flex-wrap gap-2 pr-1">
          {displayMetrics.map((metric) => {
            const isVisible = visibleMetrics.has(metric);
            return (
              <button
                key={metric}
                type="button"
                onClick={() => toggleMetric(metric)}
                className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs transition-colors ${isVisible ? 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700' : 'bg-transparent border-slate-200 dark:border-slate-800 opacity-70'}`}
                title={isVisible ? 'Hide line' : 'Show line'}
              >
                <span
                  className="inline-block h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: getSwatchColor(metric) }}
                />
                <span className="text-slate-700 dark:text-slate-300">{getMetricLabel(metric)}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
