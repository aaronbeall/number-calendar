import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Calendar, CalendarOff, Grid3X3, CalendarDays, Menu, Settings, User, Database, Trophy, Target, Plus, ChevronRight as ChevronRightIcon, Download, Sparkles } from 'lucide-react';
import { CalendarGrid } from './features/calendar/CalendarGrid';
import { DayCell } from './features/day/DayCell';
import { MonthSummary } from './features/stats/MonthSummary';
import { YearSummary } from './features/stats/YearSummary';
import WeekSummary from './features/stats/WeekSummary';
import { MonthChart } from './features/chart/MonthChart';
import { YearOverview } from './features/year/YearOverview';
import { MonthlyGrid } from './features/month/MonthlyGrid';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { BarChart as BarChartIcon, LineChart as LineChartIcon } from 'lucide-react';
import { loadMonth, saveDay } from './features/db/localdb';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuLabel } from '@/components/ui/dropdown-menu';
import { NumbersPanel } from './features/panel/NumbersPanel';
import YearChart from './features/chart/YearChart';

const today = new Date();

function getMonthDays(year: number, month: number) {
  const days: string[] = [];
  const lastDay = new Date(year, month, 0).getDate();
  for (let d = 1; d <= lastDay; d++) {
    days.push(`${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
  }
  return days;
}

function App() {
  const [view, setView] = useState<'daily' | 'monthly'>('daily');
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [monthData, setMonthData] = useState<Record<string, number[]>>({});
  const [yearData, setYearData] = useState<Record<string, number[]>>({});
  const [chartMode, setChartMode] = useState<'serial' | 'cumulative'>(() => 'serial');
  const [monthChartGroup, setMonthChartGroup] = useState<'daily' | 'all'>(() => 'daily');
  const [chartGroup, setChartGroup] = useState<'daily' | 'monthly'>(() => 'monthly');
  const [showWeekends, setShowWeekends] = useState(true);
  const [panelOpen, setPanelOpen] = useState(false);
  const [panelTitle, setPanelTitle] = useState('');
  const [panelNumbers, setPanelNumbers] = useState<number[]>([]);
  const [panelActionLabel, setActionLabel] = useState<string | undefined>(undefined);
  const [panelAction, setAction] = useState<(() => void) | undefined>(undefined);
  const [panelActionIcon, setActionIcon] = useState<React.ReactNode | undefined>(undefined);

  useEffect(() => {
    loadMonth(year, month).then(setMonthData);
  }, [year, month]);

  // Load entire year data for the year overview
  useEffect(() => {
    const loadYearData = async () => {
      const yearDataPromises = Array.from({ length: 12 }, (_, i) => 
        loadMonth(year, i + 1)
      );
      const yearResults = await Promise.all(yearDataPromises);
      const combinedYearData = yearResults.reduce((acc, monthData) => ({ ...acc, ...monthData }), {});
      setYearData(combinedYearData);
    };
    loadYearData();
  }, [year]);

  const handleSaveDay = async (date: string, numbers: number[]) => {
    await saveDay(date, numbers);
    setMonthData(prev => ({ ...prev, [date]: numbers }));
    setYearData(prev => ({ ...prev, [date]: numbers }));
  };

  const days = getMonthDays(year, month);
  const allNumbers = Object.values(monthData).flat();

  // Week stats are rendered inline beneath the calendar using renderWeekFooter

  const monthNames = ["January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Main App Header */}
      <header className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Menu className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-48">
                  <DropdownMenuLabel className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                    Dataset
                  </DropdownMenuLabel>
                  {/* Current dataset with submenu for others and new */}
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger className="gap-2 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-md mx-1 mb-1">
                      <Database className="h-4 w-4 text-blue-600" />
                      <span className="font-semibold text-blue-900">Personal Tracking</span>
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent>
                      <DropdownMenuItem>Work Goals</DropdownMenuItem>
                      <DropdownMenuItem>Fitness Journey</DropdownMenuItem>
                      <DropdownMenuItem>Study Progress</DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="gap-2">
                        <Plus className="h-4 w-4" />
                        New Dataset
                      </DropdownMenuItem>
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="gap-2">
                    <Trophy className="h-4 w-4" />
                    Achievements
                  </DropdownMenuItem>
                  <DropdownMenuItem className="gap-2">
                    <Target className="h-4 w-4" />
                    Milestones
                  </DropdownMenuItem>
                  <DropdownMenuItem className="gap-2 bg-gradient-to-r from-purple-50 to-pink-50 hover:from-purple-100 hover:to-pink-100 border border-purple-200 rounded-md mx-1 my-1">
                    <Sparkles className="h-4 w-4 text-purple-600" />
                    <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent font-semibold">AI Insights</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="gap-2">
                    <Download className="h-4 w-4" />
                    Import/Export
                  </DropdownMenuItem>
                  <DropdownMenuItem className="gap-2">
                    <Settings className="h-4 w-4" />
                    Settings
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <img src="/icon.svg" alt="Numbers Go Up" className="w-10 h-10" />
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-emerald-600 via-blue-600 to-purple-600 bg-clip-text text-transparent tracking-tight">
                  Numbers Go Up
                </h1>
                <p className="text-xs text-slate-500 font-medium">Track your daily progress</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Settings className="h-4 w-4" />
              </Button>
              
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <User className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Header */}
      <nav className="sticky top-0 z-40 bg-gradient-to-r from-slate-100 to-slate-50 border-b border-slate-200 shadow-sm">
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
                Daily
              </ToggleGroupItem>
              <ToggleGroupItem value="monthly" aria-label="Monthly View">
                <Grid3X3 className="h-4 w-4 mr-1" />
                Monthly
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
              className="gap-1 h-8"
            >
              <Calendar className="h-3 w-3" />
              Today
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
                className="h-8 w-8"
              >
                <ChevronLeft className="h-4 w-4" />
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
                className="h-8 w-8"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            
            {/* Current Month/Year */}
            <div className="text-lg font-semibold text-slate-700">
              {view === 'daily' ? `${monthNames[month - 1]} ${year}` : `${year}`}
            </div>
            
            {/* Weekend Toggle (Daily view only) */}
            {view === 'daily' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowWeekends(v => !v)}
                aria-pressed={showWeekends}
                title={showWeekends ? "Hide weekends" : "Show weekends"}
                className="gap-1 h-8"
              >
                <CalendarOff className={`h-4 w-4 ${showWeekends ? "text-slate-400" : "text-blue-500"}`} />
                {showWeekends ? "Hide weekends" : "Show weekends"}
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
            />

            {/* Calendar Grid */}
            <CalendarGrid
              year={year}
              month={month}
              showWeekends={showWeekends}
              renderWeekFooter={(datesInWeek) => {
                // Compute numbers for the week from monthData
                const weekNumbers = datesInWeek.flatMap(d => {
                  const ds = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                  return monthData[ds] || [];
                });
                if (weekNumbers.length === 0) return null; // Only render if any data exists
                
                // Calculate week number based on the first date in the week that's in current month
                const firstDateInMonth = datesInWeek.find(d => d.getMonth() === month - 1);
                const weekNumber = firstDateInMonth ? Math.ceil(firstDateInMonth.getDate() / 7) : 1;
                
                // Check if this week contains today
                const today = new Date();
                const isCurrentWeek = datesInWeek.some(d => 
                  d.getFullYear() === today.getFullYear() &&
                  d.getMonth() === today.getMonth() &&
                  d.getDate() === today.getDate()
                );
                
                return (
                  <div onClick={() => {
                    setPanelTitle(`Week ${weekNumber}`);
                    setPanelNumbers(weekNumbers);
                    setPanelOpen(true);
                  }} className="cursor-pointer">
                    <WeekSummary numbers={weekNumbers} weekNumber={weekNumber} isCurrentWeek={isCurrentWeek} />
                  </div>
                );
              }}
              renderDay={date => {
                const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
                return (
                  <DayCell
                    date={date}
                    numbers={monthData[dateStr] || []}
                    onSave={nums => handleSaveDay(dateStr, nums)}
                  />
                );
              }}
            />
            
            {/* Monthly Stats Section */}
            <div className="mt-8 mb-6">
              <div onClick={() => {
                setPanelTitle(`${monthNames[month - 1]}`);
                setPanelNumbers(allNumbers);
                // Clear any action since this is from daily view, not monthly view
                setAction(undefined);
                setActionLabel(undefined);
                setActionIcon(undefined);
                setPanelOpen(true);
              }} className="cursor-pointer">
              <MonthSummary 
                numbers={allNumbers} 
                monthName={monthNames[month - 1]} 
                isCurrentMonth={year === today.getFullYear() && month === today.getMonth() + 1}
              />
              </div>
            </div>

            {/* Chart Section */}
            <div className="space-y-4">
              <div className="rounded-lg border bg-white p-6 shadow-sm hover:shadow-md transition-shadow">
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
                      <ToggleGroupItem value="daily" aria-label="Daily">Daily</ToggleGroupItem>
                      <ToggleGroupItem value="all" aria-label="All">All</ToggleGroupItem>
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
              onMonthClick={(monthNumber, monthName, numbers) => {
                setPanelTitle(`${monthName} '${String(year).slice(-2)}`);
                setPanelNumbers(numbers);
                setAction(() => () => {
                  setView('daily');
                  setYear(year);
                  setMonth(monthNumber);
                  setPanelOpen(false);
                });
                setActionLabel('Open daily view');
                setActionIcon(<CalendarDays className="h-4 w-4" />);
                setPanelOpen(true);
              }}
            />

            {/* Year Summary */}
            <div className="mt-8 mb-6">
              <div onClick={() => {
                const allYearNumbers = Object.values(yearData).flat();
                setPanelTitle(`${year} Year Summary`);
                setPanelNumbers(allYearNumbers);
                setPanelOpen(true);
              }} className="cursor-pointer">
                <YearSummary 
                  numbers={Object.values(yearData).flat()} 
                  yearName={`${year}`} 
                  isCurrentYear={year === today.getFullYear()}
                />
              </div>
            </div>

            {/* Year Chart Section */}
            <div className="space-y-4 mb-6">
              <div className="rounded-lg border bg-white p-6 shadow-sm hover:shadow-md transition-shadow">
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
                        Daily
                      </ToggleGroupItem>
                      <ToggleGroupItem value="monthly" aria-label="Monthly">
                        Monthly
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
                />
              </div>
            </div>
          </>
        )}
      </div>
      <NumbersPanel
        isOpen={panelOpen}
        onClose={() => setPanelOpen(false)}
        title={panelTitle}
        numbers={panelNumbers}
        editableNumbers={false}
        showExpressionInput={false}
        actionLabel={panelActionLabel}
        actionOnClick={panelAction}
        actionIcon={panelActionIcon}
      />
    </div>
  );
}

export default App;
