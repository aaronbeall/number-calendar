import { useMemo } from 'react';
import { computeNumberStats } from '@/lib/stats';
import { Trophy } from 'lucide-react';
import type { StatsExtremes } from '@/lib/stats';
import { NumberText } from '@/components/ui/number-text';
import { getValueForValence } from '@/lib/valence';
import type { Valence } from '@/features/db/localdb';

interface MonthCellProps {
  monthName: string;
  numbers: number[];
  monthDays?: { date: Date; numbers: number[] }[];
  isCurrentMonth: boolean;
  isFutureMonth?: boolean;
  isSelected?: boolean;
  yearExtremes?: StatsExtremes;
  onClick: () => void;
  valence: Valence;
}

export function MonthCell({ monthName, numbers, monthDays = [], isCurrentMonth, isFutureMonth = false, isSelected = false, yearExtremes, onClick, valence }: MonthCellProps) {
  const stats = useMemo(() => computeNumberStats(numbers), [numbers]);
  
  // Calculate dot sizes based on year's extremes
  const getRelativeSize = (value: number): number => {
    if (!yearExtremes || (yearExtremes.highestMax === undefined && yearExtremes.lowestMin === undefined)) return 1;
    const absValue = Math.abs(value);
    const absMin = Math.abs(yearExtremes.lowestMin ?? 0);
    const absMax = Math.abs(yearExtremes.highestMax ?? 0);
    const maxMagnitude = Math.max(absMin, absMax);
    if (maxMagnitude === 0) return 1;
    // Scale from 0.6 to 2.4 based on relative magnitude
    return .6 + (absValue / maxMagnitude) * 1.8;
  };
  
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
  
  // Unified tile style for monthly grid, with color effect (valence-aware)
  const getColorClasses = () => {
    if (!stats) {
      return 'bg-slate-50 dark:bg-slate-800 shadow-sm dark:shadow-md hover:shadow-md dark:hover:shadow-lg rounded-lg transition-all duration-200';
    }
    return getValueForValence(stats.total, valence, {
      good: 'bg-green-50 dark:bg-[#1a3a2a] shadow-sm dark:shadow-md hover:shadow-md dark:hover:shadow-lg rounded-lg transition-all duration-200',
      bad: 'bg-red-50 dark:bg-[#3a1a1a] shadow-sm dark:shadow-md hover:shadow-md dark:hover:shadow-lg rounded-lg transition-all duration-200',
      neutral: 'bg-slate-50 dark:bg-slate-800 shadow-sm dark:shadow-md hover:shadow-md dark:hover:shadow-lg rounded-lg transition-all duration-200',
    });
  };

  // Per-stat value color handled by NumberText component
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
            <NumberText value={stats.total} isHighest={!!isHighestTotal} isLowest={!!isLowestTotal} className="text-3xl font-bold" valence={valence} />
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
                  const scale = getRelativeSize(totalDay);
                  const baseClass = 'w-1.5 h-1.5 rounded-full transition-all duration-200';
                  let colorClass;
                  if (isFuture) {
                    colorClass = 'bg-slate-200 dark:bg-slate-700/30';
                  } else if (numbersForDay.length === 0) {
                    colorClass = 'bg-slate-300 dark:bg-slate-600/40';
                  } else {
                    colorClass = getValueForValence(totalDay, valence, {
                      good: 'bg-green-500 dark:bg-green-600 ring-1 ring-green-400/20',
                      bad: 'bg-red-500 dark:bg-red-600 ring-1 ring-red-400/20',
                      neutral: 'bg-slate-400 dark:bg-slate-500',
                    });
                  }
                  dayCells.push(
                    <div
                      key={`day-${d}`}
                      className={`${baseClass} ${colorClass}`}
                      style={{
                        transform: `scale(${scale})`,
                      }}
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
              <NumberText value={stats.mean as number} isHighest={!!isHighestMean} isLowest={!!isLowestMean} className="font-semibold text-sm" formatOptions={{ minimumFractionDigits: 1, maximumFractionDigits: 1 }} valence={valence} />
            </div>
            <div className="text-center">
              <div className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-0.5">
                Median
              </div>
              <NumberText value={stats.median as number} isHighest={!!isHighestMedian} isLowest={!!isLowestMedian} className="font-semibold text-sm" formatOptions={{ minimumFractionDigits: 1, maximumFractionDigits: 1 }} valence={valence} />
            </div>
            <div className="text-center">
              <div className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-0.5">
                Min
              </div>
              <NumberText value={stats.min} isHighest={!!isHighestMin} isLowest={!!isLowestMin} className="font-semibold text-sm" valence={valence} />
            </div>
            <div className="text-center">
              <div className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-0.5">
                Max
              </div>
              <NumberText value={stats.max} isHighest={!!isHighestMax} isLowest={!!isLowestMax} className="font-semibold text-sm" valence={valence} />
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center text-slate-400 dark:text-slate-500 text-sm py-4"></div>
      )}
    </div>
  );
}