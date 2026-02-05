
import { NumberText } from '@/components/ui/number-text';
import type { Tracking, Valence } from '@/features/db/localdb';
import { getCalendarData } from '@/lib/calendar';
import { getRelativeSize } from '@/lib/charts';
import { type StatsExtremes } from '@/lib/stats';
import { getValenceValueForNumber } from '@/lib/tracking';
import { getValueForValence } from '@/lib/valence';
import { Skull, TrendingDown, TrendingUp, TrendingUpDown, Trophy } from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { NumbersPanel } from '../panel/NumbersPanel';

export interface DayCellProps {
  date: Date;
  numbers: number[];
  onSave: (numbers: number[]) => void;
  monthExtremes?: StatsExtremes;
  valence: Valence;
  priorNumbers?: number[];
  tracking: Tracking;
}

export const DayCell: React.FC<DayCellProps> = ({ date, numbers, onSave, monthExtremes, valence, priorNumbers, tracking }) => {
  const [editMode, setEditMode] = useState(false);

  const isToday = date.toDateString() === new Date().toDateString();

  const isPast = date < new Date(new Date().toDateString());
  const isFuture = date > new Date(new Date().toDateString());

  // Use getCalendarData for all stats, deltas, extremes, valence, etc.
  const {
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
  } = useMemo(() => getCalendarData(numbers, priorNumbers, monthExtremes, tracking), [numbers, priorNumbers, monthExtremes, tracking]);
  
  const count = numbers.length;
  const hasData = count > 0;
  const highExtremesCount = [isHighestPrimary, isHighestMean, isHighestMedian, isHighestMin, isHighestMax].filter(Boolean).length;
  const lowExtremesCount = [isLowestPrimary, isLowestMean, isLowestMedian, isLowestMin, isLowestMax].filter(Boolean).length;
  const nonPrimaryHighCount = [isHighestMean, isHighestMedian, isHighestMin, isHighestMax].filter(Boolean).length;
  const nonPrimaryLowCount = [isLowestMean, isLowestMedian, isLowestMin, isLowestMax].filter(Boolean).length;
  const nonPrimaryExtremesCount = nonPrimaryHighCount + nonPrimaryLowCount;
  const mixedExtremes = highExtremesCount > 0 && lowExtremesCount > 0;
  // Show badge only if there is at least one non-primary extreme (primary alone already highlighted in main cell)
  const showExtremesBadge = hasData && nonPrimaryExtremesCount > 0;

  // Unified color logic for future tiles
  let bgColor;
  let ghostClasses = '';
  if (isFuture) {
    bgColor = 'bg-slate-100 dark:bg-slate-800/60'; // Faded neutral, ghosted
    ghostClasses = 'opacity-50 cursor-default hover:shadow-none';
  } else if (!hasData) {
    bgColor = isPast ? 'bg-slate-100 dark:bg-slate-800' : 'bg-slate-50 dark:bg-slate-900';
  } else {
    bgColor = getValueForValence(primaryValenceMetric, valence, {
      good: 'bg-green-50 dark:bg-[#1a3a2a]',
      bad: 'bg-red-50 dark:bg-[#3a1a1a]',
      neutral: 'bg-slate-100 dark:bg-slate-800',
    });
  }

  function handleClose(): void {
    setEditMode(false);
  }

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
                  : getValueForValence(
                      highExtremesCount > 0 ? 1 : -1,
                      valence,
                      {
                        good: 'text-green-600 dark:text-green-400',
                        bad: 'text-red-600 dark:text-red-400',
                        neutral: 'text-slate-500 dark:text-slate-400',
                      }
                    )
              }`}
              title={`Day has ${highExtremesCount} high and ${lowExtremesCount} low extremes (total/mean/median/min/max)`}
            >
              {mixedExtremes ? (
                <span className="flex items-center gap-0.5">
                  { valence == 'neutral' ? (
                    <TrendingUpDown className="h-3 w-3 text-slate-500 dark:text-slate-400" />
                  ) : (
                    <>
                      <Trophy className="h-3 w-3 text-green-600 dark:text-green-400" />
                      <Skull className="h-3 w-3 text-red-600 dark:text-red-400" />
                    </>
                  )}
                  <span className="opacity-70">×{highExtremesCount + lowExtremesCount}</span>
                </span>
              ) : (
                (() => {
                  const isHigh = highExtremesCount > 0;
                  const count = isHigh ? highExtremesCount : lowExtremesCount;
                  const icon = getValueForValence(isHigh, valence, {
                    good: <Trophy className="h-3 w-3" />,
                    bad: <Skull className="h-3 w-3" />,
                    neutral: isHigh ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />,
                  });
                  return (
                    <span className="flex items-center gap-0.5">
                      {icon}
                      <span className="opacity-70">×{count}</span>
                    </span>
                  );
                })()
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
            {/* Primary metric (total or mean) */}
            <div className={`w-full px-3 py-1 rounded text-center flex items-center justify-center gap-1.5`}>
              <NumberText
                value={primaryMetric}
                valenceValue={primaryValenceMetric}
                isHighest={!!isHighestPrimary}
                isLowest={!!isLowestPrimary}
                valence={valence}
                className="font-mono font-bold text-lg"
              />
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
                const scale = getRelativeSize(num, { min: monthExtremes?.lowestMin, max: monthExtremes?.highestMax }, 0.4, 1);
                const size = scale * 8; // Base size 8px, scaled down to ~3.2px min
                const prioNum = numbers[idx - 1] ?? priorNumbers?.[priorNumbers?.length - 1];
                const colorClass = getValueForValence(getValenceValueForNumber(num, prioNum, tracking), valence, {
                  good: 'bg-green-500 dark:bg-green-600',
                  bad: 'bg-red-500 dark:bg-red-600',
                  neutral: 'bg-slate-400 dark:bg-slate-500',
                });
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
        priorNumbers={priorNumbers}
        editableNumbers
        showExpressionInput
        onSave={onSave}
        extremes={monthExtremes}
        valence={valence}
        tracking={tracking}
      />
    </div>
  );
};

