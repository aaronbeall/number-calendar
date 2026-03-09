import { useTheme } from '@/components/ThemeProvider';
import type { Tracking, Valence } from '@/features/db/localdb';
import {
  computeProjectionSeries,
  type AggregationType,
  type ProjectionHorizon,
  type ProjectionMomentumWeight,
  type ProjectionMode,
  type ProjectionRecentWindow,
  type ProjectionSeriesPoint,
} from '@/lib/analysis';
import { formatValue } from '@/lib/friendly-numbers';
import { type DateKeyType } from '@/lib/friendly-date';
import type { PeriodAggregateData } from '@/lib/period-aggregate';
import { getPrimaryMetric, getPrimaryMetricLabel } from '@/lib/tracking';
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
  projectionRecentWindow: ProjectionRecentWindow;
  projectionMomentumWeight: ProjectionMomentumWeight;
  valence: Valence;
}

export function ProjectionsChart({
  periods,
  tracking,
  aggregationType,
  projectionMode,
  projectionHorizon,
  projectionRecentWindow,
  projectionMomentumWeight,
  valence,
}: ProjectionsChartProps) {
  const { isDark } = useTheme();
  const gradientId = useId();
  const primaryMetric = getPrimaryMetric(tracking);
  const primaryMetricLabel = getPrimaryMetricLabel(tracking);

  const projectionSeries = useMemo(
    () => computeProjectionSeries(
      periods,
      tracking,
      primaryMetric,
      aggregationType,
      projectionMode,
      projectionHorizon,
      projectionRecentWindow,
      projectionMomentumWeight,
    ),
    [
      periods,
      tracking,
      primaryMetric,
      aggregationType,
      projectionMode,
      projectionHorizon,
      projectionRecentWindow,
      projectionMomentumWeight,
    ],
  );

  const splitLabel = useMemo(() => {
    const splitIndex = projectionSeries.findIndex((point) => point.isProjection) - 1;
    if (splitIndex < 0) return undefined;
    return projectionSeries[splitIndex]?.label;
  }, [projectionSeries]);

  const projectionStepByLabel = useMemo(() => {
    const steps = new Map<string, number>();
    projectionSeries.forEach((point) => {
      if (point.isProjection && typeof point.projectionStep === 'number') {
        steps.set(point.label, point.projectionStep);
      }
    });
    return steps;
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
    payload?: Array<{ payload?: ProjectionSeriesPoint }>;
  }) => {
    if (!active || !payload?.length || !payload[0].payload) return null;
    const point = payload[0].payload;
    
    const actual = point.actual;
    const projected = point.projected;
    const displayLabel = point.label;

    return (
      <div className="rounded-md bg-white dark:bg-slate-900 px-2.5 py-2 shadow-lg dark:shadow-xl border border-gray-200 dark:border-slate-700">
        <div className="mb-2 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
          <span>{displayLabel}</span>
          {point.isProjection && typeof point.projectionStep === 'number' && (
            <span className="inline-flex items-center rounded border border-slate-300 bg-slate-100 px-1.5 py-0.5 font-medium text-[10px] leading-none text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
              +{point.projectionStep}
            </span>
          )}
        </div>
        {typeof actual === 'number' && (
          <div className="flex items-center justify-between gap-3 text-sm mb-1">
            <span className="text-slate-600 dark:text-slate-400">{primaryMetricLabel}</span>
            <span className="font-semibold">
              <NumberText value={actual} valenceValue={actual} valence={valence} />
            </span>
          </div>
        )}
        {typeof projected === 'number' && (
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="text-amber-600 dark:text-amber-400">Projected {primaryMetricLabel}</span>
            <span className="font-semibold">
              <NumberText value={projected} valenceValue={projected} valence={valence} />
            </span>
          </div>
        )}
      </div>
    );
  };

  const renderXAxisTick = ({
    x,
    y,
    payload,
  }: {
    x: number;
    y: number;
    payload: { value: string };
  }) => {
    const label = payload.value;
    const step = projectionStepByLabel.get(label);

    if (typeof step !== 'number') {
      return (
        <g transform={`translate(${x},${y})`}>
          <text x={0} y={0} dy={12} textAnchor="middle" fill={axisColor} fontSize={11}>
            {label}
          </text>
        </g>
      );
    }

    const badgeText = `+${step}`;
    const badgeWidth = Math.max(18, badgeText.length * 6 + 8);

    return (
      <g transform={`translate(${x},${y})`}>
        <text x={0} y={0} dy={10} textAnchor="middle" fill={axisColor} fontSize={11}>
          {label}
        </text>
        <g transform={`translate(${-badgeWidth / 2},14)`}>
          <rect
            width={badgeWidth}
            height={12}
            rx={4}
            fill={isDark ? '#1e293b' : '#f1f5f9'}
            stroke={isDark ? '#334155' : '#cbd5e1'}
          />
          <text
            x={badgeWidth / 2}
            y={8.5}
            textAnchor="middle"
            fill={isDark ? '#e2e8f0' : '#334155'}
            fontSize={9}
            fontWeight={600}
          >
            {badgeText}
          </text>
        </g>
      </g>
    );
  };

  return (
    <div className="h-80 w-full flex flex-col">
      <div className="min-h-0 flex-1 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={projectionSeries} margin={{ top: 8, right: 20, left: 0, bottom: 24 }}>
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
              tick={renderXAxisTick}
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
              name={primaryMetricLabel}
              stroke={`url(#projection-gradient-stroke-${gradientId})`}
              fill={`url(#projection-gradient-${gradientId})`}
              baseValue={gradientCenter}
              strokeWidth={2}
              connectNulls
            />
            <Area type="monotone" dataKey="projected" name={`Projected ${primaryMetricLabel}`} stroke="#f59e0b" fill="#fbbf24" fillOpacity={0.18} strokeWidth={2} strokeDasharray="5 5" connectNulls />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
