import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

export interface DayCellProps {
  date: Date;
  numbers: number[];
  onSave: (numbers: number[]) => void;
}

function parseNumbers(input: string): number[] {
  return input
    .replace(/\s+/g, '')
    .split(/(?=[+-])/) // split at + or -
    .map(Number)
    .filter(n => !isNaN(n));
}

export const DayCell: React.FC<DayCellProps> = ({ date, numbers, onSave }) => {
  const [editMode, setEditMode] = useState(false);
  const [input, setInput] = useState(numbers.length ? numbers.join('+').replace('+-', '-') : '');

  const handleSave = () => {
    const parsed = parseNumbers(input);
    onSave(parsed);
    setEditMode(false);
  };

  const handleCancel = () => {
    setInput(numbers.length ? numbers.join('+').replace('+-', '-') : '');
    setEditMode(false);
  };

  const isToday = date.toDateString() === new Date().toDateString();

  return (
    <div className="p-3 h-full flex flex-col">
      <div className={`text-sm font-medium mb-3 ${
        isToday ? 'text-blue-600 font-bold bg-blue-50 rounded-full px-2 py-1 shadow-sm text-center' : 'text-slate-600'
      }`}>
        {date.getDate()}
      </div>
      
      {editMode ? (
        <div className="flex-1 flex flex-col gap-2">
          <Input
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="1+2-5"
            className="text-xs h-8 border-blue-300 focus:border-blue-500 focus:ring-blue-500/20 shadow-sm"
            autoFocus
            onKeyDown={e => {
              if (e.key === 'Enter') handleSave();
              if (e.key === 'Escape') handleCancel();
            }}
          />
          <div className="flex gap-1">
            <Button onClick={handleSave} size="sm" className="h-6 text-xs flex-1 bg-blue-600 hover:bg-blue-700 shadow-sm">
              Save
            </Button>
            <Button onClick={handleCancel} variant="outline" size="sm" className="h-6 text-xs flex-1 border-slate-300 hover:bg-slate-50 shadow-sm">
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div 
          className="flex-1 cursor-pointer flex flex-wrap gap-1 content-start p-2 rounded-lg hover:bg-slate-50 transition-all duration-200"
          onClick={() => setEditMode(true)}
        >
          {numbers.length === 0 ? (
            <div className="text-xs text-slate-400 italic">Click to add</div>
          ) : (
            numbers.map((n, i) => (
              <Badge 
                key={i} 
                variant={n >= 0 ? 'positive' : 'negative'}
                className={`text-xs px-2 py-0.5 shadow-sm transition-all hover:scale-105 ${
                  n >= 0 
                    ? 'bg-green-500 hover:bg-green-600 text-white border-green-600' 
                    : 'bg-red-500 hover:bg-red-600 text-white border-red-600'
                }`}
              >
                {n}
              </Badge>
            ))
          )}
        </div>
      )}
    </div>
  );
};

