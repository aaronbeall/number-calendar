import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetHeader, SheetTitle, SheetFooter, SheetPortal } from '@/components/ui/sheet';
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
  onCancel?: () => void;
  hasChanges?: boolean;
  // Optional action button displayed in the header (right side)
  actionLabel?: string;
  actionOnClick?: () => void;
  actionIcon?: React.ReactNode;
}

// Utility
const buildExpressionFromNumbers = (nums: number[]) => {
  if (!nums.length) return "";
  return nums.reduce((acc, n, i) => (i === 0 ? `${n}` : `${acc}${n >= 0 ? "+" : ""}${n}`), "");
};

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
  onCancel,
  hasChanges,
  actionLabel,
  actionOnClick,
  actionIcon,
}) => {
  const [sortMode, setSortMode] = React.useState<'original' | 'asc' | 'desc'>('original');

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
              placeholder="1+2-5"
              className="text-sm border-blue-300 focus:border-blue-500 focus:ring-blue-500/20 shadow-sm"
              autoFocus
              onKeyDown={e => {
                if (e.key === 'Enter') onSave && onSave();
                if (e.key === 'Escape') onCancel && onCancel();
              }}
            />
          )}

          <div className="flex items-center justify-between gap-2">
            <div className="flex flex-wrap gap-1 pr-2 flex-1 min-w-0">
              {sortedItems.map(({ value: n, index: originalIndex }) => (
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
              ))}
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

          {stats && (
            <div className="bg-slate-50 rounded-lg p-4 space-y-4">
              {/* Centered Total with colored box */}
              <div className="flex justify-center">
                <div className={`rounded-lg p-4 text-center shadow-sm ${
                  stats.total > 0 
                    ? 'bg-green-100 border border-green-200' 
                    : stats.total < 0 
                      ? 'bg-red-100 border border-red-200'
                      : 'bg-slate-100 border border-slate-200'
                }`}>
                  <div className="text-slate-600 text-sm font-medium mb-2">Total</div>
                  <div className={`font-mono text-xl font-bold ${
                    stats.total > 0 
                      ? 'text-green-600' 
                      : stats.total < 0 
                        ? 'text-red-600'
                        : 'text-slate-600'
                  }`}>
                    {stats.total}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="text-center">
                  <div className="text-slate-500 text-xs mb-1">Mean</div>
                  <div className={`font-mono text-sm font-semibold ${
                    stats.mean > 0 ? 'text-green-600' : stats.mean < 0 ? 'text-red-600' : 'text-slate-600'
                  }`}>{stats.mean.toFixed(1)}</div>
                </div>
                <div className="text-center">
                  <div className="text-slate-500 text-xs mb-1">Median</div>
                  <div className={`font-mono text-sm font-semibold ${
                    stats.median > 0 ? 'text-green-600' : stats.median < 0 ? 'text-red-600' : 'text-slate-600'
                  }`}>{stats.median}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="text-center">
                  <div className="text-slate-500 text-xs mb-1">Min</div>
                  <div className={`font-mono text-sm font-semibold ${
                    stats.min > 0 ? 'text-green-600' : stats.min < 0 ? 'text-red-600' : 'text-slate-600'
                  }`}>{stats.min}</div>
                </div>
                <div className="text-center">
                  <div className="text-slate-500 text-xs mb-1">Max</div>
                  <div className={`font-mono text-sm font-semibold ${
                    stats.max > 0 ? 'text-green-600' : stats.max < 0 ? 'text-red-600' : 'text-slate-600'
                  }`}>{stats.max}</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {showExpressionInput && hasChanges && (
          <SheetFooter className="mt-6">
            <Button onClick={onCancel} variant="outline" className="border-slate-300 hover:bg-slate-50">
              Cancel
            </Button>
            <Button onClick={onSave} className="bg-green-600 hover:bg-green-700 text-white">
              Save
            </Button>
          </SheetFooter>
        )}
      </SheetContentNoOverlay>
    </Sheet>
  );
};
