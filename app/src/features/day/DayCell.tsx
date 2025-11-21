import React, { useState } from 'react';
import { Trophy, Skull } from 'lucide-react';
import { NumbersPanel } from '../panel/NumbersPanel';
import { NumberText } from '@/components/ui/number-text';
import type { StatsExtremes } from '@/lib/stats';
import { computeNumberStats } from '@/lib/stats';

export interface DayCellProps {
  date: Date;
  numbers: number[];
  onSave: (numbers: number[]) => void;
  monthMin?: number;
  monthMax?: number;
  monthExtremes?: StatsExtremes;
}

export const DayCell: React.FC<DayCellProps> = ({ date, numbers, onSave, monthMin, monthMax, monthExtremes }) => {
  const [editMode, setEditMode] = useState(false);

  const isToday = date.toDateString() === new Date().toDateString();

  const total = numbers.reduce((a: number, b: number) => a + b, 0);
  const count = numbers.length;
  const hasData = count > 0;
  const isPast = date < new Date(new Date().toDateString());
  const isFuture = date > new Date(new Date().toDateString());
  const dayStats = hasData ? computeNumberStats(numbers) : null;

  // Check if this day has extreme values
  const isHighestTotal = monthExtremes && hasData && total === monthExtremes.highestTotal;
  const isLowestTotal = monthExtremes && hasData && total === monthExtremes.lowestTotal;
  const isHighestCount = monthExtremes && hasData && count === monthExtremes.highestCount;
  const isHighestMean = monthExtremes && dayStats && dayStats.mean === monthExtremes.highestMean;
  const isLowestMean = monthExtremes && dayStats && dayStats.mean === monthExtremes.lowestMean;
  const isHighestMedian = monthExtremes && dayStats && dayStats.median === monthExtremes.highestMedian;
  const isLowestMedian = monthExtremes && dayStats && dayStats.median === monthExtremes.lowestMedian;
  const isHighestMin = monthExtremes && dayStats && dayStats.min === monthExtremes.highestMin;
  const isLowestMin = monthExtremes && dayStats && dayStats.min === monthExtremes.lowestMin;
  const isHighestMax = monthExtremes && dayStats && dayStats.max === monthExtremes.highestMax;
  const isLowestMax = monthExtremes && dayStats && dayStats.max === monthExtremes.lowestMax;

  // Count extremes including totals; separate non-total for display logic
  const highExtremesCount = [isHighestTotal, isHighestMean, isHighestMedian, isHighestMin, isHighestMax].filter(Boolean).length;
  const lowExtremesCount = [isLowestTotal, isLowestMean, isLowestMedian, isLowestMin, isLowestMax].filter(Boolean).length;
  const nonTotalHighCount = [isHighestMean, isHighestMedian, isHighestMin, isHighestMax].filter(Boolean).length;
  const nonTotalLowCount = [isLowestMean, isLowestMedian, isLowestMin, isLowestMax].filter(Boolean).length;
  const nonTotalExtremesCount = nonTotalHighCount + nonTotalLowCount;
  const mixedExtremes = highExtremesCount > 0 && lowExtremesCount > 0;
  // Show badge only if there is at least one non-total extreme (total alone already highlighted in main cell)
  const showExtremesBadge = hasData && nonTotalExtremesCount > 0;

  // Unified color logic for future tiles
  let bgColor;
  let ghostClasses = '';
  if (isFuture) {
    bgColor = 'bg-slate-100 dark:bg-slate-800/60'; // Faded neutral, ghosted
    ghostClasses = 'opacity-50 saturate-0 cursor-default hover:shadow-none';
  } else if (!hasData) {
    bgColor = isPast ? 'bg-slate-100 dark:bg-slate-800' : 'bg-slate-50 dark:bg-slate-900';
  } else if (total > 0) {
    bgColor = 'bg-green-50 dark:bg-[#1a3a2a]'; // Muted dark green
  } else if (total < 0) {
    bgColor = 'bg-red-50 dark:bg-[#3a1a1a]'; // Muted dark red
  } else {
    // total === 0, neutral
    bgColor = isPast ? 'bg-slate-100 dark:bg-slate-800' : 'bg-slate-50 dark:bg-slate-900';
  }

  function handleClose(): void {
    setEditMode(false);
  }

  // Calculate dot sizes based on month's min/max
  const getRelativeSize = (value: number): number => {
    if (monthMin === undefined || monthMax === undefined) return 1;
    const absValue = Math.abs(value);
    const absMin = Math.abs(monthMin);
    const absMax = Math.abs(monthMax);
    const maxMagnitude = Math.max(absMin, absMax);
    if (maxMagnitude === 0) return 1;
    // Scale from 0.4 to 1.0 based on relative magnitude
    return 0.4 + (absValue / maxMagnitude) * 0.6;
  };

  return (
    <div className="relative h-full">
      <div
        className={`p-3 h-full flex flex-col rounded-lg transition-all duration-200 shadow-sm dark:shadow-md ${
          isFuture ? '' : 'cursor-pointer hover:scale-[1.02] hover:shadow-lg dark:hover:shadow-2xl'
        } hover:shadow-md dark:hover:shadow-lg ${editMode ? 'ring-2 ring-blue-400/80 ring-offset-2 ring-offset-white dark:ring-blue-300/70 dark:ring-offset-slate-900' : ''} ${bgColor} ${ghostClasses}`}
        onClick={isFuture ? undefined : () => setEditMode(true)}
        tabIndex={isFuture ? -1 : 0}
        role="button"
        aria-label={`Edit day ${date.getDate()}`}
        aria-disabled={isFuture}
      >
        <div className="flex items-start mb-2">
          {showExtremesBadge && (
            <div
              className={`flex items-center gap-1 text-[10px] font-mono font-medium px-0 py-0 ${
                mixedExtremes
                  ? 'text-slate-500 dark:text-slate-400'
                  : highExtremesCount > 0
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-red-600 dark:text-red-400'
              }`}
              title={`Day has ${highExtremesCount} high and ${lowExtremesCount} low extremes (total/mean/median/min/max)`}
            >
              {mixedExtremes ? (
                <span className="flex items-center gap-0.5">
                  <Trophy className="h-3 w-3" />
                  <Skull className="h-3 w-3" />
                  <span className="opacity-70">×{highExtremesCount + lowExtremesCount}</span>
                </span>
              ) : highExtremesCount > 0 ? (
                <span className="flex items-center gap-0.5">
                  <Trophy className="h-3 w-3" />
                  <span className="opacity-70">×{highExtremesCount}</span>
                </span>
              ) : (
                <span className="flex items-center gap-0.5">
                  <Skull className="h-3 w-3" />
                  <span className="opacity-70">×{lowExtremesCount}</span>
                </span>
              )}
            </div>
          )}
          <div className={`ml-auto text-sm font-bold flex items-center justify-end ${isToday ? 'text-blue-700 dark:text-blue-300' : 'text-slate-600 dark:text-slate-300'}`}>
            <span className="inline-flex items-center justify-end gap-1">
              <span>{date.getDate()}</span>
              {isToday && (
                <span
                  className="w-2 h-2 rounded-full bg-blue-500 dark:bg-blue-400"
                  aria-label="Today indicator"
                />
              )}
            </span>
          </div>
        </div>

        {hasData && (
          <div className="flex-1 flex flex-col gap-2 text-xs">
            {/* Total - Primary metric */}
            <div className={`w-full px-3 py-1 rounded text-center flex items-center justify-center gap-1.5 ${
              total > 0 
                ? 'bg-green-100 dark:bg-[#1a3a2a] text-green-700 dark:text-green-200' 
                : total < 0 
                  ? 'bg-red-100 dark:bg-[#3a1a1a] text-red-700 dark:text-red-200' 
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
            }`}>
              <NumberText value={total} isHighest={!!isHighestTotal} isLowest={!!isLowestTotal} className="font-mono font-bold text-lg" />
            </div>

            {/* Entry count */}
            <div className="text-[10px] text-slate-500 dark:text-slate-400 text-center flex items-center justify-center gap-1">
              {isHighestCount ? (
                <div className="flex items-center gap-1 px-1.5 py-0.5 rounded border bg-slate-50/40 dark:bg-slate-800/40 border-slate-200/40 dark:border-slate-700/40">
                  <div title="Most entries">
                    <Trophy className="h-2.5 w-2.5 text-slate-600 dark:text-slate-400" />
                  </div>
                  <span>{count} {count === 1 ? 'entry' : 'entries'}</span>
                </div>
              ) : (
                <span>{count} {count === 1 ? 'entry' : 'entries'}</span>
              )}
            </div>

            {/* Micro dots visualization - Shows composition */}
            <div className="flex flex-wrap gap-1 justify-center items-center min-h-[16px] px-1">
              {numbers.map((num, idx) => {
                const scale = getRelativeSize(num);
                const size = scale * 8; // Base size 8px, scaled down to ~3.2px min
                let colorClass;
                if (num > 0) {
                  colorClass = 'bg-green-500 dark:bg-green-600';
                } else if (num < 0) {
                  colorClass = 'bg-red-500 dark:bg-red-600';
                } else {
                  colorClass = 'bg-slate-400 dark:bg-slate-500';
                }
                return (
                  <div
                    key={idx}
                    className={`rounded-full ${colorClass} transition-all duration-200`}
                    style={{
                      width: `${size}px`,
                      height: `${size}px`,
                    }}
                    title={`${num}`}
                  />
                );
              })}
            </div>
          </div>
        )}
      </div>
      <NumbersPanel
        isOpen={editMode}
        onClose={handleClose}
        title={date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
        numbers={numbers}
        editableNumbers
        showExpressionInput
        onSave={onSave}
        extremes={monthExtremes}
      />
    </div>
  );
};

