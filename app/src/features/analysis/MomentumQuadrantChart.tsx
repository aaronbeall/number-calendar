import { useTheme } from '@/components/ThemeProvider';
import type { DateKey, Tracking, Valence } from '@/features/db/localdb';
import {
  computeMomentumQuadrantData,
  type AggregationType,
} from '@/lib/analysis';
import { getNormalizedMagnitude } from '@/lib/charts';
import { formatFriendlyDate, type DateKeyType } from '@/lib/friendly-date';
import { formatValue } from '@/lib/friendly-numbers';
import type { PeriodAggregateData } from '@/lib/period-aggregate';
import { getPrimaryMetric, getPrimaryMetricLabel } from '@/lib/tracking';
import { getValueForValence } from '@/lib/valence';
import { NumberText } from '@/components/ui/number-text';
import { TrendingUp, TrendingDown, ArrowUp, ArrowDown } from 'lucide-react';
import { memo, useCallback, useMemo } from 'react';
import {
  CartesianGrid,
  ReferenceArea,
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
    () => computeMomentumQuadrantData(periods, primaryMetric, aggregationType, tracking),
    [periods, primaryMetric, aggregationType, tracking],
  );

  const scatterDataWithStyling = useMemo(() => {
    const maxIndex = scatterData.points.length - 1;

    const sizeValues = scatterData.points.map((p) => p.level);
    const sizeRange = {
      min: Math.min(...sizeValues),
      max: Math.max(...sizeValues),
    };
    
    return scatterData.points.map((point, index) => {
      const size = getNormalizedMagnitude(point.level, sizeRange, SIZE_MIN, SIZE_MAX);
      
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

  const axisColor = isDark ? '#64748b' : '#334155';
  const gridColor = isDark ? '#334155' : '#e5e7eb';

  const renderTooltip = ({
    active,
    payload,
  }: {
    active?: boolean;
    payload?: Array<{ payload?: { label: string; dateKey: DateKey; level: number; momentum: number; fill: string } }>;
  }) => {
    if (!active || !payload?.length || !payload[0].payload) return null;

    const point = payload[0].payload;

    return (
      <div className="rounded-md bg-white dark:bg-slate-900 px-2.5 py-2 shadow-lg dark:shadow-xl border border-gray-200 dark:border-slate-700">
        <div className="text-xs text-slate-500 dark:text-slate-400 mb-2">{formatFriendlyDate(point.dateKey, { short: true })}</div>
        <div className="flex items-center justify-between gap-3 text-sm mb-1">
          <span className="text-slate-600 dark:text-slate-400">
            {primaryMetricLabel}
          </span>
          <span className="font-semibold">
            <NumberText value={point.level} valenceValue={point.level} valence={valence} delta={tracking === 'trend'} />
          </span>
        </div>
        <div className="flex items-center justify-between gap-3 text-sm">
          <span className="text-slate-600 dark:text-slate-400">Change</span>
          <span className="font-semibold">
            <NumberText value={point.momentum} valenceValue={point.momentum} valence={valence} delta={true} />
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

  // Define color sets
  const emerald = {
    border: 'border-emerald-200 dark:border-emerald-900/40',
    bg: 'bg-emerald-50 dark:bg-emerald-950/20',
    text: 'text-emerald-900 dark:text-emerald-100',
    label: 'text-emerald-600 dark:text-emerald-400',
    number: 'text-emerald-700 dark:text-emerald-300',
  };
  const cyan = {
    border: 'border-cyan-200 dark:border-cyan-900/40',
    bg: 'bg-cyan-50 dark:bg-cyan-950/20',
    text: 'text-cyan-900 dark:text-cyan-100',
    label: 'text-cyan-600 dark:text-cyan-400',
    number: 'text-cyan-700 dark:text-cyan-300',
  };
  const blue = {
    border: 'border-blue-200 dark:border-blue-900/40',
    bg: 'bg-blue-50 dark:bg-blue-950/20',
    text: 'text-blue-900 dark:text-blue-100',
    label: 'text-blue-600 dark:text-blue-400',
    number: 'text-blue-700 dark:text-blue-300',
  };
  const orange = {
    border: 'border-orange-200 dark:border-orange-900/40',
    bg: 'bg-orange-50 dark:bg-orange-950/20',
    text: 'text-orange-900 dark:text-orange-100',
    label: 'text-orange-600 dark:text-orange-400',
    number: 'text-orange-700 dark:text-orange-300',
  };
  const red = {
    border: 'border-red-200 dark:border-red-900/40',
    bg: 'bg-red-50 dark:bg-red-950/20',
    text: 'text-red-900 dark:text-red-100',
    label: 'text-red-600 dark:text-red-400',
    number: 'text-red-700 dark:text-red-300',
  };

  // Determine colors based on valence source, valence, and regime
  const getRegimeValenceValue = (isHighLevel: boolean, isPositiveMomentum: boolean) => {
    const levelValue = isHighLevel ? 1 : -1;
    const momentumValue = isPositiveMomentum ? 1 : -1;
    // Transition quadrants (Growth/Decline) should evaluate by direction.
    return isHighLevel !== isPositiveMomentum ? momentumValue : levelValue;
  };

  const getRegimeColors = (isHighLevel: boolean, isPositiveMomentum: boolean) => {
    const regimeValenceValue = getRegimeValenceValue(isHighLevel, isPositiveMomentum);
    
    // Define palette for this quadrant
    const palette = isHighLevel && isPositiveMomentum
      ? { good: emerald, bad: red, neutral: blue }        // Peak
      : !isHighLevel && isPositiveMomentum
      ? { good: cyan, bad: orange, neutral: blue }        // Growth
      : isHighLevel && !isPositiveMomentum
      ? { good: blue, bad: orange, neutral: orange }      // Decline
      : { good: emerald, bad: red, neutral: red };        // Trough
    
    return getValueForValence(regimeValenceValue, valence, palette);
  };

  const peakColors = getRegimeColors(true, true);
  const growthColors = getRegimeColors(false, true);
  const declineColors = getRegimeColors(true, false);
  const troughColors = getRegimeColors(false, false);

  const regimeTitles = valence === 'negative'
    ? {
        growth: 'Rising',
        peak: 'Elevated',
        decline: 'Easing',
        trough: 'Low',
      }
    : {
        growth: 'Growth',
        peak: 'Peak',
        decline: 'Decline',
        trough: 'Trough',
      };

  const getRegimeTint = (isHighLevel: boolean, isPositiveMomentum: boolean) => {
    const regimeValenceValue = getRegimeValenceValue(isHighLevel, isPositiveMomentum);
    const palette = isHighLevel && isPositiveMomentum
      ? { good: '#10b981', bad: '#ef4444', neutral: '#3b82f6' } // Peak
      : !isHighLevel && isPositiveMomentum
      ? { good: '#06b6d4', bad: '#f97316', neutral: '#3b82f6' } // Growth
      : isHighLevel && !isPositiveMomentum
      ? { good: '#3b82f6', bad: '#f97316', neutral: '#f97316' } // Decline
      : { good: '#10b981', bad: '#ef4444', neutral: '#ef4444' }; // Trough

    return getValueForValence(regimeValenceValue, valence, palette);
  };

  const chartBounds = useMemo(() => {
    const levels = scatterData.points.map((p) => p.level);
    const momentums = scatterData.points.map((p) => p.momentum);
    if (levels.length === 0 || momentums.length === 0) {
      return {
        levelMin: 0,
        levelMax: 0,
        momentumMin: 0,
        momentumMax: 0,
      };
    }
    return {
      levelMin: Math.min(...levels),
      levelMax: Math.max(...levels),
      momentumMin: Math.min(...momentums),
      momentumMax: Math.max(...momentums),
    };
  }, [scatterData.points]);

  const renderCustomDot = useCallback((props: {
    cx?: number;
    cy?: number;
    payload?: { size?: number; opacity?: number; fill?: string };
  }) => {
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
  }, []);

  if (scatterData.points.length < 2) {
    return <div className="text-sm text-muted-foreground">Need at least two periods to show momentum regimes.</div>;
  }

  return (
    <div className="w-full flex flex-col">
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height={320}>
          <ScatterChart margin={{ top: 8, right: 20, left: 0, bottom: 8 }}>
            <ReferenceArea
              x1={scatterData.levelMid}
              x2={chartBounds.levelMax}
              y1={scatterData.momentumMid}
              y2={chartBounds.momentumMax}
              fill={getRegimeTint(true, true)}
              fillOpacity={isDark ? 0.12 : 0.07}
              ifOverflow="extendDomain"
            />
            <ReferenceArea
              x1={chartBounds.levelMin}
              x2={scatterData.levelMid}
              y1={scatterData.momentumMid}
              y2={chartBounds.momentumMax}
              fill={getRegimeTint(false, true)}
              fillOpacity={isDark ? 0.12 : 0.07}
              ifOverflow="extendDomain"
            />
            <ReferenceArea
              x1={scatterData.levelMid}
              x2={chartBounds.levelMax}
              y1={chartBounds.momentumMin}
              y2={scatterData.momentumMid}
              fill={getRegimeTint(true, false)}
              fillOpacity={isDark ? 0.12 : 0.07}
              ifOverflow="extendDomain"
            />
            <ReferenceArea
              x1={chartBounds.levelMin}
              x2={scatterData.levelMid}
              y1={chartBounds.momentumMin}
              y2={scatterData.momentumMid}
              fill={getRegimeTint(false, false)}
              fillOpacity={isDark ? 0.12 : 0.07}
              ifOverflow="extendDomain"
            />
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
            <XAxis
              type="number"
              dataKey="level"
              name={primaryMetricLabel}
              domain={['dataMin', 'dataMax']}
              tickFormatter={(value) => formatValue(Number(value), { short: true })}
              tick={{ fill: axisColor, fontSize: 11 }}
              stroke={axisColor}
            />
            <YAxis
              type="number"
              dataKey="momentum"
              name="Change"
              domain={['dataMin', 'dataMax']}
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

      <div className="mt-4 grid grid-cols-4 gap-3">
        {/* Low & Up: Building regime */}
        <div className={`rounded-lg ${growthColors.border} ${growthColors.bg} px-3 py-2.5`}>
          <div className="flex items-center justify-between mb-1.5">
            <div className={`font-semibold text-xs ${growthColors.text} uppercase tracking-tight`}>
              {regimeTitles.growth}
            </div>
            <ArrowUp className={`w-4 h-4 ${growthColors.label}`} />
          </div>
          <div className={`text-2xl font-bold ${growthColors.number} mb-0.5`}>
            {quadrants.improving}
          </div>
          <div className={`text-xs ${growthColors.label}`}>Low & Rising</div>
        </div>

        {/* High & Up: Strongest regime */}
        <div className={`rounded-lg ${peakColors.border} ${peakColors.bg} px-3 py-2.5`}>
          <div className="flex items-center justify-between mb-1.5">
            <div className={`font-semibold text-xs ${peakColors.text} uppercase tracking-tight`}>
              {regimeTitles.peak}
            </div>
            <TrendingUp className={`w-4 h-4 ${peakColors.label}`} />
          </div>
          <div className={`text-2xl font-bold ${peakColors.number} mb-0.5`}>
            {quadrants.high}
          </div>
          <div className={`text-xs ${peakColors.label}`}>High & Rising</div>
        </div>

        {/* High & Down: Declining regime */}
        <div className={`rounded-lg ${declineColors.border} ${declineColors.bg} px-3 py-2.5`}>
          <div className="flex items-center justify-between mb-1.5">
            <div className={`font-semibold text-xs ${declineColors.text} uppercase tracking-tight`}>
              {regimeTitles.decline}
            </div>
            <ArrowDown className={`w-4 h-4 ${declineColors.label}`} />
          </div>
          <div className={`text-2xl font-bold ${declineColors.number} mb-0.5`}>
            {quadrants.declining}
          </div>
          <div className={`text-xs ${declineColors.label}`}>High & Falling</div>
        </div>

        {/* Low & Down: Worst regime */}
        <div className={`rounded-lg ${troughColors.border} ${troughColors.bg} px-3 py-2.5`}>
          <div className="flex items-center justify-between mb-1.5">
            <div className={`font-semibold text-xs ${troughColors.text} uppercase tracking-tight`}>
              {regimeTitles.trough}
            </div>
            <TrendingDown className={`w-4 h-4 ${troughColors.label}`} />
          </div>
          <div className={`text-2xl font-bold ${troughColors.number} mb-0.5`}>
            {quadrants.low}
          </div>
          <div className={`text-xs ${troughColors.label}`}>Low & Falling</div>
        </div>
      </div>
    </div>
  );
}

export default memo(MomentumQuadrantChart);
