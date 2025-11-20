import React, { useState } from 'react';
import { NumbersPanel } from '../panel/NumbersPanel';

export interface DayCellProps {
  date: Date;
  numbers: number[];
  onSave: (numbers: number[]) => void;
  monthMin?: number;
  monthMax?: number;
}

export const DayCell: React.FC<DayCellProps> = ({ date, numbers, onSave, monthMin, monthMax }) => {
  const [editMode, setEditMode] = useState(false);

  const isToday = date.toDateString() === new Date().toDateString();

  const total = numbers.reduce((a: number, b: number) => a + b, 0);
  const count = numbers.length;
  const hasData = count > 0;
  const isPast = date < new Date(new Date().toDateString());
  const isFuture = date > new Date(new Date().toDateString());

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
        <div className={`text-sm font-bold mb-2 text-right ${isToday ? 'text-blue-700 dark:text-blue-300' : 'text-slate-600 dark:text-slate-300'}`}>
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

        {hasData && (
          <div className="flex-1 flex flex-col gap-2 text-xs">
            {/* Total - Primary metric */}
            <div className={`w-full px-3 rounded text-center font-mono font-bold text-lg ${
              total > 0 
                ? 'bg-green-100 dark:bg-[#1a3a2a] text-green-700 dark:text-green-200' 
                : total < 0 
                  ? 'bg-red-100 dark:bg-[#3a1a1a] text-red-700 dark:text-red-200' 
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
            }`}>
              {total}
            </div>

            {/* Entry count */}
            <div className="text-[10px] text-slate-500 dark:text-slate-400 text-center">
              {count} {count === 1 ? 'entry' : 'entries'}
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
      />
    </div>
  );
};

