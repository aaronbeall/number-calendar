import { useTheme } from '@/components/ThemeProvider';
import type { Tracking } from '@/features/db/localdb';
import {
  computeMomentumQuadrantData,
  type AggregationType,
} from '@/lib/analysis';
import type { DateKeyType } from '@/lib/friendly-date';
import { formatValue } from '@/lib/friendly-numbers';
import type { PeriodAggregateData } from '@/lib/period-aggregate';
import { getPrimaryMetric } from '@/lib/tracking';
import { useMemo } from 'react';
import {
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

interface MomentumQuadrantChartProps {
  periods: PeriodAggregateData<DateKeyType>[];
  tracking: Tracking;
  aggregationType: AggregationType;
}

export function MomentumQuadrantChart({
  periods,
  tracking,
  aggregationType,
}: MomentumQuadrantChartProps) {
  const { isDark } = useTheme();
  const primaryMetric = getPrimaryMetric(tracking);

  const scatterData = useMemo(
    () => computeMomentumQuadrantData(periods, primaryMetric, aggregationType),
    [periods, primaryMetric, aggregationType],
  );

  if (scatterData.points.length < 2) {
    return <div className="text-sm text-muted-foreground">Need at least two periods to show momentum regimes.</div>;
  }

  const axisColor = isDark ? '#64748b' : '#334155';
  const gridColor = isDark ? '#334155' : '#e5e7eb';

  const renderTooltip = ({
    active,
    payload,
  }: {
    active?: boolean;
    payload?: Array<{ payload?: { label: string; level: number; momentum: number } }>;
  }) => {
    if (!active || !payload?.length || !payload[0].payload) return null;

    const point = payload[0].payload;

    return (
      <div className="rounded-md bg-white dark:bg-slate-900 px-2.5 py-2 shadow-lg dark:shadow-xl border border-gray-200 dark:border-slate-700">
        <div className="text-xs text-slate-500 dark:text-slate-400 mb-2">{point.label}</div>
        <div className="flex items-center justify-between gap-3 text-sm mb-1">
          <span className="text-slate-600 dark:text-slate-400">Level</span>
          <span className="font-semibold text-slate-900 dark:text-slate-100">{formatValue(point.level)}</span>
        </div>
        <div className="flex items-center justify-between gap-3 text-sm">
          <span className="text-slate-600 dark:text-slate-400">Momentum</span>
          <span className="font-semibold text-slate-900 dark:text-slate-100">{formatValue(point.momentum)}</span>
        </div>
      </div>
    );
  };

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ top: 8, right: 20, left: 0, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
          <XAxis
            type="number"
            dataKey="level"
            name="Level"
            tickFormatter={(value) => formatValue(Number(value), { short: true })}
            tick={{ fill: axisColor, fontSize: 11 }}
            stroke={axisColor}
          />
          <YAxis
            type="number"
            dataKey="momentum"
            name="Momentum"
            tickFormatter={(value) => formatValue(Number(value), { short: true })}
            tick={{ fill: axisColor, fontSize: 11 }}
            stroke={axisColor}
          />
          <Tooltip content={renderTooltip} cursor={{ strokeDasharray: '3 3' }} />
          <ReferenceLine x={scatterData.levelMid} stroke="#94a3b8" strokeDasharray="4 4" />
          <ReferenceLine y={scatterData.momentumMid} stroke="#94a3b8" strokeDasharray="4 4" />
          <Scatter data={scatterData.points} fill="#8b5cf6" />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}
