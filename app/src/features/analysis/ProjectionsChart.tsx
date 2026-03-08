import { useTheme } from '@/components/ThemeProvider';
import type { Tracking } from '@/features/db/localdb';
import {
  computeProjectionSeries,
  type AggregationType,
  type ProjectionHorizon,
  type ProjectionMode,
} from '@/lib/analysis';
import { formatValue } from '@/lib/friendly-numbers';
import type { DateKeyType } from '@/lib/friendly-date';
import type { PeriodAggregateData } from '@/lib/period-aggregate';
import { getPrimaryMetric } from '@/lib/tracking';
import { useMemo } from 'react';
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
}

export function ProjectionsChart({
  periods,
  tracking,
  aggregationType,
  projectionMode,
  projectionHorizon,
}: ProjectionsChartProps) {
  const { isDark } = useTheme();
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

  const renderTooltip = ({
    active,
    payload,
    label,
  }: {
    active?: boolean;
    payload?: Array<{ name?: string; value?: number }>;
    label?: string;
  }) => {
    if (!active || !payload?.length) return null;

    const actual = payload.find((item) => item.name === 'Actual')?.value;
    const projected = payload.find((item) => item.name === 'Projected')?.value;

    return (
      <div className="rounded-md bg-white dark:bg-slate-900 px-2.5 py-2 shadow-lg dark:shadow-xl border border-gray-200 dark:border-slate-700">
        <div className="text-xs text-slate-500 dark:text-slate-400 mb-2">{label}</div>
        {typeof actual === 'number' && (
          <div className="flex items-center justify-between gap-3 text-sm mb-1">
            <span className="text-slate-600 dark:text-slate-400">Actual</span>
            <span className="font-semibold text-slate-900 dark:text-slate-100">{formatValue(actual)}</span>
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
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
            <XAxis dataKey="label" tick={{ fill: axisColor, fontSize: 11 }} stroke={axisColor} />
            <YAxis
              tickFormatter={(value) => formatValue(Number(value), { short: true })}
              tick={{ fill: axisColor, fontSize: 11 }}
              stroke={axisColor}
            />
            <Tooltip content={renderTooltip} />
            <Legend />
            {splitLabel && <ReferenceLine x={splitLabel} stroke="#94a3b8" strokeDasharray="4 4" />}
            <Area type="monotone" dataKey="actual" name="Actual" stroke="#2563eb" fill="#60a5fa" fillOpacity={0.2} strokeWidth={2} connectNulls />
            <Area type="monotone" dataKey="projected" name="Projected" stroke="#f59e0b" fill="#fbbf24" fillOpacity={0.18} strokeWidth={2} strokeDasharray="5 5" connectNulls />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
