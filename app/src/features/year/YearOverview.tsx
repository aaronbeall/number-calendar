import React, { useMemo } from 'react';
import { getValueForValence } from '@/lib/valence';
import type { DayKey, Tracking, Valence } from '@/features/db/localdb';
import { dateToDayKey } from '@/lib/friendly-date';
import { getPrimaryMetricFromStats, getValenceValueForNumber } from '@/lib/tracking';
import type { PeriodAggregateData } from '@/lib/period-aggregate';

export interface YearOverviewProps {
  year: number;
  dayDataByKey: Record<DayKey, PeriodAggregateData<'day'>>;
  currentMonth: number;
  onMonthClick: (month: number) => void;
  valence: Valence;
  tracking: Tracking;
}

const monthNames = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

export const YearOverview: React.FC<YearOverviewProps> = ({ 
  year, 
  dayDataByKey, 
  currentMonth, 
  onMonthClick,
  valence,
  tracking
}) => {
  const today = new Date();

  // Memoize all dot data for the year: { [month]: [{ day, color, valenceValue, isFuture, hasData, value }] }
  const dotDataByMonth = useMemo(() => {
    const result: Record<number, Array<{
      day: number;
      valenceValue: number;
      isFuture: boolean;
      hasData: boolean;
      value: number;
    }>> = {};
    let priorDayValue: number | undefined = undefined;
    for (let month = 1; month <= 12; month++) {
      const daysInMonth = new Date(year, month, 0).getDate();
      result[month] = [];
      for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month - 1, day);
        const dateKey = dateToDayKey(date);
        const dayData = dayDataByKey[dateKey];
        const numbers = dayData?.numbers ?? [];
        const value = dayData ? getPrimaryMetricFromStats(dayData.stats, tracking) : 0;
        const isFuture = date > today;
        const hasData = numbers.length > 0;
        const valenceValue = hasData
          ? getValenceValueForNumber(value, priorDayValue ?? numbers[0], tracking)
          : 0;
        result[month].push({ day, valenceValue, isFuture, hasData, value });
        if (hasData) priorDayValue = value;
      }
    }
    return result;
  }, [year, dayDataByKey, tracking]);

  // Helper to get color for a dot
  const getDotColor = (valenceValue: number, isFuture: boolean, hasData: boolean) => {
    if (isFuture) {
      return 'bg-slate-200 dark:bg-slate-700/40 opacity-40';
    } else if (!hasData) {
      return 'bg-slate-400 dark:bg-slate-700/40 opacity-40';
    } else {
      return getValueForValence(valenceValue, valence, {
        good: 'bg-green-500 dark:bg-green-800/70 opacity-90',
        bad: 'bg-red-500 dark:bg-red-800/70 opacity-90',
        neutral: 'bg-blue-500 dark:bg-blue-800/70 opacity-90',
      });
    }
  };

  const renderMonth = (month: number) => {
    const isCurrentMonth = month === currentMonth;
    const daysInMonth = new Date(year, month, 0).getDate();
    const days: React.ReactElement[] = [];
    const dotData = dotDataByMonth[month];

    for (let i = 0; i < daysInMonth; i++) {
      const { day, valenceValue, isFuture, hasData, value } = dotData[i];
      const color = getDotColor(valenceValue, isFuture, hasData);
      days.push(
        <div
          key={day}
          className={`w-1 h-1 rounded-full ${color} transition-all duration-200`}
          title={`${monthNames[month - 1]} ${day}, ${year}${hasData ? `: ${value}` : ''}`}
        />
      );
    }

    // Pad the start and end so dots align with weekdays (Sun-Sat)
    const firstDayOfWeek = new Date(year, month - 1, 1).getDay(); // 0=Sun .. 6=Sat
    const lastDayOfWeek = new Date(year, month, 0).getDay();
    const padStart = firstDayOfWeek; // number of empty cells before day 1
    const padEnd = 6 - lastDayOfWeek; // number of empty cells after last day

    const paddedCells: React.ReactElement[] = [
      // Leading empty cells
      ...Array.from({ length: padStart }, (_, i) => (
        <div
          key={`pad-start-${month}-${i}`}
          className="w-1 h-1 rounded-full opacity-0"
          aria-hidden
        />
      )),
      // Actual day dots
      ...days,
      // Trailing empty cells
      ...Array.from({ length: padEnd }, (_, i) => (
        <div
          key={`pad-end-${month}-${i}`}
          className="w-1 h-1 rounded-full opacity-0"
          aria-hidden
        />
      )),
    ];

    return (
      <div
        key={month}
        className={`flex flex-col items-center space-y-1 cursor-pointer transition-all duration-200 p-2
          ${isCurrentMonth ? 'ring-2 ring-blue-400/80 ring-offset-1 ring-offset-white dark:ring-blue-300/70 dark:ring-offset-slate-900 rounded-lg' : ''}
          hover:bg-slate-100 dark:hover:bg-slate-900 hover:shadow-sm dark:hover:shadow-md hover:scale-105 rounded-lg`}
        onClick={() => onMonthClick(month)}
      >
        <div className={`text-xs font-medium ${isCurrentMonth ? 'text-blue-700 dark:text-blue-300 font-semibold' : 'text-slate-600 dark:text-slate-300'}`}>
          {monthNames[month - 1]}
        </div>
        <div className="grid grid-cols-7 gap-0.5 w-fit">
          {paddedCells}
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-lg p-4 mb-6 shadow-sm dark:shadow-md">
      <div className="grid grid-cols-12 gap-2 justify-items-center">
        {Array.from({ length: 12 }, (_, i) => renderMonth(i + 1))}
      </div>
    </div>
  );
};