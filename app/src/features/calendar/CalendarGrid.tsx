import React from 'react';

export interface CalendarGridProps {
  year: number;
  month: number;
  renderDay: (date: Date) => React.ReactNode;
  showWeekends?: boolean;
}

const allWeekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const CalendarGrid: React.FC<CalendarGridProps> = ({ year, month, renderDay, showWeekends = true }) => {
  const firstDay = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0);
  const days: Date[] = [];
  
  // Generate all days in the month
  for (let d = 1; d <= lastDay.getDate(); d++) {
    const date = new Date(year, month - 1, d);
    if (showWeekends || (date.getDay() !== 0 && date.getDay() !== 6)) {
      days.push(date);
    }
  }
  
  let weekdays = allWeekdays;
  let gridDays: (Date | null)[] = [];
  
  if (showWeekends) {
    // Standard 7-day week layout
    const padStart = firstDay.getDay();
    const padEnd = 6 - lastDay.getDay();
    gridDays = [
      ...Array(padStart).fill(null),
      ...Array.from({ length: lastDay.getDate() }, (_, i) => new Date(year, month - 1, i + 1)),
      ...Array(padEnd).fill(null),
    ];
  } else {
    // 5-day week layout (Mon-Fri only)
    weekdays = allWeekdays.slice(1, 6); // Mon-Fri
    
    // Calculate padding for Mon-Fri grid (0=Mon, 1=Tue, ..., 4=Fri)
    const firstDayOfWeek = firstDay.getDay();
    const padStart = firstDayOfWeek === 0 ? 4 : firstDayOfWeek - 1; // Convert Sun(0) to Fri(4), others shift by -1
    
    gridDays = [
      ...Array(padStart).fill(null),
      ...days,
    ];
  }
  
  return (
    <div className="space-y-4">
      {/* Weekday headers */}
      <div className={`grid gap-2 px-2 ${showWeekends ? 'grid-cols-7' : 'grid-cols-5'}`}>
        {weekdays.map(day => (
          <div key={day} className="text-center text-sm font-medium text-slate-500 uppercase tracking-wide">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className={`grid gap-2 p-2 ${showWeekends ? 'grid-cols-7' : 'grid-cols-5'}`}>
        {gridDays.map((date, i) => (
          <div 
            key={date ? date.toISOString() : `empty-${i}`}
            className={`min-h-[90px] rounded-lg transition-all duration-200 ${
              date 
                ? 'bg-white shadow-sm hover:shadow-md hover:scale-[1.02] border border-slate-100' 
                : 'bg-slate-50/50'
            }`}
          >
            {date ? renderDay(date) : null}
          </div>
        ))}
      </div>
    </div>
  );
};
