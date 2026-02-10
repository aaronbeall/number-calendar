import type { DateKey, DayKey, MonthKey, Tracking, Valence } from '@/features/db/localdb';
import { getMonthDays } from '@/lib/calendar';
import { toMonthKey } from '@/lib/friendly-date';
import type { CompletedAchievementResult } from '@/lib/goals';
import { type StatsExtremes } from '@/lib/stats';
import { parseISO } from 'date-fns';
import { useMemo } from 'react';
import { MonthCell } from './MonthCell';

interface MonthlyGridProps {
  year: number;
  yearData: Record<DayKey, number[]>;
  yearExtremes?: StatsExtremes;
  onOpenMonth: (monthNumber: number) => void;
  valence: Valence;
  tracking: Tracking;
  priorNumbersMap: Record<DayKey | MonthKey, number[]>;
  achievementResultsByDateKey: Record<DateKey, CompletedAchievementResult[]>;
}

export function MonthlyGrid({ year, yearData, yearExtremes, onOpenMonth, valence, tracking, priorNumbersMap, achievementResultsByDateKey }: MonthlyGridProps) {
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];


  // Memoized map of month data
  const monthDataMap = useMemo(() => {
    const map = new Map<number, {
      all: number[];
      days: {
        date: Date; 
        numbers: number[]; 
        priorNumbers: number[]
      }[]
    }>();

    for (let monthNumber = 1; monthNumber <= 12; monthNumber++) {
      const all: number[] = [];
      const days: { date: Date; numbers: number[]; priorNumbers: number[] }[] = [];
      const monthDayKeys = getMonthDays(year, monthNumber);

      for (const dateStr of monthDayKeys) {
        const date = parseISO(dateStr);
        const dayNumbers = yearData[dateStr] || [];
        const dayPriorNumbers = priorNumbersMap[dateStr] || [];
        all.push(...dayNumbers);
        days.push({ date, numbers: dayNumbers, priorNumbers: dayPriorNumbers });
      }

      map.set(monthNumber, { all, days });
    }

    return map;
  }, [yearData, year, priorNumbersMap]);

  const currentDate = new Date();
  const isCurrentYear = year === currentDate.getFullYear();
  const isFutureYear = year > currentDate.getFullYear();

  return (
    <div className="grid grid-cols-3 md:grid-cols-4 gap-4">
      {monthNames.map((monthName, index) => {
        const monthNumber = index + 1;
        const monthData = monthDataMap.get(monthNumber)!;
        const { all: monthNumbers, days: monthDays } = monthData;
        const isCurrentMonth = isCurrentYear && monthNumber === currentDate.getMonth() + 1;
        const isFutureMonth = isFutureYear || (isCurrentYear && monthNumber > currentDate.getMonth() + 1);
        return (
          <MonthCell
            key={monthNumber}
            year={year}
            month={monthNumber}
            monthName={monthName}
            numbers={monthNumbers}
            priorNumbers={priorNumbersMap[toMonthKey(year, monthNumber)]}
            monthDays={monthDays}
            isCurrentMonth={isCurrentMonth}
            isFutureMonth={isFutureMonth}
            yearExtremes={yearExtremes}
            onOpenMonth={onOpenMonth}
            valence={valence}
            tracking={tracking}
            achievementResults={achievementResultsByDateKey[toMonthKey(year, monthNumber)] ?? []}
          />
        );
      })}
    </div>
  );
}