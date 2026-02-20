import type { DayKey, Tracking, Valence } from '@/features/db/localdb';
import { dateToDayKey } from '@/lib/friendly-date';
import type { PeriodAggregateData } from '@/lib/period-aggregate';
import { getPrimaryMetricFromStats, getValenceValueFromData } from '@/lib/tracking';
import { getValueForValence } from '@/lib/valence';
import { useSwipe } from '@/hooks/useSwipe';
import React, { useCallback, useMemo, memo } from 'react';

export interface YearOverviewProps {
  year: number;
  dayDataByKey: Record<DayKey, PeriodAggregateData<'day'>>;
  currentMonth: number;
  onMonthClick: (month: number) => void;
  valence: Valence;
  tracking: Tracking;
  onYearChange?: (newYear: number) => void;
}

const monthNames = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

interface DayDotProps {
  day: number;
  month: number;
  year: number;
  color: string;
  hasData: boolean;
  value: number;
}

const DayDot = memo(({ day, month, year, color, hasData, value }: DayDotProps) => (
  <div
    key={day}
    className={`w-1 h-1 rounded-full ${color} transition-all duration-200`}
    title={`${monthNames[month - 1]} ${day}, ${year}${hasData ? `: ${value}` : ''}`}
  />
));
DayDot.displayName = 'DayDot';

interface MonthCardProps {
  month: number;
  year: number;
  isCurrentMonth: boolean;
  dotData: Array<{ day: number; valenceValue: number; isFuture: boolean; hasData: boolean; value: number }>;
  getDotColor: (valenceValue: number, isFuture: boolean, hasData: boolean) => string;
  onMonthClick: (month: number) => void;
}

const MonthCard = memo(({
  month,
  year,
  isCurrentMonth,
  dotData,
  getDotColor,
  onMonthClick,
}: MonthCardProps) => {
  const daysInMonth = new Date(year, month, 0).getDate();
  const firstDayOfWeek = new Date(year, month - 1, 1).getDay();
  const lastDayOfWeek = new Date(year, month, 0).getDay();
  const padStart = firstDayOfWeek;
  const padEnd = 6 - lastDayOfWeek;

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
        {/* Leading padding */}
        {Array.from({ length: padStart }, (_, i) => (
          <div
            key={`pad-start-${i}`}
            className="w-1 h-1 rounded-full opacity-0"
            aria-hidden
          />
        ))}
        {/* Day dots */}
        {Array.from({ length: daysInMonth }, (_, i) => {
          const dayInfo = dotData[i];
          const color = getDotColor(dayInfo.valenceValue, dayInfo.isFuture, dayInfo.hasData);
          return (
            <DayDot
              key={dayInfo.day}
              day={dayInfo.day}
              month={month}
              year={year}
              color={color}
              hasData={dayInfo.hasData}
              value={dayInfo.value}
            />
          );
        })}
        {/* Trailing padding */}
        {Array.from({ length: padEnd }, (_, i) => (
          <div
            key={`pad-end-${i}`}
            className="w-1 h-1 rounded-full opacity-0"
            aria-hidden
          />
        ))}
      </div>
    </div>
  );
});
MonthCard.displayName = 'MonthCard';

export const YearOverview = memo(({
  year,
  dayDataByKey,
  currentMonth,
  onMonthClick,
  valence,
  tracking,
  onYearChange
}: YearOverviewProps) => {
  const today = new Date();

  const { handleSwipeStart, handleSwipeEnd, getAnimationStyle } = useSwipe({
    onSwipeLeft: () => onYearChange?.(year + 1),
    onSwipeRight: () => onYearChange?.(year - 1),
  });

  // Memoize all dot data for the year: { [month]: [{ day, color, valenceValue, isFuture, hasData, value }] }
  const dotDataByMonth = useMemo(() => {
    const result: Record<number, Array<{
      day: number;
      valenceValue: number;
      isFuture: boolean;
      hasData: boolean;
      value: number;
    }>> = {};
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
          ? getValenceValueFromData(dayData, tracking) ?? 0
          : 0;
        result[month].push({ day, valenceValue, isFuture, hasData, value });
      }
    }
    return result;
  }, [year, dayDataByKey, tracking]);

  // Helper to get color for a dot
  const getDotColor = useCallback((valenceValue: number, isFuture: boolean, hasData: boolean) => {
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
  }, [valence]);

  return (
    <div 
      className="bg-white dark:bg-slate-900 rounded-lg p-4 mb-6 shadow-sm dark:shadow-md"
      style={getAnimationStyle()}
      onTouchStart={handleSwipeStart}
      onTouchEnd={handleSwipeEnd}
    >
      <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-12 gap-2 justify-items-center">
        {Array.from({ length: 12 }, (_, i) => {
          const month = i + 1;
          const isCurrentMonth = month === currentMonth;
          return (
            <MonthCard
              key={month}
              month={month}
              year={year}
              isCurrentMonth={isCurrentMonth}
              dotData={dotDataByMonth[month]}
              getDotColor={getDotColor}
              onMonthClick={onMonthClick}
            />
          );
        })}
      </div>
    </div>
  );
}) as React.FC<YearOverviewProps>;
YearOverview.displayName = 'YearOverview';