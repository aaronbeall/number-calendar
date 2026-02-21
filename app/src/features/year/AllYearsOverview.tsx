import type { MonthKey, Tracking, Valence } from '@/features/db/localdb';
import { parseMonthKey, toMonthKey } from '@/lib/friendly-date';
import type { PeriodAggregateData } from '@/lib/period-aggregate';
import { getValenceValueFromData, getPrimaryMetricFromStats } from '@/lib/tracking';
import { getValueForValence } from '@/lib/valence';
import { formatValue } from '@/lib/friendly-numbers';
import { getNormalizedMagnitude } from '@/lib/charts';
import React, { useCallback, useEffect, useMemo, useRef, memo } from 'react';

export interface AllYearsOverviewProps {
  monthDataByKey: Record<MonthKey, PeriodAggregateData<'month'>>;
  selectedYear: number;
  onYearClick: (year: number) => void;
  valence: Valence;
  tracking: Tracking;
}

const monthNames = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

interface MonthDotProps {
  monthNum: number;
  color: string;
  scale: number;
  monthData: PeriodAggregateData<'month'> | undefined;
  tracking: Tracking;
}

const MonthDot = memo(({ monthNum, color, scale, monthData, tracking }: MonthDotProps) => {
  const hasData = monthData && monthData.numbers.length > 0;
  const value = hasData ? getPrimaryMetricFromStats(monthData.stats, tracking) : 0;
  const formattedValue = hasData ? formatValue(value) : '—';
  const baseSizePx = 12;
  const sizedPx = baseSizePx * scale;

  return (
    <div
      className="flex items-center justify-center w-3 h-3"
      title={`${monthNames[monthNum - 1]}${hasData ? `: ${formattedValue}` : ''}`}
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
});
MonthDot.displayName = 'MonthDot';

interface MonthGridProps {
  year: number;
  monthDataByKey: Record<MonthKey, PeriodAggregateData<'month'>>;
  getMonthColorAndScale: (monthKey: MonthKey) => { color: string; scale: number };
  today: Date;
  tracking: Tracking;
}

const MonthGrid = memo(({ year, monthDataByKey, getMonthColorAndScale, today, tracking }: MonthGridProps) => {
  return (
    <div className="grid grid-cols-4 gap-3 place-items-center">
      {Array.from({ length: 12 }, (_, monthIndex) => {
        const monthNum = monthIndex + 1;
        const monthKey = toMonthKey(year, monthNum);
        const isFutureMonth = year === today.getFullYear() && monthNum > today.getMonth() + 1;
        const { color, scale } = isFutureMonth
          ? { color: 'bg-slate-200 dark:bg-slate-700/40', scale: 0.4 }
          : getMonthColorAndScale(monthKey);
        const monthData = monthDataByKey[monthKey];

        return (
          <MonthDot
            key={monthNum}
            monthNum={monthNum}
            color={color}
            scale={scale}
            monthData={monthData}
            tracking={tracking}
          />
        );
      })}
    </div>
  );
});
MonthGrid.displayName = 'MonthGrid';

const EmptyMonthGrid = memo(() => (
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
));
EmptyMonthGrid.displayName = 'EmptyMonthGrid';

interface YearButtonProps {
  year: number;
  isSelectedYear: boolean;
  hasYearData: boolean;
  isFutureYear: boolean;
  monthDataByKey: Record<MonthKey, PeriodAggregateData<'month'>>;
  today: Date;
  getMonthColorAndScale: (monthKey: MonthKey) => { color: string; scale: number };
  onYearClick: (year: number) => void;
  yearButtonRef: (el: HTMLButtonElement | null) => void;
  tracking: Tracking;
}

const YearButton = memo(({
  year,
  isSelectedYear,
  hasYearData,
  isFutureYear,
  monthDataByKey,
  today,
  getMonthColorAndScale,
  onYearClick,
  yearButtonRef,
  tracking,
}: YearButtonProps) => {
  return (
    <button
      ref={yearButtonRef}
      onClick={() => onYearClick(year)}
      className={`flex flex-col items-center space-y-2 p-3 rounded-lg transition-all duration-200 flex-shrink-0 min-w-max
        ${isSelectedYear ? 'ring-2 ring-blue-400/80 ring-offset-1 ring-offset-white dark:ring-blue-300/70 dark:ring-offset-slate-900 bg-blue-50 dark:bg-blue-950/20' : ''}
        hover:scale-105 hover:shadow-md dark:hover:shadow-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer`}
      title={hasYearData && !isFutureYear ? `${year}` : `${year}: No Data`}
    >
      <div className={`text-sm font-semibold ${isSelectedYear ? 'text-blue-700 dark:text-blue-300' : hasYearData && !isFutureYear ? 'text-slate-700 dark:text-slate-300' : 'text-slate-300 dark:text-slate-700'}`}>
        {year}
      </div>
      {hasYearData && !isFutureYear ? (
        <MonthGrid
          year={year}
          monthDataByKey={monthDataByKey}
          getMonthColorAndScale={getMonthColorAndScale}
          today={today}
          tracking={tracking}
        />
      ) : (
        <EmptyMonthGrid />
      )}
    </button>
  );
});
YearButton.displayName = 'YearButton';

export const AllYearsOverview = memo(({
  monthDataByKey,
  selectedYear,
  onYearClick,
  valence,
  tracking,
}: AllYearsOverviewProps) => {
  const today = new Date();
  const currentYear = today.getFullYear();
  const yearButtonsRef = useRef<Map<number, HTMLButtonElement>>(new Map());

  // Scroll selected year into view when it changes
  useEffect(() => {
    const button = yearButtonsRef.current.get(selectedYear);
    if (button) {
      button.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }, [selectedYear]);

  // Extract all available years from monthDataByKey
  const availableYears = useMemo(() => {
    const years = new Set<number>();
    Object.keys(monthDataByKey).forEach((monthKey) => {
      const { year } = parseMonthKey(monthKey as MonthKey);
      years.add(year);
    });
    return Array.from(years).sort((a, b) => a - b);
  }, [monthDataByKey]);

  // Generate continuous year range with padding
  const allYears = useMemo(() => {
    // Combine available years with current year (what year it is now)
    const yearsWithData = new Set([...availableYears, currentYear]);
    
    if (yearsWithData.size === 0) {
      // Fallback (shouldn't happen since currentYear is always included)
      return [currentYear - 1, currentYear, currentYear + 1];
    }

    // Find min/max from years with data (including current year)
    const sortedYears = Array.from(yearsWithData).sort((a, b) => a - b);
    const minYear = sortedYears[0];
    const maxYear = sortedYears[sortedYears.length - 1];
    
    // Add 1 empty year before and after
    const start = minYear - 1;
    const end = maxYear + 1;
    
    const years: number[] = [];
    for (let year = start; year <= end; year++) {
      years.push(year);
    }
    
    return years;
  }, [availableYears, currentYear]);

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
  const getMonthColorAndScale = useCallback((monthKey: MonthKey): { color: string; scale: number } => {
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
  }, [monthDataByKey, tracking, minAbsValence, maxAbsValence, valence]);

  return (
    <div
      className="bg-white dark:bg-slate-900 rounded-lg p-6 mb-6 shadow-sm dark:shadow-md overflow-x-auto"
    >
      <div className="flex gap-6">
        {allYears.map((year) => {
          const isSelectedYear = year === selectedYear;
          const isFutureYear = year > currentYear;
          const hasYearData = availableYears.includes(year);

          return (
            <YearButton
              key={year}
              year={year}
              isSelectedYear={isSelectedYear}
              hasYearData={hasYearData}
              isFutureYear={isFutureYear}
              monthDataByKey={monthDataByKey}
              today={today}
              getMonthColorAndScale={getMonthColorAndScale}
              onYearClick={onYearClick}
              yearButtonRef={(el) => {
                if (el) {
                  yearButtonsRef.current.set(year, el);
                }
              }}
              tracking={tracking}
            />
          );
        })}
      </div>
    </div>
  );
}) as React.FC<AllYearsOverviewProps>;
AllYearsOverview.displayName = 'AllYearsOverview';
