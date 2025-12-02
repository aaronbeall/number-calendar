import { NumberText } from '@/components/ui/number-text';
import type { Tracking, Valence } from '@/features/db/localdb';
import type { StatsExtremes } from '@/lib/stats';
import { getCalendarData } from '@/lib/calendar';
import { getValueForValence } from '@/lib/valence';
import { Trophy } from 'lucide-react';
import { useMemo, useState } from 'react';
import { NumbersPanel } from '@/features/panel/NumbersPanel';
import { CalendarDays } from 'lucide-react';
import { getRelativeSize } from '@/lib/charts';

interface MonthCellProps {
  month: number;
  monthName: string;
  numbers: number[];
  priorNumbers?: number[];
  monthDays?: { date: Date; numbers: number[] }[];
  isCurrentMonth: boolean;
  isFutureMonth?: boolean;
  yearExtremes?: StatsExtremes;
  onOpenMonth: (monthNumber: number) => void;
  valence: Valence;
  tracking: Tracking;
}

export function MonthCell({ month, monthName, numbers, priorNumbers, monthDays = [], isCurrentMonth, isFutureMonth = false, yearExtremes, onOpenMonth, valence, tracking }: MonthCellProps) {
  const [panelOpen, setPanelOpen] = useState(false);
  
  // Use getCalendarData for all stats, deltas, extremes, valence, etc.
  const {
    stats,
    valenceStats,
    primaryMetric,
    primaryValenceMetric,
    isHighestPrimary,
    isLowestPrimary,
    isHighestCount,
    isHighestMean,
    isLowestMean,
    isHighestMedian,
    isLowestMedian,
    isHighestMin,
    isLowestMin,
    isHighestMax,
    isLowestMax,
  } = useMemo(() => getCalendarData(numbers, priorNumbers, yearExtremes, tracking), [numbers, priorNumbers, yearExtremes, tracking]);
  
  // Unified tile style for monthly grid, with color effect (valence-aware)
  const getColorClasses = () => {
    if (!stats) {
      return 'bg-slate-50 dark:bg-slate-800 shadow-sm dark:shadow-md hover:shadow-md dark:hover:shadow-lg rounded-lg transition-all duration-200';
    }
    return getValueForValence(primaryValenceMetric ?? 0, valence, {
      good: 'bg-green-50 dark:bg-[#1a3a2a] shadow-sm dark:shadow-md hover:shadow-md dark:hover:shadow-lg rounded-lg transition-all duration-200',
      bad: 'bg-red-50 dark:bg-[#3a1a1a] shadow-sm dark:shadow-md hover:shadow-md dark:hover:shadow-lg rounded-lg transition-all duration-200',
      neutral: 'bg-slate-50 dark:bg-slate-800 shadow-sm dark:shadow-md hover:shadow-md dark:hover:shadow-lg rounded-lg transition-all duration-200',
    });
  };

  // Per-stat value color handled by NumberText component
  // Total uses same coloring as other stats via getValueColorClass

  const ghostClasses = isFutureMonth ? 'bg-slate-100 dark:bg-slate-800/60 opacity-50 saturate-0 cursor-default hover:shadow-none' : '';

  // Highlight if panel is open
  const isSelected = panelOpen;

  return (
    <div
      onClick={isFutureMonth ? undefined : () => setPanelOpen(true)}
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
      {/* NumbersPanel for this month */}
      <NumbersPanel
        isOpen={panelOpen}
        title={`${monthName}`}
        numbers={numbers}
        priorNumbers={priorNumbers}
        extremes={yearExtremes}
        editableNumbers={false}
        showExpressionInput={false}
        actionLabel={"Open daily view"}
        actionOnClick={() => {
          setPanelOpen(false);
          onOpenMonth(month);
        }}
        actionIcon={<CalendarDays className="h-4 w-4" />}
        onClose={() => setPanelOpen(false)}
        valence={valence}
        tracking={tracking}
      />

      {/* Stats grid */}
      {stats && stats.count > 0 ? (
        <div className="space-y-3">
          {/* Primary metric - Most important metric, centered and prominent */}
          <div className="text-center">
            <NumberText value={primaryMetric ?? 0} valenceValue={primaryValenceMetric} isHighest={!!isHighestPrimary} isLowest={!!isLowestPrimary} className="text-3xl font-bold" valence={valence} />
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
                  const scale = getRelativeSize(totalDay, { min: yearExtremes?.lowestTotal, max: yearExtremes?.highestTotal }, 0.6, 2);
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
              <NumberText value={stats.mean} valenceValue={valenceStats?.mean ?? primaryValenceMetric} isHighest={!!isHighestMean} isLowest={!!isLowestMean} className="font-semibold text-sm" formatOptions={{ minimumFractionDigits: 1, maximumFractionDigits: 1 }} valence={valence} />
            </div>
            <div className="text-center">
              <div className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-0.5">
                Median
              </div>
              <NumberText value={stats.median} valenceValue={valenceStats?.median ?? primaryValenceMetric} isHighest={!!isHighestMedian} isLowest={!!isLowestMedian} className="font-semibold text-sm" formatOptions={{ minimumFractionDigits: 1, maximumFractionDigits: 1 }} valence={valence} />
            </div>
            <div className="text-center">
              <div className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-0.5">
                Min
              </div>
              <NumberText value={stats.min} valenceValue={valenceStats?.min ?? primaryValenceMetric} isHighest={!!isHighestMin} isLowest={!!isLowestMin} className="font-semibold text-sm" valence={valence} />
            </div>
            <div className="text-center">
              <div className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-0.5">
                Max
              </div>
              <NumberText value={stats.max} valenceValue={valenceStats?.max ?? primaryValenceMetric} isHighest={!!isHighestMax} isLowest={!!isLowestMax} className="font-semibold text-sm" valence={valence} />
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center text-slate-400 dark:text-slate-500 text-sm py-4"></div>
      )}
    </div>
  );
}