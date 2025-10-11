import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetHeader, SheetTitle, SheetContent } from '@/components/ui/sheet';
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { EditableNumberBadge } from './EditableNumberBadge';
import { computeNumberStats } from '@/lib/stats';
import { buildExpressionFromNumbers, parseExpression } from '@/lib/expression';

export interface NumbersPanelProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  numbers: number[];
  editableNumbers?: boolean; // default false
  showExpressionInput?: boolean; // default false
  onSave?: (numbers: number[]) => void;
  // Optional action button displayed in the header (right side)
  actionLabel?: string;
  actionOnClick?: () => void;
  actionIcon?: React.ReactNode;
}


export const NumbersPanel: React.FC<NumbersPanelProps> = ({
  isOpen,
  onClose,
  title,
  numbers,
  editableNumbers = false,
  showExpressionInput = false,
  onSave,
  actionLabel,
  actionOnClick,
  actionIcon,
}) => {
  const [sortMode, setSortMode] = React.useState<'original' | 'asc' | 'desc'>('original');


  // Local state for the expression input, initialized from numbers
  const [expression, setExpression] = React.useState<string>(buildExpressionFromNumbers(numbers));

  // Derive parsedNumbers from expression
  const parsedNumbers = React.useMemo(() => parseExpression(expression), [expression]);

  // Update expression when numbers change
  React.useEffect(() => {
    setExpression(buildExpressionFromNumbers(numbers));
  }, [numbers]);

  // Use parsedNumbers if available, otherwise fallback to numbers
  const displayNumbers = parsedNumbers !== null ? parsedNumbers : numbers;

  // Stats computed via util
  const stats = React.useMemo(() => computeNumberStats(displayNumbers), [displayNumbers]);

  // Prepare items with original indices for stable mapping when sorting
  const items = React.useMemo(() => displayNumbers.map((value, index) => ({ value, index })), [displayNumbers]);
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

  const handleExpressionSave = (value: string) => {
    const inputNumbers = parseExpression(value);
    if (inputNumbers !== null) {
      // Only save if inputNumbers differs from numbers
      const isDifferent = inputNumbers.length !== numbers.length || inputNumbers.some((n, i) => n !== numbers[i]);
      if (isDifferent) {
        onSave?.(inputNumbers);
      } else {
        // Revert expression to current numbers
        setExpression(buildExpressionFromNumbers(numbers));
      }
    } else {
      // Invalid expression - revert to current numbers
      setExpression(buildExpressionFromNumbers(numbers));
    }
  };

  const toggleSortMode = () => {
    setSortMode((m) => (m === 'original' ? 'asc' : m === 'asc' ? 'desc' : 'original'));
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }} modal={false}>
      <SheetContent className="w-full max-w-md" disableEscapeClose>
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
              onChange={e => {
                setExpression(e.target.value);
              }}
              onBlur={e => handleExpressionSave(e.target.value)}
              placeholder="Example: 1+2-5"
              className="text-sm border-blue-300 focus:border-blue-500 focus:ring-blue-500/20 shadow-sm"
              autoFocus
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.currentTarget.blur(); // Trigger onBlur which will save
                }
                if (e.key === 'Escape') {
                  const originalExpr = buildExpressionFromNumbers(numbers);
                  setExpression(originalExpr);
                  (e.target as HTMLInputElement).value = originalExpr;
                  e.currentTarget.blur();
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
                      // Removed: onExpressionChange reference
                      let nextNumbers: number[];
                      if (next === null) {
                        nextNumbers = numbers.filter((_, idx) => idx !== originalIndex);
                      } else {
                        nextNumbers = numbers.map((val, idx) => (idx === originalIndex ? next : val));
                      }
                      // Removed: expr variable, now handled by setExpression
                      onSave?.(nextNumbers);
                      setExpression(buildExpressionFromNumbers(nextNumbers));
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
  </SheetContent>
    </Sheet>
  );
};
