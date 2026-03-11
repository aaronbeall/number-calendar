import { Card } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription, EmptyContent } from '@/components/ui/empty';
import { Button } from '@/components/ui/button';
import { PopoverTip, PopoverTipTrigger, PopoverTipContent } from '@/components/ui/popover-tip';
import { LoadingState } from '@/components/PageStates';
import { LazyChart } from '@/components/LazyChart';
import { useDatasetContext } from '@/context/DatasetContext';
import { usePreference } from '@/hooks/usePreference';
import { useAllPeriodsAggregateData } from '@/hooks/useAggregateData';
import { useAchievements } from '@/hooks/useAchievements';
import { useMatchMedia } from '@/hooks/useMatchMedia';
import { formatFriendlyDate, dateToDayKey, getTodayKey, parseDateKey, type DateKeyType } from '@/lib/friendly-date';
import { formatValue } from '@/lib/friendly-numbers';
import { useCallback, useEffect, useMemo } from 'react';
import { formatAggregationRange, getTimeRange, getAvailablePresets, computeAnalysisData, type AggregationType, type ProjectionHorizon, type ProjectionMode, type ProjectionMomentumWeight, type ProjectionRecentWindow, type TimeFramePreset, getAggregationPeriodLabel } from '@/lib/analysis';
import type { DayKey } from '@/features/db/localdb';
import { getPrimaryMetric } from '@/lib/tracking';
import type { NumberMetric } from '@/lib/stats';
import { Calendar, TrendingUp, BarChart3, Zap, LineChart, PieChart, Activity, CalendarDays, CalendarRange, CalendarClock, Ban, Hash, Sigma, HelpCircle, Infinity as InfinityIcon, Target, Award, Sparkles, Compass, ChevronDown } from 'lucide-react';
import { TrendAnalysisChart } from '@/features/analysis/TrendAnalysisChart';
import { DeviationBarChart } from '@/features/analysis/DeviationBarChart';
import { ValenceDistributionChart } from '@/features/analysis/ValenceDistributionChart';
import { DistributionHistogram } from '@/features/analysis/DistributionHistogram';
import { PeriodComparisonChart } from '@/features/analysis/PeriodComparisonChart';
import { StatsSummary } from '@/features/analysis/StatsSummary';
import { CustomRangePicker } from '@/features/analysis/CustomRangePicker';
import { AchievementInsightsChart } from '@/features/analysis/AchievementInsightsChart';
import { ProjectionsChart } from '@/features/analysis/ProjectionsChart';
import { MomentumQuadrantChart } from '@/features/analysis/MomentumQuadrantChart';
import { DropdownWithCustomInput } from '@/components/ui/dropdown-with-custom-input';
import { ToggleOptionPopover } from '@/components/ui/toggle-option-popover';
import { adjectivize, capitalize, pluralize } from '@/lib/utils';
import { Slider } from '@/components/ui/slider';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import type { TrendDataMode, TrendSummary } from '@/features/analysis/TrendAnalysisChart';
import { buildSingleNumberAggregates, computeRunningAggregatePeriods, type PeriodAggregateData } from '@/lib/period-aggregate';
import { Link } from 'react-router-dom';

export type AnalysisTrendMode = 'all-time-trend' | 'in-range-trend' | 'change';

const AGGREGATION_OPTIONS = [
  { value: 'none', label: 'None', icon: Ban },
  { value: 'day', label: 'Day', icon: CalendarDays },
  { value: 'week', label: 'Week', icon: CalendarRange },
  { value: 'month', label: 'Month', icon: Calendar },
  { value: 'year', label: 'Year', icon: CalendarClock },
] as const;

// Reusable chart section components
function ChartSection({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <Card className={`p-4 ${className}`}>{children}</Card>;
}

function ChartSectionHeader({
  children,
  actions,
}: {
  children: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-3 sm:mb-4 flex items-center justify-between gap-2 flex-wrap">
      {children}
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

function ChartSectionTitle({
  icon: Icon,
  children,
  helpContent,
  helpLabel,
}: {
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
  helpContent?: React.ReactNode;
  helpLabel?: string;
}) {
  return (
    <h3 className="font-semibold flex items-center gap-2 text-sm sm:text-base">
      <Icon className="w-4 h-4" />
      {children}
      {helpContent && (
        <PopoverTip>
          <PopoverTipTrigger asChild>
            <button
              className="inline-flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
              aria-label={helpLabel || 'Help'}
            >
              <HelpCircle className="w-3.5 h-3.5" />
            </button>
          </PopoverTipTrigger>
          <PopoverTipContent>{helpContent}</PopoverTipContent>
        </PopoverTip>
      )}
    </h3>
  );
}

// Abstract chart illustration for empty state
function EmptyChartIllustration() {
  return (
    <svg
      width="320"
      height="180"
      viewBox="0 0 320 180"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="opacity-40"
    >
      {/* Grid lines */}
      <line x1="30" y1="30" x2="30" y2="150" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.15" />
      <line x1="30" y1="150" x2="290" y2="150" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.15" />
      <line x1="30" y1="60" x2="290" y2="60" stroke="currentColor" strokeWidth="1" strokeOpacity="0.08" strokeDasharray="5 5" />
      <line x1="30" y1="90" x2="290" y2="90" stroke="currentColor" strokeWidth="1" strokeOpacity="0.08" strokeDasharray="5 5" />
      <line x1="30" y1="120" x2="290" y2="120" stroke="currentColor" strokeWidth="1" strokeOpacity="0.08" strokeDasharray="5 5" />
      
      {/* Bars - different heights */}
      <rect x="55" y="105" width="28" height="45" rx="3" fill="currentColor" fillOpacity="0.12" />
      <rect x="105" y="70" width="28" height="80" rx="3" fill="currentColor" fillOpacity="0.16" />
      <rect x="155" y="90" width="28" height="60" rx="3" fill="currentColor" fillOpacity="0.14" />
      <rect x="205" y="75" width="28" height="75" rx="3" fill="currentColor" fillOpacity="0.15" />
      <rect x="255" y="110" width="28" height="40" rx="3" fill="currentColor" fillOpacity="0.11" />
      
      {/* Trend line overlay */}
      <path
        d="M 55 115 Q 105 85 155 100 T 255 125"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeOpacity="0.2"
        fill="none"
        strokeLinecap="round"
      />
      
      {/* Dots on trend line */}
      <circle cx="55" cy="115" r="4" fill="currentColor" fillOpacity="0.25" />
      <circle cx="105" cy="85" r="4" fill="currentColor" fillOpacity="0.25" />
      <circle cx="155" cy="100" r="4" fill="currentColor" fillOpacity="0.25" />
      <circle cx="205" cy="95" r="4" fill="currentColor" fillOpacity="0.25" />
      <circle cx="255" cy="125" r="4" fill="currentColor" fillOpacity="0.25" />
    </svg>
  );
}

function ChartLoadingPlaceholder({ minHeight = 320 }: { minHeight?: number }) {
  return (
    <div
      className="w-full rounded-md bg-slate-100/80 dark:bg-slate-800/50 animate-pulse"
      style={{ height: minHeight }}
      aria-hidden="true"
    />
  );
}

export function Analysis() {
  const { dataset } = useDatasetContext();
  const { allDays, isLoading, ...aggregateData } = useAllPeriodsAggregateData();
  const { milestones: milestonesResults } = useAchievements(dataset.id);
  const isSidebarLayout = useMatchMedia('(min-width: 1024px)');
  const primaryMetric = getPrimaryMetric(dataset.tracking);

  // Persisted analysis controls (per dataset)
  const [aggregationType, setAggregationType] = usePreference<AggregationType>(
    `analysis_aggregation_${dataset.id}`,
    'month',
  );
  const [presetRange, setPresetRange] = usePreference<TimeFramePreset | null>(
    `analysis_preset_${dataset.id}`,
    'last-6-months',
  );
  const [customStartDayKey, setCustomStartDayKey] = usePreference<DayKey>(
    `analysis_customStart_${dataset.id}`,
    getTodayKey(),
  );
  const [customEndDayKey, setCustomEndDayKey] = usePreference<DayKey>(
    `analysis_customEnd_${dataset.id}`,
    getTodayKey(),
  );


  const customStart = useMemo(() => parseDateKey(customStartDayKey), [customStartDayKey]);

  const customEnd = useMemo(() => parseDateKey(customEndDayKey), [customEndDayKey]);

  // Per-dataset preferences
  const defaultSelectedSummaryMetrics = useMemo(
    () => ['count', 'mean', 'median', 'min', 'max', primaryMetric] as NumberMetric[],
    [primaryMetric],
  );
  const [selectedSummaryMetrics, setSelectedSummaryMetrics] = usePreference<NumberMetric[]>(
    `statsSummary_metrics_${dataset.id}`,
    defaultSelectedSummaryMetrics,
  );
  const defaultAnalysisTrendMode: AnalysisTrendMode = dataset.tracking === 'series' ? 'all-time-trend' : 'change';
  const [analysisTrendMode, setAnalysisTrendMode] = usePreference<AnalysisTrendMode>(
    `analysis_trendMode_${dataset.tracking}_${dataset.id}`,
    defaultAnalysisTrendMode,
  );
  const [valenceDistributionMode, setValenceDistributionMode] = usePreference<'count' | 'total'>(
    `valenceDistribution_mode_${dataset.tracking}_${dataset.id}`,
    'count',
  );
  const [projectionMode, setProjectionMode] = usePreference<ProjectionMode>(
    `analysis_projectionMode_${dataset.tracking}_${dataset.id}`,
    'linear',
  );
  const [projectionHorizonDay, setProjectionHorizonDay] = usePreference<ProjectionHorizon>(
    `analysis_projectionHorizon_day_${dataset.id}`,
    30,
  );
  const [projectionHorizonWeek, setProjectionHorizonWeek] = usePreference<ProjectionHorizon>(
    `analysis_projectionHorizon_week_${dataset.id}`,
    12,
  );
  const [projectionHorizonMonth, setProjectionHorizonMonth] = usePreference<ProjectionHorizon>(
    `analysis_projectionHorizon_month_${dataset.id}`,
    12,
  );
  const [projectionHorizonYear, setProjectionHorizonYear] = usePreference<ProjectionHorizon>(
    `analysis_projectionHorizon_year_${dataset.id}`,
    5,
  );
  const [projectionRecentWindowPref, setProjectionRecentWindowPref] = usePreference<ProjectionRecentWindow>(
    `analysis_projectionRecentWindow_${dataset.id}`,
    3,
  );
  const [projectionMomentumWeightPref, setProjectionMomentumWeightPref] = usePreference<ProjectionMomentumWeight>(
    `analysis_projectionMomentumWeight_${dataset.id}`,
    1,
  );

  const projectionHorizonMax = useMemo(() => {
    if (aggregationType === 'none' || aggregationType === 'day') return 365;
    if (aggregationType === 'week') return 52;
    if (aggregationType === 'month') return 24;
    return 24;
  }, [aggregationType]);

  const projectionHorizonScale = useMemo<ProjectionHorizon[]>(() => {
    if (aggregationType === 'none' || aggregationType === 'day') {
      return aggregationType === 'none'
        ? [1, 2, 3, 5, 10, 20, 30, 50, 100]
        : [1, 2, 3, 5, 7, 14, 21, 42, 182, 365];
    }
    if (aggregationType === 'week') {
      return [1, 2, 3, 4, 6, 12, 26, 52];
    }
    if (aggregationType === 'month') {
      return [1, 2, 3, 4, 5, 6, 12, 24];
    }
    return [1, 2, 3, 4, 5, 10];
  }, [aggregationType]);

  const projectionHorizon = useMemo<ProjectionHorizon>(() => {
    if (aggregationType === 'none' || aggregationType === 'day') return Math.min(Math.max(1, projectionHorizonDay), projectionHorizonMax);
    if (aggregationType === 'week') return Math.min(Math.max(1, projectionHorizonWeek), projectionHorizonMax);
    if (aggregationType === 'month') return Math.min(Math.max(1, projectionHorizonMonth), projectionHorizonMax);
    return Math.min(Math.max(1, projectionHorizonYear), projectionHorizonMax);
  }, [aggregationType, projectionHorizonDay, projectionHorizonWeek, projectionHorizonMonth, projectionHorizonYear, projectionHorizonMax]);

  const setProjectionHorizon = (next: ProjectionHorizon) => {
    const clamped = Math.min(Math.max(1, Number(next)), projectionHorizonMax);
    if (aggregationType === 'none' || aggregationType === 'day') {
      setProjectionHorizonDay(clamped);
      return;
    }
    if (aggregationType === 'week') {
      setProjectionHorizonWeek(clamped);
      return;
    }
    if (aggregationType === 'month') {
      setProjectionHorizonMonth(clamped);
      return;
    }
    setProjectionHorizonYear(clamped);
  };

  const projectionPeriodUnit = getAggregationPeriodLabel(aggregationType);

  // Helpers to set custom dates
  const setCustomStart = useCallback((date: Date) => {
    setCustomStartDayKey(dateToDayKey(date));
  }, [setCustomStartDayKey]);

  const setCustomEnd = useCallback((date: Date) => {
    setCustomEndDayKey(dateToDayKey(date));
  }, [setCustomEndDayKey]);

  // Get periods based on aggregation type
  const periodsForAggregation = useMemo(() => {
    switch (aggregationType) {
      case 'none': return aggregateData.days;
      case 'day': return aggregateData.days;
      case 'week': return aggregateData.weeks;
      case 'month': return aggregateData.months;
      case 'year': return aggregateData.years;
      default: return aggregateData.months;
    }
  }, [aggregationType, aggregateData]);

  // Get available time frame presets for current aggregation
  const availablePresets = useMemo(() => 
    getAvailablePresets(aggregationType).filter((preset) => preset.preset !== 'custom'),
    [aggregationType]
  );

  // Ensure current preset is valid for aggregation type
  useEffect(() => {
    if (!presetRange) return;
    const isValid = availablePresets.some(p => p.preset === presetRange);
    if (!isValid && availablePresets.length > 0) {
      setPresetRange(availablePresets[0].preset);
    }
  }, [availablePresets, presetRange, setPresetRange]);

  // Determine active time range
  const today = useMemo(() => new Date(), []);
  const timeRange = useMemo(() => {
    if (!presetRange) {
      return { startDate: customStart, endDate: customEnd };
    }
    return getTimeRange(presetRange, today);
  }, [presetRange, customStart, customEnd, today]);

  const handleAggregationChange = useCallback((nextAggregation: AggregationType) => {
    setAggregationType(nextAggregation);

    if (presetRange) return;

    const nextPeriods = (() => {
      switch (nextAggregation) {
        case 'none':
          return aggregateData.days;
        case 'day':
          return aggregateData.days;
        case 'week':
          return aggregateData.weeks;
        case 'month':
          return aggregateData.months;
        case 'year':
          return aggregateData.years;
        default:
          return aggregateData.months;
      }
    })();

    if (nextPeriods.length === 0) return;

    const periodsInRange = nextPeriods.filter(p => {
      try {
        const periodDate = parseDateKey(p.dateKey);
        return periodDate >= customStart && periodDate <= customEnd;
      } catch {
        return false;
      }
    });

    if (periodsInRange.length === 0) {
      try {
        const firstPeriod = parseDateKey(nextPeriods[0].dateKey);
        setCustomStart(firstPeriod);
        setCustomEnd(firstPeriod);
      } catch {
        // Invalid date, ignore
      }
    }
  }, [
    aggregateData.days,
    aggregateData.months,
    aggregateData.weeks,
    aggregateData.years,
    customEnd,
    customStart,
    presetRange,
    setAggregationType,
    setCustomEnd,
    setCustomStart,
  ]);

  // Compute analysis data for selected time range
  const analysisData = useMemo(() => 
    computeAnalysisData(periodsForAggregation, timeRange, {
      aggregation: aggregationType,
      primaryMetric,
    }),
    [aggregationType, periodsForAggregation, primaryMetric, timeRange]
  );

  const { periods, dataPoints, stats, extremes, cumulatives, cumulativePercents, deltas, percents, periodCount } = analysisData;

  // Cumulatives only for series tracking
  const cumulativesData = dataset.tracking === 'series' ? cumulatives : undefined;

  // Deltas only for trend tracking
  const deltasData = dataset.tracking === 'trend' ? deltas : undefined;

  // Compute all periods
  const allAggregatePeriods = useMemo(() => {
    return aggregationType === 'none'
      ? buildSingleNumberAggregates(allDays)
      : periodsForAggregation;
  }, [aggregationType, allDays, periodsForAggregation]);

  // Reusable filter function
  const filterToInRange = useCallback((periods: PeriodAggregateData<DateKeyType>[]) => {
    return periods.filter((period) => {
      const periodDate = parseDateKey(period.dateKey);
      return periodDate >= timeRange.startDate && periodDate <= timeRange.endDate;
    });
  }, [timeRange.endDate, timeRange.startDate]);

  // All-time running aggregates (unfiltered by time range)
  const allTimeRunningAggregates = useMemo(() => {
    return computeRunningAggregatePeriods(allAggregatePeriods, primaryMetric);
  }, [allAggregatePeriods, primaryMetric]);

  const computedAggregatesInRange = useMemo(() => {
    // For all-time, use running aggregates on all data, then filter, for in-range filter then compute running aggregates
    if (analysisTrendMode === 'all-time-trend') {
      return filterToInRange(allTimeRunningAggregates);
    } 
    return computeRunningAggregatePeriods(filterToInRange(allAggregatePeriods), primaryMetric);
  }, [analysisTrendMode, allAggregatePeriods, primaryMetric, allTimeRunningAggregates, filterToInRange]);

  // Projections use all-time running aggregates filtered to current time range
  const projectionPeriods = useMemo(() => {
    if (analysisTrendMode === 'all-time-trend') {
      return computedAggregatesInRange;
    }
    return filterToInRange(allTimeRunningAggregates);
  }, [analysisTrendMode, computedAggregatesInRange, allTimeRunningAggregates, filterToInRange]);

  const projectionRecentWindowMax = Math.max(1, projectionPeriods.length);
  const projectionRecentWindow = Math.min(
    Math.max(1, Math.floor(projectionRecentWindowPref)),
    projectionRecentWindowMax,
  );
  const projectionMomentumWeightMin = 1;
  const projectionMomentumWeightMax = 3;
  const projectionMomentumWeight = Math.min(
    Math.max(projectionMomentumWeightMin, Number(projectionMomentumWeightPref)),
    projectionMomentumWeightMax,
  );
  const projectionMomentumWeightLabel = Number.isInteger(projectionMomentumWeight)
    ? String(projectionMomentumWeight)
    : projectionMomentumWeight.toFixed(1);

  const priorTimeFrameValue = useMemo(() => {
    if (allAggregatePeriods.length === 0 || computedAggregatesInRange.length === 0) return undefined;
    
    // Always get the period immediately before the selected range starts
    const firstInRangeDateKey = computedAggregatesInRange[0].dateKey;
    const firstInRangeIndex = allAggregatePeriods.findIndex(p => p.dateKey === firstInRangeDateKey);
    
    if (firstInRangeIndex <= 0) return undefined;
    
    return allAggregatePeriods[firstInRangeIndex - 1].stats[primaryMetric];
  }, [allAggregatePeriods, computedAggregatesInRange, primaryMetric]);

  const trendPriorTimeFrameValue = useMemo(() => {
    if (allAggregatePeriods.length === 0) return undefined;

    if (analysisTrendMode === 'all-time-trend') {
      const firstValue = allAggregatePeriods[0].stats[primaryMetric];
      return typeof firstValue === 'number' ? firstValue : undefined;
    }
    
    return priorTimeFrameValue;
  }, [analysisTrendMode, allAggregatePeriods, computedAggregatesInRange, primaryMetric]);

  const trendSummary = useMemo<TrendSummary | undefined>(() => {
    const firstAggregate = allAggregatePeriods.length > 0 ? allAggregatePeriods[0] : undefined;

    const primaryValue = (() => {
      if (dataset.tracking === 'series') {
        if (analysisTrendMode === 'all-time-trend') {
          return cumulatives?.[primaryMetric];
        }
        return stats?.[primaryMetric];
      }

      if (analysisTrendMode === 'all-time-trend') {
        const summaryStatsPrimary = stats?.[primaryMetric];
        const firstStatsPrimary = firstAggregate?.stats?.[primaryMetric];
        if (typeof summaryStatsPrimary === 'number' && typeof firstStatsPrimary === 'number') {
          return summaryStatsPrimary - firstStatsPrimary;
        }
        return undefined;
      }

      return deltas?.[primaryMetric];
    })();

    const percent = dataset.tracking === 'series'
      ? cumulativePercents?.[primaryMetric]
      : percents?.[primaryMetric];

    return {
      primaryValue,
      primaryValenceValue: primaryValue,
      primaryDelta: dataset.tracking === 'trend',
      changePercent: percent,
      changePercentValenceValue: percent,
    };
  }, [
    analysisTrendMode,
    allAggregatePeriods,
    cumulativePercents,
    cumulatives,
    dataset.tracking,
    deltas,
    percents,
    primaryMetric,
    stats,
  ]);

  const activeAggregationLabel =
    AGGREGATION_OPTIONS.find(option => option.value === aggregationType)?.label ?? 'Month';
  const activeTimeFrameLabel =
    availablePresets.find(preset => preset.preset === presetRange)?.label 
    ?? formatAggregationRange(timeRange.startDate, timeRange.endDate, aggregationType);
  const trendScopeLabel = presetRange ? `${activeTimeFrameLabel} Trend` : 'In Range Trend';
  const aggregationModeLabel =
    aggregationType === 'none'
      ? 'Entries'
      : capitalize(adjectivize(aggregationType));
  const aggregationPeriodLabel = capitalize(adjectivize(getAggregationPeriodLabel(aggregationType)));
  const aggregationPeriodPluralLabel = pluralize(getAggregationPeriodLabel(aggregationType));
  const trendChangeModeLabel = `${aggregationModeLabel} Change`;
  // Map analysis mode to TrendChart mode
  const trendChartMode: TrendDataMode = analysisTrendMode === 'change' ? 'change' : 'trend';

  const handlePresetChange = useCallback((value: string) => {
    const newPreset = value as TimeFramePreset;
    const presetTimeRange = getTimeRange(newPreset, today);
    setCustomStart(presetTimeRange.startDate);
    setCustomEnd(presetTimeRange.endDate);
    setPresetRange(newPreset);
  }, [setCustomEnd, setCustomStart, setPresetRange, today]);

  const handleCustomRangeChange = useCallback((start: Date, end: Date) => {
    setCustomStart(start);
    setCustomEnd(end);
    if (presetRange) setPresetRange(null);
  }, [presetRange, setCustomEnd, setCustomStart, setPresetRange]);

  const handleSelectAllTime = useCallback(() => {
    const timestamps = allDays
      .map((day) => {
        try {
          return parseDateKey(day.date).getTime();
        } catch {
          return NaN;
        }
      })
      .filter((ts) => Number.isFinite(ts));

    if (timestamps.length === 0) return;

    const minTs = Math.min(...timestamps);
    const maxTs = Math.max(...timestamps);
    setPresetRange(null);
    setCustomStart(new Date(minTs));
    setCustomEnd(new Date(maxTs));
  }, [allDays, setCustomEnd, setCustomStart, setPresetRange]);

  const controlsContent = useMemo(() => (
    <>
      {/* Time Frame Section */}
      <div className="pb-3 border-b">
        <h3 className="font-semibold text-[11px] sm:text-xs uppercase tracking-wide text-slate-600 dark:text-slate-400 mb-2 flex items-center gap-2">
          <Calendar className="w-3.5 h-3.5" />
          Time Frame
        </h3>
        <Select key={presetRange || 'custom'} value={presetRange || ''} onValueChange={handlePresetChange}>
          <SelectTrigger className="w-full text-xs h-9 sm:h-8">
            <SelectValue placeholder={formatAggregationRange(timeRange.startDate, timeRange.endDate, aggregationType)} />
          </SelectTrigger>
          <SelectContent>
            {availablePresets.map(preset => (
              <SelectItem key={preset.preset} value={preset.preset} className="text-xs">
                {preset.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="pb-3 border-b">
        <CustomRangePicker
          key={dataset.id}
          tracking={dataset.tracking}
          valence={dataset.valence}
          aggregation={aggregationType}
          allPeriods={periodsForAggregation}
          startDate={timeRange.startDate}
          endDate={timeRange.endDate}
          onRangeChange={handleCustomRangeChange}
        />
      </div>

      {/* Aggregation Section */}
      <div className="pb-3 border-b">
        <h3 className="font-semibold text-[11px] sm:text-xs uppercase tracking-wide text-slate-600 dark:text-slate-400 mb-2 flex items-center gap-2">
          <BarChart3 className="w-3.5 h-3.5" />
          Aggregation
        </h3>
        <div className="grid [grid-template-columns:repeat(auto-fit,minmax(90px,1fr))] gap-1 rounded-md bg-slate-200 dark:bg-slate-800 p-1">
          {AGGREGATION_OPTIONS.map((option) => {
            const isActive = aggregationType === option.value;
            const Icon = option.icon;

            return (
              <button
                key={option.value}
                type="button"
                onClick={() => handleAggregationChange(option.value)}
                className={`h-10 sm:h-9 px-2 text-xs font-medium flex items-center justify-center gap-1.5 rounded-md transition-colors ${isActive ? 'bg-white text-slate-900 dark:bg-slate-700 dark:text-slate-50' : 'bg-white/80 text-slate-600 hover:bg-white dark:bg-slate-900/60 dark:text-slate-300 dark:hover:bg-slate-800'}`}
                aria-pressed={isActive}
              >
                <Icon className="h-3.5 w-3.5" />
                {option.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Summary Stats */}
      <div className="pt-1">
        <h3 className="font-semibold text-[11px] sm:text-xs uppercase tracking-wide text-slate-600 dark:text-slate-400 mb-2 flex items-center gap-2">
          <Zap className="w-3.5 h-3.5" />
          Summary
        </h3>
        <div className="space-y-1.5 text-xs">
          {aggregationType !== 'none' && (
            <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-800/50 px-2 py-1.5 rounded">
              <span className="text-slate-600 dark:text-slate-400">{capitalize(pluralize(aggregationType))}</span>
              <span className="font-semibold text-slate-900 dark:text-white">{formatValue(periodCount)}</span>
            </div>
          )}
          <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-800/50 px-2 py-1.5 rounded">
            <span className="text-slate-600 dark:text-slate-400">Data Points</span>
            <span className="font-semibold text-slate-900 dark:text-white">{formatValue(dataPoints.length)}</span>
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 px-2 py-1.5 rounded mt-2">
            <div className="font-semibold text-slate-600 dark:text-slate-300 mb-1">Range</div>
            <div>{formatFriendlyDate(dateToDayKey(timeRange.startDate), dateToDayKey(timeRange.endDate))}</div>
          </div>
        </div>
      </div>
    </>
  ), [
    aggregationType,
    availablePresets,
    dataPoints.length,
    dataset.id,
    dataset.tracking,
    dataset.valence,
    handleAggregationChange,
    handleCustomRangeChange,
    handlePresetChange,
    periodCount,
    periodsForAggregation,
    presetRange,
    timeRange.endDate,
    timeRange.startDate,
  ]);

  const hasDataInSelection = dataPoints.length > 0;

  if (isLoading) {
    return <LoadingState title="Loading analysis" message="Preparing your data visualizations..." />;
  }

  if (!dataset || aggregateData.days.length === 0) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <Empty className="min-h-[60vh]">
          <EmptyHeader>
            <div className="mb-6">
              <EmptyChartIllustration />
            </div>
            <EmptyTitle className="text-xl">No Data to Analyze</EmptyTitle>
            <EmptyDescription className="text-base mt-3">
              Start tracking numbers to unlock powerful insights and visualizations.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <div className="flex flex-col sm:flex-row gap-3 mt-2">
              {dataset && (
                <Button asChild size="lg">
                  <Link to={`/dataset/${dataset.id}`}>
                    <Calendar className="w-4 h-4 mr-2" />
                    Go to Calendar
                  </Link>
                </Button>
              )}
              <Button asChild variant="outline" size="lg">
                <Link to="/">
                  <BarChart3 className="w-4 h-4 mr-2" />
                  View Dashboard
                </Link>
              </Button>
            </div>
          </EmptyContent>
        </Empty>
      </div>
    );
  }

  if (!hasDataInSelection) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-5 sm:px-6 sm:py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-6">
          {/* Controls Panel */}
          <Card className="lg:col-span-1 p-3 sm:p-4 space-y-3 h-fit sticky top-2 z-20 lg:top-6">
            {!isSidebarLayout ? (
              <Accordion type="single" collapsible defaultValue="controls">
                <AccordionItem value="controls" className="border-none">
                  <AccordionTrigger className="py-1.5 px-0 text-sm">
                    <div className="flex w-full gap-3 text-left">
                      <div className="flex-1">
                        <div className="text-[10px] uppercase tracking-wide font-semibold text-slate-500 dark:text-slate-400 mb-0.5">Time Frame</div>
                        <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">{activeTimeFrameLabel}</div>
                      </div>
                      <div className="flex-1">
                        <div className="text-[10px] uppercase tracking-wide font-semibold text-slate-500 dark:text-slate-400 mb-0.5">Aggregation</div>
                        <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">{activeAggregationLabel}</div>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="py-1 pb-0">
                    {controlsContent}
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            ) : (
              controlsContent
            )}
          </Card>

          {/* Selected range empty state */}
          <Card className="lg:col-span-3 p-6 sm:p-8">
            <Empty className="min-h-[52vh]">
              <EmptyHeader>
                <div className="mb-4">
                  <EmptyChartIllustration />
                </div>
                <EmptyTitle className="text-xl">No Data in This Time Frame</EmptyTitle>
                <EmptyDescription className="text-base mt-3 max-w-2xl mx-auto">
                  No tracked values were found for <span className="font-medium text-foreground">{activeTimeFrameLabel}</span> with <span className="font-medium text-foreground">{activeAggregationLabel}</span> aggregation. Try a broader range or a different aggregation to see charts.
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <div className="flex flex-col sm:flex-row gap-3 mt-2">
                  <Button
                    size="lg"
                    onClick={handleSelectAllTime}
                  >
                    <InfinityIcon className="w-4 h-4 mr-2" />
                    Select All Time
                  </Button>
                </div>
              </EmptyContent>
            </Empty>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-5 sm:px-6 sm:py-6">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-6">
        {/* Controls Panel */}
        <Card className="lg:col-span-1 p-3 sm:p-4 space-y-3 h-fit sticky top-2 z-20 lg:top-6">
          {!isSidebarLayout ? (
            <Accordion type="single" collapsible defaultValue="controls">
              <AccordionItem value="controls" className="border-none">
                <AccordionTrigger className="py-1.5 px-0 text-sm">
                  <div className="flex w-full gap-3 text-left">
                    <div className="flex-1">
                      <div className="text-[10px] uppercase tracking-wide font-semibold text-slate-500 dark:text-slate-400 mb-0.5">Time Frame</div>
                      <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">{activeTimeFrameLabel}</div>
                    </div>
                    <div className="flex-1">
                      <div className="text-[10px] uppercase tracking-wide font-semibold text-slate-500 dark:text-slate-400 mb-0.5">Aggregation</div>
                      <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">{activeAggregationLabel}</div>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="py-1 pb-0">
                  {controlsContent}
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          ) : (
            controlsContent
          )}
        </Card>

        {/* Charts Grid */}
        <div className="lg:col-span-3 space-y-4 sm:space-y-5">
          {/* Summary Stats */}
          <StatsSummary
            key={dataset.id}
            stats={stats}
            valence={dataset.valence}
            tracking={dataset.tracking}
            datasetId={dataset.id}
            aggregationType={aggregationType}
            timeFrameLabel={activeTimeFrameLabel}
            extremes={extremes}
            cumulatives={cumulativesData}
            deltas={deltasData}
            percents={percents}
            cumulativePercents={cumulativePercents}
            selectedMetrics={selectedSummaryMetrics}
            onSelectedMetricsChange={setSelectedSummaryMetrics}
          />

          {/* Trend Chart */}
          <ChartSection>
            <ChartSectionHeader
              actions={
                <ToggleGroup
                  type="single"
                  value={analysisTrendMode}
                  onValueChange={(value) => {
                    if (value) setAnalysisTrendMode(value as AnalysisTrendMode);
                  }}
                  size="sm"
                  variant="outline"
                  aria-label="Analysis trend mode"
                >
                  {dataset.tracking === 'series' ? (
                    <>
                      <ToggleGroupItem value="all-time-trend" aria-label="All Time Trend">
                        <InfinityIcon className="size-4 sm:mr-1" />
                        <span className="hidden sm:inline">All Time Trend</span>
                      </ToggleGroupItem>
                      <ToggleGroupItem value="trend" aria-label={trendScopeLabel}>
                        <CalendarClock className="size-4 sm:mr-1" />
                        <span className="hidden sm:inline">{trendScopeLabel}</span>
                      </ToggleGroupItem>
                      <ToggleGroupItem value="change" aria-label={trendChangeModeLabel}>
                        <Activity className="size-4 sm:mr-1" />
                        <span className="hidden sm:inline">{trendChangeModeLabel}</span>
                      </ToggleGroupItem>
                    </>
                  ) : (
                    <>
                      <ToggleGroupItem value="all-time-trend" aria-label="All Time Trend">
                        <InfinityIcon className="size-4 sm:mr-1" />
                        <span className="hidden sm:inline">All Time Trend</span>
                      </ToggleGroupItem>
                      <ToggleGroupItem value="trend" aria-label={trendScopeLabel}>
                        <LineChart className="size-4 sm:mr-1" />
                        <span className="hidden sm:inline">{trendScopeLabel}</span>
                      </ToggleGroupItem>
                      <ToggleGroupItem value="change" aria-label={trendChangeModeLabel}>
                        <Activity className="size-4 sm:mr-1" />
                        <span className="hidden sm:inline">{trendChangeModeLabel}</span>
                      </ToggleGroupItem>
                    </>
                  )}
                </ToggleGroup>
              }
            >
              <ChartSectionTitle
                icon={LineChart}
                helpLabel="Help: Trend Over Time"
                helpContent={
                  <div className="space-y-1 text-sm">
                    <p className="font-medium">Trend Over Time</p>
                    <p className="text-muted-foreground">
                      View how your data changes over time. Use{' '}
                      <span className="inline-flex items-center gap-1 rounded border border-border bg-muted px-1.5 py-0.5 font-medium text-foreground">
                        <InfinityIcon className="h-3.5 w-3.5" />
                        All Time
                      </span>{' '}
                      for cumulative values from the beginning,{' '}
                      <span className="inline-flex items-center gap-1 rounded border border-border bg-muted px-1.5 py-0.5 font-medium text-foreground">
                        <CalendarClock className="h-3.5 w-3.5" />
                        Time Frame
                      </span>{' '}
                      for cumulative values within the selected range, or{' '}
                      <span className="inline-flex items-center gap-1 rounded border border-border bg-muted px-1.5 py-0.5 font-medium text-foreground">
                        <Activity className="h-3.5 w-3.5" />
                        Change
                      </span>{' '}
                      for period-over-period movement.
                    </p>
                  </div>
                }
              >
                Trend Over Time
              </ChartSectionTitle>
            </ChartSectionHeader>
            <LazyChart minHeight={320} fallback={<ChartLoadingPlaceholder minHeight={320} />}>
              <TrendAnalysisChart
                key={dataset.id}
                periods={computedAggregatesInRange}
                aggregationType={aggregationType}
                tracking={dataset.tracking}
                mode={trendChartMode}
                valence={dataset.valence}
                selectedMetrics={selectedSummaryMetrics}
                datasetId={dataset.id}
                priorTimeFrameValue={trendPriorTimeFrameValue}
                summary={trendSummary}
              />
            </LazyChart>
          </ChartSection>

          {/* Achievement Insights */}
          <ChartSection>
            <ChartSectionHeader>
              <ChartSectionTitle
                icon={Award}
                helpLabel="Help: Achievement Insights"
                helpContent={
                  <div className="space-y-1 text-sm">
                    <p className="font-medium">Achievement Insights</p>
                    <p className="text-muted-foreground">
                      See which achievements you unlock most in this range, and which of those are rare across your all-time history.
                    </p>
                  </div>
                }
              >
                Achievement Insights
              </ChartSectionTitle>
            </ChartSectionHeader>
            <LazyChart minHeight={320} fallback={<ChartLoadingPlaceholder minHeight={320} />}>
              <AchievementInsightsChart
                datasetId={dataset.id}
                aggregationType={aggregationType}
                timeRange={timeRange}
                periods={computedAggregatesInRange}
              />
            </LazyChart>
          </ChartSection>

          {/* Aggregation Bar Chart */}
          <ChartSection>
            <ChartSectionHeader>
              <ChartSectionTitle
                icon={BarChart3}
                helpLabel="Help: Deviation from Average"
                helpContent={
                  <div className="space-y-1 text-sm">
                    <p className="font-medium">Deviation from Baseline</p>
                    <p className="text-muted-foreground">
                      See how each period deviates from a selectable baseline. Choose from{' '}
                      <span className="inline-flex items-center gap-1 rounded border border-border bg-muted px-1.5 py-0.5 font-medium text-foreground">
                        <InfinityIcon className="h-3.5 w-3.5" />
                        All Time Average
                      </span>{' '}
                      for historical context,{' '}
                      <span className="inline-flex items-center gap-1 rounded border border-border bg-muted px-1.5 py-0.5 font-medium text-foreground">
                        <CalendarClock className="h-3.5 w-3.5" />
                        Range Average
                      </span>{' '}
                      for comparison within the selected period,{' '}
                      <span className="inline-flex items-center gap-1 rounded border border-border bg-muted px-1.5 py-0.5 font-medium text-foreground">
                        <Activity className="h-3.5 w-3.5" />
                        Prior
                      </span>{' '}
                      for the previous period, or{' '}
                      <span className="inline-flex items-center gap-1 rounded border border-border bg-muted px-1.5 py-0.5 font-medium text-foreground">
                        <Target className="h-3.5 w-3.5" />
                        Target
                      </span>{' '}
                      for a goal value (select from saved targets or enter a custom value).
                    </p>
                  </div>
                }
              >
                {capitalize(adjectivize(getAggregationPeriodLabel(aggregationType)))} Deviation
              </ChartSectionTitle>
            </ChartSectionHeader>
            <LazyChart minHeight={320} fallback={<ChartLoadingPlaceholder minHeight={320} />}>
              <DeviationBarChart
                key={dataset.id}
                periods={computedAggregatesInRange}
                allTimePeriods={allAggregatePeriods}
                aggregationType={aggregationType}
                tracking={dataset.tracking}
                valence={dataset.valence}
                rangeLabel={activeTimeFrameLabel}
                datasetId={dataset.id}
                priorTimeFrameValue={priorTimeFrameValue}
              />
            </LazyChart>
          </ChartSection>

          {/* Distribution Histogram */}
          <ChartSection>
            <ChartSectionHeader>
              <ChartSectionTitle
                icon={Activity}
                helpLabel="Help: Value Distribution"
                helpContent={
                  <div className="space-y-1 text-sm">
                    <p className="font-medium">{aggregationPeriodLabel} Value Distribution</p>
                    <p className="text-muted-foreground">
                      Shows how frequently different values appear across the selected {aggregationPeriodPluralLabel}.
                      {aggregationType === 'none'
                        ? ' Each bar is a value bucket, and its height is how many entries fall into that bucket.'
                        : ` Each bar is a value bucket of ${adjectivize(aggregationType)} aggregated values, and its height is how many ${aggregationPeriodPluralLabel} fall into that bucket.`}
                    </p>
                  </div>
                }
              >
                {aggregationPeriodLabel} Value Distribution
              </ChartSectionTitle>
            </ChartSectionHeader>
            <LazyChart minHeight={320} fallback={<ChartLoadingPlaceholder minHeight={320} />}>
              <DistributionHistogram
                key={dataset.id}
                periods={computedAggregatesInRange}
                tracking={dataset.tracking}
                valence={dataset.valence}
              />
            </LazyChart>
          </ChartSection>

          {/* Valence Distribution for non-neutral datasets */}
          {dataset.valence !== 'neutral' && (
            <ChartSection>
              <ChartSectionHeader
                actions={
                  dataset.tracking === 'series' ? (
                    <ToggleGroup
                      type="single"
                      value={valenceDistributionMode}
                      onValueChange={(value) => {
                        if (value) setValenceDistributionMode(value as 'count' | 'total');
                      }}
                      size="sm"
                      variant="outline"
                      aria-label="Valence distribution mode"
                    >
                      <ToggleGroupItem value="count" aria-label="Count">
                        <Hash className="size-4 sm:mr-1" />
                        <span className="hidden sm:inline">Count</span>
                      </ToggleGroupItem>
                      <ToggleGroupItem value="total" aria-label="Total">
                        <Sigma className="size-4 sm:mr-1" />
                        <span className="hidden sm:inline">Total</span>
                      </ToggleGroupItem>
                    </ToggleGroup>
                  ) : undefined
                }
              >
                <ChartSectionTitle
                  icon={PieChart}
                  helpLabel="Help: Valence Distribution"
                  helpContent={
                    <div className="space-y-1 text-sm">
                      <p className="font-medium">Valence Distribution</p>
                      <p className="text-muted-foreground">
                        {dataset.tracking === 'trend' ? (
                          'Shows the balance between periods with upward trends versus downward trends in your data.'
                        ) : (
                          <>
                            Shows the balance between positive and negative values. Toggle between{' '}
                            <span className="inline-flex items-center gap-1 rounded border border-border bg-muted px-1.5 py-0.5 font-medium text-foreground">
                              <Hash className="h-3.5 w-3.5" />
                              Count
                            </span>{' '}
                            (number of periods) and{' '}
                            <span className="inline-flex items-center gap-1 rounded border border-border bg-muted px-1.5 py-0.5 font-medium text-foreground">
                              <Sigma className="h-3.5 w-3.5" />
                              Total
                            </span>{' '}
                            (sum of values) to see different perspectives.
                          </>
                        )}
                      </p>
                    </div>
                  }
                >
                  {aggregationType === 'none' ? 'Entry' : capitalize(adjectivize(aggregationType))} Valence Distribution
                </ChartSectionTitle>
              </ChartSectionHeader>
              <LazyChart minHeight={300} fallback={<ChartLoadingPlaceholder minHeight={300} />}>
                <ValenceDistributionChart
                  key={dataset.id}
                  periods={computedAggregatesInRange}
                  aggregationType={aggregationType}
                  tracking={dataset.tracking}
                  valence={dataset.valence}
                  mode={valenceDistributionMode}
                />
              </LazyChart>
            </ChartSection>
          )}

          {/* Period Comparison - only for aggregated data */}
          {aggregationType !== 'none' && (
            <ChartSection>
              <ChartSectionHeader>
                <ChartSectionTitle
                  icon={TrendingUp}
                  helpLabel="Help: Period Comparison"
                  helpContent={
                    <div className="space-y-1 text-sm">
                      <p className="font-medium">Period Comparison</p>
                      <p className="text-muted-foreground">
                        Compare aggregated metrics side-by-side across different time periods. This makes it easy to spot differences in performance, trends, or patterns between periods.
                      </p>
                    </div>
                  }
                >
                  {capitalize(adjectivize(aggregationType))} Comparison
                </ChartSectionTitle>
              </ChartSectionHeader>
              <LazyChart minHeight={320} fallback={<ChartLoadingPlaceholder minHeight={320} />}>
                <PeriodComparisonChart
                  key={dataset.id}
                  periods={periods}
                  aggregationType={aggregationType}
                  selectedMetrics={selectedSummaryMetrics}
                  valence={dataset.valence}
                  tracking={dataset.tracking}
                  datasetId={dataset.id}
                />
              </LazyChart>
            </ChartSection>
          )}

          {/* Projection Chart */}
          <ChartSection>
            <ChartSectionHeader
              actions={
                <div className="flex flex-wrap items-center gap-2">
                  <ToggleGroup
                    type="single"
                    value={projectionMode}
                    onValueChange={(value) => {
                      if (value) setProjectionMode(value as ProjectionMode);
                    }}
                    size="sm"
                    variant="outline"
                    aria-label="Projection mode"
                  >
                    <ToggleGroupItem value="linear" aria-label="Linear" className="gap-1.5">
                      <LineChart className="h-3.5 w-3.5" />
                      <span>Linear</span>
                    </ToggleGroupItem>

                    <ToggleGroupItem value="recent-average" aria-label="Recent" className="px-0">
                      <ToggleOptionPopover
                        align="start"
                        contentClassName="w-64 p-3"
                        trigger={
                          <div className="inline-flex items-center gap-1.5 px-2">
                            <CalendarClock className="h-3.5 w-3.5" />
                            <span>Recent</span>
                            <span className="hidden lg:inline text-xs opacity-70">({projectionRecentWindow} {pluralize(projectionPeriodUnit, projectionRecentWindow)})</span>
                            <ChevronDown className="size-3 opacity-50" />
                          </div>
                        }
                      >
                        <div className="space-y-3">
                          <p className="text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
                            Uses the average per-period change from the latest window.
                          </p>
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-slate-700 dark:text-slate-300">Recent window</span>
                            <span className="text-xs text-slate-500 dark:text-slate-400">{projectionRecentWindow} {pluralize(projectionPeriodUnit, projectionRecentWindow)}</span>
                          </div>
                          <Slider
                            min={1}
                            max={projectionRecentWindowMax}
                            step={1}
                            value={[projectionRecentWindow]}
                            onValueChange={(value) => setProjectionRecentWindowPref(value[0] as ProjectionRecentWindow)}
                            className="w-full"
                          />
                        </div>
                      </ToggleOptionPopover>
                    </ToggleGroupItem>

                    <ToggleGroupItem value="momentum" aria-label="Momentum" className="px-0">
                      <ToggleOptionPopover
                        align="start"
                        contentClassName="w-72 p-3"
                        trigger={
                          <div className="inline-flex items-center gap-1.5 px-2">
                            <Zap className="h-3.5 w-3.5" />
                            <span>Momentum</span>
                            <span className="hidden lg:inline text-xs opacity-70">({projectionMomentumWeightLabel}x)</span>
                            <ChevronDown className="size-3 opacity-50" />
                          </div>
                        }
                      >
                        <div className="space-y-4">
                          <p className="text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
                            Same trend model as Recent, but with extra weight on the newest periods.
                          </p>
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-medium text-slate-700 dark:text-slate-300">Recent window</span>
                              <span className="text-xs text-slate-500 dark:text-slate-400">{projectionRecentWindow} {pluralize(projectionPeriodUnit, projectionRecentWindow)}</span>
                            </div>
                            <Slider
                              min={1}
                              max={projectionRecentWindowMax}
                              step={1}
                              value={[projectionRecentWindow]}
                              onValueChange={(value) => setProjectionRecentWindowPref(value[0] as ProjectionRecentWindow)}
                              className="w-full"
                            />
                          </div>

                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-medium text-slate-700 dark:text-slate-300">Recency weighting</span>
                              <span className="text-xs text-slate-500 dark:text-slate-400">{projectionMomentumWeight.toFixed(1)}x</span>
                            </div>
                            <Slider
                              min={projectionMomentumWeightMin}
                              max={projectionMomentumWeightMax}
                              step={0.1}
                              value={[projectionMomentumWeight]}
                              onValueChange={(value) => setProjectionMomentumWeightPref(value[0] as ProjectionMomentumWeight)}
                              className="w-full"
                            />
                          </div>
                        </div>
                      </ToggleOptionPopover>
                    </ToggleGroupItem>
                  </ToggleGroup>

                  <DropdownWithCustomInput
                    trigger={
                      <button
                        type="button"
                        className="h-8 w-[150px] inline-flex items-center justify-between rounded-md border border-input bg-background px-3 text-xs"
                        aria-label="Projection horizon"
                      >
                        <span>+{projectionHorizon} {pluralize(projectionPeriodUnit, projectionHorizon)}</span>
                        <ChevronDown className="h-3.5 w-3.5 opacity-50" />
                      </button>
                    }
                    align="end"
                    contentClassName="w-[220px] p-2"
                    options={projectionHorizonScale.map((option) => ({
                      id: String(option),
                      onSelect: () => setProjectionHorizon(option),
                      className: `w-full rounded-md px-2 py-1.5 text-left text-xs transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 ${projectionHorizon === option ? 'bg-slate-100 dark:bg-slate-800' : ''}`,
                      content: <span>+{option} {pluralize(projectionPeriodUnit, option)}</span>,
                    }))}
                    customInputType="number"
                    customInputValue={String(projectionHorizon)}
                    onCustomInputChange={(value) => {
                      const digitsOnly = value.replace(/[^0-9]/g, '');
                      if (!digitsOnly) return;
                      setProjectionHorizon(Number(digitsOnly) as ProjectionHorizon);
                    }}
                    customInputPlaceholder={`Custom ${pluralize(projectionPeriodUnit, 2)}`}
                    customInputAriaLabel="Custom projection horizon"
                    customInputMin={1}
                    customInputMax={projectionHorizonMax}
                    customInputClassName="h-8 text-xs"
                  />
                </div>
              }
            >
              <ChartSectionTitle
                icon={Sparkles}
                helpLabel="Help: Projections"
                helpContent={
                  <div className="space-y-2 text-sm max-w-sm">
                    <p className="font-medium">Projections</p>
                    <p className="text-muted-foreground">
                      Forecast from your fitted per-period trend across {aggregationPeriodPluralLabel} in the selected range.
                    </p>
                    <p className="text-muted-foreground">
                      <span className="inline-flex items-center gap-1 rounded border border-border bg-muted px-1.5 py-0.5 font-medium text-foreground">
                        <LineChart className="h-3.5 w-3.5" />
                        <strong>Linear</strong>
                      </span>{' '}
                      fits a straight trend from full in-range history.
                    </p>
                    <p className="text-muted-foreground">
                      <span className="inline-flex items-center gap-1 rounded border border-border bg-muted px-1.5 py-0.5 font-medium text-foreground">
                        <CalendarClock className="h-3.5 w-3.5" />
                        <strong>Recent</strong>
                      </span>{' '}
                      uses only the latest window for trend.
                    </p>
                    <p className="text-muted-foreground">
                      <span className="inline-flex items-center gap-1 rounded border border-border bg-muted px-1.5 py-0.5 font-medium text-foreground">
                        <Zap className="h-3.5 w-3.5" />
                        <strong>Momentum</strong>
                      </span>{' '}
                      is Recent with recency weighting.
                    </p>
                    <p className="text-muted-foreground">
                      <span className="inline-flex items-center gap-1 rounded border border-border bg-muted px-1.5 py-0.5 font-medium text-foreground">
                        <TrendingUp className="h-3.5 w-3.5" />
                        <strong>Growth</strong>
                      </span>{' '}
                      Additive keeps a straight trend; Compound curves by compounding growth each step.
                    </p>
                    <p className="text-muted-foreground">
                      <span className="inline-flex items-center gap-1 rounded border border-border bg-muted px-1.5 py-0.5 font-medium text-foreground">
                        <Target className="h-3.5 w-3.5" />
                        <strong>Spread</strong>
                      </span>{' '}
                      High/Low apply +/- % to trend rate, not to absolute value.
                    </p>
                  </div>
                }
              >
                Projections
              </ChartSectionTitle>
            </ChartSectionHeader>
            <LazyChart minHeight={360} fallback={<ChartLoadingPlaceholder minHeight={360} />}>
              <ProjectionsChart
                datasetId={dataset.id}
                periods={projectionPeriods}
                tracking={dataset.tracking}
                aggregationType={aggregationType}
                projectionMode={projectionMode}
                projectionHorizon={projectionHorizon}
                projectionRecentWindow={projectionRecentWindow}
                projectionMomentumWeight={projectionMomentumWeight}
                valence={dataset.valence}
                milestones={milestonesResults}
              />
            </LazyChart>
          </ChartSection>

          {/* Unique chart: Momentum Quadrant */}
          <ChartSection>
            <ChartSectionHeader>
              <ChartSectionTitle
                icon={Compass}
                helpLabel="Help: Momentum Quadrant"
                helpContent={
                  <div className="space-y-2 text-sm">
                    <p className="font-medium">Momentum Quadrant</p>
                    <p className="text-muted-foreground">
                      Each point is one selected {getAggregationPeriodLabel(aggregationType)}. Center lines show average Level and Momentum.
                    </p>
                    {dataset.tracking === 'series' ? (
                      <p className="text-muted-foreground">
                        <strong>Level</strong> is the running all-time cumulative value; <strong>Momentum</strong> is the current {getAggregationPeriodLabel(aggregationType)} value.
                      </p>
                    ) : (
                      <p className="text-muted-foreground">
                        <strong>Level</strong> is the per-{getAggregationPeriodLabel(aggregationType)} delta; <strong>Momentum</strong> is change in delta vs the previous {getAggregationPeriodLabel(aggregationType)}.
                      </p>
                    )}
                    <p className="text-muted-foreground">
                      Right/left = above/below-average Level. Up/down = above/below-average Momentum. Use it to spot strengthening, fading, recovering, and worsening periods.
                    </p>
                  </div>
                }
              >
                Momentum Quadrant
              </ChartSectionTitle>
            </ChartSectionHeader>
            <LazyChart minHeight={360} fallback={<ChartLoadingPlaceholder minHeight={360} />}>
              <MomentumQuadrantChart
                periods={computedAggregatesInRange}
                tracking={dataset.tracking}
                aggregationType={aggregationType}
                valence={dataset.valence}
              />
            </LazyChart>
          </ChartSection>
        </div>
      </div>
    </div>
  );
}

export default Analysis;
