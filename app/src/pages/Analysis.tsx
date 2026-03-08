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
import { useDatasetContext } from '@/context/DatasetContext';
import { usePreference } from '@/hooks/usePreference';
import { useAllPeriodsAggregateData } from '@/hooks/useAggregateData';
import { formatFriendlyDate, dateToDayKey, getTodayKey, parseDateKey, type DateKeyType } from '@/lib/friendly-date';
import { formatValue } from '@/lib/friendly-numbers';
import { useMemo } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { formatAggregationRange, getTimeRange, getAvailablePresets, computeAnalysisData, type AggregationType, type TimeFramePreset } from '@/lib/analysis';
import type { DayKey } from '@/features/db/localdb';
import { getPrimaryMetric } from '@/lib/tracking';
import type { NumberMetric } from '@/lib/stats';
import { Calendar, TrendingUp, BarChart3, Zap, LineChart, PieChart, Activity, CalendarDays, CalendarRange, CalendarClock, Ban, Hash, Sigma, HelpCircle, Infinity, Target } from 'lucide-react';
import { TrendAnalysisChart } from '@/features/analysis/TrendAnalysisChart';
import { DeviationBarChart } from '@/features/analysis/DeviationBarChart';
import { ValenceDistributionChart } from '@/features/analysis/ValenceDistributionChart';
import { DistributionHistogram } from '@/features/analysis/DistributionHistogram';
import { PeriodComparisonChart } from '@/features/analysis/PeriodComparisonChart';
import { StatsSummary } from '@/features/analysis/StatsSummary';
import { CustomRangePicker } from '@/features/analysis/CustomRangePicker';
import { adjectivize, capitalize, pluralize } from '@/lib/utils';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import type { TrendDataMode } from '@/features/analysis/TrendAnalysisChart';
import { buildSingleNumberAggregates, computeRunningAggregatePeriods, type PeriodAggregateData } from '@/lib/period-aggregate';
import { Link } from 'react-router-dom';

export type AnalysisTrendMode = 'all-time-trend' | 'in-range-trend' | 'change';

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

export function Analysis() {
  const { dataset } = useDatasetContext();
  const { allDays, isLoading, ...aggregateData } = useAllPeriodsAggregateData();
  const isMobile = useIsMobile();
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

  // Helpers to set custom dates
  const setCustomStart = (date: Date) => {
    setCustomStartDayKey(dateToDayKey(date));
  };

  const setCustomEnd = (date: Date) => {
    setCustomEndDayKey(dateToDayKey(date));
  };

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
  useMemo(() => {
    if (!presetRange) return;
    const isValid = availablePresets.some(p => p.preset === presetRange);
    if (!isValid && availablePresets.length > 0) {
      setPresetRange(availablePresets[0].preset);
    }
  }, [aggregationType, availablePresets, presetRange]);

  // Determine active time range
  const today = new Date();
  const timeRange = useMemo(() => {
    if (!presetRange) {
      return { startDate: customStart, endDate: customEnd };
    }
    return getTimeRange(presetRange, today);
  }, [presetRange, customStart, customEnd, today]);

  const handleAggregationChange = (nextAggregation: AggregationType) => {
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
  };

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

  const computedAggregatesInRange = useMemo(() => {
    const filterToInRange = (periods: PeriodAggregateData<DateKeyType>[]) => {
      return periods.filter((period) => {
        const periodDate = parseDateKey(period.dateKey);
        return periodDate >= timeRange.startDate && periodDate <= timeRange.endDate;
      });
    }
    // For all-time, use running aggregates on all data, then filter, for in-range filter then compute running aggregates
    if (analysisTrendMode === 'all-time-trend') {
      return filterToInRange(computeRunningAggregatePeriods(allAggregatePeriods, primaryMetric));
    } 
    return computeRunningAggregatePeriods(filterToInRange(allAggregatePeriods), primaryMetric);
  }, [analysisTrendMode, allAggregatePeriods, primaryMetric, timeRange]);

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

    const priorIndex = Math.max(allAggregatePeriods.length - computedAggregatesInRange.length - 1, 0);
    return allAggregatePeriods[priorIndex].stats[primaryMetric];
  }, [analysisTrendMode, allAggregatePeriods, computedAggregatesInRange, primaryMetric]);

  const aggregationOptions = [
    { value: 'none', label: 'None', icon: Ban },
    { value: 'day', label: 'Day', icon: CalendarDays },
    { value: 'week', label: 'Week', icon: CalendarRange },
    { value: 'month', label: 'Month', icon: Calendar },
    { value: 'year', label: 'Year', icon: CalendarClock },
  ] as const;

  const activeAggregationLabel =
    aggregationOptions.find(option => option.value === aggregationType)?.label ?? 'Month';
  const activeTimeFrameLabel =
    availablePresets.find(preset => preset.preset === presetRange)?.label 
    ?? formatAggregationRange(timeRange.startDate, timeRange.endDate, aggregationType);
  const trendScopeLabel = presetRange ? `${activeTimeFrameLabel} Trend` : 'In Range Trend';
  const aggregationModeLabel =
    aggregationType === 'none'
      ? 'Entries'
      : capitalize(adjectivize(aggregationType));
  const trendChangeModeLabel = `${aggregationModeLabel} Change`;
  // Map analysis mode to TrendChart mode
  const trendChartMode: TrendDataMode = analysisTrendMode === 'change' ? 'change' : 'trend';

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

  const controlsContent = (
    <>
      {/* Time Frame Section */}
      <div className="pb-3 border-b">
        <h3 className="font-semibold text-[11px] sm:text-xs uppercase tracking-wide text-slate-600 dark:text-slate-400 mb-2 flex items-center gap-2">
          <Calendar className="w-3.5 h-3.5" />
          Time Frame
        </h3>
        <Select key={presetRange || 'custom'} value={presetRange || ''} onValueChange={(value) => {
          const newPreset = value as TimeFramePreset;
          const presetTimeRange = getTimeRange(newPreset, today);
          setCustomStart(presetTimeRange.startDate);
          setCustomEnd(presetTimeRange.endDate);
          setPresetRange(newPreset);
        }}>
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
          onRangeChange={(start, end) => {
            setCustomStart(start);
            setCustomEnd(end);
            if (presetRange) setPresetRange(null);
          }}
        />
      </div>

      {/* Aggregation Section */}
      <div className="pb-3 border-b">
        <h3 className="font-semibold text-[11px] sm:text-xs uppercase tracking-wide text-slate-600 dark:text-slate-400 mb-2 flex items-center gap-2">
          <BarChart3 className="w-3.5 h-3.5" />
          Aggregation
        </h3>
        <div className="grid [grid-template-columns:repeat(auto-fit,minmax(90px,1fr))] gap-1 rounded-md bg-slate-200 dark:bg-slate-800 p-1">
          {aggregationOptions.map((option) => {
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
  );

  if (!hasDataInSelection) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-5 sm:px-6 sm:py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-6">
          {/* Controls Panel */}
          <Card className="lg:col-span-1 p-3 sm:p-4 space-y-3 h-fit sticky top-2 z-20 lg:top-6">
            {isMobile ? (
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
                    onClick={() => {
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
                    }}
                  >
                    <Infinity className="w-4 h-4 mr-2" />
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
          {isMobile ? (
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
          <Card className="p-4">
            <div className="mb-3 sm:mb-4 flex items-center justify-between gap-2 flex-wrap">
              <h3 className="font-semibold flex items-center gap-2 text-sm sm:text-base">
                <LineChart className="w-4 h-4" />
                Trend Over Time
                <PopoverTip>
                  <PopoverTipTrigger asChild>
                    <button
                      className="inline-flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                      aria-label="Help: Trend Over Time"
                    >
                      <HelpCircle className="w-3.5 h-3.5" />
                    </button>
                  </PopoverTipTrigger>
                  <PopoverTipContent>
                    <div className="space-y-1 text-sm">
                      <p className="font-medium">Trend Over Time</p>
                      <p className="text-muted-foreground">
                        View how your data changes over time. Use{' '}
                        <span className="inline-flex items-center gap-1 rounded border border-border bg-muted px-1.5 py-0.5 font-medium text-foreground">
                          <Infinity className="h-3.5 w-3.5" />
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
                  </PopoverTipContent>
                </PopoverTip>
              </h3>
              <div className="flex items-center gap-2">
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
                      <Infinity className="size-4 sm:mr-1" />
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
                      <Infinity className="size-4 sm:mr-1" />
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
              </div>
            </div>
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
            />
          </Card>

          {/* Aggregation Bar Chart */}
          <Card className="p-4">
            <h3 className="font-semibold mb-3 sm:mb-4 flex items-center gap-2 text-sm sm:text-base">
              <BarChart3 className="w-4 h-4" />
              {aggregationType === 'none' ? 'Entry' : capitalize(adjectivize(aggregationType))} Deviation from Baseline
              <PopoverTip>
                <PopoverTipTrigger asChild>
                  <button
                    className="inline-flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                    aria-label="Help: Deviation from Average"
                  >
                    <HelpCircle className="w-3.5 h-3.5" />
                  </button>
                </PopoverTipTrigger>
                <PopoverTipContent>
                  <div className="space-y-1 text-sm">
                    <p className="font-medium">Deviation from Baseline</p>
                    <p className="text-muted-foreground">
                      See how each period deviates from a selectable baseline. Choose from{' '}
                      <span className="inline-flex items-center gap-1 rounded border border-border bg-muted px-1.5 py-0.5 font-medium text-foreground">
                        <Infinity className="h-3.5 w-3.5" />
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
                </PopoverTipContent>
              </PopoverTip>
            </h3>
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
          </Card>

          {/* Distribution Histogram */}
          <Card className="p-4">
            <h3 className="font-semibold mb-3 sm:mb-4 flex items-center gap-2 text-sm sm:text-base">
              <Activity className="w-4 h-4" />
              Value Distribution
              <PopoverTip>
                <PopoverTipTrigger asChild>
                  <button
                    className="inline-flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                    aria-label="Help: Value Distribution"
                  >
                    <HelpCircle className="w-3.5 h-3.5" />
                  </button>
                </PopoverTipTrigger>
                <PopoverTipContent>
                  <div className="space-y-1 text-sm">
                    <p className="font-medium">Value Distribution</p>
                    <p className="text-muted-foreground">
                      Shows how frequently different values appear in your data. This histogram reveals patterns like clustering around certain values or whether your data is evenly spread out.
                    </p>
                  </div>
                </PopoverTipContent>
              </PopoverTip>
            </h3>
            <DistributionHistogram
              key={dataset.id}
              periods={computedAggregatesInRange}
              tracking={dataset.tracking}
              valence={dataset.valence}
            />
          </Card>

          {/* Valence Distribution for non-neutral datasets */}
          {dataset.valence !== 'neutral' && (
            <Card className="p-4">
              <div className="mb-3 sm:mb-4 flex items-center justify-between gap-2">
                <h3 className="font-semibold flex items-center gap-2 text-sm sm:text-base">
                  <PieChart className="w-4 h-4" />
                  {aggregationType === 'none' ? 'Entry' : capitalize(adjectivize(aggregationType))} {dataset.tracking === 'trend' ? 'Uptrend/Downtrend' : 'Positive/Negative'} Distribution
                  <PopoverTip>
                    <PopoverTipTrigger asChild>
                      <button
                        className="inline-flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                        aria-label="Help: Valence Distribution"
                      >
                        <HelpCircle className="w-3.5 h-3.5" />
                      </button>
                    </PopoverTipTrigger>
                    <PopoverTipContent>
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
                    </PopoverTipContent>
                  </PopoverTip>
                </h3>
                {dataset.tracking === 'series' && (
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
                )}
              </div>
              <ValenceDistributionChart
                key={dataset.id}
                periods={computedAggregatesInRange}
                aggregationType={aggregationType}
                tracking={dataset.tracking}
                valence={dataset.valence}
                mode={valenceDistributionMode}
              />
            </Card>
          )}

          {/* Period Comparison - only for aggregated data */}
          {aggregationType !== 'none' && (
            <Card className="p-4">
              <h3 className="font-semibold mb-3 sm:mb-4 flex items-center gap-2 text-sm sm:text-base">
                <TrendingUp className="w-4 h-4" />
                {capitalize(adjectivize(aggregationType))} Comparison
                <PopoverTip>
                  <PopoverTipTrigger asChild>
                    <button
                      className="inline-flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                      aria-label="Help: Period Comparison"
                    >
                      <HelpCircle className="w-3.5 h-3.5" />
                    </button>
                  </PopoverTipTrigger>
                  <PopoverTipContent>
                    <div className="space-y-1 text-sm">
                      <p className="font-medium">Period Comparison</p>
                      <p className="text-muted-foreground">
                        Compare aggregated metrics side-by-side across different time periods. This makes it easy to spot differences in performance, trends, or patterns between periods.
                      </p>
                    </div>
                  </PopoverTipContent>
                </PopoverTip>
              </h3>
              <PeriodComparisonChart
                key={dataset.id}
                periods={periods}
                aggregationType={aggregationType}
                selectedMetrics={selectedSummaryMetrics}
                valence={dataset.valence}
                tracking={dataset.tracking}
                datasetId={dataset.id}
              />
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

export default Analysis;
