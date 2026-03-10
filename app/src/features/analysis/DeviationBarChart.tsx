import { useTheme } from '@/components/ThemeProvider';
import { Button } from '@/components/ui/button';
import { NumberText } from '@/components/ui/number-text';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { DropdownWithCustomInput } from '@/components/ui/dropdown-with-custom-input';
import { AchievementBadge } from '@/features/achievements/AchievementBadge';
import { AchievementBadgeIcon } from '@/features/achievements/AchievementBadgeIcon';
import type { DateKey, Tracking, Valence } from '@/features/db/localdb';
import { useGoals } from '@/features/db/useGoalsData';
import { usePreference } from '@/hooks/usePreference';
import { formatPeriodLabel, getAggregationPeriodLabel, getValenceAdjustedColor, type AggregationType } from '@/lib/analysis';
import { formatFriendlyDate, type DateKeyType } from '@/lib/friendly-date';
import { formatValue } from '@/lib/friendly-numbers';
import { formatGoalTargetValue } from '@/lib/goals';
import type { PeriodAggregateData } from '@/lib/period-aggregate';
import { METRIC_DISPLAY_INFO } from '@/lib/stats';
import { getPrimaryMetric, getValenceSource } from '@/lib/tracking';
import { adjectivize, capitalize } from '@/lib/utils';
import { getValueForValence } from '@/lib/valence';
import { Activity, CalendarClock, ChevronDown, ExternalLink, Infinity, Target } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

interface DeviationBarChartProps {
  periods: PeriodAggregateData<DateKeyType>[];
  allTimePeriods: PeriodAggregateData<DateKeyType>[];
  aggregationType: AggregationType;
  tracking: Tracking;
  valence: Valence;
  rangeLabel: string;
  datasetId: string;
  priorTimeFrameValue?: number;
}

type DeviationBaselineMode = 'range-average' | 'all-time-average' | 'prior' | 'target';

interface BarDataPoint {
  dateKey: DateKey;
  label: string;
  entryNumber?: number;
  value: number;
  deviation: number;
  baselineValue: number;
}

export function DeviationBarChart({
  periods,
  allTimePeriods,
  aggregationType,
  tracking,
  valence,
  rangeLabel,
  datasetId,
  priorTimeFrameValue,
}: DeviationBarChartProps) {
  const { isDark } = useTheme();

  const primaryMetric = getPrimaryMetric(tracking);
  const valenceSource = getValenceSource(tracking);
  const { data: goals } = useGoals(datasetId);
  const [targetPopoverOpen, setTargetPopoverOpen] = useState(false);

  const [baselineMode, setBaselineMode] = usePreference<DeviationBaselineMode>(
    `analysis_deviationBaselineMode_${datasetId}`,
    'range-average',
  );
  const [targetBaselineInput, setTargetBaselineInput] = usePreference<string>(
    `analysis_deviationTargetBaseline_${datasetId}_${aggregationType}`,
    '',
  );
  const targetBaselineValue = targetBaselineInput ? Number(targetBaselineInput) : 0;
  const [selectedGoalId, setSelectedGoalId] = usePreference<string | null>(
    `analysis_deviationSelectedGoal_${datasetId}_${aggregationType}`,
    null,
  );

  // Filter goals that match the current aggregation time period, metric, and source
  const matchingGoals = useMemo(() => {
    if (!goals || aggregationType === 'none') return [];
    const periodMap: Record<string, string> = {
      'day': 'day',
      'week': 'week',
      'month': 'month',
      'year': 'year',
    };
    const targetPeriod = periodMap[aggregationType];
    return goals
      .filter((goal) => 
        goal.type === 'target' && 
        !goal.archived && 
        goal.timePeriod === targetPeriod &&
        goal.target.metric === primaryMetric &&
        goal.target.source === valenceSource
      )
      .sort((a, b) => a.title.localeCompare(b.title));
  }, [goals, aggregationType, primaryMetric, valenceSource]);

  // Helper function to select a goal and update the target baseline
  const selectGoal = useCallback((goalId: string) => {
    setSelectedGoalId(goalId);
    const goal = matchingGoals.find((g) => g.id === goalId);
    if (!goal) return;
    
    const target = goal.target;
    if (target.value !== undefined) {
      setTargetBaselineInput(String(target.value));
    } else if (target.range) {
      // Use midpoint of range as target
      const midpoint = (target.range[0] + target.range[1]) / 2;
      setTargetBaselineInput(String(midpoint));
    }
  }, [matchingGoals, setSelectedGoalId, setTargetBaselineInput]);

  // Auto-select the latest matching goal on initialization
  useEffect(() => {
    // Only auto-select if no goal is selected AND no custom value is set
    if (selectedGoalId !== null || targetBaselineInput || matchingGoals.length === 0) return;
    
    // Find the most recently created goal
    const toTimestamp = (value: number | string): number =>
      typeof value === 'number' ? value : (Date.parse(value) || 0);
    const sortedByDate = [...matchingGoals].sort((a, b) => 
      toTimestamp(b.createdAt) - toTimestamp(a.createdAt)
    );
    const latestGoal = sortedByDate[0];
    
    if (latestGoal) {
      selectGoal(latestGoal.id);
    }
  }, [matchingGoals, selectGoal, selectedGoalId, targetBaselineInput]);

  // Helper function to calculate median
  const calculateMedian = (values: number[]): number => {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0
      ? (sorted[mid - 1] + sorted[mid]) / 2
      : sorted[mid];
  };

  const data: BarDataPoint[] = useMemo(() => {
    const periodValues = periods
      .filter((period) => period.stats.count > 0)
      .map((period, index) => {
        const value =
          valenceSource === 'stats'
            ? (period.stats[primaryMetric] ?? 0)
            : (period.deltas?.[primaryMetric] ?? 0);

        return {
          period,
          index,
          value,
        };
      });

    const allTimeValues = (allTimePeriods ?? periods)
      .filter((period) => period.stats.count > 0)
      .map((period) =>
        valenceSource === 'stats'
          ? (period.stats[primaryMetric] ?? 0)
          : (period.deltas?.[primaryMetric] ?? 0),
      );

    const values = periodValues.map((pv) => pv.value);
    const rangeAverage = values.length > 0
      ? values.reduce((sum, value) => sum + value, 0) / values.length
      : 0;

    const allTimeAverage = allTimeValues.length > 0
      ? allTimeValues.reduce((sum, value) => sum + value, 0) / allTimeValues.length
      : 0;

    const priorValue = priorTimeFrameValue ?? 0;

    const baselineValue = baselineMode === 'all-time-average'
      ? allTimeAverage
      : baselineMode === 'prior'
        ? priorValue
        : baselineMode === 'target'
          ? targetBaselineValue
          : rangeAverage;

    return periodValues.map(({ period, index, value }) => ({
      dateKey: period.dateKey,
      label: formatPeriodLabel(period.dateKey, aggregationType),
      ...(aggregationType === 'none' && { entryNumber: index + 1 }),
      value,
      deviation: value - baselineValue,
      baselineValue,
    }));
  }, [periods, allTimePeriods, primaryMetric, valenceSource, aggregationType, baselineMode, targetBaselineInput, priorTimeFrameValue]);

  // Calculate medians for tooltip (outside useMemo to avoid recalculation)
  const rangeMedian = useMemo(() => {
    const values = periods
      .filter((period) => period.stats.count > 0)
      .map((period) =>
        valenceSource === 'stats'
          ? (period.stats[primaryMetric] ?? 0)
          : (period.deltas?.[primaryMetric] ?? 0),
      );
    return calculateMedian(values);
  }, [periods, primaryMetric, valenceSource]);

  const allTimeMedian = useMemo(() => {
    const allTimeValues = (allTimePeriods ?? periods)
      .filter((period) => period.stats.count > 0)
      .map((period) =>
        valenceSource === 'stats'
          ? (period.stats[primaryMetric] ?? 0)
          : (period.deltas?.[primaryMetric] ?? 0),
      );
    return calculateMedian(allTimeValues);
  }, [allTimePeriods, periods, primaryMetric, valenceSource]);

  if (data.length === 0) {
    return <div>No data available</div>;
  }

  const axisColor = isDark ? '#64748b' : '#334155';
  const gridColor = isDark ? '#334155' : '#e5e7eb';

  const getBarColor = (value: number): string => {
    return getValueForValence(value, valence, {
      good: '#22c55e',
      bad: '#ef4444',
      neutral: '#3b82f6',
    });
  };

  const renderTooltip = ({
    active,
    payload,
  }: {
    active?: boolean;
    payload?: Array<{ payload?: BarDataPoint }>;
  }) => {
    if (!active || !payload?.length || !payload[0].payload) return null;
    const point = payload[0].payload;

    const metricLabel = METRIC_DISPLAY_INFO[primaryMetric].label;
    
    // Get aggregation prefix for tooltip labels
    const aggregationPrefix = aggregationType === 'none'
      ? ''
      : capitalize(adjectivize(aggregationType));
    
    const baselineLabel = baselineMode === 'all-time-average'
      ? ['All Time', aggregationPrefix, 'Mean'].filter(Boolean).join(' ')
      : baselineMode === 'prior'
        ? lastPriorLabel
        : baselineMode === 'target'
          ? 'Target'
          : [aggregationPrefix, 'Mean'].filter(Boolean).join(' ');
    
    const medianValue = baselineMode === 'all-time-average'
      ? allTimeMedian
      : baselineMode === 'range-average'
        ? rangeMedian
        : null;
    
    const medianLabel = baselineMode === 'all-time-average'
      ? ['All Time', aggregationPrefix, 'Median'].filter(Boolean).join(' ')
      : [aggregationPrefix, 'Median'].filter(Boolean).join(' ');

    return (
      <div className="rounded-md bg-white dark:bg-slate-900 px-2.5 py-2 shadow-lg dark:shadow-xl border border-gray-200 dark:border-slate-700">
        {aggregationType === 'none' && (
          <div className="text-xs text-slate-500 dark:text-slate-400 mb-2">{point.label} (#{point.entryNumber})</div>
        )}
        {aggregationType !== 'none' && (
          <div className="text-xs text-slate-500 dark:text-slate-400 mb-2">
            {formatFriendlyDate(point.dateKey)}
          </div>
        )}
        
        {/* Primary value */}
        <div className="flex items-center justify-between gap-3 mb-2 pb-2 border-b border-slate-200 dark:border-slate-700">
          <span className="text-xs text-slate-600 dark:text-slate-400">{metricLabel}</span>
          <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            <NumberText
              value={point.value}
              valenceValue={point.value}
              valence={valence}
              delta={valenceSource === 'deltas'}
              className="inline"
            />
          </span>
        </div>

        {/* Deviation from selected baseline */}
        <div className="flex items-center justify-between gap-3 mb-1.5">
          <span className="text-xs text-slate-600 dark:text-slate-400">Deviation</span>
          <span className="text-sm font-semibold">
            <NumberText
              value={point.deviation}
              valenceValue={point.deviation}
              valence={valence}
              delta
              className="inline"
            />
          </span>
        </div>
        <div className="flex items-center justify-between gap-3 mb-2 text-[11px] text-slate-500 dark:text-slate-500">
          <span>{baselineLabel}:</span>
          <span>{formatValue(point.baselineValue)}</span>
        </div>
        {medianValue !== null && (
          <div className="flex items-center justify-between gap-3 text-[11px] text-slate-500 dark:text-slate-500">
            <span>{medianLabel}:</span>
            <span>{formatValue(medianValue)}</span>
          </div>
        )}
      </div>
    );
  };

  const rangeAverageLabel = `${rangeLabel} Average`;
  const periodName = capitalize(getAggregationPeriodLabel(aggregationType));
  const periodly = aggregationType === 'none' ? 'individual' : adjectivize(aggregationType);
  const lastPriorLabel = `Prior ${periodName}`;

  const selectedGoal = selectedGoalId ? matchingGoals.find((g) => g.id === selectedGoalId) : null;
  const targetLabel = selectedGoal ? selectedGoal.title : 'Target';
  const targetValue = selectedGoal 
    ? formatGoalTargetValue(selectedGoal.target) 
    : targetBaselineValue ? formatValue(targetBaselineValue) : null;

  return (
    <div className="h-80 w-full flex flex-col">
      <div className="min-h-0 flex-1">
        <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 5, right: 20, bottom: 40, left: 0 }}>
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
          <ReferenceLine y={0} stroke={axisColor} strokeOpacity={0.5} strokeWidth={1.5} />
          <Tooltip content={renderTooltip} />
          <Bar dataKey="deviation" fill="#8884d8" isAnimationActive radius={[8, 8, 0, 0]}>
            {data.map((entry) => {
              const baseColor = getBarColor(entry.value);
              const color = getValenceAdjustedColor(baseColor, entry.deviation, valence);
              return <Cell key={`bar-${entry.dateKey}`} fill={color} />;
            })}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      </div>
      
      {/* Baseline Toggle Bar */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <ToggleGroup
          type="single"
          value={baselineMode}
          onValueChange={(value) => {
            if (value) setBaselineMode(value as DeviationBaselineMode);
          }}
          size="sm"
          variant="outline"
          aria-label="Baseline mode"
        >
          <span className="text-[10px] uppercase tracking-wide font-semibold text-slate-600 dark:text-slate-400 px-2 flex items-center">
            Baseline
          </span>
          <ToggleGroupItem value="all-time-average" aria-label="All Time Average">
            <Infinity className="size-4 sm:mr-1" />
            <span className="hidden sm:inline">All Time Average</span>
          </ToggleGroupItem>
          <ToggleGroupItem value="range-average" aria-label={rangeAverageLabel}>
            <CalendarClock className="size-4 sm:mr-1" />
            <span className="hidden sm:inline">{rangeAverageLabel}</span>
          </ToggleGroupItem>
          <ToggleGroupItem value="prior" aria-label={lastPriorLabel}>
            <Activity className="size-4 sm:mr-1" />
            <span className="hidden sm:inline">{lastPriorLabel}</span>
          </ToggleGroupItem>
          
          {/* Target mode with integrated dropdown */}
          <ToggleGroupItem 
            value="target" 
            aria-label="Target"
            className='px-0'
          >
            <DropdownWithCustomInput
              open={targetPopoverOpen}
              onOpenChange={setTargetPopoverOpen}
              align="start"
              contentClassName="w-80 p-2"
              trigger={
                <div className='flex items-center px-2'>
                  {selectedGoal ? (
                    <>
                      <AchievementBadgeIcon badge={selectedGoal.badge} size={16} className="sm:mr-1" />
                      <span className="hidden sm:inline truncate max-w-[120px]">{targetLabel}</span>
                      {targetValue && <span className="hidden lg:inline text-xs opacity-70 ml-1">({targetValue})</span>}
                    </>
                  ) : (
                    <>
                      <Target className="size-4 sm:mr-1" />
                      <span className="hidden sm:inline">{targetLabel}</span>
                      {targetValue && <span className="hidden lg:inline text-xs opacity-70 ml-1">({targetValue})</span>}
                    </>
                  )}
                  <ChevronDown className="size-3 ml-1 opacity-50" />
                </div>
              }
              header={aggregationType !== 'none' && matchingGoals.length > 0 ? (
                <div className="px-2 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400">
                  Select Target
                </div>
              ) : undefined}
              options={aggregationType !== 'none' ? matchingGoals.map((goal) => ({

                id: goal.id,
                onSelect: () => {
                  selectGoal(goal.id);
                },
                className: `w-full flex items-start gap-2 rounded-md px-2 py-2 text-left text-sm transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 ${selectedGoalId === goal.id ? 'bg-slate-100 dark:bg-slate-800' : ''}`,
                content: (
                  <>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-slate-900 dark:text-slate-100 truncate">
                        {goal.title}
                      </div>
                      <div className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                        {formatGoalTargetValue(goal.target)}
                      </div>
                    </div>
                    <AchievementBadge badge={goal.badge} size="small" className="flex-shrink-0" />
                  </>
                ),
              })) : []}
              emptyContent={aggregationType !== 'none' ? (
                <div className="px-2 py-2 text-center">
                  <p className="text-xs text-slate-600 dark:text-slate-400 mb-2">You haven't created any {periodly} targets yet</p>
                  <Link to={`/dataset/${datasetId}/targets?add`}>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs gap-1 w-full"
                    >
                      Create Target
                      <ExternalLink className="h-3 w-3" />
                    </Button>
                  </Link>
                </div>
              ) : undefined}
              customInputType="number"
              customInputValue={selectedGoalId ? '' : targetBaselineInput}
              onCustomInputChange={(value) => {
                setSelectedGoalId(null);
                setTargetBaselineInput(value);
              }}
              customInputPlaceholder="Custom target value"
              customInputClassName="h-8 text-xs"
              customInputAriaLabel="Custom target value"
            />
          </ToggleGroupItem>
        </ToggleGroup>
      </div>
    </div>
  );
}
