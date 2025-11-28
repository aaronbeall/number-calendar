import React from 'react';

interface DailyGridProps {
  year: number;
  month: number;
  renderDay: (date: Date) => React.ReactNode;
  showWeekends?: boolean;
  renderWeekFooter?: (datesInWeek: Date[]) => React.ReactNode;
}

const allWeekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const DailyGrid: React.FC<DailyGridProps> = ({ year, month, renderDay, showWeekends = true, renderWeekFooter }) => {
  const firstDay = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0);
  const days: Date[] = [];
  // Generate all days in the month (filter weekends if needed)
  for (let d = 1; d <= lastDay.getDate(); d++) {
    const date = new Date(year, month - 1, d);
    if (showWeekends || (date.getDay() !== 0 && date.getDay() !== 6)) {
      days.push(date);
    }
  }

  let weekdays = allWeekdays;
  let gridDays: (Date | null)[] = [];
  const cols = showWeekends ? 7 : 5;

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
    const firstDow = firstDay.getDay();
    const padStart = firstDow === 0 ? 4 : firstDow - 1; // Sun->Fri(4), Mon->0, ...
    gridDays = [
      ...Array(padStart).fill(null),
      ...days,
    ];
    // Ensure full final row by padding the end to multiple of 5
    const remainder = gridDays.length % cols;
    if (remainder !== 0) {
      gridDays = [
        ...gridDays,
        ...Array(cols - remainder).fill(null),
      ];
    }
  }

  // Chunk into weeks
  const weeks: Array<(Date | null)[]> = [];
  for (let i = 0; i < gridDays.length; i += cols) {
    weeks.push(gridDays.slice(i, i + cols));
  }
  
  return (
    <>
      {/* Weekday headers */}
      <div className={`grid gap-2 px-2 ${showWeekends ? 'grid-cols-7' : 'grid-cols-5'}`}>
        {weekdays.map(day => (
          <div key={day} className="text-center text-sm font-medium text-slate-500 uppercase tracking-wide">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid rendered by weeks with optional footer per week */}
      <div className={`grid gap-2 p-2 ${showWeekends ? 'grid-cols-7' : 'grid-cols-5'}`}>
        {weeks.map((week, wi) => (
          <React.Fragment key={`week-${wi}`}>
            {week.map((date, di) => (
              <div
                key={date ? date.toISOString() : `empty-${wi}-${di}`}
                className={date ? 'transition-all duration-200 cursor-pointer hover:scale-[1.02] hover:shadow-lg dark:hover:shadow-2xl' : 'invisible'}
              >
                {date ? renderDay(date) : null}
              </div>
            ))}
            {renderWeekFooter && (() => {
              const datesInWeek = week.filter((d): d is Date => d instanceof Date);
              const content = renderWeekFooter(datesInWeek);
              return content ? (
                <div className={showWeekends ? 'col-span-7' : 'col-span-5'}>
                  {content}
                </div>
              ) : null;
            })()}
          </React.Fragment>
        ))}
      </div>
    </>
  );
};
