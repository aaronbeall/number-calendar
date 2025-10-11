import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetHeader, SheetTitle, SheetPortal } from '@/components/ui/sheet';
import * as SheetPrimitive from "@radix-ui/react-dialog";
import { cn } from "@/lib/utils";
import { X, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { EditableNumberBadge } from './EditableNumberBadge';
import { computeNumberStats } from '@/lib/stats';

// Custom SheetContent without overlay (Escape disabled)
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
        onEscapeKeyDown={(e) => {
          // Prevent Radix Dialog from closing the sheet on Escape
          e.preventDefault();
        }}
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

export interface NumbersPanelProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  numbers: number[];
  editableNumbers?: boolean; // default false
  showExpressionInput?: boolean; // default false
  expression?: string;
  onExpressionChange?: (value: string) => void;
  onSave?: () => void;
  // Optional action button displayed in the header (right side)
  actionLabel?: string;
  actionOnClick?: () => void;
  actionIcon?: React.ReactNode;
}

import { buildExpressionFromNumbers } from '@/lib/expression';

export const NumbersPanel: React.FC<NumbersPanelProps> = ({
  isOpen,
  onClose,
  title,
  numbers,
  editableNumbers = false,
  showExpressionInput = false,
  expression,
  onExpressionChange,
  onSave,
  actionLabel,
  actionOnClick,
  actionIcon,
}) => {
  const [sortMode, setSortMode] = React.useState<'original' | 'asc' | 'desc'>('original');
  const [originalExpression, setOriginalExpression] = React.useState<string>('');

  // Update original expression when expression prop changes
  React.useEffect(() => {
    if (expression !== undefined) {
      setOriginalExpression(expression);
    }
  }, [expression]);

  // Stats computed via util
  const stats = React.useMemo(() => computeNumberStats(numbers), [numbers]);

  // Prepare items with original indices for stable mapping when sorting
  const items = React.useMemo(() => numbers.map((value, index) => ({ value, index })), [numbers]);
  const sortedItems = React.useMemo(() => {
    if (sortMode === 'original') return items;
    const arr = [...items];
    if (sortMode === 'asc') {
      arr.sort((a, b) => (a.value - b.value) || (a.index - b.index));
    } else {
      arr.sort((a, b) => (b.value - a.value) || (a.index - b.index));
    }
    return arr;
  }, [items, sortMode]);

  // Simple expression parser - returns null if invalid, empty array if blank
  const parseExpression = (expr: string): number[] | null => {
    if (!expr.trim()) return []; // blank = delete
    
    try {
      // Simple math expression evaluation
      const result = Function(`"use strict"; return (${expr})`)();
      if (typeof result === 'number' && !isNaN(result)) {
        return [result];
      }
      
      // Try parsing as comma/space separated numbers
      const numbers = expr.split(/[,\s]+/)
        .map(s => s.trim())
        .filter(s => s.length > 0)
        .map(s => parseFloat(s));
      
      if (numbers.every(n => !isNaN(n))) {
        return numbers;
      }
      
      return null; // invalid
    } catch {
      return null; // invalid
    }
  };

  const handleExpressionSave = (expr: string) => {
    const parsed = parseExpression(expr);
    if (parsed !== null) {
      // Valid expression - save it
      onSave && onSave();
      setOriginalExpression(expr);
    } else {
      // Invalid expression - revert to original
      onExpressionChange && onExpressionChange(originalExpression);
    }
  };

  const toggleSortMode = () => {
    setSortMode((m) => (m === 'original' ? 'asc' : m === 'asc' ? 'desc' : 'original'));
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }} modal={false}>
      <SheetContentNoOverlay className="w-full max-w-md">
        <SheetHeader>
          <div className="flex items-center justify-between gap-3 pr-8">
            <div>
              <SheetTitle className={'text-slate-700'}>
                {title}
              </SheetTitle>
              {stats && (
                <div className="text-xs text-slate-500">{stats.count} entries</div>
              )}
            </div>
            {actionLabel && actionOnClick && (
              <Button variant="outline" size="sm" className="gap-1 h-8" onClick={actionOnClick}>
                {actionIcon}
                {actionLabel}
              </Button>
            )}
          </div>
        </SheetHeader>

        <div className="flex flex-col gap-4 mt-6">
          {showExpressionInput && (
            <Input
              value={expression}
              onChange={e => onExpressionChange && onExpressionChange(e.target.value)}
              onBlur={() => handleExpressionSave(expression || '')}
              placeholder="Example: 1+2-5"
              className="text-sm border-blue-300 focus:border-blue-500 focus:ring-blue-500/20 shadow-sm"
              autoFocus
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.currentTarget.blur(); // Trigger onBlur which will save
                  e.preventDefault(); // Prevent any form submission or panel closing
                }
                if (e.key === 'Escape') {
                  onExpressionChange && onExpressionChange(originalExpression);
                  e.currentTarget.blur();
                  e.preventDefault(); // Prevent panel from closing
                }
              }}
            />
          )}

          <div className="flex items-center justify-between gap-2">
            <div className="flex flex-wrap gap-1 pr-2 flex-1 min-w-0 max-h-80 overflow-y-auto">
              {sortedItems.length > 0 ? (
                sortedItems.map(({ value: n, index: originalIndex }) => (
                  <EditableNumberBadge
                    key={`${originalIndex}-${n}`}
                    value={n}
                    editable={!!editableNumbers}
                    onCommit={editableNumbers ? (next) => {
                      if (!onExpressionChange) return;
                      let nextNumbers: number[];
                      if (next === null) {
                        nextNumbers = numbers.filter((_, idx) => idx !== originalIndex);
                      } else {
                        nextNumbers = numbers.map((val, idx) => (idx === originalIndex ? next : val));
                      }
                      const expr = buildExpressionFromNumbers(nextNumbers);
                      onExpressionChange(expr);
                    } : undefined}
                  />
                ))
              ) : (
                <div className="flex items-center justify-center w-full py-8 text-center">
                  <div className="text-slate-400">
                    <div className="text-sm font-medium mb-1">No numbers to display</div>
                    <div className="text-xs">Add some data to see statistics</div>
                  </div>
                </div>
              )}
            </div>
            {numbers.length > 1 && (
              <Button
                variant="ghost"
                size="icon"
                className={`h-8 w-8 flex-shrink-0 ${
                  sortMode === 'original' 
                    ? 'hover:bg-slate-100' 
                    : 'hover:bg-blue-100'
                }`}
                onClick={toggleSortMode}
                title={`Sort: ${sortMode === 'original' ? 'Original order' : sortMode === 'asc' ? 'Ascending' : 'Descending'}`}
              >
                {sortMode === 'original' && <ArrowUpDown className="h-4 w-4 text-slate-400" />}
                {sortMode === 'asc' && <ArrowUp className="h-4 w-4 text-blue-600" />}
                {sortMode === 'desc' && <ArrowDown className="h-4 w-4 text-blue-600" />}
              </Button>
            )}
          </div>

          {stats && stats.count > 0 && (
            <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-4 space-y-4">
              {/* Centered Total with colored box */}
              <div className="flex justify-center">
                <div className={`rounded-lg p-4 text-center shadow-sm border font-mono text-xl font-bold ${
                  stats.total > 0 
                    ? 'bg-green-100 dark:bg-green-950/60 border-green-200 dark:border-green-900 text-green-600 dark:text-green-300' 
                    : stats.total < 0 
                      ? 'bg-red-100 dark:bg-red-950/60 border-red-200 dark:border-red-900 text-red-600 dark:text-red-300'
                      : 'bg-slate-100 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                }`}>
                  <div className="text-slate-600 dark:text-slate-400 text-sm font-medium mb-2">Total</div>
                  {stats.total}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="text-center">
                  <div className="text-slate-500 dark:text-slate-400 text-xs mb-1">Mean</div>
                  <div className={`font-mono text-sm font-semibold ${
                    stats.mean > 0 ? 'text-green-600 dark:text-green-300' : stats.mean < 0 ? 'text-red-600 dark:text-red-300' : 'text-slate-600 dark:text-slate-300'
                  }`}>{stats.mean.toFixed(1)}</div>
                </div>
                <div className="text-center">
                  <div className="text-slate-500 dark:text-slate-400 text-xs mb-1">Median</div>
                  <div className={`font-mono text-sm font-semibold ${
                    stats.median > 0 ? 'text-green-600 dark:text-green-300' : stats.median < 0 ? 'text-red-600 dark:text-red-300' : 'text-slate-600 dark:text-slate-300'
                  }`}>{stats.median}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="text-center">
                  <div className="text-slate-500 dark:text-slate-400 text-xs mb-1">Min</div>
                  <div className={`font-mono text-sm font-semibold ${
                    stats.min > 0 ? 'text-green-600 dark:text-green-300' : stats.min < 0 ? 'text-red-600 dark:text-red-300' : 'text-slate-600 dark:text-slate-300'
                  }`}>{stats.min}</div>
                </div>
                <div className="text-center">
                  <div className="text-slate-500 dark:text-slate-400 text-xs mb-1">Max</div>
                  <div className={`font-mono text-sm font-semibold ${
                    stats.max > 0 ? 'text-green-600 dark:text-green-300' : stats.max < 0 ? 'text-red-600 dark:text-red-300' : 'text-slate-600 dark:text-slate-300'
                  }`}>{stats.max}</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </SheetContentNoOverlay>
    </Sheet>
  );
};
