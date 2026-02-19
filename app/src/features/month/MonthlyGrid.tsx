import type { DayKey, MonthKey, Tracking, Valence } from '@/features/db/localdb';
import { getMonthDays } from '@/lib/calendar';
import { toMonthKey } from '@/lib/friendly-date';
import { createEmptyAggregate, type PeriodAggregateData } from '@/lib/period-aggregate';
import { type StatsExtremes } from '@/lib/stats';
import { parseISO } from 'date-fns';
import { useMemo } from 'react';
import { MonthCell } from './MonthCell';

interface MonthlyGridProps {
  year: number;
  dayDataByKey: Record<DayKey, PeriodAggregateData<'day'>>;
  priorDayByKey: Record<DayKey, PeriodAggregateData<'day'> | undefined>;
  monthDataByKey: Record<MonthKey, PeriodAggregateData<'month'>>;
  priorMonthByKey: Record<MonthKey, PeriodAggregateData<'month'> | undefined>;
  yearExtremes?: StatsExtremes;
  valence: Valence;
  tracking: Tracking;
}

export function MonthlyGrid({ year, dayDataByKey, priorDayByKey, monthDataByKey, priorMonthByKey, yearExtremes, valence, tracking }: MonthlyGridProps) {
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];


  // Memoized map of month data
  const monthDataMap = useMemo(() => {
    const map = new Map<number, {
      data: PeriodAggregateData<'month'>;
      priorData?: PeriodAggregateData<'month'>;
      days: {
        date: Date;
        data: PeriodAggregateData<'day'>;
        priorData?: PeriodAggregateData<'day'>;
      }[];
    }>();

    for (let monthNumber = 1; monthNumber <= 12; monthNumber++) {
      const monthKey = toMonthKey(year, monthNumber);
      const days: { date: Date; data: PeriodAggregateData<'day'>; priorData?: PeriodAggregateData<'day'> }[] = [];
      const monthDayKeys = getMonthDays(year, monthNumber);

      for (const dateStr of monthDayKeys) {
        const date = parseISO(dateStr);
        const dayData = dayDataByKey[dateStr] ?? createEmptyAggregate(dateStr, 'day');
        const priorData = priorDayByKey[dateStr];
        days.push({ date, data: dayData, priorData });
      }

      const data = monthDataByKey[monthKey] ?? createEmptyAggregate(monthKey, 'month');
      const priorData = priorMonthByKey[monthKey];
      map.set(monthNumber, { data, priorData, days });
    }

    return map;
  }, [dayDataByKey, priorDayByKey, monthDataByKey, priorMonthByKey, year]);

  const currentDate = new Date();
  const isCurrentYear = year === currentDate.getFullYear();
  const isFutureYear = year > currentDate.getFullYear();

  return (
    <div className="grid grid-cols-3 md:grid-cols-4 gap-4">
      {monthNames.map((monthName, index) => {
        const monthNumber = index + 1;
        const monthData = monthDataMap.get(monthNumber)!;
        const { data: monthAggregate, days: monthDays } = monthData;
        const isCurrentMonth = isCurrentYear && monthNumber === currentDate.getMonth() + 1;
        const isFutureMonth = isFutureYear || (isCurrentYear && monthNumber > currentDate.getMonth() + 1);
        return (
          <MonthCell
            key={monthNumber}
            year={year}
            month={monthNumber}
            monthName={monthName}
            data={monthAggregate}
            monthDays={monthDays}
            isCurrentMonth={isCurrentMonth}
            isFutureMonth={isFutureMonth}
            yearExtremes={yearExtremes}
            valence={valence}
            tracking={tracking}
          />
        );
      })}
    </div>
  );
}