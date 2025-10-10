import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetHeader, SheetTitle, SheetFooter, SheetPortal } from '@/components/ui/sheet';
import * as SheetPrimitive from "@radix-ui/react-dialog";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";
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
  hasChanges
}) => {
  // Stats computed via util
  const stats = React.useMemo(() => computeNumberStats(numbers), [numbers]);

  return (
    <Sheet open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }} modal={false}>
      <SheetContentNoOverlay className="w-full max-w-md">
        <SheetHeader>
          <SheetTitle className={'text-slate-700'}>
            {title}
          </SheetTitle>
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

          <div className="flex flex-wrap gap-1">
            {numbers.map((n, i) => (
              <EditableNumberBadge
                key={`${i}-${n}`}
                value={n}
                editable={!!editableNumbers}
                onCommit={editableNumbers ? (next) => {
                  if (!onExpressionChange) return;
                  let nextNumbers: number[];
                  if (next === null) {
                    nextNumbers = numbers.filter((_, idx) => idx !== i);
                  } else {
                    nextNumbers = numbers.map((val, idx) => (idx === i ? next : val));
                  }
                  const expr = buildExpressionFromNumbers(nextNumbers);
                  onExpressionChange(expr);
                } : undefined}
              />
            ))}
          </div>

          {stats && (
            <div className="bg-slate-50 rounded-lg p-4 space-y-4">
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

              <div className="grid grid-cols-2 gap-3">
                <div className="text-center">
                  <div className="text-slate-500 text-xs mb-1">Mean</div>
                  <div className={`font-mono text-sm font-semibold ${stats.mean >= 0 ? 'text-green-600' : 'text-red-600'}`}>{stats.mean.toFixed(1)}</div>
                </div>
                <div className="text-center">
                  <div className="text-slate-500 text-xs mb-1">Median</div>
                  <div className={`font-mono text-sm font-semibold ${stats.median >= 0 ? 'text-green-600' : 'text-red-600'}`}>{stats.median}</div>
                </div>
              </div>

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
