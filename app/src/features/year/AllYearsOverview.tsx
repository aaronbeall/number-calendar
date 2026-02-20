import type { MonthKey, Tracking, Valence } from '@/features/db/localdb';
import { parseMonthKey, toMonthKey } from '@/lib/friendly-date';
import type { PeriodAggregateData } from '@/lib/period-aggregate';
import { getValenceValueFromData, getPrimaryMetricFromStats } from '@/lib/tracking';
import { getValueForValence } from '@/lib/valence';
import { formatValue } from '@/lib/friendly-numbers';
import { getNormalizedMagnitude } from '@/lib/charts';
import { useSwipe } from '@/hooks/useSwipe';
import React, { useMemo } from 'react';

export interface AllYearsOverviewProps {
  monthDataByKey: Record<MonthKey, PeriodAggregateData<'month'>>;
  currentYear: number;
  onYearClick: (year: number) => void;
  valence: Valence;
  tracking: Tracking;
}

const monthNames = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

export const AllYearsOverview: React.FC<AllYearsOverviewProps> = ({
  monthDataByKey,
  currentYear,
  onYearClick,
  valence,
  tracking,
}) => {
  const today = new Date();

  // Extract all available years from monthDataByKey
  const availableYears = useMemo(() => {
    const years = new Set<number>();
    Object.keys(monthDataByKey).forEach((monthKey) => {
      const { year } = parseMonthKey(monthKey as MonthKey);
      years.add(year);
    });
    return Array.from(years).sort((a, b) => a - b);
  }, [monthDataByKey]);

  const { handleSwipeStart, handleSwipeEnd, getAnimationStyle } = useSwipe({
    onSwipeLeft: () => {},
    onSwipeRight: () => {},
  });

  // Calculate global min/max of absolute valence metric for opacity normalization
  const { minAbsValence, maxAbsValence } = useMemo(() => {
    const absValences: number[] = [];
    Object.values(monthDataByKey).forEach((monthData) => {
      if (monthData && monthData.numbers.length > 0) {
        const valenceValue = getValenceValueFromData(monthData, tracking) ?? 0;
        absValences.push(Math.abs(valenceValue));
      }
    });
    
    if (absValences.length === 0) {
      return { minAbsValence: 0, maxAbsValence: 100 };
    }
    
    return {
      minAbsValence: Math.min(...absValences),
      maxAbsValence: Math.max(...absValences),
    };
  }, [monthDataByKey, tracking]);

  // Helper to get color class and opacity for a month box based on valence magnitude
  const getMonthColorAndOpacity = (monthKey: MonthKey): { color: string; opacity: number } => {
    const monthData = monthDataByKey[monthKey];
    if (!monthData || monthData.numbers.length === 0) {
      return { color: 'bg-slate-300 dark:bg-slate-700/40', opacity: 0.3 };
    }
    const valenceValue = getValenceValueFromData(monthData, tracking) ?? 0;
    const absValenceValue = Math.abs(valenceValue);
    const opacity = getNormalizedMagnitude(absValenceValue, { min: minAbsValence, max: maxAbsValence }, .3, 1);
    
    const color = getValueForValence(valenceValue, valence, {
      good: 'bg-green-500 dark:bg-green-800/70',
      bad: 'bg-red-500 dark:bg-red-800/70',
      neutral: 'bg-blue-500 dark:bg-blue-800/70',
    });
    
    return { color, opacity };
  };

  const renderYear = (year: number) => {
    const isCurrentYear = year === currentYear;
    const isFutureYear = year > today.getFullYear();

    return (
      <button
        key={year}
        onClick={() => onYearClick(year)}
        className={`flex flex-col items-center space-y-2 p-3 rounded-lg transition-all duration-200
          ${isCurrentYear ? 'ring-2 ring-blue-400/80 ring-offset-1 ring-offset-white dark:ring-blue-300/70 dark:ring-offset-slate-900 bg-blue-50 dark:bg-blue-950/20' : ''}
          hover:scale-105 hover:shadow-md dark:hover:shadow-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer`}
        title={`${year}`}
      >
        <div className={`text-sm font-semibold ${isCurrentYear ? 'text-blue-700 dark:text-blue-300' : 'text-slate-600 dark:text-slate-400'}`}>
          {year}
        </div>
        <div className="grid grid-cols-6 gap-1.5">
          {Array.from({ length: 12 }, (_, monthIndex) => {
            const monthNum = monthIndex + 1;
            const monthKey = toMonthKey(year, monthNum);
            const isFuture = isFutureYear || (year === today.getFullYear() && monthNum > today.getMonth() + 1);
            const { color, opacity } = isFuture 
              ? { color: 'bg-slate-200 dark:bg-slate-700/40', opacity: 0.3 }
              : getMonthColorAndOpacity(monthKey);
            const monthData = monthDataByKey[monthKey];
            const hasData = monthData && monthData.numbers.length > 0;
            const value = hasData ? getPrimaryMetricFromStats(monthData.stats, tracking) : 0;
            const formattedValue = hasData ? formatValue(value) : '—';

            return (
              <div
                key={monthNum}
                className={`w-3 h-3 rounded ${color} transition-all duration-200`}
                style={{ opacity }}
                title={`${monthNames[monthNum - 1]} ${year}${hasData ? `: ${formattedValue}` : ''}`}
              />
            );
          })}
        </div>
      </button>
    );
  };

  return (
    <div
      className="bg-white dark:bg-slate-900 rounded-lg p-6 mb-6 shadow-sm dark:shadow-md overflow-y-auto max-h-[600px]"
      style={getAnimationStyle()}
      onTouchStart={handleSwipeStart}
      onTouchEnd={handleSwipeEnd}
    >
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6 justify-items-center">
        {availableYears.map((year) => renderYear(year))}
      </div>
    </div>
  );
};
