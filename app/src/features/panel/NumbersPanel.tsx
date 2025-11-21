import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetHeader, SheetTitle, SheetContent } from '@/components/ui/sheet';
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { NumberText } from '@/components/ui/number-text';
import { EditableNumberBadge } from './EditableNumberBadge';
import { computeNumberStats } from '@/lib/stats';
import { buildExpressionFromNumbers, parseExpression } from '@/lib/expression';
import { CopyButton } from '@/components/ui/shadcn-io/copy-button';
import { ChartContainer } from '@/components/ui/chart';
import { LineChart, Line, Tooltip } from 'recharts';
import { Badge } from '@/components/ui/badge';
import { AddNumberEditor } from './AddNumberEditor';
import { AnimatePresence } from 'framer-motion';
import type { StatsExtremes } from '@/lib/stats';

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
  extremes?: StatsExtremes;
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
  extremes,
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

  // Cumulative numbers for line chart
  const cumulativeNumbers = React.useMemo(() => {
    let sum = 0;
    return displayNumbers.map(n => (sum += n));
  }, [displayNumbers]);

  const [adding, setAdding] = useState(false);

  // Helper to get current total for delta mode
  const currentTotal = displayNumbers.reduce((a, b) => a + b, 0);

  // Handler for add number
  const handleAddNumber = (finalNumber: number) => {
    onSave?.([...numbers, finalNumber]);
    setExpression(buildExpressionFromNumbers([...numbers, finalNumber]));
    setAdding(false);
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
            <div className="flex flex-wrap gap-1 pr-2 flex-1 min-w-0 max-h-80 overflow-y-auto p-2">
              {sortedItems.length > 0 ? (
                sortedItems.map(({ value: n, index: originalIndex }) => (
                  <EditableNumberBadge
                    key={`${originalIndex}-${n}`}
                    value={n}
                    editable={!!editableNumbers}
                    onCommit={editableNumbers ? (next) => {
                      let nextNumbers: number[];
                      if (next === null) {
                        nextNumbers = numbers.filter((_, idx) => idx !== originalIndex);
                      } else {
                        nextNumbers = numbers.map((val, idx) => (idx === originalIndex ? next : val));
                      }
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
              {/* Add (+) badge */}
              {editableNumbers && !adding && parsedNumbers && parsedNumbers.length > 0 && (
                <Badge
                  variant="outline"
                  onClick={() => setAdding(true)}
                  aria-label="Add number"
                  className="px-2 py-0.5 text-xs shadow-sm hover:shadow-md border border-dashed border-blue-300 dark:border-blue-700 text-blue-500 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-slate-800 hover:border-blue-400 dark:hover:border-blue-500 transition-colors cursor-pointer bg-transparent dark:bg-transparent"
                >
                  +
                </Badge>
              )}
            </div>
            {parsedNumbers && parsedNumbers.length > 1 && (
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
          {/* Inline add number editor */}
          <AnimatePresence>
            {editableNumbers && adding && (
              <AddNumberEditor
                onAdd={handleAddNumber}
                onCancel={() => setAdding(false)}
                priorTotal={currentTotal}
              />
            )}
          </AnimatePresence>

          {stats && stats.count > 0 && (
            <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-4 space-y-4 relative">
              <CopyButton
                className="absolute top-2 right-2"
                content={`Total: ${stats.total}\nMean: ${stats.mean.toFixed(1)}\nMedian: ${stats.median}\nMin: ${stats.min}\nMax: ${stats.max}`}
                variant="ghost"
              />
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
                  <NumberText
                    value={stats.total}
                    isHighest={!!(extremes && stats.total === extremes.highestTotal)}
                    isLowest={!!(extremes && stats.total === extremes.lowestTotal)}
                    className=""
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="text-center">
                  <div className="text-slate-500 dark:text-slate-400 text-xs mb-1">Mean</div>
                  <div className="font-mono text-sm font-semibold flex items-center justify-center">
                    <NumberText
                      value={stats.mean}
                      isHighest={!!(extremes && stats.mean === extremes.highestMean)}
                      isLowest={!!(extremes && stats.mean === extremes.lowestMean)}
                      className=""
                      formatOptions={{ minimumFractionDigits: 1, maximumFractionDigits: 1 }}
                    />
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-slate-500 dark:text-slate-400 text-xs mb-1">Median</div>
                  <div className="font-mono text-sm font-semibold flex items-center justify-center">
                    <NumberText
                      value={stats.median}
                      isHighest={!!(extremes && stats.median === extremes.highestMedian)}
                      isLowest={!!(extremes && stats.median === extremes.lowestMedian)}
                      className=""
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="text-center">
                  <div className="text-slate-500 dark:text-slate-400 text-xs mb-1">Min</div>
                  <div className={`font-mono text-sm font-semibold flex items-center justify-center ${
                    stats.min > 0 ? 'text-green-600 dark:text-green-300' : stats.min < 0 ? 'text-red-600 dark:text-red-300' : 'text-slate-600 dark:text-slate-300'
                  }`}>
                    <NumberText
                      value={stats.min}
                      isHighest={!!(extremes && stats.min === extremes.highestMin)}
                      isLowest={!!(extremes && stats.min === extremes.lowestMin)}
                      className=""
                    />
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-slate-500 dark:text-slate-400 text-xs mb-1">Max</div>
                  <div className={`font-mono text-sm font-semibold flex items-center justify-center ${
                    stats.max > 0 ? 'text-green-600 dark:text-green-300' : stats.max < 0 ? 'text-red-600 dark:text-red-300' : 'text-slate-600 dark:text-slate-300'
                  }`}>
                    <NumberText
                      value={stats.max}
                      isHighest={!!(extremes && stats.max === extremes.highestMax)}
                      isLowest={!!(extremes && stats.max === extremes.lowestMax)}
                      className=""
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Micro cumulative line chart below numbers, in its own box */}
          {stats && stats.count > 1 && (
            <div className="rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-2 mt-2 flex items-center justify-center">
              <ChartContainer config={{ numbers: { color: stats.total >= 0 ? '#22c55e' : '#ef4444' } }} className="w-full h-10">
                <LineChart width={120} height={32} data={cumulativeNumbers.map((y, i) => ({ x: i, y }))} margin={{ top: 8, right: 0, left: 0, bottom: 8 }}>
                  <Line
                    type="monotone"
                    dataKey="y"
                    stroke={stats.total >= 0 ? '#22c55e' : '#ef4444'}
                    strokeWidth={2}
                    dot={{ r: 2, stroke: 'none', fill: stats.total >= 0 ? '#22c55e' : '#ef4444' }}
                    activeDot={{ r: 3, stroke: 'none', fill: stats.total >= 0 ? '#22c55e' : '#ef4444' }}
                    isAnimationActive={false}
                  />
                  <Tooltip
                    cursor={{ fill: 'rgba(16,185,129,0.08)' }}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const cumulative = payload[0].value as number;
                        const entryIndex = payload[0].payload.x as number;
                        const entryValue = entryIndex === 0 ? cumulative : cumulative - cumulativeNumbers[entryIndex - 1];
                        const entryColor = entryValue > 0 ? '#22c55e' : entryValue < 0 ? '#ef4444' : '#64748b';
                        const totalColor = cumulative > 0 ? '#22c55e' : cumulative < 0 ? '#ef4444' : '#64748b';
                        return (
                          <div className="rounded-md bg-white dark:bg-slate-900 px-3 py-2 shadow-lg dark:shadow-xl border border-gray-200 dark:border-slate-700">
                            <div style={{ color: entryColor, fontWeight: 600, fontSize: 16 }}>
                              {entryValue > 0 ? `+${entryValue}` : entryValue < 0 ? `-${Math.abs(entryValue)}` : entryValue}
                            </div>
                            <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 mt-1">
                              <span>Total</span>
                              <span style={{ color: totalColor, fontWeight: 600, fontSize: 16 }}>
                                {cumulative}
                              </span>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                </LineChart>
              </ChartContainer>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
