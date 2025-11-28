

import { DayCell } from './DayCell';
import { WeekSummary } from '../stats/WeekSummary';
import type { DayKey, Tracking, Valence } from '@/features/db/localdb';
import type { StatsExtremes } from '@/lib/stats';
import { formatDateAsKey } from '@/lib/friendly-date';
import { Fragment } from 'react/jsx-runtime';

interface DailyGridProps {
  year: number;
  month: number;
  monthData: Record<DayKey, number[]>;
  priorDayNumbers: Record<DayKey, number[]>;
  showWeekends?: boolean;
  monthExtremes?: StatsExtremes;
  valence: Valence;
  tracking: Tracking;
  onSaveDay: (date: DayKey, numbers: number[]) => void;
}


const allWeekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];


export const DailyGrid: React.FC<DailyGridProps> = ({
  year,
  month,
  monthData,
  priorDayNumbers,
  showWeekends = true,
  monthExtremes,
  valence,
  tracking,
  onSaveDay,
}) => {
  const firstDay = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0);
  const days: Date[] = [];
  for (let d = 1; d <= lastDay.getDate(); d++) {
    days.push(new Date(year, month - 1, d));
  }

  let weekdays = allWeekdays;
  let gridDays: (Date | null)[] = [];
  const cols = showWeekends ? 7 : 5;

  if (showWeekends) {
    const padStart = firstDay.getDay();
    const padEnd = 6 - lastDay.getDay();
    gridDays = [
      ...Array(padStart).fill(null),
      ...days,
      ...Array(padEnd).fill(null),
    ];
  } else {
    weekdays = allWeekdays.slice(1, 6);
    const firstDow = firstDay.getDay();
    const padStart = firstDow === 0 ? 0 : firstDow - 1;
    gridDays = [
      ...Array(padStart).fill(null),
      ...days.filter(d => d.getDay() !== 0 && d.getDay() !== 6),
    ];
    const remainder = gridDays.length % cols;
    if (remainder !== 0) {
      gridDays = [
        ...gridDays,
        ...Array(cols - remainder).fill(null),
      ];
    }
  }

  // Chunk into weeks
  const weekChunks: Array<(Date | null)[]> = [];
  for (let i = 0; i < gridDays.length; i += cols) {
    weekChunks.push(gridDays.slice(i, i + cols));
  }

  // Helper to get week numbers and week data
  const getWeekNumbers = (datesInWeek: Date[]) => datesInWeek.flatMap(d => {
    const key = formatDateAsKey(d, 'day');
    return monthData[key] || [];
  });

  const today = new Date();

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

      {/* Calendar grid rendered by weeks with summary per week */}
      <div className={`grid gap-2 p-2 ${showWeekends ? 'grid-cols-7' : 'grid-cols-5'}`}>
        {weekChunks.map((week, wi) => {
          const datesInWeek = week.filter((d): d is Date => d instanceof Date);
          // Calculate week number (same logic as before)
          const firstOfMonth = firstDay;
          const firstDayOfWeek = firstOfMonth.getDay();
          const firstSunday = firstDayOfWeek === 0 ? 1 : 8 - firstDayOfWeek;
          const datesInCurrentMonth = datesInWeek.filter(d => d.getMonth() === month - 1);
          const minDate = datesInCurrentMonth.length > 0 ? Math.min(...datesInCurrentMonth.map(d => d.getDate())) : 1;
          let weekNumber;
          if (minDate < firstSunday) {
            weekNumber = 1;
          } else {
            weekNumber = 1 + Math.floor((minDate - firstSunday) / 7) + 1;
          }
          const isCurrentWeek = datesInWeek.some(d =>
            d.getFullYear() === today.getFullYear() &&
            d.getMonth() === today.getMonth() &&
            d.getDate() === today.getDate()
          );
          const weekNumbers = getWeekNumbers(datesInWeek);
          return (
            <Fragment key={`week-${wi}`}>
              {week.map((date, di) => {
                if (!date) {
                  return <div key={`empty-${wi}-${di}`} className="invisible" />;
                }
                const key = formatDateAsKey(date, 'day');
                const numbers = monthData[key] || [];
                const priorNumbers = priorDayNumbers[key] || [];
                return (
                  <div key={key} className="transition-all duration-200 cursor-pointer hover:scale-[1.02] hover:shadow-lg dark:hover:shadow-2xl">
                    <DayCell
                      date={date}
                      numbers={numbers}
                      priorNumbers={priorNumbers}
                      onSave={nums => onSaveDay(key, nums)}
                      monthExtremes={monthExtremes}
                      valence={valence}
                      tracking={tracking}
                    />
                  </div>
                );
              })}
              {/* Week summary below the week */}
              {weekNumbers.length > 0 && (
                <div className={showWeekends ? 'col-span-7' : 'col-span-5'}>
                  <WeekSummary
                    numbers={weekNumbers}
                    weekNumber={weekNumber}
                    isCurrentWeek={isCurrentWeek}
                    valence={valence}
                    tracking={tracking}
                  />
                </div>
              )}
            </Fragment>
          );
        })}
      </div>
    </>
  );
};
