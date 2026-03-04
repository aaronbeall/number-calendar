import { useTheme } from '@/components/ThemeProvider';
import { NumberText } from '@/components/ui/number-text';
import type { DateKey, Tracking, Valence } from '@/features/db/localdb';
import { formatPeriodLabel, type AggregationType } from '@/lib/analysis';
import { formatFriendlyDate, type DateKeyType } from '@/lib/friendly-date';
import { formatValue } from '@/lib/friendly-numbers';
import type { PeriodAggregateData } from '@/lib/period-aggregate';
import { METRIC_DISPLAY_INFO, type NumberMetric } from '@/lib/stats';
import { getPrimaryMetric, getValenceSource } from '@/lib/tracking';
import { getValueForValence } from '@/lib/valence';
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
  periods: PeriodAggregateData<DateKeyType>[];
  aggregationType: AggregationType;
  tracking: Tracking;
  mode: TrendDataMode;
  valence?: Valence;
  selectedMetrics?: NumberMetric[];
}

export type TrendDataMode = 'trend' | 'change';

type TrendPoint = {
  dateKey: DateKey;
  label: string;
  entryNumber?: number;
  // Normalized tooltip data per metric
  primaryValue: Partial<Record<NumberMetric, number>>;
  secondaryValue: Partial<Record<NumberMetric, number>>;
  primaryValenceValue: Partial<Record<NumberMetric, number>>;
  secondaryValenceValue: Partial<Record<NumberMetric, number>>;
  primaryShowDelta: Partial<Record<NumberMetric, boolean>>;
  secondaryShowDelta: Partial<Record<NumberMetric, boolean>>;
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
  
  const valenceSource = getValenceSource(tracking);

  const restrictToPrimaryMetric = aggregationType === 'none' && mode === 'change';

  const displayMetrics = useMemo(() => {
    if (restrictToPrimaryMetric) {
      return [primaryMetric];
    }
    const unique = [
      primaryMetric,
      ...selectedMetrics.filter((metric): metric is NumberMetric => metric !== primaryMetric),
    ];
    return unique.length > 0 ? unique : [primaryMetric];
  }, [primaryMetric, selectedMetrics, restrictToPrimaryMetric]);

  const [visibleMetrics, setVisibleMetrics] = useState<Set<NumberMetric>>(() => {
    const defaults = new Set<NumberMetric>([primaryMetric]);
    if (!restrictToPrimaryMetric && displayMetrics.includes('mean')) {
      defaults.add('mean');
    }
    return defaults;
  });

  const data: TrendPoint[] = useMemo(() => {
    const result = periods
      .filter((period) => period.stats.count > 0)
      .map((period, index) => {
        const point: TrendPoint = {
          dateKey: period.dateKey,
          label: formatPeriodLabel(period.dateKey, aggregationType),
          ...(aggregationType === 'none' && { entryNumber: index + 1 }),
          primaryValue: {},
          secondaryValue: {},
          primaryValenceValue: {},
          secondaryValenceValue: {},
          primaryShowDelta: {},
          secondaryShowDelta: {},
        };

        // Normalize tooltip data based on valence source and mode
        // Valence = stats + trend: primary=cumulative/color-by-cumulative, secondary=stats/color-by-stats
        // Valence = stats + change: primary=stats/color-by-stats, secondary=cumulative/color-by-cumulative
        // Valence = deltas + trend: primary=stats/color-by-cumulative-deltas, secondary=cumulative-deltas/color-by-cumulative-deltas
        // Valence = deltas + change: primary=deltas/color-by-deltas, secondary=stats/color-by-deltas
        
        for (const metric of displayMetrics) {
          if (valenceSource === 'stats') {
            if (mode === 'trend') {
              // Show cumulatives, color by cumulatives
              point.primaryValue[metric] = period.cumulatives?.[metric] ?? 0;
              point.secondaryValue[metric] = period.stats?.[metric] ?? 0;
              point.primaryValenceValue[metric] = period.cumulatives?.[metric] ?? 0;
              point.secondaryValenceValue[metric] = period.stats?.[metric] ?? 0;
              point.primaryShowDelta[metric] = false;
              point.secondaryShowDelta[metric] = true;
              // Chart displays cumulatives
              point[metric] = period.cumulatives?.[metric];
            } else {
              // Show stats, color by stats
              point.primaryValue[metric] = period.stats?.[metric] ?? 0;
              point.secondaryValue[metric] = period.cumulatives?.[metric] ?? 0;
              point.primaryValenceValue[metric] = period.stats?.[metric] ?? 0;
              point.secondaryValenceValue[metric] = period.cumulatives?.[metric] ?? 0;
              point.primaryShowDelta[metric] = true;
              point.secondaryShowDelta[metric] = false;
              // Chart displays stats
              point[metric] = period.stats?.[metric];
            }
          } else {
            // valenceSource === 'deltas'
            if (mode === 'trend') {
              // Show stats, color by cumulative deltas
              point.primaryValue[metric] = period.stats?.[metric] ?? 0;
              point.secondaryValue[metric] = period.cumulativeDeltas?.[metric] ?? 0;
              point.primaryValenceValue[metric] = period.cumulativeDeltas?.[metric] ?? 0;
              point.secondaryValenceValue[metric] = period.cumulativeDeltas?.[metric] ?? 0;
              point.primaryShowDelta[metric] = false;
              point.secondaryShowDelta[metric] = true;
              // Chart displays stats
              point[metric] = period.stats?.[metric];
            } else {
              // Show deltas, color by deltas
              point.primaryValue[metric] = period.deltas?.[metric] ?? 0;
              point.secondaryValue[metric] = period.stats?.[metric] ?? 0;
              point.primaryValenceValue[metric] = period.deltas?.[metric] ?? 0;
              point.secondaryValenceValue[metric] = period.deltas?.[metric] ?? 0;
              point.primaryShowDelta[metric] = true;
              point.secondaryShowDelta[metric] = false;
              // Chart displays deltas
              point[metric] = period.deltas?.[metric];
            }
          }
        }

        return point;
      });
    
    // Debug: log cumulative deltas vs cumulatives for first few periods
    if (valenceSource === 'deltas' && mode === 'trend' && result.length > 0) {
      console.log('[TrendAnalysisChart] Debug cumulative deltas:');
      result.slice(0, 5).forEach((point, i) => {
        const period = periods.filter(p => p.stats.count > 0)[i];
        console.log(`Period ${i}:`, {
          dateKey: point.dateKey,
          primaryMetric,
          stats: period.stats?.[primaryMetric],
          cumulatives: period.cumulatives?.[primaryMetric],
          cumulativeDeltas: period.cumulativeDeltas?.[primaryMetric],
          deltas: period.deltas?.[primaryMetric],
        });
      });
    }
    
    return result;
  }, [periods, valenceSource, mode, displayMetrics, aggregationType, primaryMetric]);

  if (data.length === 0) {
    return <div>No data available</div>;
  }

  const axisColor = isDark ? '#64748b' : '#334155';
  const gridColor = isDark ? '#334155' : '#e5e7eb';

  // Extract valence source values for color calculations
  const valenceSourceValues = data
    .map((point) => point.primaryValenceValue[primaryMetric])
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

  const hasVisibleMetrics = displayMetrics.some((metric) => visibleMetrics.has(metric));

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
          <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">{formatFriendlyDate(point.dateKey)}</div>
        )}
        <div className="space-y-1">
          {displayMetrics.filter((metric) => visibleMetrics.has(metric)).map((metric) => {
            const dash = getLineDash(metric);
            
            // Use pre-normalized tooltip values
            const primaryValue = point.primaryValue[metric] ?? 0;
            const secondaryValue = point.secondaryValue[metric] ?? 0;
            const primaryValenceValue = point.primaryValenceValue[metric] ?? 0;
            const secondaryValenceValue = point.secondaryValenceValue[metric] ?? 0;
            const primaryShowDelta = point.primaryShowDelta[metric] ?? false;
            const secondaryShowDelta = point.secondaryShowDelta[metric] ?? false;
            
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
        {restrictToPrimaryMetric && (
          <span className="self-center text-xs text-slate-500 dark:text-slate-400">
            Individual entries only support the entry value here, so other summary metrics are unavailable.
          </span>
        )}
      </div>
    </div>
  );
}
