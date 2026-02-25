import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useDatasetContext } from '@/context/DatasetContext';
import { useAllDays } from '@/features/db/useDayEntryData';
import type { DayKey } from '@/features/db/localdb';
import { useSearchParamState } from '@/hooks/useSearchParamState';
import { formatFriendlyDate, toMonthKey, toYearKey, dateToDayKey, parseDateKeyToParts, parseDateKey } from '@/lib/friendly-date';
import { formatValue } from '@/lib/friendly-numbers';
import { calculateExtremes, computeNumberStats, computePeriodDerivedStats } from '@/lib/stats';
import { useMemo, useState } from 'react';
import { subDays, startOfYear } from 'date-fns';
import { Calendar, TrendingUp, BarChart3, Zap, LineChart, PieChart, Activity, CalendarDays, CalendarRange, CalendarClock } from 'lucide-react';
import { TrendAnalysisChart } from '@/features/analysis/TrendAnalysisChart';
import { AggregationBarChart } from '@/features/analysis/AggregationBarChart';
import { ValenceDistributionChart } from '@/features/analysis/ValenceDistributionChart';
import { DistributionHistogram } from '@/features/analysis/DistributionHistogram';
import { PeriodComparisonChart } from '@/features/analysis/PeriodComparisonChart';
import { StatsSummary } from '@/features/analysis/StatsSummary';

type AggregationType = 'day' | 'week' | 'month' | 'year' | 'none';
type PresetRange = 'all' | 'last7' | 'last30' | 'last90' | 'ytd' | 'custom';

export function Analysis() {
  const { dataset } = useDatasetContext();
  const { data: allDays = [] } = useAllDays(dataset.id);

  const [aggregationType, setAggregationType] = useSearchParamState<AggregationType>('agg', 'month');
  const actualAggregationType = (typeof aggregationType === 'string' ? aggregationType : 'month') as AggregationType;
  const [presetRange, setPresetRange] = useState<PresetRange>('last30');
  const [customStart, setCustomStart] = useState<DayKey | ''>('');
  const [customEnd, setCustomEnd] = useState<DayKey | ''>('');

  // Determine active start/end dates
  const today = new Date();
  const {
    startDate: activeStartDate,
    endDate: activeEndDate,
  } = useMemo(() => {
    if (presetRange === 'custom' && customStart && customEnd) {
      return {
        startDate: parseDateKey(customStart),
        endDate: parseDateKey(customEnd),
      };
    }

    const end = today;
    let start = today;

    if (presetRange === 'all') {
      // Get the earliest date from allDays
      if (allDays.length > 0) {
        const sortedDays = [...allDays].sort((a, b) => a.date.localeCompare(b.date));
        start = parseDateKey(sortedDays[0]!.date);
      } else {
        start = end;
      }
    } else if (presetRange === 'last7') {
      start = subDays(end, 7);
    } else if (presetRange === 'last30') {
      start = subDays(end, 30);
    } else if (presetRange === 'last90') {
      start = subDays(end, 90);
    } else if (presetRange === 'ytd') {
      start = startOfYear(end);
    }

    return { startDate: start, endDate: end };
  }, [presetRange, customStart, customEnd, today, allDays]);

  const startDateKey = dateToDayKey(activeStartDate);
  const endDateKey = dateToDayKey(activeEndDate);

  // Filter days in the selected range
  const daysInRange = useMemo(() => {
    return allDays.filter(
      day => day.date >= startDateKey && day.date <= endDateKey
    );
  }, [allDays, startDateKey, endDateKey]);

  // Get aggregated data for the range
  const aggregatedStats = useMemo(() => {
    const numbers = daysInRange.flatMap(day => day.numbers);
    if (numbers.length === 0) {
      return {
        dataPoints: [],
        min: null,
        max: null,
        avg: null,
        median: null,
        count: 0,
      };
    }

    numbers.sort((a, b) => a - b);
    const min = numbers[0];
    const max = numbers[numbers.length - 1];
    const avg = numbers.reduce((a, b) => a + b, 0) / numbers.length;
    const median =
      numbers.length % 2 === 0
        ? (numbers[numbers.length / 2 - 1] + numbers[numbers.length / 2]) / 2
        : numbers[Math.floor(numbers.length / 2)];

    return {
      dataPoints: numbers,
      min,
      max,
      avg,
      median,
      count: numbers.length,
    };
  }, [daysInRange]);

  // Compute stats extremes for this range
  const dailyExtremesData = useMemo(() => {
    const stats = daysInRange
      .map(day => computeNumberStats(day.numbers))
      .filter((s): s is typeof s & {} => s !== null);
    return calculateExtremes(stats) || undefined;
  }, [daysInRange]);

  // Compute cumulatives for series tracking
  const cumulativesData = useMemo(() => {
    if (dataset.tracking !== 'series') return undefined;
    const derived = computePeriodDerivedStats(aggregatedStats.dataPoints, null, null);
    return derived.cumulatives;
  }, [aggregatedStats.dataPoints, dataset.tracking]);

  // Group days by aggregation type
  const groupedData = useMemo(() => {
    const groups: Record<string, typeof daysInRange> = {};

    daysInRange.forEach(day => {
      let groupKey = '';
      if (actualAggregationType === 'day') {
        groupKey = day.date;
      } else if (actualAggregationType === 'week') {
        const date = parseDateKey(day.date);
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay()); // Sunday start
        groupKey = dateToDayKey(weekStart);
      } else if (actualAggregationType === 'month') {
        const parsed = parseDateKeyToParts(day.date);
        groupKey = toMonthKey(parsed.year, parsed.month!);
      } else if (actualAggregationType === 'year') {
        const parsed = parseDateKeyToParts(day.date);
        groupKey = toYearKey(parsed.year);
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

  if (!dataset || allDays.length === 0) {
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
            <div className="space-y-1.5">  
              <Button
                variant={presetRange === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setPresetRange('all')}
                className="w-full justify-start text-xs h-8"
              >
                All Time
              </Button>
              <Button
                variant={presetRange === 'last7' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setPresetRange('last7')}
                className="w-full justify-start text-xs h-8"
              >
                Last 7 days
              </Button>
              <Button
                variant={presetRange === 'last30' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setPresetRange('last30')}
                className="w-full justify-start text-xs h-8"
              >
                Last 30 days
              </Button>
              <Button
                variant={presetRange === 'last90' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setPresetRange('last90')}
                className="w-full justify-start text-xs h-8"
              >
                Last 90 days
              </Button>
              <Button
                variant={presetRange === 'ytd' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setPresetRange('ytd')}
                className="w-full justify-start text-xs h-8"
              >
                Year to date
              </Button>
              <Button
                variant={presetRange === 'custom' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setPresetRange('custom')}
                className="w-full justify-start text-xs h-8"
              >
                Custom
              </Button>
            </div>
          </div>

          {presetRange === 'custom' && (
            <div className="space-y-2 pb-3 border-b">
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400">Start Date</label>
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value as DayKey)}
                className="w-full px-2 py-1.5 text-xs border rounded bg-white dark:bg-slate-800"
              />
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400">End Date</label>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value as DayKey)}
                className="w-full px-2 py-1.5 text-xs border rounded bg-white dark:bg-slate-800"
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
                    onClick={() => setAggregationType(option.value as AggregationType)}
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
                <span className="text-slate-600 dark:text-slate-400">Days Tracked</span>
                <span className="font-semibold text-slate-900 dark:text-white">{formatValue(daysInRange.length)}</span>
              </div>
              <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-800/50 px-2 py-1.5 rounded">
                <span className="text-slate-600 dark:text-slate-400">Data Points</span>
                <span className="font-semibold text-slate-900 dark:text-white">{formatValue(daysInRange.flatMap(d => d.numbers).length)}</span>
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 px-2 py-1.5 rounded mt-2">
                <div className="font-semibold text-slate-600 dark:text-slate-300 mb-1">Range</div>
                <div>{formatFriendlyDate(dateToDayKey(activeStartDate), dateToDayKey(activeEndDate))}</div>
              </div>
            </div>
          </div>
        </Card>

        {/* Charts Grid */}
        <div className="lg:col-span-3 space-y-4">
          {/* Summary Stats */}
          <StatsSummary
            stats={aggregatedStats}
            valence={dataset.valence}
            tracking={dataset.tracking}
            datasetId={dataset.id}
            extremes={dailyExtremesData}
            cumulatives={cumulativesData}
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
              numbers={aggregatedStats.dataPoints}
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
                numbers={aggregatedStats.dataPoints}
                valence={dataset.valence}
              />
            </Card>
          )}

          {/* Period Comparison */}
          {actualAggregationType !== 'none' && (
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
          )}
        </div>
      </div>
    </div>
  );
}

export default Analysis;
