import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { MonthChart } from '@/features/chart/MonthChart';
import YearChart from '@/features/chart/YearChart';
import { DailyGrid } from '@/features/day/DailyGrid';
import { DayCell } from '@/features/day/DayCell';
import type { Dataset } from '@/features/db/localdb';
import { useMonth, useMostRecentPopulatedEntryBefore, useSaveDay, useYear } from '@/features/db/useCalendarData';
import { MonthlyGrid } from '@/features/month/MonthlyGrid';
import { NumbersPanel } from '@/features/panel/NumbersPanel';
import { MonthSummary } from '@/features/stats/MonthSummary';
import WeekSummary from '@/features/stats/WeekSummary';
import { YearSummary } from '@/features/stats/YearSummary';
import { YearOverview } from '@/features/year/YearOverview';
import { getMonthDays, getPriorNumbersMap } from "@/lib/calendar";
import { formatDateAsKey } from '@/lib/friendly-date';
import type { StatsExtremes } from '@/lib/stats';
import { calculateDayStats, calculateMonthExtremes, calculateMonthStats, calculateYearExtremes } from '@/lib/stats';
import { BarChart as BarChartIcon, CalendarDays, Calendar as CalendarIcon, CalendarOff, ChevronLeft, ChevronRight, Grid3X3, LineChart as LineChartIcon } from 'lucide-react';
import { useMemo, useState } from 'react';

export function Calendar({ dataset }: { dataset: Dataset; }) {
  const today = new Date();
  
  const [view, setView] = useState<'daily' | 'monthly'>('daily');
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [chartMode, setChartMode] = useState<'serial' | 'cumulative'>(() => 'serial');
  const [monthChartGroup, setMonthChartGroup] = useState<'daily' | 'all'>(() => 'daily');
  const [chartGroup, setChartGroup] = useState<'daily' | 'monthly'>(() => 'monthly');
  const [showWeekends, setShowWeekends] = useState(true);
  const [panelProps, setPanelProps] = useState({
    isOpen: false,
    title: '',
    numbers: [] as number[],
    editableNumbers: false,
    showExpressionInput: false,
    actionLabel: undefined as string | undefined,
    actionOnClick: undefined as (() => void) | undefined,
    actionIcon: undefined as React.ReactNode | undefined,
    extremes: undefined as StatsExtremes | undefined,
  });

  // Use selectedDataset for all data hooks
  const { data: monthData = {} } = useMonth(dataset.id, year, month);
  const { data: yearData = {} } = useYear(dataset.id, year);
  const saveDayMutation = useSaveDay();

  const handleSaveDay = async (date: string, numbers: number[]) => {
    await saveDayMutation.mutateAsync({ datasetId: dataset.id, date: date as `${number}-${number}-${number}`, numbers });
  };

  const days = getMonthDays(year, month);
  const allNumbers = Object.values(monthData).flat();
  
  // Calculate extremes across all days for highlighting and dot scaling
  const dayStats = useMemo(() => calculateDayStats(monthData), [monthData]);
  const monthExtremes = useMemo(() => calculateMonthExtremes(dayStats), [dayStats]);

  // Calculate extremes across all months in the year for MonthSummary highlighting
  const yearExtremes = useMemo(() => {
    const monthStats = calculateMonthStats(yearData, year);
    return calculateYearExtremes(monthStats);
  }, [yearData, year]);

  // Week stats are rendered inline beneath the calendar using renderWeekFooter

  const monthNames = ["January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"];

  // Find the most recent populated entry before the first day of the current month
  const firstDayStr = days[0];
  const { data: mostRecentEntryBefore } = useMostRecentPopulatedEntryBefore(dataset.id, firstDayStr);
  // Precompute prior populated numbers map for all days in the month, seeded with the most recent entry before the period
  const priorDayNumbers = useMemo(() => {
    return getPriorNumbersMap(days, monthData, mostRecentEntryBefore?.numbers ?? []);
  }, [days, monthData, mostRecentEntryBefore]);

  return (
  <div className="min-h-screen">

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
                <span>Daily</span>
              </ToggleGroupItem>
              <ToggleGroupItem value="monthly" aria-label="Monthly View">
                <Grid3X3 className="h-4 w-4 mr-1" />
                <span>Monthly</span>
              </ToggleGroupItem>
            </ToggleGroup>
            
            {/* Today Button */}
            <Button 
              variant="outline"
              size="sm"
              onClick={() => { 
                setYear(today.getFullYear()); 
                setMonth(today.getMonth() + 1); 
              }}
              className="gap-1 h-8 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700"
            >
              <CalendarIcon className="h-3 w-3 text-slate-700 dark:text-blue-300" />
              <span className="text-slate-700 dark:text-blue-300">Today</span>
            </Button>
            
            {/* Date Navigation */}
            <div className="flex items-center gap-1">
              <Button 
                variant="outline" 
                size="icon"
                onClick={() => {
                  if (view === 'daily') {
                    if (month === 1) {
                      setYear(y => y - 1);
                      setMonth(12);
                    } else {
                      setMonth(m => m - 1);
                    }
                  } else {
                    setYear(y => y - 1);
                  }
                }}
                className="h-8 w-8 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                <ChevronLeft className="h-4 w-4 text-slate-700 dark:text-blue-300" />
              </Button>
              
              <Button 
                variant="outline" 
                size="icon"
                onClick={() => {
                  if (view === 'daily') {
                    if (month === 12) {
                      setYear(y => y + 1);
                      setMonth(1);
                    } else {
                      setMonth(m => m + 1);
                    }
                  } else {
                    setYear(y => y + 1);
                  }
                }}
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
                <span className="text-slate-700 dark:text-blue-300">{showWeekends ? "Hide weekends" : "Show weekends"}</span>
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
              data={yearData}
              currentMonth={month}
              onMonthClick={(selectedMonth) => setMonth(selectedMonth)}
              valence={dataset.valence}
            />

            {/* Calendar Grid */}
            <DailyGrid
              year={year}
              month={month}
              showWeekends={showWeekends}
              renderWeekFooter={(datesInWeek) => {
                // Compute numbers for the week from monthData
                const weekNumbers = datesInWeek.flatMap(d => {
                  const ds = formatDateAsKey(d, 'day');
                  return monthData[ds] || [];
                });
                if (weekNumbers.length === 0) return null; // Only render if any data exists
                // Calculate week number: weeks start on Sunday, so week 1 is the week containing the 1st of the month, week 2 starts on the first Sunday after the 1st, etc.
                const firstOfMonth = new Date(year, month - 1, 1);
                const firstDayOfWeek = firstOfMonth.getDay(); // 0=Sun, 1=Mon, ...
                const firstSunday = firstDayOfWeek === 0 ? 1 : 8 - firstDayOfWeek;
                const datesInCurrentMonth = datesInWeek.filter(d => d.getMonth() === month - 1);
                const minDate = datesInCurrentMonth.length > 0 ? Math.min(...datesInCurrentMonth.map(d => d.getDate())) : 1;
                let weekNumber;
                if (minDate < firstSunday) {
                  weekNumber = 1;
                } else {
                  weekNumber = 1 + Math.floor((minDate - firstSunday) / 7) + 1;
                }
                // Check if this week contains today
                const today = new Date();
                const isCurrentWeek = datesInWeek.some(d => 
                  d.getFullYear() === today.getFullYear() &&
                  d.getMonth() === today.getMonth() &&
                  d.getDate() === today.getDate()
                );
                const isSelectedWeek = panelProps.isOpen && panelProps.title === `Week ${weekNumber}`;
                const ringClasses = 'ring-2 ring-blue-400/80 ring-offset-2 ring-offset-white dark:ring-blue-300/70 dark:ring-offset-slate-900';
                return (
                  <div
                    onClick={() => {
                      setPanelProps({
                        isOpen: true,
                        title: `Week ${weekNumber}`,
                        numbers: weekNumbers,
                        editableNumbers: false,
                        showExpressionInput: false,
                        actionLabel: undefined,
                        actionOnClick: undefined,
                        actionIcon: undefined,
                        extremes: undefined,
                      });
                    }}
                    className={`cursor-pointer transition-shadow rounded-md ${isSelectedWeek ? ringClasses : ''}`}
                  >
                    <WeekSummary numbers={weekNumbers} weekNumber={weekNumber} isCurrentWeek={isCurrentWeek} valence={dataset.valence} tracking={dataset.tracking} />
                  </div>
                );
              }}
              renderDay={date => {
                const dateStr = formatDateAsKey(date, 'day');
                const dayNumbers = monthData[dateStr] || [];
                const priorNumbers = priorDayNumbers[dateStr] || [];
                return (
                  <DayCell
                    date={date}
                    numbers={dayNumbers}
                    onSave={nums => handleSaveDay(dateStr, nums)}
                    monthMin={monthExtremes?.lowestMin}
                    monthMax={monthExtremes?.highestMax}
                    monthExtremes={monthExtremes}
                    valence={dataset.valence}
                    priorNumbers={priorNumbers}
                    tracking={dataset.tracking}
                  />
                );
              }}
            />
            
            {/* Monthly Stats Section */}
            <div className="mt-8 mb-6">
              <div onClick={() => {
                setPanelProps({
                  isOpen: true,
                  title: `${monthNames[month - 1]}`,
                  numbers: allNumbers,
                  extremes: undefined,
                  editableNumbers: false,
                  showExpressionInput: false,
                  actionLabel: undefined,
                  actionOnClick: undefined,
                  actionIcon: undefined,
                });
              }} className="cursor-pointer">
              <MonthSummary 
                numbers={allNumbers} 
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
              <div className="rounded-lg bg-slate-50 dark:bg-slate-900/60 p-6 shadow-lg dark:shadow-xl hover:shadow-xl dark:hover:shadow-2xl transition-shadow">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex gap-2">
                    <ToggleGroup
                      type="single"
                      value={monthChartGroup}
                      onValueChange={(v: string | null) => {
                        if (v === 'daily' || v === 'all') setMonthChartGroup(v);
                      }}
                      size="sm"
                      variant="outline"
                      aria-label="Group Mode"
                    >
                      <ToggleGroupItem value="daily" aria-label="Daily"><span>Daily</span></ToggleGroupItem>
                      <ToggleGroupItem value="all" aria-label="All"><span>All</span></ToggleGroupItem>
                    </ToggleGroup>
                  </div>
                  <ToggleGroup
                    type="single"
                    value={chartMode}
                    onValueChange={(v: string | null) => {
                      if (!v) return;
                      setChartMode(v as 'serial' | 'cumulative');
                    }}
                    size="sm"
                    variant="outline"
                    aria-label="Chart Mode"
                  >
                      <ToggleGroupItem value="serial" aria-label="Serial">
                        <BarChartIcon className="size-4 mr-1" />
                        <span className="hidden sm:inline">Serial</span>
                    </ToggleGroupItem>
                      <ToggleGroupItem value="cumulative" aria-label="Cumulative">
                        <LineChartIcon className="size-4 mr-1" />
                        <span className="hidden sm:inline">Cumulative</span>
                    </ToggleGroupItem>
                  </ToggleGroup>
                </div>
                <MonthChart
                  days={days.map(date => ({ date, numbers: monthData[date] || [] }))}
                  mode={chartMode}
                  group={monthChartGroup}
                  valence={dataset.valence}
                />
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Monthly Grid */}
            <MonthlyGrid
              year={year}
              yearData={yearData}
              selectedPanelTitle={panelProps.isOpen ? panelProps.title : undefined}
              onMonthClick={(monthNumber, monthName, numbers, yearExtremes) => {
                setPanelProps({
                  isOpen: true,
                  title: `${monthName} '${String(year).slice(-2)}`,
                  numbers,
                  editableNumbers: false,
                  showExpressionInput: false,
                  actionLabel: 'Open daily view',
                  actionOnClick: () => {
                    setView('daily');
                    setYear(year);
                    setMonth(monthNumber);
                    setPanelProps(prev => ({ ...prev, isOpen: false }));
                  },
                  actionIcon: <CalendarDays className="h-4 w-4" />,
                  extremes: yearExtremes,
                });
              }}
              valence={dataset.valence}
              tracking={dataset.tracking}
            />

            {/* Year Summary */}
            <div className="mt-8 mb-6">
              <div onClick={() => {
                const allYearNumbers = Object.values(yearData).flat();
                setPanelProps({
                  isOpen: true,
                  title: `${year} Year Summary`,
                  numbers: allYearNumbers,
                  extremes: undefined,
                  editableNumbers: false,
                  showExpressionInput: false,
                  actionLabel: undefined,
                  actionOnClick: undefined,
                  actionIcon: undefined,
                });
              }} className="cursor-pointer">
                <YearSummary 
                  numbers={Object.values(yearData).flat()} 
                  yearName={`${year}`} 
                  isCurrentYear={year === today.getFullYear()}
                  valence={dataset.valence}
                  tracking={dataset.tracking}
                />
              </div>
            </div>

            {/* Year Chart Section */}
            <div className="space-y-4 mb-6">
              <div className="rounded-lg bg-slate-50 dark:bg-slate-900/60 p-6 shadow-lg dark:shadow-xl hover:shadow-xl dark:hover:shadow-2xl transition-shadow">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex gap-2">
                    <ToggleGroup
                      type="single"
                      value={chartGroup}
                      onValueChange={(v: string | null) => {
                        if (!v) return;
                        setChartGroup(v as 'daily' | 'monthly');
                      }}
                      size="sm"
                      variant="outline"
                      aria-label="Chart Group"
                    >
                      <ToggleGroupItem value="daily" aria-label="Daily">
                        <span>Daily</span>
                      </ToggleGroupItem>
                      <ToggleGroupItem value="monthly" aria-label="Monthly">
                        <span>Monthly</span>
                      </ToggleGroupItem>
                    </ToggleGroup>
                  </div>
                  <ToggleGroup
                    type="single"
                    value={chartMode}
                    onValueChange={(v: string | null) => {
                      if (!v) return;
                      setChartMode(v as 'serial' | 'cumulative');
                    }}
                    size="sm"
                    variant="outline"
                    aria-label="Chart Mode"
                  >
                    <ToggleGroupItem value="serial" aria-label="Serial">
                      <BarChartIcon className="size-4 mr-1" />
                      <span className="hidden sm:inline">Serial</span>
                    </ToggleGroupItem>
                    <ToggleGroupItem value="cumulative" aria-label="Cumulative">
                      <LineChartIcon className="size-4 mr-1" />
                      <span className="hidden sm:inline">Cumulative</span>
                    </ToggleGroupItem>
                  </ToggleGroup>
                </div>
                <YearChart
                  year={year}
                  yearData={yearData}
                  mode={chartMode}
                  group={chartGroup}
                  valence={dataset.valence}
                />
              </div>
            </div>
          </>
        )}
      </div>
      <NumbersPanel
        {...panelProps}
        valence={dataset.valence}
        tracking={dataset.tracking}
        onClose={() => setPanelProps(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}