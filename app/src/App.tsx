import { ChevronLeft, ChevronRight, Calendar, CalendarOff, Grid3X3, CalendarDays, Menu, Settings, User, Database, Trophy, Target, Plus, Download, Sparkles, Sun, Moon } from 'lucide-react';
import LogoIcon from '../public/icon.svg?react';
import { useState } from 'react';
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
import { useMonth, useYear, useSaveDay } from './features/db/useCalendarData';
import { useDatasets, useCreateDataset } from './features/db/useDatasetData';
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

import { useTheme } from './components/ThemeProvider';

function App() {

  // Datasets
  const { data: datasets = [], isLoading: datasetsLoading } = useDatasets();
  const createDatasetMutation = useCreateDataset();
  const [selectedDataset, setSelectedDataset] = useState<string | null>(null);

  // If no selected dataset, show landing page
  if (!selectedDataset) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white dark:bg-slate-900/80">
        <div className="max-w-md w-full p-8 rounded-xl shadow-lg bg-white/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800">
          <LogoIcon className="w-16 h-16 mb-6 mx-auto block" aria-label="Numbers Go Up" />
          <h2 className="text-2xl font-bold text-center mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Welcome to Numbers Go Up</h2>
          <p className="text-center text-slate-500 mb-6">Select a dataset to begin tracking your progress. Datasets let you organize your numbers for different goals, projects, or journeys.</p>
          <div className="space-y-4">
            {datasetsLoading ? (
              <div className="text-center text-slate-400">Loading datasets...</div>
            ) : datasets.length === 0 ? (
              <button
                className="w-full py-3 rounded-lg border border-dashed border-slate-300 dark:border-slate-700 text-slate-400 dark:text-slate-500 bg-transparent hover:bg-slate-50 dark:hover:bg-slate-800 transition flex flex-col items-center gap-2"
                onClick={() => {
                  createDatasetMutation.mutate({
                    id: `ds-${Date.now()}`,
                    name: 'My First Dataset',
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                  });
                }}
              >
                  <Plus className="w-7 h-7" />
                <span className="font-semibold">Add your first dataset</span>
                <span className="text-xs text-slate-400">Start tracking your numbers!</span>
              </button>
            ) : (
              <div className="space-y-2">
                {datasets.map(ds => (
                  <button
                    key={ds.id}
                    className="block w-full py-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-slate-700 transition font-semibold"
                    onClick={() => setSelectedDataset(ds.id)}
                  >
                    {ds.name}
                  </button>
                ))}
                <button
                  className="block w-full py-3 rounded-lg border border-dashed border-slate-300 dark:border-slate-700 text-slate-400 dark:text-slate-500 bg-transparent hover:bg-slate-50 dark:hover:bg-slate-800 transition flex flex-col items-center gap-2"
                  onClick={() => {
                    createDatasetMutation.mutate({
                      id: `ds-${Date.now()}`,
                      name: `Dataset ${datasets.length + 1}`,
                      createdAt: Date.now(),
                      updatedAt: Date.now(),
                    });
                  }}
                >
                    <Plus className="w-6 h-6" />
                  <span>Add another dataset</span>
                </button>
              </div>
            )}
          </div>
        </div>
        <AppFooter />
      </div>
    );
  }

  return (
    <Main datasetId={selectedDataset} />
  );
  
}

function Main({ datasetId }: { datasetId: string }) {
  const { theme, setTheme } = useTheme();
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
  });

  // Use selectedDataset for all data hooks
  const { data: monthData = {} } = useMonth(datasetId, year, month);
  const { data: yearData = {} } = useYear(datasetId, year);
  const saveDayMutation = useSaveDay();

  const handleSaveDay = async (date: string, numbers: number[]) => {
    await saveDayMutation.mutateAsync({ datasetId, date: date as `${number}-${number}-${number}`, numbers });
  };

  const days = getMonthDays(year, month);
  const allNumbers = Object.values(monthData).flat();

  // Week stats are rendered inline beneath the calendar using renderWeekFooter

  const monthNames = ["January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"];

  return (
  <div className="min-h-screen bg-white dark:bg-slate-900/80">
    {/* Main App Header */}
    <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-sm">
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
                    <DropdownMenuSubTrigger className="gap-2 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-md mx-1 mb-1 hover:from-blue-100 hover:to-indigo-100 dark:bg-gradient-to-r dark:from-slate-800 dark:to-slate-900 dark:border-slate-700 dark:hover:from-slate-700 dark:hover:to-slate-800">
                      <Database className="h-4 w-4 text-blue-600 dark:text-blue-300" />
                      <span className="font-semibold text-blue-900 dark:text-blue-200">Personal Tracking</span>
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent>
                      <DropdownMenuLabel className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Other Datasets</DropdownMenuLabel>
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
                  <DropdownMenuItem className="gap-2 bg-gradient-to-r from-purple-50 to-pink-50 hover:from-purple-100 hover:to-pink-100 border border-purple-200 rounded-md mx-1 my-1 dark:bg-gradient-to-r dark:from-slate-800 dark:to-slate-900 dark:border-slate-700 dark:hover:from-slate-700 dark:hover:to-slate-800">
                    <Sparkles className="h-4 w-4 text-purple-600 dark:text-pink-300" />
                    <span className="bg-gradient-to-r from-purple-600 to-pink-600 dark:from-pink-700 dark:to-purple-700 bg-clip-text text-transparent font-semibold">AI Insights</span>
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
              <LogoIcon className="w-10 h-10" aria-label="Numbers Go Up" />
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-emerald-600 via-blue-600 to-purple-600 bg-clip-text text-transparent tracking-tight">
                  Numbers Go Up
                </h1>
                <p className="text-xs text-slate-500 font-medium">Daily progress tracking for numberphiles</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                aria-label="Toggle light/dark mode"
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              >
                {theme === 'dark' ? (
                  <Moon className="h-4 w-4 text-blue-500" />
                ) : (
                  <Sun className="h-4 w-4 text-yellow-400" />
                )}
              </Button>
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
              <Calendar className="h-3 w-3 text-slate-700 dark:text-blue-300" />
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
                
                return (
                  <div onClick={() => {
                    setPanelProps({
                      isOpen: true,
                      title: `Week ${weekNumber}`,
                      numbers: weekNumbers,
                      editableNumbers: false,
                      showExpressionInput: false,
                      actionLabel: undefined,
                      actionOnClick: undefined,
                      actionIcon: undefined,
                    });
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
                setPanelProps({
                  isOpen: true,
                  title: `${monthNames[month - 1]}`,
                  numbers: allNumbers,
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
                });
              }}
            />

            {/* Year Summary */}
            <div className="mt-8 mb-6">
              <div onClick={() => {
                const allYearNumbers = Object.values(yearData).flat();
                setPanelProps({
                  isOpen: true,
                  title: `${year} Year Summary`,
                  numbers: allYearNumbers,
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
                />
              </div>
            </div>
          </>
        )}
      </div>
      <NumbersPanel
        {...panelProps}
        onClose={() => setPanelProps(prev => ({ ...prev, isOpen: false }))}
      />
      <AppFooter />
    </div>
  );
}

function AppFooter() {
  return (
    <footer className="w-full py-4 text-center text-xs text-slate-400 bg-transparent mt-8">
      <span>
        Made with <span aria-label="love" role="img">❤️</span> and <span aria-label="banana" role="img">🍌</span> by Meta Modern Monkey &copy; {new Date().getFullYear()}.
        {' '}<a href="https://buymeacoffee.com/metamodernmonkey" target="_blank" rel="noopener noreferrer" className="underline hover:text-yellow-600 mx-1">Buy Me a Coffee</a>
        {' '}|{' '}
        <a href="https://patreon.com/metamodernmonkey" target="_blank" rel="noopener noreferrer" className="underline hover:text-pink-600 mx-1">Patreon</a>
      </span>
    </footer>
  );
}

export default App;
