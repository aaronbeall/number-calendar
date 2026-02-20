import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
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
import { AllYearsOverview } from '@/features/year/AllYearsOverview';
import { useAllPeriodsAggregateData } from '@/hooks/useAggregateData';
import { useSearchParamState } from '@/hooks/useSearchParamState';
import { getMonthDays } from "@/lib/calendar";
import { parseDateKey, parseMonthKey, toMonthKey, toYearKey } from '@/lib/friendly-date';
import type { CompletedAchievementResult } from '@/lib/goals';
import { buildPriorAggregateMap, createEmptyAggregate, type PeriodAggregateData } from '@/lib/period-aggregate';
import { type StatsExtremes } from '@/lib/stats';
import { arrayToRecord } from '@/lib/utils';
import { parseISO } from 'date-fns';
import { CalendarCheck2, CalendarDays, CalendarOff, ChevronDown, ChevronLeft, ChevronRight, Grid3X3 } from 'lucide-react';
import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { useSwipe } from '@/hooks/useSwipe';
import { useSidePanelParam } from '@/lib/search-params';
import { useCalendar } from '@/context/useCalendar';

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
    actionLabel?: string;
    actionOnClick?: () => void;
    actionIcon?: ReactNode;
    extremes?: StatsExtremes;
    daysData?: Record<DayKey, PeriodAggregateData<'day'>>;
    dateKey: DateKey;
  };

  const { mode, setMode, year, setYear, month, setMonth, setDate, goToToday, goToPrevious, goToNext } = useCalendar();
  const today = new Date();
  const [builderOpen, setBuilderOpen] = useSearchParamState('goal-builder', '');
  const [panelView, setPanelView] = useSidePanelParam();
  const [showYearOverview, setShowYearOverview] = useState(false);
  const [showYearsOverview, setShowYearsOverview] = useState(false);
  const builderTemplateId = typeof builderOpen === 'string' && builderOpen ? builderOpen : undefined;
  
  // Swipe/drag detection for calendar navigation
  const { handleSwipeStart, handleSwipeEnd, getAnimationStyle } = useSwipe({
    onSwipeLeft: goToNext,
    onSwipeRight: goToPrevious,
  });
  
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

    const panelViewKey = typeof panelView === 'number' ? String(panelView) : panelView;
    if (typeof panelViewKey !== 'string' || !panelViewKey) {
      return fallback;
    }

    if (Object.prototype.hasOwnProperty.call(monthDataByKey, panelViewKey)) {
      const monthKeyValue = panelViewKey as MonthKey;
      const { month: keyMonth, year: keyYear } = parseMonthKey(monthKeyValue);
      return {
        isOpen: true,
        title: `${monthNames[keyMonth - 1]}`,
        data: monthDataByKey[monthKeyValue],
        priorData: priorMonthDataByKey[monthKeyValue],
        actionLabel: 'Open daily view',
        actionOnClick: () => {
          setPanelView(null);
          setMode('daily');
          setDate(toMonthKey(keyYear, keyMonth));
        },
        actionIcon: <CalendarDays className="h-4 w-4" />,
        extremes: yearExtremes,
        daysData: buildMonthDaysDataForKey(monthKeyValue),
        dateKey: monthKeyValue,
      };
    }

    if (Object.prototype.hasOwnProperty.call(yearDataByKey, panelViewKey)) {
      const yearKeyValue = panelViewKey as YearKey;
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
  }, [buildMonthDaysDataForKey, buildYearDaysDataForKey, monthDataByKey, monthKey, monthNames, panelView, priorMonthDataByKey, setDate, setPanelView, setMode, yearDataByKey, yearExtremes]);

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

  // Selection state for MonthSummary and YearSummary
  const isMonthSummaryOpen = String(panelView) === monthKey;
  const isYearSummaryOpen = String(panelView) === yearKey;

  const handleMonthSummarySelect = useCallback(() => {
    setPanelView(monthKey);
  }, [monthKey, setPanelView]);

  const handleYearSummarySelect = useCallback(() => {
    setPanelView(yearKey);
  }, [yearKey, setPanelView]);

  // View mode handler
  const handleModeChange = useCallback((v: string | null) => {
    if (v === 'daily' || v === 'monthly') {
      setMode(v);
    }
  }, [setMode]);

  // Year/Month navigation handlers
  const handleYearOverviewMonthClick = useCallback((newMonth: number) => {
    setMonth(newMonth);
  }, [setMonth]);

  const handleYearOverviewYearChange = useCallback((newYear: number) => {
    setYear(newYear);
  }, [setYear]);

  const handleAllYearsOverviewYearClick = useCallback((selectedYear: number) => {
    setYear(selectedYear);
  }, [setYear]);

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
            {/* View Toggle and Controls */}
            <div className="flex items-center gap-4">
              {/* Left: Desktop - Toggle + Today | Mobile - Month + Chevron */}
              <div className="hidden sm:flex items-center gap-4">
                <ToggleGroup
                  type="single"
                  value={mode}
                  onValueChange={handleModeChange}
                  size="sm"
                >
                  <ToggleGroupItem value="daily" aria-label="Daily View">
                    <CalendarDays className="h-4 w-4 mr-1" />
                    <span>Daily</span>
                  </ToggleGroupItem>
                  <ToggleGroupItem value="monthly" aria-label="Monthly View">
                    <Grid3X3 className="h-4 w-4 mr-1" />
                    <span>Monthly</span>
                  </ToggleGroupItem>
                </ToggleGroup>
                
                <Button 
                  variant="outline"
                  size="sm"
                  onClick={goToToday}
                  className="gap-1 h-8 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 px-3"
                  title="Today"
                >
                  <CalendarCheck2 className="h-4 w-4 text-slate-700 dark:text-blue-300" />
                  <span>Today</span>
                </Button>
              </div>

              {/* Mobile: Month + Chevron on left */}
              <button
                onClick={() => mode === 'daily' ? setShowYearOverview(!showYearOverview) : setShowYearsOverview(!showYearsOverview)}
                className="sm:hidden flex items-center gap-2 font-semibold text-slate-700 dark:text-blue-200 transition-colors"
              >
                <span className="text-lg">
                  {mode === 'daily' ? `${monthNames[month - 1]}${year !== today.getFullYear() ? ` ${year}` : ''}` : `${year}`}
                </span>
                <ChevronDown className={`h-4 w-4 transition-transform ${mode === 'daily' && showYearOverview || mode === 'monthly' && showYearsOverview ? 'rotate-180' : ''}`} />
              </button>

              {/* Desktop: Navigation Buttons + Month/Year in center */}
              <div className="hidden sm:flex items-center gap-1">
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={goToPrevious}
                  className="h-8 w-8 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700"
                  title="Previous month"
                >
                  <ChevronLeft className="h-4 w-4 text-slate-700 dark:text-blue-300" />
                </Button>
                
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={goToNext}
                  className="h-8 w-8 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700"
                  title="Next month"
                >
                  <ChevronRight className="h-4 w-4 text-slate-700 dark:text-blue-300" />
                </Button>
              </div>

              {/* Desktop: Month/Year display */}
              <span className="hidden sm:inline font-semibold text-slate-700 dark:text-blue-200">
                {mode === 'daily' ? `${monthNames[month - 1]} ${year}` : `${year}`}
              </span>
              
              {/* Spacer */}
              <div className="flex-1" />
              
              {/* Right: Mobile - Today icon + Hide Weekends icon | Desktop - Hide Weekends text button */}
              <div className="flex items-center gap-1">
                {/* Mobile: Today icon only */}
                <Button 
                  variant="ghost"
                  size="icon"
                  onClick={goToToday}
                  className="sm:hidden h-8 w-8 text-slate-700 dark:text-slate-200"
                  title="Today"
                >
                  <CalendarCheck2 className="h-4 w-4 text-slate-700 dark:text-blue-300" />
                </Button>

                {/* Hide Weekends: Icon on mobile, text on desktop */}
                {mode === 'daily' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowWeekends(v => !v)}
                    aria-pressed={showWeekends}
                    title={showWeekends ? "Hide weekends" : "Show weekends"}
                    className="h-8 text-slate-700 dark:text-slate-200 p-1 sm:px-3"
                  >
                    <CalendarOff className={`h-4 w-4 ${showWeekends ? "text-slate-400 dark:text-slate-500" : "text-blue-500 dark:text-blue-300"}`} />
                    <span className="hidden sm:inline ml-1">{showWeekends ? "Hide weekends" : "Show weekends"}</span>
                  </Button>
                )}
              </div>
            </div>
          </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto p-4 space-y-6 overflow-hidden">
        {mode === 'daily' ? (
          <>
            {/* Year Overview - Always shown on large screens, collapsible on mobile */}
            <div className={`transition-all duration-300 overflow-hidden -mx-4 px-4 sm:mx-0 sm:px-0 ${showYearOverview ? 'max-h-96 sm:max-h-none' : 'max-h-0 sm:max-h-none'}`}>
              <YearOverview
                year={year}
                dayDataByKey={yearDayDataByKey}
                currentMonth={month}
                onMonthClick={handleYearOverviewMonthClick}
                onYearChange={handleYearOverviewYearChange}
                valence={dataset.valence}
                tracking={dataset.tracking}
              />
            </div>

            {/* Calendar Grid with Swipe Support */}
            <div 
              onTouchStart={handleSwipeStart}
              onTouchEnd={handleSwipeEnd}
              style={getAnimationStyle()}
            >
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
            </div>
            
            {/* Monthly Stats Section */}
            <div className="mt-8 mb-6">
              <MonthSummary 
                data={monthAggregate}
                monthName={monthNames[month - 1]} 
                isCurrentMonth={year === today.getFullYear() && month === today.getMonth() + 1}
                yearExtremes={yearExtremes}
                valence={dataset.valence}
                tracking={dataset.tracking}
                isPanelOpen={isMonthSummaryOpen}
                onSelect={handleMonthSummarySelect}
              />
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
            {/* All Years Overview - Collapsible on mobile */}
            <div className={`transition-all duration-300 overflow-hidden -mx-4 px-4 sm:mx-0 sm:px-0 ${showYearsOverview ? 'max-h-96 sm:max-h-none' : 'max-h-0 sm:max-h-none'}`}>
              <AllYearsOverview
                monthDataByKey={monthDataByKey}
                currentYear={year}
                onYearClick={handleAllYearsOverviewYearClick}
                valence={dataset.valence}
                tracking={dataset.tracking}
              />
            </div>

            {/* Monthly Grid with Swipe Support */}
            <div 
              onTouchStart={handleSwipeStart}
              onTouchEnd={handleSwipeEnd}
              style={getAnimationStyle()}
            >
              <MonthlyGrid
                year={year}
                dayDataByKey={yearDayDataByKey}
                priorDayByKey={priorDayDataByKey}
                monthDataByKey={monthDataByKey}
                priorMonthByKey={priorMonthDataByKey}
                yearExtremes={yearExtremes}
                valence={dataset.valence}
                tracking={dataset.tracking}
              />
            </div>

            {/* Year Summary */}
            <div className="mt-8 mb-6">
              <YearSummary 
                data={yearAggregate}
                yearName={`${year}`} 
                isCurrentYear={year === today.getFullYear()}
                valence={dataset.valence}
                tracking={dataset.tracking}
                isPanelOpen={isYearSummaryOpen}
                onSelect={handleYearSummarySelect}
              />
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