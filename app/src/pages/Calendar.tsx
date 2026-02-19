import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useCalendarContext } from '@/context/CalendarContext';
import { GoalBuilderDialog } from '@/features/achievements/GoalBuilderDialog';
import { MonthChart } from '@/features/chart/MonthChart';
import { TrendChart } from '@/features/chart/TrendChart';
import YearChart from '@/features/chart/YearChart';
import { DailyGrid } from '@/features/day/DailyGrid';
import type { Dataset, DateKey, DayKey, MonthKey, TimePeriod, YearKey } from '@/features/db/localdb';
import { useSaveDay } from '@/features/db/useDayEntryData';
import { MonthlyGrid } from '@/features/month/MonthlyGrid';
import { NumbersPanel } from '@/features/panel/NumbersPanel';
import { MonthSummary } from '@/features/stats/MonthSummary';
import { YearSummary } from '@/features/stats/YearSummary';
import { YearOverview } from '@/features/year/YearOverview';
import { useAllPeriodsAggregateData } from '@/hooks/useAggregateData';
import { useSearchParamState } from '@/hooks/useSearchParamState';
import { getMonthDays } from "@/lib/calendar";
import { parseDateKey, parseMonthKey, toMonthKey, toYearKey } from '@/lib/friendly-date';
import type { CompletedAchievementResult } from '@/lib/goals';
import { buildPriorAggregateMap, createEmptyAggregate, type PeriodAggregateData } from '@/lib/period-aggregate';
import { type StatsExtremes } from '@/lib/stats';
import { arrayToRecord } from '@/lib/utils';
import { parseISO } from 'date-fns';
import { CalendarCheck2, CalendarDays, CalendarOff, ChevronLeft, ChevronRight, Grid3X3 } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';

export function Calendar({
  dataset,
  achievementResultsByDateKey,
}: {
  dataset: Dataset;
  achievementResultsByDateKey: Record<DateKey, CompletedAchievementResult[]>;
}) {
  type PanelProps = {
    isOpen: boolean;
    title: string;
    data: PeriodAggregateData<TimePeriod>;
    priorData?: PeriodAggregateData<TimePeriod>;
    extremes?: StatsExtremes;
    daysData?: Record<DayKey, PeriodAggregateData<'day'>>;
    dateKey: DateKey;
  };

  const { view, setView, year, setYear, month, setMonth, goToToday, goToPrevious, goToNext } = useCalendarContext();
  const today = new Date();
  const [builderOpen, setBuilderOpen] = useSearchParamState('goal-builder', '');
  const [panelView, setPanelView] = useSearchParamState<string>('view', null);
  const builderTemplateId = typeof builderOpen === 'string' && builderOpen ? builderOpen : undefined;
  
  // Chart state moved into MonthChart and YearChart components
  const [showWeekends, setShowWeekends] = useState(true);

  const { days, weeks, months, years } = useAllPeriodsAggregateData();
  const saveDayMutation = useSaveDay();

  const handleSaveDay = async (date: string, numbers: number[]) => {
    await saveDayMutation.mutateAsync({ datasetId: dataset.id, date: date as `${number}-${number}-${number}`, numbers });
  };

  // All days data key
  const dayDataByKey = useMemo(() => arrayToRecord(days, (day) => day.dateKey), [days]);
  const priorDayDataByKey = useMemo(() => buildPriorAggregateMap(days), [days]);

  // Data for all days in the selected month
  const monthDayKeys = useMemo(() => getMonthDays(year, month), [year, month]);
  const monthDays = useMemo(() => {
    return monthDayKeys.map((dayKey) => ({
      date: parseISO(dayKey),
      data: dayDataByKey[dayKey] ?? createEmptyAggregate(dayKey, 'day'),
      priorData: priorDayDataByKey[dayKey],
    }));
  }, [monthDayKeys, dayDataByKey, priorDayDataByKey]);

  // Aggregate data for weeks, months, years
  const monthDataByKey = useMemo(() => arrayToRecord(months, (item) => item.dateKey), [months]);
  const priorMonthDataByKey = useMemo(() => buildPriorAggregateMap(months), [months]);
  const weekDataByKey = useMemo(() => arrayToRecord(weeks, (item) => item.dateKey), [weeks]);
  const priorWeekDataByKey = useMemo(() => buildPriorAggregateMap(weeks), [weeks]);
  const yearDataByKey = useMemo(() => arrayToRecord(years, (item) => item.dateKey), [years]);

  // Current month and year aggregate data for summary panels and charts
  const monthKey = toMonthKey(year, month);
  const monthAggregate = monthDataByKey[monthKey] ?? createEmptyAggregate(monthKey, 'month');
  const yearKey = toYearKey(year);
  const yearAggregate = yearDataByKey[yearKey] ?? createEmptyAggregate(yearKey, 'year');
  const monthExtremes = monthAggregate.extremes;
  const yearExtremes = yearAggregate.extremes;

  const monthNames = ["January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"];

  const buildMonthDaysDataForKey = useCallback((monthKeyValue: MonthKey) => {
    const { year: keyYear, month: keyMonth } = parseMonthKey(monthKeyValue);
    const dayKeys = getMonthDays(keyYear, keyMonth);
    return dayKeys.reduce((acc, dayKey) => {
      acc[dayKey] = dayDataByKey[dayKey] ?? createEmptyAggregate(dayKey, 'day');
      return acc;
    }, {} as Record<DayKey, PeriodAggregateData<'day'>>);
  }, [dayDataByKey]);

  const buildYearDaysDataForKey = useCallback((yearKeyValue: YearKey) => {
    const yearPrefix = `${parseDateKey(yearKeyValue).getFullYear()}-`;
    return Object.entries(dayDataByKey).reduce((acc, [dayKey, dayData]) => {
      if (dayKey.startsWith(yearPrefix)) {
        acc[dayKey as DayKey] = dayData;
      }
      return acc;
    }, {} as Record<DayKey, PeriodAggregateData<'day'>>);
  }, [dayDataByKey]);

  const panelProps = useMemo<PanelProps>(() => {
    const fallback: PanelProps = {
      isOpen: false,
      title: '',
      data: createEmptyAggregate(monthKey, 'month'),
      priorData: undefined,
      extremes: undefined,
      daysData: undefined,
      dateKey: monthKey,
    };

    if (typeof panelView !== 'string' || !panelView) {
      return fallback;
    }

    if (Object.prototype.hasOwnProperty.call(monthDataByKey, panelView)) {
      const monthKeyValue = panelView as MonthKey;
      const { month: keyMonth } = parseMonthKey(monthKeyValue);
      return {
        isOpen: true,
        title: `${monthNames[keyMonth - 1]}`,
        data: monthDataByKey[monthKeyValue],
        priorData: priorMonthDataByKey[monthKeyValue],
        extremes: yearExtremes,
        daysData: buildMonthDaysDataForKey(monthKeyValue),
        dateKey: monthKeyValue,
      };
    }

    if (Object.prototype.hasOwnProperty.call(yearDataByKey, panelView)) {
      const yearKeyValue = panelView as YearKey;
      return {
        isOpen: true,
        title: `${parseDateKey(yearKeyValue).getFullYear()} Year Summary`,
        data: yearDataByKey[yearKeyValue],
        extremes: undefined,
        priorData: undefined,
        daysData: buildYearDaysDataForKey(yearKeyValue),
        dateKey: yearKeyValue,
      };
    }

    return fallback;
  }, [buildMonthDaysDataForKey, buildYearDaysDataForKey, monthDataByKey, monthKey, monthNames, panelView, priorMonthDataByKey, yearDataByKey, yearExtremes]);

  // Precompute year-level data maps for quick access in YearOverview and MonthlyGrid
  const yearDayDataByKey = useMemo(
    () => arrayToRecord(
      days.filter((day) => day.dateKey.startsWith(`${year}-`)),
      (day) => day.dateKey
    ),
    [days, year]
  );

  // For year view trend chart: { [dayKey]: numbers[] }
  const yearNumbersByDay = useMemo(
    () => arrayToRecord(
      days.filter((day) => day.dateKey.startsWith(`${year}-`)),
      (day) => day.dateKey,
      (day) => day.numbers
    ),
    [days, year]
  );

  const monthChartDays = useMemo(
    () => monthDays.map((day) => ({ date: day.data.dateKey, numbers: day.data.numbers })),
    [monthDays]
  );

  const monthNumbersByDay = useMemo(
    () => arrayToRecord(
      monthDays,
      (day) => day.data.dateKey,
      (day) => day.data.numbers
    ),
    [monthDays]
  );

  const getAchievementsForDateKey = useCallback(
    (key: DateKey) => achievementResultsByDateKey[key] ?? [],
    [achievementResultsByDateKey]
  );

  return (
    <div className="min-h-screen">
      <GoalBuilderDialog
        key={`builder-${builderOpen}`}
        open={!!builderOpen}
        onOpenChange={(open) => setBuilderOpen(open)}
        dataset={dataset}
        templateId={builderTemplateId}
      />

          {/* Navigation Header */}
          <nav className="sticky top-0 z-40 bg-gradient-to-r from-slate-100 to-slate-50 dark:from-slate-800 dark:to-slate-700 border-b border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="max-w-4xl mx-auto px-4 py-3">
              <div className="flex items-center gap-4">
            {/* View Toggle */}
            <ToggleGroup
              type="single"
              value={view}
              onValueChange={(v: string | null) => {
                if (v === 'daily' || v === 'monthly') {
                  setView(v);
                }
              }}
              size="sm"
            >
              <ToggleGroupItem value="daily" aria-label="Daily View">
                <CalendarDays className="h-4 w-4 mr-1" />
                <span className="hidden sm:inline">Daily</span>
              </ToggleGroupItem>
              <ToggleGroupItem value="monthly" aria-label="Monthly View">
                <Grid3X3 className="h-4 w-4 mr-1" />
                <span className="hidden sm:inline">Monthly</span>
              </ToggleGroupItem>
            </ToggleGroup>
            
            {/* Today Button */}
            <Button 
              variant="outline"
              size="sm"
              onClick={goToToday}
              className="gap-1 h-8 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700"
            >
              <CalendarCheck2 className="h-3 w-3 text-slate-700 dark:text-blue-300" />
              <span className="text-slate-700 dark:text-blue-300 hidden sm:inline">Today</span>
            </Button>
            
            {/* Date Navigation */}
            <div className="flex items-center gap-1">
              <Button 
                variant="outline" 
                size="icon"
                onClick={goToPrevious}
                className="h-8 w-8 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                <ChevronLeft className="h-4 w-4 text-slate-700 dark:text-blue-300" />
              </Button>
              
              <Button 
                variant="outline" 
                size="icon"
                onClick={goToNext}
                className="h-8 w-8 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                <ChevronRight className="h-4 w-4 text-slate-700 dark:text-blue-300" />
              </Button>
            </div>
            
            {/* Current Month/Year */}
            <div className="text-lg font-semibold text-slate-700">
              <span className="text-slate-700 dark:text-blue-200">
                {view === 'daily' ? `${monthNames[month - 1]} ${year}` : `${year}`}
              </span>
            </div>
            
            {/* Weekend Toggle (Daily view only) */}
            {view === 'daily' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowWeekends(v => !v)}
                aria-pressed={showWeekends}
                title={showWeekends ? "Hide weekends" : "Show weekends"}
                className="gap-1 h-8 text-slate-700 dark:text-slate-200"
              >
                <CalendarOff className={`h-4 w-4 ${showWeekends ? "text-slate-400 dark:text-slate-500" : "text-blue-500 dark:text-blue-300"}`} />
                <span className="text-slate-700 dark:text-blue-300 hidden sm:inline">{showWeekends ? "Hide weekends" : "Show weekends"}</span>
              </Button>
            )}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto p-4 space-y-6">
        {view === 'daily' ? (
          <>
            {/* Year Overview */}
            <YearOverview
              year={year}
              dayDataByKey={yearDayDataByKey}
              currentMonth={month}
              onMonthClick={setMonth}
              valence={dataset.valence}
              tracking={dataset.tracking}
            />

            {/* Calendar Grid */}
            <DailyGrid
              year={year}
              month={month}
              showWeekends={showWeekends}
              monthDays={monthDays}
              weekDataByKey={weekDataByKey}
              priorWeekByKey={priorWeekDataByKey}
              valence={dataset.valence}
              tracking={dataset.tracking}
              monthExtremes={monthExtremes}
              achievementResultsByDateKey={achievementResultsByDateKey}
              onSaveDay={handleSaveDay}
            />
            
            {/* Monthly Stats Section */}
            <div className="mt-8 mb-6">
              <div onClick={() => {
                const dateKey = toMonthKey(year, month);
                setPanelView(dateKey);
              }} className="cursor-pointer">
              <MonthSummary 
                data={monthAggregate}
                monthName={monthNames[month - 1]} 
                isCurrentMonth={year === today.getFullYear() && month === today.getMonth() + 1}
                yearExtremes={yearExtremes}
                valence={dataset.valence}
                tracking={dataset.tracking}
              />
              </div>
            </div>

            {/* Chart Section */}
            <div className="space-y-4">
              {dataset.tracking === 'trend' ? (
                <TrendChart
                  year={year}
                  month={month}
                  data={monthNumbersByDay}
                  valence={dataset.valence}
                  priorDay={monthDays[0]?.priorData?.numbers}
                />
              ) : (
                <MonthChart
                  days={monthChartDays}
                  valence={dataset.valence}
                />
              )}
            </div>
          </>
        ) : (
          <>
            {/* Monthly Grid */}
            <MonthlyGrid
              year={year}
              dayDataByKey={yearDayDataByKey}
              priorDayByKey={priorDayDataByKey}
              monthDataByKey={monthDataByKey}
              priorMonthByKey={priorMonthDataByKey}
              yearExtremes={yearExtremes}
              onOpenMonth={(monthNumber) => {
                setView('daily');
                setYear(year);
                setMonth(monthNumber);
              }}
              valence={dataset.valence}
              tracking={dataset.tracking}
              achievementResultsByDateKey={achievementResultsByDateKey}
            />

            {/* Year Summary */}
            <div className="mt-8 mb-6">
              <div onClick={() => {
                const dateKey = toYearKey(year);
                setPanelView(dateKey);
              }} className="cursor-pointer">
                <YearSummary 
                  data={yearAggregate}
                  yearName={`${year}`} 
                  isCurrentYear={year === today.getFullYear()}
                  valence={dataset.valence}
                  tracking={dataset.tracking}
                />
              </div>
            </div>

            {/* Year Chart Section */}
            <div className="space-y-4 mb-6">
              {dataset.tracking === 'trend' ? (
                <TrendChart
                  year={year}
                  data={yearNumbersByDay}
                  valence={dataset.valence}
                  // Todo: prior day for year view?
                />
              ) : (
                <YearChart
                  year={year}
                  yearData={yearNumbersByDay}
                  valence={dataset.valence}
                />
              )}
            </div>
          </>
        )}
      </div>
      <NumbersPanel
        {...panelProps}
        valence={dataset.valence}
        tracking={dataset.tracking}
        achievementResults={getAchievementsForDateKey(panelProps.dateKey)}
        onClose={() => {
          setPanelView(null);
        }}
      />
    </div>
  );
}