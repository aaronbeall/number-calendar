import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Calendar, TrendingUp } from 'lucide-react';
import { CalendarGrid } from './features/calendar/CalendarGrid';
import { DayCell } from './features/day/DayCell';
import { StatsBar } from './features/stats/StatsBar';
import { MonthChart } from './features/chart/MonthChart';
import { Button } from '@/components/ui/button';
import { loadMonth, saveDay } from './features/db/localdb';

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
  const [chartMode, setChartMode] = useState<'serial' | 'cumulative'>('serial');

  useEffect(() => {
    loadMonth(year, month).then(setMonthData);
  }, [year, month]);

  const handleSaveDay = async (date: string, numbers: number[]) => {
    await saveDay(date, numbers);
    setMonthData(prev => ({ ...prev, [date]: numbers }));
  };

  const days = getMonthDays(year, month);
  const allNumbers = Object.values(monthData).flat();

  // Week stats (grouped by week)
  function getWeekStats() {
    const weeks: { week: number; numbers: number[] }[] = [];
    let weekNum = 1;
    let weekNumbers: number[] = [];
    days.forEach((date, i) => {
      weekNumbers.push(...(monthData[date] || []));
      if ((i + 1) % 7 === 0 || i === days.length - 1) {
        weeks.push({ week: weekNum, numbers: [...weekNumbers] });
        weekNum++;
        weekNumbers = [];
      }
    });
    return weeks;
  }

  const monthNames = ["January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* App Bar Header */}
      <header className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-emerald-500 to-blue-600 p-2 rounded-lg shadow-md">
                <TrendingUp className="h-6 w-6 text-white" />
              </div>
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
        {/* Calendar Grid */}
        <CalendarGrid
          year={year}
          month={month}
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

        {/* Stats Section */}
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold mb-4 text-slate-700">Weekly Stats</h2>
            <div className="space-y-3">
              {getWeekStats().map((w, i) => (
                <div key={w.week} className="rounded-lg border bg-white p-4 shadow-sm hover:shadow-md transition-shadow">
                  <div className="text-sm font-medium text-gray-500 mb-2">Week {i + 1}</div>
                  <StatsBar numbers={w.numbers} />
                </div>
              ))}
            </div>
          </div>
          
          <div>
            <h2 className="text-xl font-semibold mb-4 text-slate-700">Monthly Stats</h2>
            <div className="rounded-lg border bg-white p-6 shadow-sm hover:shadow-md transition-shadow">
              <StatsBar numbers={allNumbers} />
            </div>
          </div>
        </div>

        {/* Chart Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-slate-700">Chart</h2>
            <div className="flex gap-2">
              <Button 
                variant={chartMode === 'serial' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setChartMode('serial')}
                className="shadow-sm hover:shadow-md transition-shadow"
              >
                Serial
              </Button>
              <Button 
                variant={chartMode === 'cumulative' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setChartMode('cumulative')}
                className="shadow-sm hover:shadow-md transition-shadow"
              >
                Cumulative
              </Button>
            </div>
          </div>
          
          <div className="rounded-lg border bg-white p-6 shadow-sm hover:shadow-md transition-shadow">
            <MonthChart
              days={days.map(date => ({ date, numbers: monthData[date] || [] }))}
              mode={chartMode}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
