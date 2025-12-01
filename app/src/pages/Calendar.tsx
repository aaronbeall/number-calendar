import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { MonthChart } from '@/features/chart/MonthChart';
import YearChart from '@/features/chart/YearChart';
import { DailyGrid } from '@/features/day/DailyGrid';
import type { Dataset } from '@/features/db/localdb';
import { useMonth, useMostRecentPopulatedMonthBefore, useSaveDay, useYear } from '@/features/db/useCalendarData';
import { MonthlyGrid } from '@/features/month/MonthlyGrid';
import { NumbersPanel } from '@/features/panel/NumbersPanel';
import { MonthSummary } from '@/features/stats/MonthSummary';
import { YearSummary } from '@/features/stats/YearSummary';
import { YearOverview } from '@/features/year/YearOverview';
import { getMonthDays, getPriorNumbersMap } from "@/lib/calendar";
import { toMonthKey } from '@/lib/friendly-date';
import { calculateDailyStats, calculateMonthExtremes, calculateMonthlyStats, calculateYearExtremes, type StatsExtremes } from '@/lib/stats';
import { CalendarDays, Calendar as CalendarIcon, CalendarOff, ChevronLeft, ChevronRight, Grid3X3 } from 'lucide-react';
import { useMemo, useState } from 'react';

export function Calendar({ dataset }: { dataset: Dataset; }) {
  const today = new Date();
  
  const [view, setView] = useState<'daily' | 'monthly'>('daily');
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  // Chart state moved into MonthChart and YearChart components
  const [showWeekends, setShowWeekends] = useState(true);
  const [panelProps, setPanelProps] = useState({
    isOpen: false,
    title: '',
    numbers: [] as number[],
    priorNumbers: undefined as number[] | undefined,
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
  const monthExtremes = useMemo(() => {
    const dailyStats = calculateDailyStats(monthData);
    return calculateMonthExtremes(dailyStats);
  }, [monthData]);

  // Calculate extremes across all months in the year for MonthSummary highlighting
  const yearExtremes = useMemo(() => {
    const monthlyStats = calculateMonthlyStats(yearData, year);
    return calculateYearExtremes(monthlyStats);
  }, [yearData, year]);

  const monthNames = ["January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"];

  // Find the most recent populated entry before the first day of the current month
  const firstDayStr = days[0];
  const { data: priorMonthData } = useMostRecentPopulatedMonthBefore(dataset.id, firstDayStr);
  // Precompute prior populated numbers map for all days in the month, seeded with the most recent entry before the period
  const priorNumbersMap = useMemo(() => {
    return getPriorNumbersMap(days, monthData, priorMonthData);
  }, [days, monthData, priorMonthData]);

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
              tracking={dataset.tracking}
            />

            {/* Calendar Grid */}
            <DailyGrid
              year={year}
              month={month}
              showWeekends={showWeekends}
              monthData={monthData}
              priorNumbersMap={priorNumbersMap}
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
                  numbers: allNumbers,
                  priorNumbers: priorNumbersMap[toMonthKey(year, month)],
                  extremes: yearExtremes,
                });
              }} className="cursor-pointer">
              <MonthSummary 
                numbers={allNumbers} 
                priorNumbers={priorNumbersMap[toMonthKey(year, month)]}
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
              <MonthChart
                days={days.map(date => ({ date, numbers: monthData[date] || [] }))}
                valence={dataset.valence}
              />
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
              <YearChart
                year={year}
                yearData={yearData}
                valence={dataset.valence}
              />
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