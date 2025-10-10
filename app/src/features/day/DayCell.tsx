import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { CheckCircle, XCircle } from 'lucide-react';

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

  const total = numbers.reduce((a, b) => a + b, 0);
  const count = numbers.length;
  const hasData = count > 0;
  const isPast = date < new Date(new Date().toDateString());
  
  // Color logic: only positive/negative if there's data
  let bgColor, textColor;
  if (!hasData) {
    bgColor = isPast ? 'bg-slate-100' : 'bg-white';
    textColor = isPast ? 'text-slate-400' : 'text-slate-600';
  } else {
    bgColor = total > 0 ? 'bg-green-50' : 'bg-red-50';
    textColor = total > 0 ? 'text-green-600' : 'text-red-600';
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
          <div className="flex-1 grid grid-cols-2 gap-2 text-xs">
            <div className="text-center">
              <div className="text-slate-500 mb-1">Count</div>
              <div className={`px-2 py-1 rounded font-mono font-bold ${total > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {count}
              </div>
            </div>
            <div className="text-center">
              <div className="text-slate-500 mb-1">Total</div>
              <div className={`px-2 py-1 rounded font-mono font-bold ${total > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {total}
              </div>
            </div>
          </div>
        )}
      </div>

      <Dialog open={editMode} onOpenChange={setEditMode}>
        <DialogContent className="max-w-xs w-full p-4 rounded-xl">
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between mb-2">
              <div className={`text-lg font-bold ${isToday ? 'text-blue-600' : textColor}`}>{date.toLocaleDateString()}</div>
              <Button variant="ghost" size="icon" onClick={handleCancel} aria-label="Cancel">
                <XCircle className="text-slate-400" />
              </Button>
            </div>
            <Input
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="1+2-5"
              className="text-sm border-blue-300 focus:border-blue-500 focus:ring-blue-500/20 shadow-sm"
              autoFocus
              onKeyDown={e => {
                if (e.key === 'Enter') handleSave();
                if (e.key === 'Escape') handleCancel();
              }}
            />
            <div className="flex gap-2 items-center">
              <Button onClick={handleSave} size="icon" className="bg-green-600 hover:bg-green-700 text-white shadow-sm" aria-label="Save">
                <CheckCircle className="size-5" />
              </Button>
              <Button onClick={handleCancel} variant="outline" size="icon" className="border-slate-300 hover:bg-slate-50 shadow-sm" aria-label="Cancel">
                <XCircle className="size-5 text-slate-400" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-1 mt-2">
              {parseNumbers(input).map((n, i) => (
                <Badge
                  key={i}
                  className={`text-xs px-2 py-0.5 shadow-sm transition-all ${
                    n >= 0
                      ? 'bg-green-500 text-white border-green-600'
                      : 'bg-red-500 text-white border-red-600'
                  }`}
                >
                  {n}
                </Badge>
              ))}
            </div>
            <div className="mt-2 text-xs text-slate-500">
              <div>Count: {parseNumbers(input).length}</div>
              <div>Total: {parseNumbers(input).reduce((a, b) => a + b, 0)}</div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

