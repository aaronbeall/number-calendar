import React, { useState } from 'react';
import { DayEditor } from './DayEditor';

export interface DayCellProps {
  date: Date;
  numbers: number[];
  onSave: (numbers: number[]) => void;
}

function parseNumbers(input: string): number[] {
  if (!input.trim()) return [];
  return input
    .replace(/\s+/g, '')
    .split(/(?=[+-])/) // split at + or -
    .map(Number)
    .filter(n => !isNaN(n));
}

function buildExpressionFromNumbers(nums: number[]): string {
  if (!nums.length) return '';
  return nums.reduce((acc, n, i) => (i === 0 ? `${n}` : `${acc}${n >= 0 ? '+' : ''}${n}`), '');
}

export const DayCell: React.FC<DayCellProps> = ({ date, numbers, onSave }) => {
  const [editMode, setEditMode] = useState(false);
  const [input, setInput] = useState(buildExpressionFromNumbers(numbers));
  const [originalExpression, setOriginalExpression] = useState(buildExpressionFromNumbers(numbers));
  
  // Update input when numbers prop changes (external updates)
  React.useEffect(() => {
    const expression = buildExpressionFromNumbers(numbers);
    setInput(expression);
    setOriginalExpression(expression);
  }, [numbers]);

  const handleSave = () => {
    const parsed = parseNumbers(input);
    onSave(parsed);
    setEditMode(false);
  };

  const handleCancel = () => {
    setInput(originalExpression);
    setEditMode(false);
  };
  
  const hasChanges = input !== originalExpression;
  const currentNumbers = parseNumbers(input);
  const stats = React.useMemo(() => {
    if (currentNumbers.length === 0) return null;
    const sorted = [...currentNumbers].sort((a, b) => a - b);
    const total = currentNumbers.reduce((a, b) => a + b, 0);
    const count = currentNumbers.length;
    const average = total / count;
    const median = count % 2 === 0 
      ? (sorted[count / 2 - 1] + sorted[count / 2]) / 2
      : sorted[Math.floor(count / 2)];
    return {
      count,
      total,
      average: Number(average.toFixed(2)),
      median,
      min: sorted[0],
      max: sorted[sorted.length - 1]
    };
  }, [currentNumbers]);

  const isToday = date.toDateString() === new Date().toDateString();

  const total = numbers.reduce((a, b) => a + b, 0);
  const count = numbers.length;
  const hasData = count > 0;
  const isPast = date < new Date(new Date().toDateString());
  
  // Color logic: only positive/negative if there's data
  let bgColor;
  if (!hasData) {
    bgColor = isPast ? 'bg-slate-100' : 'bg-white';
  } else if (total > 0) {
    bgColor = 'bg-green-50';
  } else if (total < 0) {
    bgColor = 'bg-red-50';
  } else {
    // total === 0, neutral
    bgColor = isPast ? 'bg-slate-100' : 'bg-white';
  }

  return (
    <>
      <div
        className={`p-3 h-full flex flex-col cursor-pointer rounded-lg transition-all duration-200 border border-slate-100 shadow-sm hover:shadow-md hover:scale-[1.02] ${
          isToday ? 'ring-2 ring-blue-500 ring-offset-2' : ''
        } ${bgColor}`}
        onClick={() => setEditMode(true)}
        tabIndex={0}
        role="button"
        aria-label={`Edit day ${date.getDate()}`}
      >
        <div className={`text-sm font-bold mb-2 text-right ${isToday ? 'text-blue-600' : 'text-slate-600'}`}>
          {date.getDate()}
        </div>
        
        {hasData && (
          <div className="flex-1 flex flex-col gap-2 text-xs">
            <div className="text-slate-500 text-center">
              Count: {count}
            </div>
            <div className={`w-full px-3 py-2 rounded text-center font-mono font-bold ${total > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
              {total}
            </div>
          </div>
        )}
      </div>

      <DayEditor
        date={date}
        isOpen={editMode}
        onClose={handleCancel}
        input={input}
        onInputChange={setInput}
        onSave={handleSave}
        onCancel={handleCancel}
        hasChanges={hasChanges}
        currentNumbers={currentNumbers}
        stats={stats}
      />
    </>
  );
};

