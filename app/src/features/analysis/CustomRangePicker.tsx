import { useMemo, useCallback, useRef, useState, useEffect } from 'react';
import type { Valence, DateKey } from '@/features/db/localdb';
import type { PeriodAggregateData } from '@/lib/period-aggregate';
import type { AggregationType } from '@/lib/analysis';
import { getValueForValence } from '@/lib/valence';
import { parseDateKey } from '@/lib/friendly-date';
import { useDebouncedCallback } from '@/hooks/useDebouncedCallback';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { BarChart, LineChart, Bar, Line, ResponsiveContainer, Cell } from 'recharts';

interface CustomRangePickerProps {
  tracking: 'series' | 'trend';
  valence: Valence;
  aggregation: AggregationType;
  allPeriods: PeriodAggregateData<any>[];
  startDate: Date;
  endDate: Date;
  onRangeChange: (startDate: Date, endDate: Date) => void;
}

interface PeriodStepperProps {
  title: string;
  dateKey: string | null;
  onStepLeft: () => void;
  onStepRight: () => void;
  disableLeft: boolean;
  disableRight: boolean;
}

function PeriodStepper({
  title,
  dateKey,
  onStepLeft,
  onStepRight,
  disableLeft,
  disableRight,
}: PeriodStepperProps) {
  return (
    <div className="space-y-1">
      <div className="text-xs font-semibold text-slate-600 dark:text-slate-400">{title}</div>
      <div className="text-center text-sm font-medium bg-slate-50 dark:bg-slate-900 rounded px-2 py-1.5 border border-slate-200 dark:border-slate-700">
        {dateKey || '—'}
      </div>
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="sm"
          className="h-8 flex-1"
          onClick={onStepLeft}
          disabled={disableLeft}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-8 flex-1"
          onClick={onStepRight}
          disabled={disableRight}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export function CustomRangePicker({
  tracking,
  valence,
  aggregation,
  allPeriods,
  startDate,
  endDate,
  onRangeChange,
}: CustomRangePickerProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState<'start' | 'end' | null>(null);
  const [visualStartIndex, setVisualStartIndex] = useState<number | null>(null);
  const [visualEndIndex, setVisualEndIndex] = useState<number | null>(null);
  const [mouseX, setMouseX] = useState<number | null>(null);

  // Create debounced callback for range changes
  const [debouncedOnRangeChange] = useDebouncedCallback(onRangeChange, 300);

  // Filter periods that have data
  const periodsWithData = useMemo(() => 
    allPeriods.filter(p => p.numbers.length > 0),
    [allPeriods]
  );

  // Find current start/end indices
  const { startIndex, endIndex } = useMemo(() => {
    let start = 0;
    let end = periodsWithData.length - 1;

    // Find first period >= startDate
    for (let i = 0; i < periodsWithData.length; i++) {
      try {
        const periodDate = parseDateKey(periodsWithData[i].dateKey as DateKey);
        if (periodDate >= startDate) {
          start = i;
          break;
        }
      } catch {
        continue;
      }
    }

    // Find last period <= endDate
    for (let i = periodsWithData.length - 1; i >= 0; i--) {
      try {
        const periodDate = parseDateKey(periodsWithData[i].dateKey as DateKey);
        if (periodDate <= endDate) {
          end = i;
          break;
        }
      } catch {
        continue;
      }
    }

    return { startIndex: start, endIndex: end };
  }, [periodsWithData, startDate, endDate]);

  // Use visual indices while dragging, otherwise use calculated indices
  const labelStartIndex = visualStartIndex !== null ? visualStartIndex : startIndex;
  const labelEndIndex = visualEndIndex !== null ? visualEndIndex : endIndex;

  // Prepare chart data
  const chartData = useMemo(() => {
    return periodsWithData.map((period, i) => {
      const value = tracking === 'series' 
        ? period.cumulatives.total 
        : period.stats.mean ?? 0;
      
      return {
        dateKey: period.dateKey,
        value,
        isInRange: i >= labelStartIndex && i <= labelEndIndex,
      };
    });
  }, [periodsWithData, tracking, labelStartIndex, labelEndIndex]);

  // Get colors for each data point
  const getBarColor = useCallback((value: number) => {
    return getValueForValence(value, valence, {
      good: '#22c55e',   // green-500
      bad: '#ef4444',    // red-500
      neutral: '#94a3b8', // slate-400
    });
  }, [valence]);

  // Calculate trend valence for line color (average of trend values)
  const trendValenceValue = useMemo(() => {
    if (tracking !== 'trend' || chartData.length === 0) return 0;
    const sum = chartData.reduce((acc, item) => acc + item.value, 0);
    return sum / chartData.length;
  }, [chartData, tracking]);

  // Format period label based on aggregation
  const formatPeriodLabel = useCallback((dateKey: string): string => {
    try {
      const date = parseDateKey(dateKey as DateKey);
      switch (aggregation) {
        case 'none':
          return format(date, "MMM d, ''yy");
        case 'day':
          return format(date, "MMM d, ''yy");
        case 'week':
          return format(date, "'W'ww ''yy");
        case 'month':
          return format(date, "MMM ''yy");
        case 'year':
          return format(date, 'yyyy');
      }
    } catch {
      return dateKey;
    }
  }, [aggregation]);

  // Handle stepping
  const handleStepStart = useCallback((direction: 1 | -1) => {
    const newIndex = Math.max(0, Math.min(endIndex, startIndex + direction));
    if (newIndex !== startIndex && periodsWithData[newIndex]) {
      try {
        const newDate = parseDateKey(periodsWithData[newIndex].dateKey as DateKey);
        // Clear visual state to use new calculated indices
        setVisualStartIndex(null);
        setVisualEndIndex(null);
        onRangeChange(newDate, endDate);
      } catch {
        // Invalid date
      }
    }
  }, [startIndex, endIndex, periodsWithData, endDate, onRangeChange]);

  const handleStepEnd = useCallback((direction: 1 | -1) => {
    const newIndex = Math.max(startIndex, Math.min(periodsWithData.length - 1, endIndex + direction));
    if (newIndex !== endIndex && periodsWithData[newIndex]) {
      try {
        const newDate = parseDateKey(periodsWithData[newIndex].dateKey as DateKey);
        // Clear visual state to use new calculated indices
        setVisualStartIndex(null);
        setVisualEndIndex(null);
        onRangeChange(startDate, newDate);
      } catch {
        // Invalid date
      }
    }
  }, [startIndex, endIndex, periodsWithData, startDate, onRangeChange]);

  // Handle drag
  const handleMouseDown = useCallback((e: React.MouseEvent, handle: 'start' | 'end') => {
    e.preventDefault();
    setIsDragging(handle);
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!chartRef.current) return;

    // Track mouse position for handle z-index ordering
    const rect = chartRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    setMouseX(x);

    if (!isDragging) return;

    const ratio = x / rect.width;
    const newIndex = Math.floor(ratio * periodsWithData.length);
    const effectiveEndIndex = visualEndIndex !== null ? visualEndIndex : endIndex;
    const effectiveStartIndex = visualStartIndex !== null ? visualStartIndex : startIndex;

    if (isDragging === 'start' && newIndex <= effectiveEndIndex && periodsWithData[newIndex]) {
      try {
        const newDate = parseDateKey(periodsWithData[newIndex].dateKey as DateKey);
        // Update visual immediately
        setVisualStartIndex(newIndex);
        
        // Debounce the actual change
        debouncedOnRangeChange(newDate, endDate);
      } catch {
        // Invalid date
      }
    } else if (isDragging === 'end' && newIndex >= effectiveStartIndex && periodsWithData[newIndex]) {
      try {
        const newDate = parseDateKey(periodsWithData[newIndex].dateKey as DateKey);
        // Update visual immediately
        setVisualEndIndex(newIndex);
        
        // Debounce the actual change
        debouncedOnRangeChange(startDate, newDate);
      } catch {
        // Invalid date
      }
    }
  }, [isDragging, periodsWithData, startIndex, endIndex, startDate, endDate, debouncedOnRangeChange, visualStartIndex, visualEndIndex]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(null);
    // Don't clear visual state yet - keep it visible until debounce fires and props update
  }, []);

  // Clear visual state when calculated indices change (after debounce fires)
  useEffect(() => {
    setVisualStartIndex(null);
    setVisualEndIndex(null);
  }, [startIndex, endIndex]);

  // Attach global mouse listeners when dragging
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Calculate which handle is closest to the mouse for z-index ordering
  const startHandleX = (labelStartIndex / periodsWithData.length) * 100;
  const endHandleX = ((labelEndIndex + 1) / periodsWithData.length) * 100;
  const closestHandle = mouseX !== null
    ? Math.abs(mouseX - (startHandleX / 100) * (chartRef.current?.offsetWidth || 0)) <
      Math.abs(mouseX - (endHandleX / 100) * (chartRef.current?.offsetWidth || 0))
      ? 'start'
      : 'end'
    : 'end';

  if (periodsWithData.length === 0) {
    return (
      <div className="text-sm text-slate-500 dark:text-slate-400 text-center py-8">
        No data available for custom range selection
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Chart */}
      <div 
        ref={chartRef}
        className="relative h-32 bg-slate-50 dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-700 p-2"
      >
        <ResponsiveContainer width="100%" height="100%">
          {tracking === 'series' ? (
            <BarChart data={chartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
              <Bar dataKey="value" radius={[2, 2, 0, 0]} isAnimationActive={false}>
                {chartData.map((item, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={getBarColor(item.value)}
                    opacity={item.isInRange ? 1 : 0.25}
                  />
                ))}
              </Bar>
            </BarChart>
          ) : (
            <LineChart data={chartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
              <Line 
                type="monotone" 
                dataKey="value"
                stroke={getBarColor(trendValenceValue)}
                dot={false}
                isAnimationActive={false}
                strokeWidth={2}
              />
            </LineChart>
          )}
        </ResponsiveContainer>

        {/* Range overlay */}
        <div
          className="absolute inset-y-0 bg-blue-500/10 border-l-2 border-r-2 border-blue-500 pointer-events-none"
          style={{
            left: `calc(0.5rem + (100% - 1rem) * ${labelStartIndex / periodsWithData.length})`,
            right: `calc(0.5rem + (100% - 1rem) * ${(periodsWithData.length - labelEndIndex - 1) / periodsWithData.length})`,
          }}
          onMouseMove={(e) => {
            if (!chartRef.current) return;
            const rect = chartRef.current.getBoundingClientRect();
            setMouseX(e.clientX - rect.left);
          }}
          onMouseLeave={() => setMouseX(null)}
        >
          {/* Start handle */}
          <div
            className="absolute left-0 top-0 bottom-0 w-4 -ml-2 flex items-center justify-center pointer-events-auto cursor-ew-resize group"
            style={{ zIndex: closestHandle === 'start' ? 10 : 5 }}
            onMouseDown={(e) => handleMouseDown(e, 'start')}
          >
            {/* Thin vertical bar */}
            <div className="absolute inset-y-0 w-0.5 bg-blue-500 group-hover:bg-blue-600 transition-colors" />
            {/* Circular gripper */}
            <div className="relative w-4 h-4 bg-blue-500 rounded-full border border-blue-600 group-hover:bg-blue-600 transition-colors shadow-sm flex-shrink-0" />
          </div>
          
          {/* End handle */}
          <div
            className="absolute right-0 top-0 bottom-0 w-4 -mr-2 flex items-center justify-center pointer-events-auto cursor-ew-resize group"
            style={{ zIndex: closestHandle === 'end' ? 10 : 5 }}
            onMouseDown={(e) => handleMouseDown(e, 'end')}
          >
            {/* Thin vertical bar */}
            <div className="absolute inset-y-0 w-0.5 bg-blue-500 group-hover:bg-blue-600 transition-colors" />
            {/* Circular gripper */}
            <div className="relative w-4 h-4 bg-blue-500 rounded-full border border-blue-600 group-hover:bg-blue-600 transition-colors shadow-sm flex-shrink-0" />
          </div>
        </div>
      </div>

      {/* Steppers */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <PeriodStepper
          title="Start"
          dateKey={periodsWithData[labelStartIndex] ? formatPeriodLabel(periodsWithData[labelStartIndex].dateKey) : null}
          onStepLeft={() => handleStepStart(-1)}
          onStepRight={() => handleStepStart(1)}
          disableLeft={labelStartIndex <= 0}
          disableRight={labelStartIndex >= labelEndIndex}
        />
        <PeriodStepper
          title="End"
          dateKey={periodsWithData[labelEndIndex] ? formatPeriodLabel(periodsWithData[labelEndIndex].dateKey) : null}
          onStepLeft={() => handleStepEnd(-1)}
          onStepRight={() => handleStepEnd(1)}
          disableLeft={labelEndIndex <= labelStartIndex}
          disableRight={labelEndIndex >= periodsWithData.length - 1}
        />
      </div>
    </div>
  );
}
