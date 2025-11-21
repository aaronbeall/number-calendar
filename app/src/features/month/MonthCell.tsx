import { useMemo } from 'react';
import { computeNumberStats } from '@/lib/stats';
import { Trophy, Skull } from 'lucide-react';
import type { StatsExtremes } from '@/lib/stats';

interface MonthCellProps {
  monthName: string;
  numbers: number[];
  monthDays?: { date: Date; numbers: number[] }[];
  isCurrentMonth: boolean;
  isFutureMonth?: boolean;
  isSelected?: boolean;
  yearExtremes?: StatsExtremes;
  onClick: () => void;
}

export function MonthCell({ monthName, numbers, monthDays = [], isCurrentMonth, isFutureMonth = false, isSelected = false, yearExtremes, onClick }: MonthCellProps) {
  const stats = useMemo(() => computeNumberStats(numbers), [numbers]);
  
    // Check if this month has extreme values
    const isHighestTotal = yearExtremes && stats && stats.total === yearExtremes.highestTotal;
    const isLowestTotal = yearExtremes && stats && stats.total === yearExtremes.lowestTotal;
    const isHighestCount = yearExtremes && stats && stats.count === yearExtremes.highestCount;
    const isHighestMean = yearExtremes && stats && stats.mean === yearExtremes.highestMean;
    const isLowestMean = yearExtremes && stats && stats.mean === yearExtremes.lowestMean;
    const isHighestMedian = yearExtremes && stats && stats.median === yearExtremes.highestMedian;
    const isLowestMedian = yearExtremes && stats && stats.median === yearExtremes.lowestMedian;
    const isHighestMin = yearExtremes && stats && stats.min === yearExtremes.highestMin;
    const isLowestMin = yearExtremes && stats && stats.min === yearExtremes.lowestMin;
    const isHighestMax = yearExtremes && stats && stats.max === yearExtremes.highestMax;
    const isLowestMax = yearExtremes && stats && stats.max === yearExtremes.lowestMax;
  
  // Unified tile style for monthly grid, with color effect
  const getColorClasses = () => {
    if (!stats) {
      return 'bg-slate-50 dark:bg-slate-800 shadow-sm dark:shadow-md hover:shadow-md dark:hover:shadow-lg rounded-lg transition-all duration-200';
    } else if (stats.total > 0) {
      return 'bg-green-50 dark:bg-[#1a3a2a] shadow-sm dark:shadow-md hover:shadow-md dark:hover:shadow-lg rounded-lg transition-all duration-200';
    } else if (stats.total < 0) {
      return 'bg-red-50 dark:bg-[#3a1a1a] shadow-sm dark:shadow-md hover:shadow-md dark:hover:shadow-lg rounded-lg transition-all duration-200';
    } else {
      return 'bg-slate-50 dark:bg-slate-800 shadow-sm dark:shadow-md hover:shadow-md dark:hover:shadow-lg rounded-lg transition-all duration-200';
    }
  };

  // Removed: getTextColorClass (replaced by per-stat getValueColorClass)

  // Per-stat value color (positive/negative/neutral)
  const getValueColorClass = (val?: number) => {
    if (val === undefined || val === null) return 'text-slate-700 dark:text-slate-200';
    if (val > 0) return 'text-green-700 dark:text-green-300';
    if (val < 0) return 'text-red-700 dark:text-red-300';
    return 'text-slate-700 dark:text-slate-200';
  };

  // Total uses same coloring as other stats via getValueColorClass

  const ghostClasses = isFutureMonth ? 'bg-slate-100 dark:bg-slate-800/60 opacity-50 saturate-0 cursor-default hover:shadow-none' : '';

  return (
    <div
      onClick={isFutureMonth ? undefined : onClick}
      className={`h-full
        relative p-4 rounded-lg transition-all duration-200 shadow-sm dark:shadow-md
        ${isFutureMonth ? ghostClasses : 'cursor-pointer hover:scale-[1.02] hover:shadow-lg dark:hover:shadow-2xl'}
        ${!isFutureMonth ? getColorClasses() : ''}
        ${isSelected ? 'ring-2 ring-blue-400/80 ring-offset-2 ring-offset-white dark:ring-blue-300/70 dark:ring-offset-slate-900' : ''}
      `}
      tabIndex={isFutureMonth ? -1 : 0}
      aria-disabled={isFutureMonth}
    >
      {/* Month name */}
      <div className={`text-sm font-semibold mb-3 text-center relative ${isCurrentMonth ? 'text-blue-700 dark:text-blue-300' : 'text-slate-700 dark:text-slate-200'}`}>
        {monthName}
        {isCurrentMonth && (
          <span
            className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-blue-500 dark:bg-blue-400"
            aria-label="Current month indicator"
          />
        )}
      </div>

      {/* Stats grid */}
      {stats && stats.count > 0 ? (
        <div className="space-y-3">
          {/* Total - Most important metric, centered and prominent */}
          <div className="text-center">
            {(isHighestTotal || isLowestTotal) ? (
              <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border ${
                isHighestTotal
                  ? 'bg-green-50/40 dark:bg-green-950/20 border-green-200/40 dark:border-green-800/40'
                  : 'bg-red-50/40 dark:bg-red-950/20 border-red-200/40 dark:border-red-800/40'
              }`}>
                <div className={`text-3xl font-bold ${getValueColorClass(stats.total)}`}>
                  {stats.total}
                </div>
                {isHighestTotal && (
                  <div title="Highest total">
                    <Trophy className="h-4 w-4 text-green-600 dark:text-green-400" />
                  </div>
                )}
                {isLowestTotal && (
                  <div title="Lowest total">
                    <Skull className="h-4 w-4 text-red-600 dark:text-red-400" />
                  </div>
                )}
              </div>
            ) : (
              <div className={`text-3xl font-bold ${getValueColorClass(stats.total)}`}>
                {stats.total}
              </div>
            )}
            <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
              {isHighestCount ? (
                <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded border bg-slate-50/40 dark:bg-slate-800/40 border-slate-200/40 dark:border-slate-700/40">
                  <div title="Most entries">
                    <Trophy className="h-2.5 w-2.5 text-slate-600 dark:text-slate-400" />
                  </div>
                  <span>{stats.count} {stats.count === 1 ? 'entry' : 'entries'}</span>
                </div>
              ) : (
                <span>{stats.count} {stats.count === 1 ? 'entry' : 'entries'}</span>
              )}
            </div>
          </div>

          {/* Calendar dots - Full width, larger and more visible */}
          {monthDays.length > 0 && (
            <div className="flex justify-center px-1">
              {(() => {
                const today = new Date();
                const firstDate = monthDays[0].date;
                const year = firstDate.getFullYear();
                const monthIndex = firstDate.getMonth();
                const firstDayOfWeek = new Date(year, monthIndex, 1).getDay();
                const lastDayOfMonth = new Date(year, monthIndex + 1, 0).getDate();
                const lastDayOfWeek = new Date(year, monthIndex + 1, 0).getDay();
                const padStart = firstDayOfWeek;
                const padEnd = 6 - lastDayOfWeek;
                const dayCells: React.ReactElement[] = [];
                
                // Padding before first day
                for (let i = 0; i < padStart; i++) {
                  dayCells.push(<div key={`pad-start-${i}`} className="w-1.5 h-1.5 opacity-0" />);
                }
                
                // Actual days
                for (let d = 1; d <= lastDayOfMonth; d++) {
                  const dayObj = monthDays[d - 1];
                  const date = dayObj.date;
                  const numbersForDay = dayObj.numbers;
                  const totalDay = numbersForDay.reduce((a, b) => a + b, 0);
                  const isFuture = date > today;
                  const baseClass = 'w-1.5 h-1.5 rounded-full transition-all duration-200';
                  let colorClass;
                  
                  if (isFuture) {
                    colorClass = 'bg-slate-200 dark:bg-slate-700/30';
                  } else if (numbersForDay.length === 0) {
                    colorClass = 'bg-slate-300 dark:bg-slate-600/40';
                  } else if (totalDay > 0) {
                    colorClass = 'bg-green-500 dark:bg-green-600 ring-1 ring-green-400/20';
                  } else if (totalDay < 0) {
                    colorClass = 'bg-red-500 dark:bg-red-600 ring-1 ring-red-400/20';
                  } else {
                    colorClass = 'bg-slate-400 dark:bg-slate-500';
                  }
                  
                  dayCells.push(
                    <div
                      key={`day-${d}`}
                      className={`${baseClass} ${colorClass}`}
                      title={`${monthName} ${d}: ${totalDay}`}
                    />
                  );
                }
                
                // Padding after last day
                for (let i = 0; i < padEnd; i++) {
                  dayCells.push(<div key={`pad-end-${i}`} className="w-1.5 h-1.5 opacity-0" />);
                }
                
                return (
                  <div className="grid grid-cols-7 gap-1 justify-items-center">
                    {dayCells}
                  </div>
                );
              })()}
            </div>
          )}

          {/* Divider */}
          <div className="border-t border-slate-200 dark:border-slate-700/50" />

          {/* Stats grid - Compact 2x2 layout */}
          <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
            <div className="text-center">
              <div className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-0.5">
                Mean
              </div>
              {(isHighestMean || isLowestMean) ? (
                <div className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded border text-sm font-semibold ${
                  isHighestMean
                    ? 'bg-green-50/40 dark:bg-green-950/20 border-green-200/40 dark:border-green-800/40'
                    : 'bg-red-50/40 dark:bg-red-950/20 border-red-200/40 dark:border-red-800/40'
                } ${getValueColorClass(stats.mean)}`}>
                  <span>{stats.mean?.toFixed(1) ?? '-'}</span>
                  {isHighestMean && (
                    <div title="Highest mean">
                      <Trophy className="h-2.5 w-2.5 text-green-600 dark:text-green-400" />
                    </div>
                  )}
                  {isLowestMean && (
                    <div title="Lowest mean">
                      <Skull className="h-2.5 w-2.5 text-red-600 dark:text-red-400" />
                    </div>
                  )}
                </div>
              ) : (
                <div className={`font-semibold text-sm ${getValueColorClass(stats.mean)}`}>
                  {stats.mean?.toFixed(1) ?? '-'}
                </div>
              )}
            </div>
            <div className="text-center">
              <div className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-0.5">
                Median
              </div>
              {(isHighestMedian || isLowestMedian) ? (
                <div className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded border text-sm font-semibold ${
                  isHighestMedian
                    ? 'bg-green-50/40 dark:bg-green-950/20 border-green-200/40 dark:border-green-800/40'
                    : 'bg-red-50/40 dark:bg-red-950/20 border-red-200/40 dark:border-red-800/40'
                } ${getValueColorClass(stats.median)}`}>
                  <span>{stats.median?.toFixed(1) ?? '-'}</span>
                  {isHighestMedian && (
                    <div title="Highest median">
                      <Trophy className="h-2.5 w-2.5 text-green-600 dark:text-green-400" />
                    </div>
                  )}
                  {isLowestMedian && (
                    <div title="Lowest median">
                      <Skull className="h-2.5 w-2.5 text-red-600 dark:text-red-400" />
                    </div>
                  )}
                </div>
              ) : (
                <div className={`font-semibold text-sm ${getValueColorClass(stats.median)}`}>
                  {stats.median?.toFixed(1) ?? '-'}
                </div>
              )}
            </div>
            <div className="text-center">
              <div className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-0.5">
                Min
              </div>
              {(isHighestMin || isLowestMin) ? (
                <div className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded border text-sm font-semibold ${
                  isHighestMin
                    ? 'bg-green-50/40 dark:bg-green-950/20 border-green-200/40 dark:border-green-800/40'
                    : 'bg-red-50/40 dark:bg-red-950/20 border-red-200/40 dark:border-red-800/40'
                } ${getValueColorClass(stats.min)}`}>
                  <span>{stats.min}</span>
                  {isHighestMin && (
                    <div title="Highest min">
                      <Trophy className="h-2.5 w-2.5 text-green-600 dark:text-green-400" />
                    </div>
                  )}
                  {isLowestMin && (
                    <div title="Lowest min">
                      <Skull className="h-2.5 w-2.5 text-red-600 dark:text-red-400" />
                    </div>
                  )}
                </div>
              ) : (
                <div className={`font-semibold text-sm ${getValueColorClass(stats.min)}`}>
                  {stats.min}
                </div>
              )}
            </div>
            <div className="text-center">
              <div className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-0.5">
                Max
              </div>
              {(isHighestMax || isLowestMax) ? (
                <div className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded border text-sm font-semibold ${
                  isHighestMax
                    ? 'bg-green-50/40 dark:bg-green-950/20 border-green-200/40 dark:border-green-800/40'
                    : 'bg-red-50/40 dark:bg-red-950/20 border-red-200/40 dark:border-red-800/40'
                } ${getValueColorClass(stats.max)}`}>
                  <span>{stats.max}</span>
                  {isHighestMax && (
                    <div title="Highest max">
                      <Trophy className="h-2.5 w-2.5 text-green-600 dark:text-green-400" />
                    </div>
                  )}
                  {isLowestMax && (
                    <div title="Lowest max">
                      <Skull className="h-2.5 w-2.5 text-red-600 dark:text-red-400" />
                    </div>
                  )}
                </div>
              ) : (
                <div className={`font-semibold text-sm ${getValueColorClass(stats.max)}`}>
                  {stats.max}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center text-slate-400 dark:text-slate-500 text-sm py-4"></div>
      )}
    </div>
  );
}