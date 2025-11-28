import type { DayKey, Tracking, Valence } from '@/features/db/localdb';
import { toDayKey } from '@/lib/friendly-date';
import type { StatsExtremes } from '@/lib/stats';
import { calculateMonthlyStats, calculateYearExtremes } from '@/lib/stats';
import { useMemo } from 'react';
import { MonthCell } from './MonthCell';

interface MonthlyGridProps {
  year: number;
  yearData: Record<DayKey, number[]>;
  yearExtremes: StatsExtremes;
  onOpenMonth: (monthNumber: number) => void;
  valence: Valence;
  tracking: Tracking;
}

export function MonthlyGrid({ year, yearData, yearExtremes, onOpenMonth, valence, tracking }: MonthlyGridProps) {
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];



  // Memoized map of month data
  const monthDataMap = useMemo(() => {
    const map = new Map<number, { all: number[]; days: { date: Date; numbers: number[] }[] }>();
    
    for (let monthNumber = 1; monthNumber <= 12; monthNumber++) {
      const all: number[] = [];
      const days: { date: Date; numbers: number[] }[] = [];
      const lastDay = new Date(year, monthNumber, 0).getDate();
      
      for (let day = 1; day <= lastDay; day++) {
        const date = new Date(year, monthNumber - 1, day);
        const dateStr = toDayKey(year, monthNumber, day);
        const dayNumbers = yearData[dateStr] || [];
        all.push(...dayNumbers);
        days.push({ date, numbers: dayNumbers });
      }
      
      map.set(monthNumber, { all, days });
    }
    
    return map;
  }, [yearData, year]);

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
            month={monthNumber}
            monthName={monthName}
            numbers={monthNumbers}
            monthDays={monthDays}
            isCurrentMonth={isCurrentMonth}
            isFutureMonth={isFutureMonth}
            yearExtremes={yearExtremes}
            onOpenMonth={onOpenMonth}
            valence={valence}
            tracking={tracking}
          />
        );
      })}
    </div>
  );
}