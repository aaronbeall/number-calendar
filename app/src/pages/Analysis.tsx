import { Card } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useDatasetContext } from '@/context/DatasetContext';
import { useAllDays } from '@/features/db/useDayEntryData';
import type { DateKey } from '@/features/db/localdb';
import { useSearchParamState } from '@/hooks/useSearchParamState';
import { useAllPeriodsAggregateData } from '@/hooks/useAggregateData';
import { formatFriendlyDate, dateToDayKey, convertDateKey, parseDateKey } from '@/lib/friendly-date';
import { formatValue } from '@/lib/friendly-numbers';
import { useMemo, useState } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { getTimeRange, getAvailablePresets, computeAnalysisData, type AggregationType, type TimeFramePreset } from '@/lib/analysis';
import { getPrimaryMetric } from '@/lib/tracking';
import { Calendar, TrendingUp, BarChart3, Zap, LineChart, PieChart, Activity, CalendarDays, CalendarRange, CalendarClock, Ban } from 'lucide-react';
import { TrendAnalysisChart } from '@/features/analysis/TrendAnalysisChart';
import { AggregationBarChart } from '@/features/analysis/AggregationBarChart';
import { ValenceDistributionChart } from '@/features/analysis/ValenceDistributionChart';
import { DistributionHistogram } from '@/features/analysis/DistributionHistogram';
import { PeriodComparisonChart } from '@/features/analysis/PeriodComparisonChart';
import { StatsSummary } from '@/features/analysis/StatsSummary';
import { CustomRangePicker } from '@/features/analysis/CustomRangePicker';
import { capitalize, pluralize } from '@/lib/utils';



export function Analysis() {
  const { dataset } = useDatasetContext();
  const aggregateData = useAllPeriodsAggregateData();
  const { data: allDays = [] } = useAllDays(dataset.id);
  const isMobile = useIsMobile();
  const primaryMetric = getPrimaryMetric(dataset.tracking);

  const [aggregationType, setAggregationType] = useSearchParamState<AggregationType>('agg', 'month');
  const actualAggregationType = (typeof aggregationType === 'string' ? aggregationType : 'month') as AggregationType;
  const [presetRange, setPresetRange] = useState<TimeFramePreset>('last-6-months');
  const [customStart, setCustomStart] = useState<Date>(new Date());
  const [customEnd, setCustomEnd] = useState<Date>(new Date());

  // Get periods based on aggregation type
  const periodsForAggregation = useMemo(() => {
    switch (actualAggregationType) {
      case 'none': return aggregateData.days;
      case 'day': return aggregateData.days;
      case 'week': return aggregateData.weeks;
      case 'month': return aggregateData.months;
      case 'year': return aggregateData.years;
      default: return aggregateData.months;
    }
  }, [actualAggregationType, aggregateData]);

  // Get available time frame presets for current aggregation
  const availablePresets = useMemo(() => 
    getAvailablePresets(actualAggregationType),
    [actualAggregationType]
  );

  // Ensure current preset is valid for aggregation type
  useMemo(() => {
    const isValid = availablePresets.some(p => p.preset === presetRange);
    if (!isValid && availablePresets.length > 0) {
      setPresetRange(availablePresets[0].preset);
    }
  }, [actualAggregationType, availablePresets]);

  // Determine active time range
  const today = new Date();
  const timeRange = useMemo(() => {
    const customRange = presetRange === 'custom' ? { startDate: customStart, endDate: customEnd } : undefined;
    return getTimeRange(presetRange, today, customRange);
  }, [presetRange, customStart, customEnd, today]);

  const handleAggregationChange = (nextAggregation: AggregationType) => {
    setAggregationType(nextAggregation);

    if (presetRange !== 'custom') return;

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
    computeAnalysisData(periodsForAggregation, timeRange, true, {
      aggregation: actualAggregationType,
      primaryMetric,
    }),
    [actualAggregationType, periodsForAggregation, primaryMetric, timeRange]
  );

  const { dataPoints, stats, extremes, cumulatives, cumulativePercents, deltas, percents, periodCount } = analysisData;

  // Cumulatives only for series tracking
  const cumulativesData = dataset.tracking === 'series' ? cumulatives : undefined;

  // Deltas only for trend tracking
  const deltasData = dataset.tracking === 'trend' ? deltas : undefined;

  // Filter allDays by the time range for charts
  const daysInRange = useMemo(() => {
    const startKey = dateToDayKey(timeRange.startDate);
    const endKey = dateToDayKey(timeRange.endDate);
    return allDays.filter(day => day.date >= startKey && day.date <= endKey);
  }, [allDays, timeRange]);

  // Group days by aggregation type for AggregationBarChart
  const groupedData = useMemo(() => {
    const groups: Record<string, typeof daysInRange> = {};
    
    daysInRange.forEach(day => {
      let groupKey: DateKey = day.date; // DateKey union type allows all date key types
      if (actualAggregationType === 'week') {
        groupKey = convertDateKey(day.date, 'week');
      } else if (actualAggregationType === 'month') {
        groupKey = convertDateKey(day.date, 'month');
      } else if (actualAggregationType === 'year') {
        groupKey = convertDateKey(day.date, 'year');
      }
      
      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(day);
    });
    
    return groups;
  }, [daysInRange, actualAggregationType]);

  const aggregationOptions = [
    { value: 'none', label: 'None', icon: Ban },
    { value: 'day', label: 'Day', icon: CalendarDays },
    { value: 'week', label: 'Week', icon: CalendarRange },
    { value: 'month', label: 'Month', icon: Calendar },
    { value: 'year', label: 'Year', icon: CalendarClock },
  ] as const;

  const activeAggregationLabel =
    aggregationOptions.find(option => option.value === actualAggregationType)?.label ?? 'Month';
  const activePresetLabel =
    availablePresets.find(preset => preset.preset === presetRange)?.label ?? 'Custom';

  if (!dataset || aggregateData.days.length === 0) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <h1 className="text-3xl font-bold mb-2">Analysis</h1>
        <p className="text-slate-500 mb-8">No data available</p>
        <div className="text-slate-500 mt-8">
          Start tracking numbers to see analysis visualizations.
        </div>
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
        <Select value={presetRange} onValueChange={(value) => {
          const newPreset = value as TimeFramePreset;
          if (newPreset !== 'custom') {
            // Switching to a preset - sync custom values to match it
            const presetTimeRange = getTimeRange(newPreset, today);
            setCustomStart(presetTimeRange.startDate);
            setCustomEnd(presetTimeRange.endDate);
          } else {
            // Switching TO custom - initialize with the current preset's range
            const currentPresetRange = getTimeRange(presetRange, today);
            setCustomStart(currentPresetRange.startDate);
            setCustomEnd(currentPresetRange.endDate);
          }
          setPresetRange(newPreset);
        }}>
          <SelectTrigger className="w-full text-xs h-9 sm:h-8">
            <SelectValue />
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

      {presetRange === 'custom' && (
        <div className="pb-3 border-b">
          <CustomRangePicker
            tracking={dataset.tracking}
            valence={dataset.valence}
            aggregation={actualAggregationType}
            allPeriods={periodsForAggregation}
            startDate={customStart}
            endDate={customEnd}
            onRangeChange={(start, end) => {
              setCustomStart(start);
              setCustomEnd(end);
            }}
          />
        </div>
      )}

      {/* Aggregation Section */}
      <div className="pb-3 border-b">
        <h3 className="font-semibold text-[11px] sm:text-xs uppercase tracking-wide text-slate-600 dark:text-slate-400 mb-2 flex items-center gap-2">
          <BarChart3 className="w-3.5 h-3.5" />
          Aggregation
        </h3>
        <div className="grid [grid-template-columns:repeat(auto-fit,minmax(90px,1fr))] gap-1 rounded-md bg-slate-200 dark:bg-slate-800 p-1">
          {aggregationOptions.map((option) => {
            const isActive = actualAggregationType === option.value;
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
          {actualAggregationType !== 'none' && (
            <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-800/50 px-2 py-1.5 rounded">
              <span className="text-slate-600 dark:text-slate-400">{capitalize(pluralize(actualAggregationType))}</span>
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
                      <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">{activePresetLabel}</div>
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
            extremes={extremes}
            cumulatives={cumulativesData}
            deltas={deltasData}
            percents={percents}
            cumulativePercents={cumulativePercents}
          />

          {/* Trend Chart */}
          <Card className="p-4">
            <h3 className="font-semibold mb-3 sm:mb-4 flex items-center gap-2 text-sm sm:text-base">
              <LineChart className="w-4 h-4" />
              Trend Over Time
            </h3>
            <TrendAnalysisChart
              days={daysInRange}
              aggregationType={actualAggregationType}
              valence={dataset.valence}
            />
          </Card>

          {/* Aggregation Bar Chart */}
          <Card className="p-4">
            <h3 className="font-semibold mb-3 sm:mb-4 flex items-center gap-2 text-sm sm:text-base">
              <BarChart3 className="w-4 h-4" />
              {actualAggregationType === 'none' ? 'Raw' : actualAggregationType === 'day' ? 'Daily' : actualAggregationType === 'week' ? 'Weekly' : actualAggregationType === 'month' ? 'Monthly' : 'Yearly'} Totals
            </h3>
            <AggregationBarChart
              groupedData={groupedData}
              aggregationType={actualAggregationType}
              valence={dataset.valence}
            />
          </Card>

          {/* Distribution Histogram */}
          <Card className="p-4">
            <h3 className="font-semibold mb-3 sm:mb-4 flex items-center gap-2 text-sm sm:text-base">
              <Activity className="w-4 h-4" />
              Value Distribution
            </h3>
            <DistributionHistogram
              numbers={dataPoints}
              valence={dataset.valence}
            />
          </Card>

          {/* Valence Distribution for non-neutral datasets */}
          {dataset.valence !== 'neutral' && (
            <Card className="p-4">
              <h3 className="font-semibold mb-3 sm:mb-4 flex items-center gap-2 text-sm sm:text-base">
                <PieChart className="w-4 h-4" />
                {dataset.valence === 'positive' ? 'Positive/Negative' : 'Beneficial/Harmful'} Breakdown
              </h3>
              <ValenceDistributionChart
                numbers={dataPoints}
                valence={dataset.valence}
              />
            </Card>
          )}

          {/* Period Comparison */}
          <Card className="p-4">
            <h3 className="font-semibold mb-3 sm:mb-4 flex items-center gap-2 text-sm sm:text-base">
              <TrendingUp className="w-4 h-4" />
              {actualAggregationType === 'none' ? 'Raw' : actualAggregationType === 'day' ? 'Daily' : actualAggregationType === 'week' ? 'Weekly' : actualAggregationType === 'month' ? 'Monthly' : 'Yearly'} Comparison
            </h3>
            <PeriodComparisonChart
              groupedData={groupedData}
              aggregationType={actualAggregationType}
            />
          </Card>
        </div>
      </div>
    </div>
  );
}

export default Analysis;
