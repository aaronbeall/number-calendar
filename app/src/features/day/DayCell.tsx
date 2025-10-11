import React, { useState } from 'react';
import { DayEditor } from './DayEditor';
import { parseNumbers, buildExpressionFromNumbers } from '@/lib/expression';

export interface DayCellProps {
  date: Date;
  numbers: number[];
  onSave: (numbers: number[]) => void;
}

export const DayCell: React.FC<DayCellProps> = ({ date, numbers, onSave }) => {
  const [editMode, setEditMode] = useState(false);
  const [input, setInput] = useState(buildExpressionFromNumbers(numbers));

  // Update input when numbers prop changes (external updates)
  React.useEffect(() => {
    const expression = buildExpressionFromNumbers(numbers);
    setInput(expression);
  }, [numbers]);

  const handleSave = () => {
    const parsed = parseNumbers(input);
    onSave(parsed);
  };

  const currentNumbers = parseNumbers(input);

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
  return (
    <div className="relative h-full">
      <div
        className={`p-3 h-full flex flex-col rounded-lg transition-all duration-200 shadow-sm dark:shadow-md ${
          isFuture ? '' : 'cursor-pointer hover:scale-[1.02] hover:shadow-lg dark:hover:shadow-2xl'
        } hover:shadow-md dark:hover:shadow-lg ${
          isToday ? 'ring-2 ring-blue-400/80 ring-offset-2 ring-offset-white dark:ring-blue-300/70 dark:ring-offset-slate-900' : ''
        } ${bgColor} ${ghostClasses}`}
        onClick={isFuture ? undefined : () => setEditMode(true)}
        tabIndex={isFuture ? -1 : 0}
        role="button"
        aria-label={`Edit day ${date.getDate()}`}
        aria-disabled={isFuture}
      >
        <div className={`text-sm font-bold mb-2 text-right ${isToday ? 'text-blue-700 dark:text-blue-300' : 'text-slate-600 dark:text-slate-300'}`}>
          {date.getDate()}
        </div>

        {hasData && (
          <div className="flex-1 flex flex-col gap-2 text-xs">
            <div className="text-[10px] text-slate-500 dark:text-slate-400 text-center">
              {count} entries
            </div>
            <div className={`w-full px-3 py-2 rounded text-center font-mono font-bold ${
              total > 0 
                ? 'bg-green-100 dark:bg-[#1a3a2a] text-green-700 dark:text-green-200' 
                : total < 0 
                  ? 'bg-red-100 dark:bg-[#3a1a1a] text-red-700 dark:text-red-200' 
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
            }`}>
              {total}
            </div>
          </div>
        )}
      </div>
      <DayEditor
        date={date}
        isOpen={editMode}
        onClose={handleClose}
        input={input}
        onInputChange={setInput}
        onSave={handleSave}
        currentNumbers={currentNumbers}
      />
    </div>
  );
};

