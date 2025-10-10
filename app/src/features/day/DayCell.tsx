import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetHeader, SheetTitle, SheetFooter, SheetPortal } from '@/components/ui/sheet';
import * as SheetPrimitive from "@radix-ui/react-dialog";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

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

// Custom SheetContent without overlay
const SheetContentNoOverlay = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Content> & {
    side?: "top" | "right" | "bottom" | "left";
  }
>(({ side = "right", className, children, ...props }, ref) => {
  const sheetVariants = cn(
    "fixed z-50 gap-4 bg-white p-6 shadow-lg transition ease-in-out data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:duration-300 data-[state=open]:duration-500 dark:bg-slate-950",
    side === "right" && "inset-y-0 right-0 h-full w-3/4 border-l data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right sm:max-w-sm",
    className
  );

  return (
    <SheetPortal>
      {/* Invisible overlay that allows pointer events through */}
      <div className="fixed inset-0 z-40 pointer-events-none" />
      <SheetPrimitive.Content
        ref={ref}
        className={sheetVariants}
        {...props}
      >
        {children}
        <SheetPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-white transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-slate-950 focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-slate-100 dark:ring-offset-slate-950 dark:focus:ring-slate-300 dark:data-[state=open]:bg-slate-800">
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </SheetPrimitive.Close>
      </SheetPrimitive.Content>
    </SheetPortal>
  );
});
SheetContentNoOverlay.displayName = "SheetContentNoOverlay";

export const DayCell: React.FC<DayCellProps> = ({ date, numbers, onSave }) => {
  const [editMode, setEditMode] = useState(false);
  const [input, setInput] = useState(numbers.length ? numbers.join('+').replace('+-', '-') : '');
  const [originalExpression, setOriginalExpression] = useState(numbers.length ? numbers.join('+').replace('+-', '-') : '');
  
  // Update input when numbers prop changes (external updates)
  React.useEffect(() => {
    const expression = numbers.length ? numbers.join('+').replace('+-', '-') : '';
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

      <Sheet open={editMode} onOpenChange={(open) => {
        if (!open) handleCancel();
      }} modal={false}>
        <SheetContentNoOverlay className="w-full max-w-md">
          <SheetHeader>
            <SheetTitle className={`${isToday ? 'text-blue-600' : 'text-slate-700'}`}>
              {date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
            </SheetTitle>
          </SheetHeader>
          
          <div className="flex flex-col gap-4 mt-6">
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
            
            <div className="flex flex-wrap gap-1">
              {currentNumbers.map((n, i) => (
                <Badge
                  key={i}
                  className={`text-xs px-2 py-0.5 shadow-sm transition-all ${
                    n > 0
                      ? 'bg-green-500 text-white border-green-600'
                      : n < 0
                      ? 'bg-red-500 text-white border-red-600'
                      : 'bg-slate-500 text-white border-slate-600'
                  }`}
                >
                  {n}
                </Badge>
              ))}
            </div>
            
            {stats && (
              <div className="bg-slate-50 rounded-lg p-4 space-y-4">
                {/* Primary stats: Count and Total */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center bg-white rounded-lg p-3 shadow-sm">
                    <div className="text-slate-600 text-sm font-medium mb-2">Count</div>
                    <div className="font-mono text-lg font-bold text-slate-800">{stats.count}</div>
                  </div>
                  <div className="text-center bg-white rounded-lg p-3 shadow-sm">
                    <div className="text-slate-600 text-sm font-medium mb-2">Total</div>
                    <div className={`font-mono text-lg font-bold ${stats.total >= 0 ? 'text-green-600' : 'text-red-600'}`}>{stats.total}</div>
                  </div>
                </div>
                
                {/* Secondary stats: Central tendency */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="text-center">
                    <div className="text-slate-500 text-xs mb-1">Mean</div>
                    <div className={`font-mono text-sm font-semibold ${stats.average >= 0 ? 'text-green-600' : 'text-red-600'}`}>{stats.average.toFixed(1)}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-slate-500 text-xs mb-1">Median</div>
                    <div className={`font-mono text-sm font-semibold ${stats.median >= 0 ? 'text-green-600' : 'text-red-600'}`}>{stats.median}</div>
                  </div>
                </div>
                
                {/* Tertiary stats: Range */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="text-center">
                    <div className="text-slate-500 text-xs mb-1">Min</div>
                    <div className={`font-mono text-sm font-semibold ${stats.min >= 0 ? 'text-green-600' : 'text-red-600'}`}>{stats.min}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-slate-500 text-xs mb-1">Max</div>
                    <div className={`font-mono text-sm font-semibold ${stats.max >= 0 ? 'text-green-600' : 'text-red-600'}`}>{stats.max}</div>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          {hasChanges && (
            <SheetFooter className="mt-6">
              <Button onClick={handleCancel} variant="outline" className="border-slate-300 hover:bg-slate-50">
                Cancel
              </Button>
              <Button onClick={handleSave} className="bg-green-600 hover:bg-green-700 text-white">
                Save
              </Button>
            </SheetFooter>
          )}
        </SheetContentNoOverlay>
      </Sheet>
    </>
  );
};

