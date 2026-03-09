import { useTheme } from '@/components/ThemeProvider';
import type { Tracking, Valence } from '@/features/db/localdb';
import {
  computeMomentumQuadrantData,
  type AggregationType,
} from '@/lib/analysis';
import type { DateKeyType } from '@/lib/friendly-date';
import { formatValue } from '@/lib/friendly-numbers';
import type { PeriodAggregateData } from '@/lib/period-aggregate';
import { getPrimaryMetric, getPrimaryMetricLabel } from '@/lib/tracking';
import { getValueForValence } from '@/lib/valence';
import { NumberText } from '@/components/ui/number-text';
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
  valence: Valence;
}

// Sizing and opacity constants for customization
const SIZE_MIN = 3;
const SIZE_MAX = 9;
const OPACITY_MIN = 0.2;
const OPACITY_MAX = 1;

export function MomentumQuadrantChart({
  periods,
  tracking,
  aggregationType,
  valence,
}: MomentumQuadrantChartProps) {
  const { isDark } = useTheme();
  const primaryMetric = getPrimaryMetric(tracking);
  const primaryMetricLabel = getPrimaryMetricLabel(tracking);

  const scatterData = useMemo(
    () => computeMomentumQuadrantData(periods, primaryMetric, aggregationType),
    [periods, primaryMetric, aggregationType],
  );

  const scatterDataWithStyling = useMemo(() => {
    const maxIndex = scatterData.points.length - 1;
    
    // Calculate max absolute level for size scaling
    const levels = scatterData.points.map(p => p.level);
    const maxAbsLevel = Math.max(...levels.map(l => Math.abs(l)), 1);
    
    return scatterData.points.map((point, index) => {
      // Size based on absolute value
      const levelRatio = Math.abs(point.level) / maxAbsLevel;
      const size = SIZE_MIN + (SIZE_MAX - SIZE_MIN) * levelRatio;
      
      // Opacity based on time (oldest = transparent, newest = opaque)
      const timeRatio = maxIndex === 0 ? 1 : index / maxIndex;
      const opacity = OPACITY_MIN + (OPACITY_MAX - OPACITY_MIN) * timeRatio;
      
      const color = getValueForValence(point.level, valence, {
        good: '#22c55e',
        bad: '#ef4444',
        neutral: '#3b82f6',
      });
      
      return {
        ...point,
        size,
        opacity,
        fill: color,
      };
    });
  }, [scatterData.points, valence]);

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
    payload?: Array<{ payload?: { label: string; level: number; momentum: number; fill: string } }>;
  }) => {
    if (!active || !payload?.length || !payload[0].payload) return null;

    const point = payload[0].payload;

    return (
      <div className="rounded-md bg-white dark:bg-slate-900 px-2.5 py-2 shadow-lg dark:shadow-xl border border-gray-200 dark:border-slate-700">
        <div className="text-xs text-slate-500 dark:text-slate-400 mb-2">{point.label}</div>
        <div className="flex items-center justify-between gap-3 text-sm mb-1">
          <span className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
            <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: point.fill }} />
            {primaryMetricLabel}
          </span>
          <span className="font-semibold">
            <NumberText value={point.level} valenceValue={point.level} valence={valence} />
          </span>
        </div>
        <div className="flex items-center justify-between gap-3 text-sm">
          <span className="text-slate-600 dark:text-slate-400">Change</span>
          <span className="font-semibold">
            <NumberText value={point.momentum} valenceValue={point.momentum} valence={valence} />
          </span>
        </div>
      </div>
    );
  };

  // Calculate quadrant summary
  const quadrants = useMemo(() => {
    const high = scatterData.points.filter(p => p.level >= scatterData.levelMid && p.momentum >= scatterData.momentumMid).length;
    const improving = scatterData.points.filter(p => p.level < scatterData.levelMid && p.momentum >= scatterData.momentumMid).length;
    const declining = scatterData.points.filter(p => p.level >= scatterData.levelMid && p.momentum < scatterData.momentumMid).length;
    const low = scatterData.points.filter(p => p.level < scatterData.levelMid && p.momentum < scatterData.momentumMid).length;
    return { high, improving, declining, low };
  }, [scatterData]);

  const renderCustomDot = (props: any) => {
    const { cx, cy, payload } = props;
    if (typeof cx !== 'number' || typeof cy !== 'number') {
      return <circle cx={0} cy={0} r={0} />;
    }
    
    const size = payload?.size || 4;
    const opacity = payload?.opacity ?? 0.7;
    const fill = payload?.fill || '#8b5cf6';
    
    return (
      <circle
        cx={cx}
        cy={cy}
        r={size}
        fill={fill}
        fillOpacity={opacity}
      />
    );
  };

  return (
    <div className="w-full flex flex-col">
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height={320}>
          <ScatterChart margin={{ top: 8, right: 20, left: 0, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
            <XAxis
              type="number"
              dataKey="level"
              name={primaryMetricLabel}
              tickFormatter={(value) => formatValue(Number(value), { short: true })}
              tick={{ fill: axisColor, fontSize: 11 }}
              stroke={axisColor}
            />
            <YAxis
              type="number"
              dataKey="momentum"
              name="Change"
              tickFormatter={(value) => formatValue(Number(value), { short: true })}
              tick={{ fill: axisColor, fontSize: 11 }}
              stroke={axisColor}
            />
            <Tooltip content={renderTooltip} cursor={{ strokeDasharray: '3 3' }} />
            <ReferenceLine x={scatterData.levelMid} stroke="#94a3b8" strokeDasharray="4 4" />
            <ReferenceLine y={scatterData.momentumMid} stroke="#94a3b8" strokeDasharray="4 4" />
            <Scatter data={scatterDataWithStyling} shape={renderCustomDot} />
          </ScatterChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-3 grid grid-cols-4 gap-2 text-xs">
        <div className="rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 px-2.5 py-1.5">
          <div className="font-semibold text-slate-700 dark:text-slate-300">High & Up</div>
          <div style={{ color: getValueForValence(1, valence, { good: '#22c55e', bad: '#ef4444', neutral: '#3b82f6' }) }}>
            {quadrants.high}
          </div>
        </div>
        <div className="rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 px-2.5 py-1.5">
          <div className="font-semibold text-slate-700 dark:text-slate-300">Low & Up</div>
          <div style={{ color: getValueForValence(0, valence, { good: '#22c55e', bad: '#ef4444', neutral: '#3b82f6' }) }}>
            {quadrants.improving}
          </div>
        </div>
        <div className="rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 px-2.5 py-1.5">
          <div className="font-semibold text-slate-700 dark:text-slate-300">High & Down</div>
          <div style={{ color: getValueForValence(-1, valence, { good: '#22c55e', bad: '#ef4444', neutral: '#3b82f6' }) }}>
            {quadrants.declining}
          </div>
        </div>
        <div className="rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 px-2.5 py-1.5">
          <div className="font-semibold text-slate-700 dark:text-slate-300">Low & Down</div>
          <div style={{ color: getValueForValence(-1, valence, { good: '#22c55e', bad: '#ef4444', neutral: '#3b82f6' }) }}>
            {quadrants.low}
          </div>
        </div>
      </div>
    </div>
  );
}
