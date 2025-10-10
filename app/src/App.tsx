import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Calendar, CalendarOff } from 'lucide-react';
import { CalendarGrid } from './features/calendar/CalendarGrid';
import { DayCell } from './features/day/DayCell';
import { MonthSummary } from './features/stats/MonthSummary';
import WeekSummary from './features/stats/WeekSummary';
import { MonthChart } from './features/chart/MonthChart';
import { YearOverview } from './features/year/YearOverview';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { BarChart as BarChartIcon, LineChart as LineChartIcon } from 'lucide-react';
import { loadMonth, saveDay } from './features/db/localdb';
import { NumbersPanel } from './features/panel/NumbersPanel';

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
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [monthData, setMonthData] = useState<Record<string, number[]>>({});
  const [yearData, setYearData] = useState<Record<string, number[]>>({});
  const [chartMode, setChartMode] = useState<'serial' | 'cumulative'>(() => 'serial');
  const [showWeekends, setShowWeekends] = useState(true);
  const [panelOpen, setPanelOpen] = useState(false);
  const [panelTitle, setPanelTitle] = useState('');
  const [panelNumbers, setPanelNumbers] = useState<number[]>([]);

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
      {/* App Bar Header */}
      <header className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src="/icon.svg" alt="Numbers Go Up" className="w-10 h-10" />
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-emerald-600 via-blue-600 to-purple-600 bg-clip-text text-transparent tracking-tight">
                  Numbers Go Up
                </h1>
                <p className="text-xs text-slate-500 font-medium">Track your daily progress</p>
              </div>
            </div>
            
            {/* Month Navigation */}
            <div className="flex items-center gap-3">
              <Button 
                variant="outline" 
                size="icon"
                onClick={() => {
                  if (month === 1) {
                    setYear(y => y - 1);
                    setMonth(12);
                  } else {
                    setMonth(m => m - 1);
                  }
                }}
                className="shadow-sm hover:shadow-md transition-shadow h-9 w-9"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              
              <Button 
                variant="outline"
                onClick={() => { 
                  setYear(today.getFullYear()); 
                  setMonth(today.getMonth() + 1); 
                }}
                className="gap-2 shadow-sm hover:shadow-md transition-shadow text-sm px-3 h-9"
              >
                <Calendar className="h-4 w-4" />
                Today
              </Button>
              
              <div className="text-lg font-semibold text-slate-700 min-w-[160px] text-center">
                {monthNames[month - 1]} {year}
              </div>
              
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowWeekends(v => !v)}
                aria-pressed={showWeekends}
                title={showWeekends ? "Hide weekends" : "Show weekends"}
              >
                <CalendarOff className={showWeekends ? "text-slate-400" : "text-blue-500"} />
              </Button>
              <Button 
                variant="outline" 
                size="icon"
                onClick={() => {
                  if (month === 12) {
                    setYear(y => y + 1);
                    setMonth(1);
                  } else {
                    setMonth(m => m + 1);
                  }
                }}
                className="shadow-sm hover:shadow-md transition-shadow h-9 w-9"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto p-4 space-y-6">
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
            
            return (
              <div onClick={() => {
                setPanelTitle(`Week ${weekNumber}`);
                setPanelNumbers(weekNumbers);
                setPanelOpen(true);
              }} className="cursor-pointer">
                <WeekSummary numbers={weekNumbers} weekNumber={weekNumber} />
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
            setPanelTitle(`${monthNames[month - 1]} Summary`);
            setPanelNumbers(allNumbers);
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
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-slate-700">Chart</h2>
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
              className="mb-2"
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
          
          <div className="rounded-lg border bg-white p-6 shadow-sm hover:shadow-md transition-shadow">
            <MonthChart
              days={days.map(date => ({ date, numbers: monthData[date] || [] }))}
              mode={chartMode}
            />
          </div>
        </div>
      </div>
      <NumbersPanel
        isOpen={panelOpen}
        onClose={() => setPanelOpen(false)}
        title={panelTitle}
        numbers={panelNumbers}
        editableNumbers={false}
        showExpressionInput={false}
      />
    </div>
  );
}

export default App;
