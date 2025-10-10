import React from 'react';

export interface CalendarGridProps {
  year: number;
  month: number;
  renderDay: (date: Date) => React.ReactNode;
}

const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const CalendarGrid: React.FC<CalendarGridProps> = ({ year, month, renderDay }) => {
  const firstDay = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0);
  const days: Date[] = [];
  for (let d = 1; d <= lastDay.getDate(); d++) {
    days.push(new Date(year, month - 1, d));
  }
  // Pad start of week
  const padStart = firstDay.getDay();
  const padEnd = 6 - lastDay.getDay();
  const gridDays = [
    ...Array(padStart).fill(null),
    ...days,
    ...Array(padEnd).fill(null),
  ];
  
  return (
    <div className="space-y-4">
      {/* Weekday headers */}
      <div className="grid grid-cols-7 gap-2 px-2">
        {weekdays.map(day => (
          <div key={day} className="text-center text-sm font-medium text-slate-500 uppercase tracking-wide">
            {day}
          </div>
        ))}
      </div>
      
      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-2 p-2">
        {gridDays.map((date, i) => (
          <div 
            key={i} 
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
