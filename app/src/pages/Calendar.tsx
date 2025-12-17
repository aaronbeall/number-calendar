import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { MonthChart } from '@/features/chart/MonthChart';
import { TrendChart } from '@/features/chart/TrendChart';
import YearChart from '@/features/chart/YearChart';
import { DailyGrid } from '@/features/day/DailyGrid';
import type { Dataset, DayKey } from '@/features/db/localdb';
import { useMonth, useMostRecentPopulatedMonthBefore, useSaveDay, useYear } from '@/features/db/useCalendarData';
import { MonthlyGrid } from '@/features/month/MonthlyGrid';
import { NumbersPanel } from '@/features/panel/NumbersPanel';
import { MonthSummary } from '@/features/stats/MonthSummary';
import { YearSummary } from '@/features/stats/YearSummary';
import { YearOverview } from '@/features/year/YearOverview';
import { getMonthDays, getPriorMonthNumbersMap, getPriorYearMonthNumbersMap } from "@/lib/calendar";
import { toDayKey, toMonthKey } from '@/lib/friendly-date';
import { calculateDailyExtremes, calculateMonthlyExtremes, type StatsExtremes } from '@/lib/stats';
import { useCalendarContext } from '@/context/CalendarContext';
import { CalendarCheck2, CalendarDays, Calendar as CalendarIcon, CalendarOff, ChevronLeft, ChevronRight, Grid3X3 } from 'lucide-react';
import { useMemo, useState } from 'react';

export function Calendar({ dataset }: { dataset: Dataset; }) {
  const { view, setView, year, setYear, month, setMonth, goToToday, goToPrevious, goToNext } = useCalendarContext();
  const today = new Date();
  
  // Chart state moved into MonthChart and YearChart components
  const [showWeekends, setShowWeekends] = useState(true);
  const [panelProps, setPanelProps] = useState({
    isOpen: false,
    title: '',
    numbers: [] as number[],
    priorNumbers: undefined as number[] | undefined,
    extremes: undefined as StatsExtremes | undefined,
    daysData: undefined as Record<DayKey, number[]> | undefined,
  });

  // Use selectedDataset for all data hooks
  const { data: monthData = {} } = useMonth(dataset.id, year, month);
  const { data: yearData = {} } = useYear(dataset.id, year);
  const saveDayMutation = useSaveDay();

  const handleSaveDay = async (date: string, numbers: number[]) => {
    await saveDayMutation.mutateAsync({ datasetId: dataset.id, date: date as `${number}-${number}-${number}`, numbers });
  };

  const daysOfMonth = getMonthDays(year, month);
  const monthNumbers = Object.values(monthData).flat();
  
  // Calculate extremes across all days for highlighting and dot scaling
  const monthExtremes = useMemo(() => {
    return calculateDailyExtremes(monthData);
  }, [monthData]);

  // Calculate extremes across all months in the year for MonthSummary highlighting
  const yearExtremes = useMemo(() => {
    return calculateMonthlyExtremes(yearData);
  }, [yearData]);

  const monthNames = ["January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"];

  // Get prior month numbers map for daily view
  const firstDayOfMonthStr = view === 'daily' ? daysOfMonth[0] : '' as DayKey;
  const { data: priorMonthData } = useMostRecentPopulatedMonthBefore(dataset.id, firstDayOfMonthStr);
  const priorMonthNumbersMap = useMemo(() => {
    return view === 'daily' ? getPriorMonthNumbersMap(daysOfMonth, monthData, priorMonthData) : {};
  }, [daysOfMonth, monthData, priorMonthData, view]);

  // Get prior year month numbers map for monthly view
  const firstDayOfYearStr = view === 'monthly' ? toDayKey(year, 1, 1) : '' as DayKey;
  const { data: priorYearMonthData } = useMostRecentPopulatedMonthBefore(dataset.id, firstDayOfYearStr);
  const priorYearMonthNumbersMap = useMemo(() => {
    return view === 'monthly' ? getPriorYearMonthNumbersMap(year, yearData, priorYearMonthData) : {};
  }, [year, yearData, priorYearMonthData, view]);

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
              data={yearData}
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
              monthData={monthData}
              priorNumbersMap={priorMonthNumbersMap}
              valence={dataset.valence}
              tracking={dataset.tracking}
              monthExtremes={monthExtremes}
              onSaveDay={handleSaveDay}
            />
            
            {/* Monthly Stats Section */}
            <div className="mt-8 mb-6">
              <div onClick={() => {
                setPanelProps({
                  isOpen: true,
                  title: `${monthNames[month - 1]}`,
                  numbers: monthNumbers,
                  priorNumbers: priorMonthNumbersMap[toMonthKey(year, month)],
                  extremes: yearExtremes,
                  daysData: monthData,
                });
              }} className="cursor-pointer">
              <MonthSummary 
                numbers={monthNumbers} 
                priorNumbers={priorMonthNumbersMap[toMonthKey(year, month)]}
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
                  data={monthData}
                  valence={dataset.valence}
                  priorDay={priorMonthNumbersMap[daysOfMonth[0]]}
                />
              ) : (
                <MonthChart
                  days={daysOfMonth.map(date => ({ date, numbers: monthData[date] || [] }))}
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
              yearData={yearData}
              yearExtremes={yearExtremes}
              onOpenMonth={(monthNumber) => {
                setView('daily');
                setYear(year);
                setMonth(monthNumber);
              }}
              valence={dataset.valence}
              tracking={dataset.tracking}
              priorNumbersMap={priorYearMonthNumbersMap}
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
                  priorNumbers: undefined,
                  daysData: yearData
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
              {dataset.tracking === 'trend' ? (
                <TrendChart
                  year={year}
                  data={yearData}
                  valence={dataset.valence}
                  // Todo: prior day for year view?
                />
              ) : (
                <YearChart
                  year={year}
                  yearData={yearData}
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
        onClose={() => setPanelProps(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}