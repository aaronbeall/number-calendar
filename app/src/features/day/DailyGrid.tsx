

import type { DateKey, DayKey, MonthKey, Tracking, Valence, WeekKey } from '@/features/db/localdb';
import { dateToWeekKey, formatDateAsKey } from '@/lib/friendly-date';
import type { CompletedAchievementResult } from '@/lib/goals';
import type { StatsExtremes } from '@/lib/stats';
import { useMemo } from 'react';
import { Fragment } from 'react/jsx-runtime';
import { WeekSummary } from '../stats/WeekSummary';
import { DayCell } from './DayCell';

interface DailyGridProps {
  year: number;
  month: number;
  monthData: Record<DayKey, number[]>;
  priorNumbersMap: Record<DayKey | WeekKey | MonthKey, number[]>;
  showWeekends?: boolean;
  monthExtremes?: StatsExtremes;
  valence: Valence;
  tracking: Tracking;
  onSaveDay: (date: DayKey, numbers: number[]) => void;
  achievementResultsByDateKey: Record<DateKey, CompletedAchievementResult[]>;
}


const allWeekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];


export const DailyGrid: React.FC<DailyGridProps> = ({
  year,
  month,
  monthData,
  priorNumbersMap,
  showWeekends = true,
  monthExtremes,
  valence,
  tracking,
  onSaveDay,
  achievementResultsByDateKey,
}) => {

  const { firstDay, weekdays, gridDays } = useMemo(() => {
    // Calculdate days in month
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
    return { firstDay, lastDay, cols, weekdays, gridDays };
  }, [year, month, showWeekends]);

  const weeks = useMemo(() => {

    // Precompute weeks: each week is { days: (Date|null)[], weekNumbers: number[], weekNumber: number, isCurrentWeek: boolean }
    const today = new Date();
    const weeks = [] as Array<{
      days: (Date | null)[];
      weekNumbers: number[];
      weekNumber: number;
      isCurrentWeek: boolean;
      priorWeekNumbers?: number[];
      weekDateKey?: WeekKey;
    }>;
    for (let i = 0; i < gridDays.length; i += weekdays.length) {
      const week = gridDays.slice(i, i + weekdays.length);
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
      const weekNumbers = datesInWeek.flatMap(d => {
        const key = formatDateAsKey(d, 'day');
        return monthData[key] || [];
      });
      const priorWeekKey = datesInWeek.length > 0 ? dateToWeekKey(datesInWeek[0]) : undefined;
      const priorWeekNumbers = priorWeekKey && priorNumbersMap[priorWeekKey];
      weeks.push({ days: week, weekNumbers, weekNumber, isCurrentWeek, priorWeekNumbers, weekDateKey: priorWeekKey });
    }
    return weeks;
  }, [year, month, monthData, priorNumbersMap, gridDays, firstDay, weekdays]);

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
        {weeks.map((week, wi) => (
          <Fragment key={`week-${wi}`}>
            {week.days.map((date, di) => {
              if (!date) {
                return <div key={`empty-${wi}-${di}`} className="invisible" />;
              }
              const key = formatDateAsKey(date, 'day');
              const numbers = monthData[key] || [];
              const priorNumbers = priorNumbersMap[key] || [];
              return (
                <div key={formatDateAsKey(date, 'day')} className="transition-all duration-200 cursor-pointer hover:scale-[1.02] hover:shadow-lg dark:hover:shadow-2xl">
                  <DayCell
                    date={date}
                    numbers={numbers}
                    priorNumbers={priorNumbers}
                    onSave={nums => onSaveDay(key, nums)}
                    monthExtremes={monthExtremes}
                    valence={valence}
                    tracking={tracking}
                    achievementResults={achievementResultsByDateKey[key] ?? []}
                  />
                </div>
              );
            })}
            {/* Week summary below the week */}
            {week.weekNumbers.length > 0 && week.weekDateKey && (
              <div className={showWeekends ? 'col-span-7' : 'col-span-5'}>
                <WeekSummary
                  numbers={week.weekNumbers}
                  weekNumber={week.weekNumber}
                  isCurrentWeek={week.isCurrentWeek}
                  priorNumbers={week.priorWeekNumbers}
                  valence={valence}
                  tracking={tracking}
                  dateKey={week.weekDateKey}
                  achievementResults={achievementResultsByDateKey[week.weekDateKey] ?? []}
                />
              </div>
            )}
          </Fragment>
        ))}
      </div>
    </>
  );
};
