import { useTheme } from '@/components/ThemeProvider';
import type { Tracking, Valence } from '@/features/db/localdb';
import {
  computeProjectionSeries,
  type AggregationType,
  type ProjectionHorizon,
  type ProjectionMode,
} from '@/lib/analysis';
import { formatValue } from '@/lib/friendly-numbers';
import { formatFriendlyDate, type DateKeyType } from '@/lib/friendly-date';
import type { PeriodAggregateData } from '@/lib/period-aggregate';
import { getPrimaryMetric } from '@/lib/tracking';
import { getValueForValence } from '@/lib/valence';
import { NumberText } from '@/components/ui/number-text';
import { useId, useMemo } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

interface ProjectionsChartProps {
  periods: PeriodAggregateData<DateKeyType>[];
  tracking: Tracking;
  aggregationType: AggregationType;
  projectionMode: ProjectionMode;
  projectionHorizon: ProjectionHorizon;
  valence: Valence;
}

export function ProjectionsChart({
  periods,
  tracking,
  aggregationType,
  projectionMode,
  projectionHorizon,
  valence,
}: ProjectionsChartProps) {
  const { isDark } = useTheme();
  const gradientId = useId();
  const primaryMetric = getPrimaryMetric(tracking);

  const projectionSeries = useMemo(
    () => computeProjectionSeries(periods, tracking, primaryMetric, aggregationType, projectionMode, projectionHorizon),
    [periods, tracking, primaryMetric, aggregationType, projectionMode, projectionHorizon],
  );

  const splitLabel = useMemo(() => {
    const splitIndex = projectionSeries.findIndex((point) => point.isProjection) - 1;
    if (splitIndex < 0) return undefined;
    return projectionSeries[splitIndex]?.label;
  }, [projectionSeries]);

  if (projectionSeries.length < 2) {
    return <div className="text-sm text-muted-foreground">Not enough data points to project yet.</div>;
  }

  const axisColor = isDark ? '#64748b' : '#334155';
  const gridColor = isDark ? '#334155' : '#e5e7eb';

  // Calculate valence colors for the actual data
  const actualValues = projectionSeries
    .filter(point => !point.isProjection && typeof point.actual === 'number')
    .map(point => point.actual!);
  
  const minActual = actualValues.length ? Math.min(...actualValues) : 0;
  const maxActual = actualValues.length ? Math.max(...actualValues) : 0;
  
  // Center gradient on 0 for trend datasets, or use data range for series
  const gradientCenter = tracking === 'series' ? 0 : 0;
  
  const zeroOffset = maxActual <= gradientCenter
    ? 0
    : minActual >= gradientCenter
      ? 1
      : (maxActual - gradientCenter) / (maxActual - minActual);
  
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

  const renderTooltip = ({
    active,
    payload,
  }: {
    active?: boolean;
    payload?: Array<{ payload?: { label: string; dateKey?: any; actual?: number; projected?: number; isProjection: boolean } }>;
  }) => {
    if (!active || !payload?.length || !payload[0].payload) return null;
    const point = payload[0].payload;
    
    const actual = point.actual;
    const projected = point.projected;
    const displayLabel = point.dateKey ? formatFriendlyDate(point.dateKey as any) : point.label;

    return (
      <div className="rounded-md bg-white dark:bg-slate-900 px-2.5 py-2 shadow-lg dark:shadow-xl border border-gray-200 dark:border-slate-700">
        <div className="text-xs text-slate-500 dark:text-slate-400 mb-2">{displayLabel}</div>
        {typeof actual === 'number' && (
          <div className="flex items-center justify-between gap-3 text-sm mb-1">
            <span className="text-slate-600 dark:text-slate-400">Actual</span>
            <span className="font-semibold">
              <NumberText value={actual} valenceValue={actual} valence={valence} />
            </span>
          </div>
        )}
        {typeof projected === 'number' && (
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="text-slate-600 dark:text-slate-400">Projected</span>
            <span className="font-semibold text-slate-900 dark:text-slate-100">{formatValue(projected)}</span>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="h-80 w-full flex flex-col">
      <div className="min-h-0 flex-1 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={projectionSeries} margin={{ top: 8, right: 20, left: 0, bottom: 8 }}>
            <defs>
              <linearGradient id={`projection-gradient-${gradientId}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset={`${zeroOffset * 100}%`} stopColor={positiveColor} stopOpacity={0.2} />
                <stop offset={`${zeroOffset * 100}%`} stopColor={negativeColor} stopOpacity={0.2} />
              </linearGradient>
              <linearGradient id={`projection-gradient-stroke-${gradientId}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={positiveColor} stopOpacity={1} />
                <stop offset={`${zeroOffset * 100}%`} stopColor={positiveColor} stopOpacity={0.25} />
                <stop offset={`${zeroOffset * 100}%`} stopColor={negativeColor} stopOpacity={0.25} />
                <stop offset="100%" stopColor={negativeColor} stopOpacity={1} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
            <XAxis
              dataKey="label"
              tick={{ fill: axisColor, fontSize: 11 }}
              stroke={axisColor}
              interval={Math.floor(projectionSeries.length / 8) || 0}
            />
            <YAxis
              tickFormatter={(value) => formatValue(Number(value), { short: true })}
              tick={{ fill: axisColor, fontSize: 11 }}
              stroke={axisColor}
            />
            <Tooltip content={renderTooltip} />
            <Legend />
            {splitLabel && <ReferenceLine x={splitLabel} stroke="#94a3b8" strokeDasharray="4 4" />}
            <Area
              type="monotone"
              dataKey="actual"
              name="Actual"
              stroke={`url(#projection-gradient-stroke-${gradientId})`}
              fill={`url(#projection-gradient-${gradientId})`}
              baseValue={gradientCenter}
              strokeWidth={2}
              connectNulls
            />
            <Area type="monotone" dataKey="projected" name="Projected" stroke="#f59e0b" fill="#fbbf24" fillOpacity={0.18} strokeWidth={2} strokeDasharray="5 5" connectNulls />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
