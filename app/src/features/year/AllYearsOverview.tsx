import type { MonthKey, Tracking, Valence } from '@/features/db/localdb';
import { parseMonthKey, toMonthKey } from '@/lib/friendly-date';
import type { PeriodAggregateData } from '@/lib/period-aggregate';
import { getValenceValueFromData, getPrimaryMetricFromStats } from '@/lib/tracking';
import { getValueForValence } from '@/lib/valence';
import { formatValue } from '@/lib/friendly-numbers';
import { getNormalizedMagnitude } from '@/lib/charts';
import { useSwipe } from '@/hooks/useSwipe';
import React, { useEffect, useMemo, useRef } from 'react';

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
  const yearButtonsRef = useRef<Map<number, HTMLButtonElement>>(new Map());

  // Scroll current year into view when it changes
  useEffect(() => {
    const button = yearButtonsRef.current.get(currentYear);
    if (button) {
      button.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }, [currentYear]);

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

  // Generate continuous year range with padding
  const allYears = useMemo(() => {
    if (availableYears.length === 0) {
      // No data at all, show current year ± 1
      const now = today.getFullYear();
      return [now - 1, now, now + 1];
    }

    const minYear = availableYears[0];
    const maxYear = availableYears[availableYears.length - 1];
    
    // Start with min-1 to max+1
    let start = minYear - 1;
    let end = maxYear + 1;
    
    // Ensure at least 1 year before and after currentYear
    if (currentYear - 1 < start) start = currentYear - 1;
    if (currentYear + 1 > end) end = currentYear + 1;
    
    const years: number[] = [];
    for (let year = start; year <= end; year++) {
      years.push(year);
    }
    
    return years;
  }, [availableYears, currentYear, today]);

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

  // Helper to get color class and scale for a month dot based on valence magnitude
  const getMonthColorAndScale = (monthKey: MonthKey): { color: string; scale: number } => {
    const monthData = monthDataByKey[monthKey];
    if (!monthData || monthData.numbers.length === 0) {
      return { color: 'bg-slate-300 dark:bg-slate-700/40', scale: 0.4 };
    }
    const valenceValue = getValenceValueFromData(monthData, tracking) ?? 0;
    const absValenceValue = Math.abs(valenceValue);
    const scale = getNormalizedMagnitude(absValenceValue, { min: minAbsValence, max: maxAbsValence }, 0.4, 1);
    
    const color = getValueForValence(valenceValue, valence, {
      good: 'bg-green-500 dark:bg-green-800/70',
      bad: 'bg-red-500 dark:bg-red-800/70',
      neutral: 'bg-blue-500 dark:bg-blue-800/70',
    });
    
    return { color, scale };
  };

  const renderYear = (year: number) => {
    const isCurrentYear = year === currentYear;
    const isFutureYear = year > today.getFullYear();
    const hasYearData = availableYears.includes(year);

    return (
      <button
        ref={(el) => {
          if (el) {
            yearButtonsRef.current.set(year, el);
          }
        }}
        key={year}
        onClick={() => onYearClick(year)}
        className={`flex flex-col items-center space-y-2 p-3 rounded-lg transition-all duration-200 flex-shrink-0 min-w-max
          ${isCurrentYear ? 'ring-2 ring-blue-400/80 ring-offset-1 ring-offset-white dark:ring-blue-300/70 dark:ring-offset-slate-900 bg-blue-50 dark:bg-blue-950/20' : ''}
          hover:scale-105 hover:shadow-md dark:hover:shadow-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer`}
        title={`${year}`}
      >
        <div className={`text-sm font-semibold ${isCurrentYear ? 'text-blue-700 dark:text-blue-300' : hasYearData && !isFutureYear ? 'text-slate-700 dark:text-slate-300' : 'text-slate-300 dark:text-slate-700'}`}>
          {year}
        </div>
        {hasYearData && !isFutureYear ? (
          <div className="grid grid-cols-4 gap-3 place-items-center">
            {Array.from({ length: 12 }, (_, monthIndex) => {
              const monthNum = monthIndex + 1;
              const monthKey = toMonthKey(year, monthNum);
              const isFutureMonth = year === today.getFullYear() && monthNum > today.getMonth() + 1;
              const { color, scale } = isFutureMonth
                ? { color: 'bg-slate-200 dark:bg-slate-700/40', scale: 0.4 }
                : getMonthColorAndScale(monthKey);
              const monthData = monthDataByKey[monthKey];
              const hasData = monthData && monthData.numbers.length > 0;
              const value = hasData ? getPrimaryMetricFromStats(monthData.stats, tracking) : 0;
              const formattedValue = hasData ? formatValue(value) : '—';
              const baseSizePx = 12;
              const sizedPx = baseSizePx * scale;

              return (
                <div
                  key={monthNum}
                  className="flex items-center justify-center w-3 h-3"
                  title={`${monthNames[monthNum - 1]} ${year}${hasData ? `: ${formattedValue}` : ''}`}
                >
                  <div
                    className={`rounded-full ${color} transition-all duration-200`}
                    style={{ 
                      width: `${sizedPx}px`, 
                      height: `${sizedPx}px`,
                    }}
                  />
                </div>
              );
            })}
          </div>
        ) : (
          <div className="relative flex items-center justify-center">
            <div className="grid grid-cols-4 gap-3 place-items-center">
              {Array.from({ length: 12 }).map((_, i) => (
                <div
                  key={i}
                  className="flex items-center justify-center w-3 h-3"
                >
                  <div
                    className="rounded-full bg-slate-300 dark:bg-slate-600/50"
                    style={{ width: '2px', height: '2px' }}
                  />
                </div>
              ))}
            </div>
            {/* <div className="absolute inset-0 flex items-center justify-center">
              <span className="px-2 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-[10px] uppercase tracking-wide text-slate-500 dark:text-slate-400 font-medium">
                No Data
              </span>
            </div> */}
          </div>
        )}
      </button>
    );
  };

  return (
    <div
      className="bg-white dark:bg-slate-900 rounded-lg p-6 mb-6 shadow-sm dark:shadow-md overflow-x-auto"
      style={getAnimationStyle()}
      onTouchStart={handleSwipeStart}
      onTouchEnd={handleSwipeEnd}
    >
      <div className="flex gap-6">
        {allYears.map((year) => renderYear(year))}
      </div>
    </div>
  );
};
