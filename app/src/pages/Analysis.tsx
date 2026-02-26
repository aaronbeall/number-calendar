import { Card } from '@/components/ui/card';
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
import { getTimeRange, getAvailablePresets, computeAnalysisData, type AggregationType, type TimeFramePreset } from '@/lib/analysis';
import { Calendar, TrendingUp, BarChart3, Zap, LineChart, PieChart, Activity, CalendarDays, CalendarRange, CalendarClock } from 'lucide-react';
import { TrendAnalysisChart } from '@/features/analysis/TrendAnalysisChart';
import { AggregationBarChart } from '@/features/analysis/AggregationBarChart';
import { ValenceDistributionChart } from '@/features/analysis/ValenceDistributionChart';
import { DistributionHistogram } from '@/features/analysis/DistributionHistogram';
import { PeriodComparisonChart } from '@/features/analysis/PeriodComparisonChart';
import { StatsSummary } from '@/features/analysis/StatsSummary';
import { CustomRangePicker } from '@/features/analysis/CustomRangePicker';



export function Analysis() {
  const { dataset } = useDatasetContext();
  const aggregateData = useAllPeriodsAggregateData();
  const { data: allDays = [] } = useAllDays(dataset.id);

  const [aggregationType, setAggregationType] = useSearchParamState<AggregationType>('agg', 'month');
  const actualAggregationType = (typeof aggregationType === 'string' ? aggregationType : 'month') as AggregationType;
  const [presetRange, setPresetRange] = useState<TimeFramePreset>('last-6-months');
  const [customStart, setCustomStart] = useState<Date>(new Date());
  const [customEnd, setCustomEnd] = useState<Date>(new Date());

  // Get periods based on aggregation type
  const periodsForAggregation = useMemo(() => {
    switch (actualAggregationType) {
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
    computeAnalysisData(periodsForAggregation, timeRange, true),
    [periodsForAggregation, timeRange]
  );

  const { dataPoints, stats, extremes, cumulatives, deltas, periodCount } = analysisData;

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
    { value: 'day', label: 'Day', icon: CalendarDays, corner: 'rounded-tl-md' },
    { value: 'week', label: 'Week', icon: CalendarRange, corner: 'rounded-tr-md' },
    { value: 'month', label: 'Month', icon: Calendar, corner: 'rounded-bl-md' },
    { value: 'year', label: 'Year', icon: CalendarClock, corner: 'rounded-br-md' },
  ] as const;

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

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Controls Panel */}
        <Card className="lg:col-span-1 p-4 space-y-3 h-fit sticky top-6">
          {/* Time Frame Section */}
          <div className="pb-3 border-b">
            <h3 className="font-semibold text-xs uppercase tracking-wide text-slate-600 dark:text-slate-400 mb-2 flex items-center gap-2">
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
              <SelectTrigger className="w-full text-xs h-8">
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
            <h3 className="font-semibold text-xs uppercase tracking-wide text-slate-600 dark:text-slate-400 mb-2 flex items-center gap-2">
              <BarChart3 className="w-3.5 h-3.5" />
              Aggregation
            </h3>
            <div className="grid grid-cols-2 gap-px rounded-md bg-slate-200 dark:bg-slate-800 p-px">
              {aggregationOptions.map((option) => {
                const isActive = actualAggregationType === option.value;
                const Icon = option.icon;

                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handleAggregationChange(option.value)}
                    className={`h-9 px-2 text-xs font-medium flex items-center justify-center gap-1.5 ${option.corner} transition-colors ${isActive ? 'bg-white text-slate-900 dark:bg-slate-700 dark:text-slate-50' : 'bg-white/80 text-slate-600 hover:bg-white dark:bg-slate-900/60 dark:text-slate-300 dark:hover:bg-slate-800'}`}
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
            <h3 className="font-semibold text-xs uppercase tracking-wide text-slate-600 dark:text-slate-400 mb-2 flex items-center gap-2">
              <Zap className="w-3.5 h-3.5" />
              Summary
            </h3>
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-800/50 px-2 py-1.5 rounded">
                <span className="text-slate-600 dark:text-slate-400">{actualAggregationType === 'day' ? 'Days' : actualAggregationType === 'week' ? 'Weeks' : actualAggregationType === 'month' ? 'Months' : 'Years'}</span>
                <span className="font-semibold text-slate-900 dark:text-white">{formatValue(periodCount)}</span>
              </div>
              <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-800/50 px-2 py-1.5 rounded">
                <span className="text-slate-600 dark:text-slate-400">Data Points</span>
                <span className="font-semibold text-slate-900 dark:text-white">{formatValue(stats?.count ?? 0)}</span>
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 px-2 py-1.5 rounded mt-2">
                <div className="font-semibold text-slate-600 dark:text-slate-300 mb-1">Range</div>
                <div>{formatFriendlyDate(dateToDayKey(timeRange.startDate), dateToDayKey(timeRange.endDate))}</div>
              </div>
            </div>
          </div>
        </Card>

        {/* Charts Grid */}
        <div className="lg:col-span-3 space-y-4">
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
          />

          {/* Trend Chart */}
          <Card className="p-4">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
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
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              {actualAggregationType === 'day' ? 'Daily' : actualAggregationType === 'week' ? 'Weekly' : actualAggregationType === 'month' ? 'Monthly' : 'Yearly'} Totals
            </h3>
            <AggregationBarChart
              groupedData={groupedData}
              aggregationType={actualAggregationType}
              valence={dataset.valence}
            />
          </Card>

          {/* Distribution Histogram */}
          <Card className="p-4">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
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
              <h3 className="font-semibold mb-4 flex items-center gap-2">
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
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              {actualAggregationType === 'day' ? 'Daily' : actualAggregationType === 'week' ? 'Weekly' : actualAggregationType === 'month' ? 'Monthly' : 'Yearly'} Comparison
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
