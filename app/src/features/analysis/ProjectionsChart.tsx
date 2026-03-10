import { useTheme } from '@/components/ThemeProvider';
import type { Tracking, Valence } from '@/features/db/localdb';
import type { GoalResults } from '@/lib/goals';
import {
  computeProjectionSeries,
  type AggregationType,
  type ProjectionHorizon,
  type ProjectionMathMode,
  type ProjectionMomentumWeight,
  type ProjectionMode,
  type ProjectionRecentWindow,
  type ProjectionSeriesPoint,
} from '@/lib/analysis';
import { formatValue } from '@/lib/friendly-numbers';
import { formatFriendlyDate, type DateKeyType } from '@/lib/friendly-date';
import type { PeriodAggregateData } from '@/lib/period-aggregate';
import { getPrimaryMetric, getPrimaryMetricLabel } from '@/lib/tracking';
import { getValueForValence } from '@/lib/valence';
import { NumberText } from '@/components/ui/number-text';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Slider } from '@/components/ui/slider';
import { ToggleOptionPopover } from '@/components/ui/toggle-option-popover';
import { Button } from '@/components/ui/button';
import { usePreference } from '@/hooks/usePreference';
import { CheckCircle, ChevronDown, ExternalLink, Gauge, Percent, Plus, SlidersHorizontal, Target } from 'lucide-react';
import { useId, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { AchievementBadgeIcon } from '@/features/achievements/AchievementBadgeIcon';
import { AchievementBadge } from '@/features/achievements/AchievementBadge';
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

interface ProjectionsChartProps {
  datasetId: string;
  periods: PeriodAggregateData<DateKeyType>[];
  tracking: Tracking;
  aggregationType: AggregationType;
  projectionMode: ProjectionMode;
  projectionHorizon: ProjectionHorizon;
  projectionRecentWindow: ProjectionRecentWindow;
  projectionMomentumWeight: ProjectionMomentumWeight;
  valence: Valence;
  milestones: GoalResults[];
}

export function ProjectionsChart({
  datasetId,
  periods,
  tracking,
  aggregationType,
  projectionMode,
  projectionHorizon,
  projectionRecentWindow,
  projectionMomentumWeight,
  valence,
  milestones,
}: ProjectionsChartProps) {
  const { isDark } = useTheme();
  const gradientId = useId();
  const primaryMetric = getPrimaryMetric(tracking);
  const primaryMetricLabel = getPrimaryMetricLabel(tracking);
  const [projectionMath, setProjectionMath] = usePreference<ProjectionMathMode>(
    `analysis_projectionMath_${datasetId}`,
    'additive',
  );
  const [showProjectionSpread, setShowProjectionSpread] = usePreference<boolean>(
    `analysis_projectionSpreadEnabled_${datasetId}`,
    true,
  );
  const [projectionSpreadPercentPref, setProjectionSpreadPercentPref] = usePreference<number>(
    `analysis_projectionSpreadPercent_${datasetId}_${aggregationType}`,
    5,
  );
  const projectionSpreadPercent = Math.min(Math.max(1, Number(projectionSpreadPercentPref)), 25);
  const [compoundGrowthRatePref, setCompoundGrowthRatePref] = usePreference<number>(
    `analysis_compoundGrowthRate_${datasetId}_${aggregationType}`,
    5,
  );
  const compoundGrowthRate = Math.min(Math.max(1, Number(compoundGrowthRatePref)), 50);
  const [showProjectionAdjustment, setShowProjectionAdjustment] = usePreference<boolean>(
    `analysis_projectionAdjustmentEnabled_${datasetId}`,
    false,
  );
  const [projectionAdjustmentPercentPref, setProjectionAdjustmentPercentPref] = usePreference<number>(
    `analysis_projectionAdjustmentPercent_${datasetId}_${aggregationType}`,
    0,
  );
  const projectionAdjustmentPercent = Math.min(Math.max(-25, Number(projectionAdjustmentPercentPref)), 25);

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
      projectionMath,
      compoundGrowthRate,
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
      projectionMath,
      compoundGrowthRate,
    ],
  );

  const adjustedProjectionSeries = useMemo(() => {
    if (!showProjectionAdjustment || projectionAdjustmentPercent === 0) {
      return projectionSeries;
    }

    const projectionStart = projectionSeries.find(
      (point) => point.isProjection && point.projectionStep === 1 && typeof point.projected === 'number',
    );
    const anchorPoint = [...projectionSeries]
      .reverse()
      .find((point) => !point.isProjection && typeof point.projected === 'number');

    if (
      !projectionStart
      || typeof projectionStart.projected !== 'number'
      || !anchorPoint
      || typeof anchorPoint.projected !== 'number'
    ) {
      return projectionSeries;
    }

    const anchorValue = anchorPoint.projected;
    const firstStepDelta = projectionStart.projected - anchorValue;
    const baseRatePercent = anchorValue !== 0
      ? (firstStepDelta / Math.abs(anchorValue)) * 100
      : 0;
    const adjustedRatePercent = baseRatePercent + projectionAdjustmentPercent;

    // Scenario adjustment is in percentage points (e.g. 2% + 100 => 102%).
    const rateMultiplier = baseRatePercent === 0
      ? 1 + (projectionAdjustmentPercent / 100)
      : (adjustedRatePercent / baseRatePercent);

    return projectionSeries.map((point) => {
      if (typeof point.projected !== 'number') {
        return point;
      }
      return {
        ...point,
        projected: anchorValue + ((point.projected - anchorValue) * rateMultiplier),
      };
    });
  }, [projectionSeries, showProjectionAdjustment, projectionAdjustmentPercent]);

  type ProjectionChartPoint = ProjectionSeriesPoint & {
    projectedLow?: number;
    projectedHigh?: number;
  };

  const chartSeries = useMemo<ProjectionChartPoint[]>(() => {
    if (!showProjectionSpread || projectionSpreadPercent <= 0) {
      return adjustedProjectionSeries;
    }

    const projectionStart = adjustedProjectionSeries.find(
      (point) => point.isProjection && point.projectionStep === 1 && typeof point.projected === 'number',
    );
    const anchorPoint = [...adjustedProjectionSeries]
      .reverse()
      .find((point) => !point.isProjection && typeof point.projected === 'number');

    if (!projectionStart || !anchorPoint || typeof anchorPoint.projected !== 'number') {
      return adjustedProjectionSeries;
    }

    if (typeof projectionStart.projected !== 'number') {
      return adjustedProjectionSeries;
    }

    const anchorValue = anchorPoint.projected;
    const baseSlope = projectionStart.projected - anchorValue;
    const baseRatePercent = anchorValue !== 0
      ? (baseSlope / Math.abs(anchorValue)) * 100
      : 0;

    const toSlopeFromRatePercent = (targetRatePercent: number): number => {
      // Spread is in percentage points, similar to scenario adjustment.
      const multiplier = baseRatePercent === 0
        ? 1 + ((targetRatePercent - baseRatePercent) / 100)
        : (targetRatePercent / baseRatePercent);
      return baseSlope * multiplier;
    };

    const projectBySlope = (step: number, slope: number): number => {
      if (projectionMath === 'compound') {
        const rate = compoundGrowthRate / 100;
        if (rate === 0) return anchorValue + (slope * step);
        return anchorValue + (slope * ((((1 + rate) ** step) - 1) / rate));
      }
      return anchorValue + (slope * step);
    };

    return adjustedProjectionSeries.map((point) => {
      if (typeof point.projected !== 'number') {
        return point;
      }

      if (!point.isProjection || typeof point.projectionStep !== 'number') {
        return {
          ...point,
          projectedLow: point.projected,
          projectedHigh: point.projected,
        };
      }

      const step = Math.max(1, point.projectionStep);
      const highSlope = toSlopeFromRatePercent(baseRatePercent + projectionSpreadPercent);
      const lowSlope = toSlopeFromRatePercent(baseRatePercent - projectionSpreadPercent);
      const highCandidate = projectBySlope(step, highSlope);
      const lowCandidate = projectBySlope(step, lowSlope);

      return {
        ...point,
        projectedLow: Math.min(lowCandidate, highCandidate),
        projectedHigh: Math.max(lowCandidate, highCandidate),
      };
    });
  }, [
    adjustedProjectionSeries,
    showProjectionSpread,
    projectionSpreadPercent,
    projectionMath,
    compoundGrowthRate,
  ]);

  const projectionRate = useMemo(() => {
    const projectionStart = adjustedProjectionSeries.find(
      (point) => point.isProjection && point.projectionStep === 1 && typeof point.projected === 'number',
    );
    const anchorPoint = [...adjustedProjectionSeries]
      .reverse()
      .find((point) => !point.isProjection && typeof point.projected === 'number');

    if (!projectionStart || !anchorPoint || typeof projectionStart.projected !== 'number' || typeof anchorPoint.projected !== 'number') {
      return undefined;
    }

    const delta = projectionStart.projected - anchorPoint.projected;
    if (!Number.isFinite(delta)) return undefined;

    const percent = anchorPoint.projected !== 0
      ? (delta / Math.abs(anchorPoint.projected)) * 100
      : undefined;

    return { delta, percent };
  }, [adjustedProjectionSeries]);

  const splitLabel = useMemo(() => {
    const splitIndex = chartSeries.findIndex((point) => point.isProjection) - 1;
    if (splitIndex < 0) return undefined;
    return chartSeries[splitIndex]?.label;
  }, [chartSeries]);

  const projectionStepByLabel = useMemo(() => {
    const steps = new Map<string, number>();
    chartSeries.forEach((point) => {
      if (point.isProjection && typeof point.projectionStep === 'number') {
        steps.set(point.label, point.projectionStep);
      }
    });
    return steps;
  }, [chartSeries]);

  const pointIndexByLabel = useMemo(() => {
    const indices = new Map<string, number>();
    chartSeries.forEach((point, index) => {
      indices.set(point.label, index);
    });
    return indices;
  }, [chartSeries]);

  // Sort milestones by value based on valence (worst to best)
  const sortedMilestones = useMemo(() => {
    return [...milestones]
      .filter((result) => {
        const targetValue = result.goal.target.value;
        return typeof targetValue === 'number';
      })
      .sort((a, b) => {
        const aValue = a.goal.target.value as number;
        const bValue = b.goal.target.value as number;
        // For positive valence: smallest to highest
        // For negative valence: highest to smallest
        return valence === 'positive' ? aValue - bValue : bValue - aValue;
      });
  }, [milestones, valence]);

  // Find the next incomplete milestone
  const nextIncompleteMilestone = useMemo(() => {
    return sortedMilestones.find((result) => result.completedCount === 0)?.goal.id;
  }, [sortedMilestones]);

  // Selected milestones preference (multi-select)
  const [selectedMilestoneIds, setSelectedMilestoneIds] = usePreference<string[]>(
    `analysis_selectedMilestones_${datasetId}`,
    nextIncompleteMilestone ? [nextIncompleteMilestone] : [],
  );

  const selectedMilestones = useMemo(() => {
    return sortedMilestones.filter((result) => selectedMilestoneIds.includes(result.goal.id));
  }, [sortedMilestones, selectedMilestoneIds]);

  // Find intersection points for all selected milestones
  const milestoneData = useMemo(() => {
    const intersections: Array<{ label: string; value: number; milestoneId: string }> = [];
    const noIntersectionMilestones: Set<string> = new Set();
    
    selectedMilestones.forEach((milestone) => {
      const targetValue = milestone.goal.target.value as number;
      const isComplete = milestone.completedCount > 0;
      let foundIntersection = false;

      chartSeries.forEach((point, index) => {
        // For incomplete milestones, check projected data
        // For complete milestones, check actual data
        const dataValue = isComplete ? point.actual : point.projected;
        if (typeof dataValue !== 'number') return;
        
        const prevPoint = index > 0 ? chartSeries[index - 1] : null;
        if (!prevPoint) return;
        
        const prevDataValue = isComplete ? prevPoint.actual : prevPoint.projected;
        if (typeof prevDataValue !== 'number') return;

        // Check if the line crosses the milestone value in the correct direction
        const crossesUp = prevDataValue < targetValue && dataValue >= targetValue;
        const crossesDown = prevDataValue > targetValue && dataValue <= targetValue;

        // For positive valence, we want to reach from below (crossesUp)
        // For negative valence, we want to reach from above (crossesDown)
        const isCorrectDirection = valence === 'positive' ? crossesUp : crossesDown;

        if (isCorrectDirection) {
          intersections.push({
            label: point.label,
            value: targetValue,
            milestoneId: milestone.goal.id,
          });
          foundIntersection = true;
        }
      });
      
      if (!foundIntersection) {
        noIntersectionMilestones.add(milestone.goal.id);
      }
    });

    return { intersections, noIntersectionMilestones };
  }, [selectedMilestones, chartSeries, valence]);

  if (chartSeries.length < 2) {
    return <div className="text-sm text-muted-foreground">Not enough data points to project yet.</div>;
  }

  const axisColor = isDark ? '#64748b' : '#334155';
  const gridColor = isDark ? '#334155' : '#e5e7eb';

  // Calculate valence colors for the actual data
  const actualValues = chartSeries
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
  const projectionRateColor = getValueForValence(projectionRate?.delta ?? 0, valence, {
    good: '#22c55e',
    bad: '#ef4444',
    neutral: '#3b82f6',
  });

  const legendFormatter = (value: string) => {
    if (value === primaryMetricLabel) {
      return <span style={{ color: positiveColor, fontWeight: 600 }}>{value}</span>;
    }
    return value;
  };

  const renderTooltip = ({
    active,
    payload,
  }: {
    active?: boolean;
    payload?: Array<{ payload?: ProjectionChartPoint }>;
  }) => {
    if (!active || !payload?.length || !payload[0].payload) return null;
    const point = payload[0].payload;
    
    const actual = point.actual;
    const projected = point.projected;
    const projectedLow = point.projectedLow;
    const projectedHigh = point.projectedHigh;
    const pointIndex = pointIndexByLabel.get(point.label);
    const previousPoint = typeof pointIndex === 'number' && pointIndex > 0
      ? chartSeries[pointIndex - 1]
      : undefined;
    const actualDelta = typeof actual === 'number' && typeof previousPoint?.actual === 'number'
      ? actual - previousPoint.actual
      : undefined;
    const projectedDelta = typeof projected === 'number' && typeof previousPoint?.projected === 'number'
      ? projected - previousPoint.projected
      : undefined;
    const projectedHighDelta = typeof projectedHigh === 'number' && typeof previousPoint?.projectedHigh === 'number'
      ? projectedHigh - previousPoint.projectedHigh
      : undefined;
    const projectedLowDelta = typeof projectedLow === 'number' && typeof previousPoint?.projectedLow === 'number'
      ? projectedLow - previousPoint.projectedLow
      : undefined;
    const displayLabel = point.dateKey
      ? formatFriendlyDate(point.dateKey, { short: true })
      : point.label;
    
    // Find any milestone intersections at this point
    const milestonesAtPoint = milestoneData.intersections
      .filter(intersection => intersection.label === point.label)
      .map(intersection => selectedMilestones.find(m => m.goal.id === intersection.milestoneId))
      .filter((m): m is typeof selectedMilestones[0] => m !== undefined);

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
            <span className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
              <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: positiveColor }} />
              {primaryMetricLabel}
            </span>
            <span className="font-semibold">
              <NumberText value={actual} valenceValue={actual} valence={valence} />
              {typeof actualDelta === 'number' && (
                <span className="ml-1 text-xs font-medium opacity-80">
                  (<NumberText value={actualDelta} valenceValue={actualDelta} valence={valence} delta className="inline" />)
                </span>
              )}
            </span>
          </div>
        )}
        {typeof projected === 'number' && (
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
              <span className="inline-block w-2 h-2 rounded-full bg-amber-500" />
              Projected {primaryMetricLabel}
            </span>
            <span className="font-semibold">
              <NumberText value={projected} valenceValue={projected} valence={valence} />
              {typeof projectedDelta === 'number' && (
                <span className="ml-1 text-xs font-medium opacity-80">
                  (<NumberText value={projectedDelta} valenceValue={projectedDelta} valence={valence} delta className="inline" />)
                </span>
              )}
            </span>
          </div>
        )}
        {milestonesAtPoint.length > 0 && (
          <div className="mt-1 pt-1">
            {milestonesAtPoint.map((milestone) => (
              <div key={milestone.goal.id} className="flex items-center gap-2 mt-1">
                <AchievementBadge badge={milestone.goal.badge} size="small" />
                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{milestone.goal.title}</span>
                  {milestone.goal.description && (
                    <span className="text-[10px] text-slate-500 dark:text-slate-400">{milestone.goal.description}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
        {showProjectionSpread && typeof projectedLow === 'number' && typeof projectedHigh === 'number' && (
          <>
            <div className="flex items-center justify-between gap-3 text-xs mt-1">
              <span className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                <span className="inline-block w-2 h-2 rounded-full bg-cyan-500" />
                High projection
              </span>
              <span className="font-medium">
                <NumberText value={projectedHigh} valenceValue={projectedHigh} valence={valence} />
                {typeof projectedHighDelta === 'number' && (
                  <span className="ml-1 opacity-80">
                    (<NumberText value={projectedHighDelta} valenceValue={projectedHighDelta} valence={valence} delta className="inline" />)
                  </span>
                )}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3 text-xs">
              <span className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                <span className="inline-block w-2 h-2 rounded-full bg-purple-500" />
                Low projection
              </span>
              <span className="font-medium">
                <NumberText value={projectedLow} valenceValue={projectedLow} valence={valence} />
                {typeof projectedLowDelta === 'number' && (
                  <span className="ml-1 opacity-80">
                    (<NumberText value={projectedLowDelta} valenceValue={projectedLowDelta} valence={valence} delta className="inline" />)
                  </span>
                )}
              </span>
            </div>
          </>
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
    <div className="w-full flex flex-col">
      <div className="min-h-0 flex-1 w-full">
        <ResponsiveContainer width="100%" height={320}>
          <ComposedChart data={chartSeries} margin={{ top: 8, right: 20, left: 0, bottom: 24 }}>
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
              interval={Math.floor(chartSeries.length / 8) || 0}
            />
            <YAxis
              tickFormatter={(value) => formatValue(Number(value), { short: true })}
              tick={{ fill: axisColor, fontSize: 11 }}
              stroke={axisColor}
            />
            <Tooltip content={renderTooltip} />
            <Legend formatter={legendFormatter} />
            {splitLabel && <ReferenceLine x={splitLabel} stroke="#94a3b8" strokeDasharray="4 4" />}
            {selectedMilestones.map((milestone) => {
              const hasIntersection = milestoneData.intersections.some(
                (intersection) => intersection.milestoneId === milestone.goal.id
              );
              
              return (
                <ReferenceLine
                  key={`milestone-line-${milestone.goal.id}`}
                  y={milestone.goal.target.value as number}
                  stroke="#3b82f6"
                  strokeWidth={1}
                  strokeDasharray="4 4"
                  label={
                    !hasIntersection
                      ? {
                          value: milestone.goal.title,
                          position: 'insideTopRight' as const,
                          fill: isDark ? '#93c5fd' : '#3b82f6',
                          fontSize: 10,
                          fontWeight: 600,
                          offset: -4,
                        }
                      : undefined
                  }
                />
              );
            })}
            {milestoneData.intersections.map((intersection: { label: string; value: number; milestoneId: string }) => {
              const milestone = selectedMilestones.find(m => m.goal.id === intersection.milestoneId);
              return (
                <ReferenceDot
                  key={`intersection-${intersection.milestoneId}-${intersection.label}`}
                  x={intersection.label}
                  y={intersection.value}
                  r={5}
                  fill="#3b82f6"
                  stroke="#fff"
                  strokeWidth={2}
                  isFront
                  label={{
                    value: milestone?.goal.title || 'Milestone',
                    position: 'top',
                    fill: isDark ? '#93c5fd' : '#3b82f6',
                    fontSize: 10,
                    fontWeight: 600,
                    offset: 8,
                  }}
                />
              );
            })}
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
            {showProjectionSpread && <Line type="monotone" dataKey="projectedHigh" name="High Projection" stroke="#0ea5e9" strokeWidth={1.5} strokeDasharray="2 4" dot={false} connectNulls />}
            {showProjectionSpread && <Line type="monotone" dataKey="projectedLow" name="Low Projection" stroke="#a78bfa" strokeWidth={1.5} strokeDasharray="2 4" dot={false} connectNulls />}
            <Area type="monotone" dataKey="projected" name={`Projected ${primaryMetricLabel}`} stroke="#f59e0b" fill="#fbbf24" fillOpacity={0.18} strokeWidth={2} strokeDasharray="5 5" connectNulls />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-1 mb-2 flex justify-center">
        <div className="inline-flex items-center gap-2 rounded-md border border-slate-200/90 bg-slate-50/80 px-3 py-1.5 text-xs shadow-sm dark:border-slate-700/80 dark:bg-slate-800/60">
          <Gauge className="size-3.5" style={{ color: projectionRateColor }} />
          <span className="font-semibold text-slate-700 dark:text-slate-200">Rate of change</span>
          <span className="text-slate-400 dark:text-slate-500">•</span>
          <span className="font-semibold">
            {projectionRate ? (
              <>
                <NumberText value={projectionRate.delta} valenceValue={projectionRate.delta} valence={valence} animated className="inline" /> / {aggregationType === 'none' ? 'entry' : aggregationType}
              </>
            ) : 'N/A'}
          </span>
          {projectionRate && typeof projectionRate.percent === 'number' && (
            <span className="font-medium" style={{ color: projectionRateColor }}>
              ({projectionRate.percent.toFixed(2)}%)
            </span>
          )}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <ToggleGroup
          type="single"
          value={projectionMath}
          onValueChange={(value) => {
            if (value) setProjectionMath(value as ProjectionMathMode);
          }}
          size="sm"
          variant="outline"
          aria-label="Projection growth model"
        >
          <span className="text-[10px] uppercase tracking-wide font-semibold text-slate-600 dark:text-slate-400 px-2 flex items-center">
            Growth
          </span>
          <ToggleGroupItem value="additive" aria-label="Additive" className="gap-1.5">
            <Plus className="size-3.5" />
            <span>Additive</span>
          </ToggleGroupItem>
          <ToggleGroupItem value="compound" aria-label="Compound" className="px-0">
            <ToggleOptionPopover
              align="start"
              contentClassName="w-64 p-3"
              trigger={
                <div className="inline-flex items-center gap-1.5 px-2">
                  <Percent className="size-3.5" />
                  <span>Compound</span>
                  <span className="hidden lg:inline text-xs opacity-70">({compoundGrowthRate}%)</span>
                  <ChevronDown className="size-3 opacity-50" />
                </div>
              }
            >
              <div className="space-y-3">
                <p className="text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
                  Compounds the fitted trend each period; higher rate increases curvature.
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-700 dark:text-slate-300">Growth rate</span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">{compoundGrowthRate}%</span>
                </div>
                <Slider
                  min={1}
                  max={50}
                  step={0.5}
                  value={[compoundGrowthRate]}
                  onValueChange={(value) => setCompoundGrowthRatePref(value[0])}
                  className="w-full"
                />
              </div>
            </ToggleOptionPopover>
          </ToggleGroupItem>
        </ToggleGroup>

        <ToggleGroup
          type="single"
          value={showProjectionAdjustment ? 'adjust' : 'base'}
          onValueChange={(value) => {
            if (!value) return;
            setShowProjectionAdjustment(value === 'adjust');
          }}
          size="sm"
          variant="outline"
          aria-label="Projection scenario settings"
        >
          <span className="text-[10px] uppercase tracking-wide font-semibold text-slate-600 dark:text-slate-400 px-2 flex items-center">
            Scenario
          </span>
          <ToggleGroupItem value="base" aria-label="Base projection">
            Base
          </ToggleGroupItem>
          <ToggleGroupItem value="adjust" aria-label="Adjusted projection" className="px-0">
            <ToggleOptionPopover
              align="start"
              contentClassName="w-64 p-3"
              trigger={
                <div className="inline-flex items-center gap-1.5 px-2">
                  <SlidersHorizontal className="size-3.5" />
                  <span>Adjust</span>
                  <span className="hidden lg:inline text-xs opacity-70">({projectionAdjustmentPercent > 0 ? '+' : ''}{projectionAdjustmentPercent}%)</span>
                  <ChevronDown className="size-3 opacity-50" />
                </div>
              }
            >
              <div className="space-y-3">
                <p className="text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
                  What-if control: add/subtract percentage points from projected trend rate.
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-700 dark:text-slate-300">Trend adjustment</span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">{projectionAdjustmentPercent > 0 ? '+' : ''}{projectionAdjustmentPercent}%</span>
                </div>
                <Slider
                  min={-25}
                  max={25}
                  step={0.5}
                  value={[projectionAdjustmentPercent]}
                  onValueChange={(value) => setProjectionAdjustmentPercentPref(value[0])}
                  className="w-full"
                />
              </div>
            </ToggleOptionPopover>
          </ToggleGroupItem>
        </ToggleGroup>

        <ToggleGroup
          type="single"
          value={showProjectionSpread ? 'on' : 'off'}
          onValueChange={(value) => {
            if (!value) return;
            setShowProjectionSpread(value === 'on');
          }}
          size="sm"
          variant="outline"
          aria-label="Projection spread settings"
        >
          <span className="text-[10px] uppercase tracking-wide font-semibold text-slate-600 dark:text-slate-400 px-2 flex items-center">
            Spread
          </span>
          <ToggleGroupItem value="off" aria-label="Spread off">
            Off
          </ToggleGroupItem>
          <ToggleGroupItem value="on" aria-label="Spread on" className="px-0">
            <ToggleOptionPopover
              align="start"
              contentClassName="w-64 p-3"
              trigger={
                <div className="inline-flex items-center gap-1.5 px-2">
                  <Target className="size-3.5" />
                  <span>On</span>
                  <span className="hidden lg:inline text-xs opacity-70">({projectionSpreadPercent}%)</span>
                  <ChevronDown className="size-3 opacity-50" />
                </div>
              }
            >
              <div className="space-y-3">
                <p className="text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
                  High/Low apply +/- percentage points to trend rate.
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-700 dark:text-slate-300">Spread amount</span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">{projectionSpreadPercent}%</span>
                </div>
                <Slider
                  min={1}
                  max={25}
                  step={0.5}
                  value={[projectionSpreadPercent]}
                  onValueChange={(value) => setProjectionSpreadPercentPref(value[0])}
                  className="w-full"
                />
              </div>
            </ToggleOptionPopover>
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      {/* Milestone toggle list */}
      {sortedMilestones.length > 0 ? (
        <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
          <div className="text-[10px] uppercase tracking-wide font-semibold text-slate-600 dark:text-slate-400 mb-2">
            Milestones
          </div>
          <div className="flex flex-wrap gap-2">
            {sortedMilestones.map((result) => {
              const isSelected = selectedMilestoneIds.includes(result.goal.id);
              const isCompleted = result.completedCount > 0;
              const targetValue = result.goal.target.value as number;
              
              const toggleMilestone = () => {
                if (isSelected) {
                  setSelectedMilestoneIds(selectedMilestoneIds.filter(id => id !== result.goal.id));
                } else {
                  setSelectedMilestoneIds([...selectedMilestoneIds, result.goal.id]);
                }
              };
              
              return (
                <button
                  key={result.goal.id}
                  type="button"
                  onClick={toggleMilestone}
                  className={`relative inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs transition-colors ${
                    isSelected
                      ? 'bg-blue-50 dark:bg-blue-950 border-blue-300 dark:border-blue-700'
                      : 'bg-transparent border-slate-200 dark:border-slate-800 opacity-70 hover:opacity-100'
                  }`}
                  title={isSelected ? 'Hide milestone line' : 'Show milestone line'}
                >
                  <AchievementBadgeIcon badge={result.goal.badge} size={16} />
                  <span className="text-slate-700 dark:text-slate-300">
                    {result.goal.title}
                  </span>
                  <span className="text-slate-500 dark:text-slate-400">
                    ({formatValue(targetValue)})
                  </span>
                  {isCompleted && (
                    <CheckCircle className="absolute -top-1.5 -right-1.5 size-4 text-green-500 bg-white dark:bg-slate-900 rounded-full" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
          <div className="rounded-xl border border-blue-200 dark:border-blue-800 bg-gradient-to-br from-blue-50 to-white dark:from-blue-900/20 dark:to-slate-900 p-4">
            <div className="flex flex-col gap-3">
              <div className="flex items-start gap-3">
                <AchievementBadge badge={{ style: 'laurel_trophy', icon: 'flag', color: 'sapphire', label: '' }} size="small" />
                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    Add milestones to visualize targets on this chart
                  </p>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                    Create milestone goals to see projection intersections and track when you'll reach major targets.
                  </p>
                </div>
              </div>
              <Link to={`/dataset/${datasetId}/milestones?add`}>
                <Button variant="outline" className="w-full h-auto px-3 py-2.5 justify-start gap-2.5 border-blue-200/80 dark:border-blue-900/60 bg-blue-50/70 dark:bg-blue-950/20 hover:bg-blue-100 dark:hover:bg-blue-900/30">
                  <AchievementBadge badge={{ style: 'laurel_trophy', icon: 'flag', color: 'sapphire', label: '' }} size="small" />
                  <span className="flex-1 min-w-0 text-left">
                    <span className="block text-xs font-semibold text-blue-800 dark:text-blue-200">Create Milestone</span>
                    <span className="block text-[11px] text-blue-700/85 dark:text-blue-300/85">Mark major achievement targets</span>
                  </span>
                  <ExternalLink className="h-3.5 w-3.5 text-blue-700 dark:text-blue-300" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
