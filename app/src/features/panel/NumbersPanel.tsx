import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChartContainer } from '@/components/ui/chart';
import { Input } from '@/components/ui/input';
import { NumberText } from '@/components/ui/number-text';
import { CopyButton } from '@/components/ui/shadcn-io/copy-button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import type { DayKey, Tracking, Valence } from '@/features/db/localdb';
import { getCalendarData } from '@/lib/calendar';
import { getChartData, getChartNumbers, type NumbersChartDataPoint } from '@/lib/charts';
import { buildExpressionFromNumbers, parseExpression } from '@/lib/expression';
import { calculateExtremes, computeDailyStats, computeMetricStats, computeMonthlyStats, type StatsExtremes } from '@/lib/stats';
import { getPrimaryMetric, getPrimaryMetricLabel, getValenceValueForNumber } from "@/lib/tracking";
import { getValueForValence } from '@/lib/valence';
import { AnimatePresence } from 'framer-motion';
import { ArrowDown, ArrowDownToLine, ArrowUp, ArrowUpDown, ArrowUpToLine } from "lucide-react";
import React, { useMemo, useState } from 'react';
import { Line, LineChart, Tooltip } from 'recharts';
import { AddNumberEditor } from './AddNumberEditor';
import { EditableNumberBadge } from './EditableNumberBadge';
import { capitalize } from '@/lib/utils';

export interface NumbersPanelProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  numbers: number[];
  priorNumbers?: number[]; // previous period's numbers
  editableNumbers?: boolean; // default false
  showExpressionInput?: boolean; // default false
  onSave?: (numbers: number[]) => void;
  // Optional action button displayed in the header (right side)
  actionLabel?: string;
  actionOnClick?: () => void;
  actionIcon?: React.ReactNode;
  extremes?: StatsExtremes;
  valence: Valence;
  tracking: Tracking;

  daysData?: Record<DayKey, number[]>;
}


export const NumbersPanel: React.FC<NumbersPanelProps> = ({
  isOpen,
  onClose,
  title,
  numbers,
  priorNumbers,
  editableNumbers = false,
  showExpressionInput = false,
  onSave,
  actionLabel,
  actionOnClick,
  actionIcon,
  extremes,
  valence,
  tracking,
  daysData
}) => {
  const [sortMode, setSortMode] = React.useState<'original' | 'asc' | 'desc'>('original');


  // Local state for the expression input, initialized from numbers
  const [expression, setExpression] = React.useState<string>(buildExpressionFromNumbers(numbers, tracking));

  // Derive parsedNumbers from expression
  const parsedNumbers = React.useMemo(() => parseExpression(expression, tracking), [expression, tracking]);

  // Update expression when numbers change
  React.useEffect(() => {
    setExpression(buildExpressionFromNumbers(numbers, tracking));
  }, [numbers, tracking]);

  // Use parsedNumbers if available, otherwise fallback to numbers
  const displayNumbers = parsedNumbers !== null ? parsedNumbers : numbers;

  // Use getCalendarData for all stats, deltas, extremes, valence, etc.
  const {
    stats,
    valenceStats,
    deltas,
    percents,
    primaryMetric,
    primaryMetricLabel,
    primaryValenceMetric,
    isHighestPrimary,
    isLowestPrimary,
    isHighestMean,
    isLowestMean,
    isHighestMedian,
    isLowestMedian,
    isHighestMin,
    isLowestMin,
    isHighestMax,
    isLowestMax
  } = useMemo(() => getCalendarData(displayNumbers, priorNumbers, extremes, tracking), [displayNumbers, priorNumbers, extremes, tracking]);;

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
    const inputNumbers = parseExpression(value, tracking);
    if (inputNumbers !== null) {
      // Only save if inputNumbers differs from numbers
      const isDifferent = inputNumbers.length !== numbers.length || inputNumbers.some((n, i) => n !== numbers[i]);
      if (isDifferent) {
        onSave?.(inputNumbers);
      } else {
        // Revert expression to current numbers
        setExpression(buildExpressionFromNumbers(numbers, tracking));
      }
    } else {
      // Invalid expression - revert to current numbers
      setExpression(buildExpressionFromNumbers(numbers, tracking));
    }
  };

  const toggleSortMode = () => {
    setSortMode((m) => (m === 'original' ? 'asc' : m === 'asc' ? 'desc' : 'original'));
  };

  // Chart data for micro line chart
  const chartNumbers = React.useMemo(() => getChartNumbers(displayNumbers, priorNumbers, tracking), [displayNumbers, priorNumbers, tracking]);
  const chartData = React.useMemo(() => getChartData(chartNumbers, tracking), [chartNumbers, tracking]);

  const [adding, setAdding] = useState(false);

  // Helper to get current total for delta mode
  const currentTotal = displayNumbers.reduce((a, b) => a + b, 0);

  // Handler for add number
  const handleAddNumber = (finalNumber: number) => {
    onSave?.([...numbers, finalNumber]);
    setExpression(buildExpressionFromNumbers([...numbers, finalNumber], tracking));
    setAdding(false);
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }} modal={false}>
      <SheetContent className="w-full max-w-md flex flex-col" disableEscapeClose>
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

        <div className="flex flex-col gap-4 mt-6 overflow-auto">
          {showExpressionInput && (
            <Input
              value={expression}
              onChange={e => {
                setExpression(e.target.value);
              }}
              onBlur={e => handleExpressionSave(e.target.value)}
              placeholder={tracking === 'series' ? 'Example: 1+2-5' : 'Example: 35 21 -76'}
              className="text-sm border-blue-300 focus:border-blue-500 focus:ring-blue-500/20 shadow-sm"
              autoFocus
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.currentTarget.blur(); // Trigger onBlur which will save
                }
                if (e.key === 'Escape') {
                  const originalExpr = buildExpressionFromNumbers(numbers, tracking);
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
                    valenceValue={getValenceValueForNumber(n, displayNumbers[originalIndex - 1] ?? priorNumbers?.[priorNumbers?.length - 1], tracking)}
                    editable={!!editableNumbers}
                    valence={valence}
                    onCommit={editableNumbers ? (next) => {
                      let nextNumbers: number[];
                      if (next === null) {
                        nextNumbers = numbers.filter((_, idx) => idx !== originalIndex);
                      } else {
                        nextNumbers = numbers.map((val, idx) => (idx === originalIndex ? next : val));
                      }
                      onSave?.(nextNumbers);
                      setExpression(buildExpressionFromNumbers(nextNumbers, tracking));
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
                className={`h-8 w-8 flex-shrink-0 ${sortMode === 'original'
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
                valence={valence}
                tracking={tracking}
                priorNumber={numbers[numbers.length - 1] ?? priorNumbers?.[priorNumbers?.length - 1]}
              />
            )}
          </AnimatePresence>

          {stats && stats.count > 0 && (
            <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-4 space-y-4 relative">
              <CopyButton
                className="absolute top-2 right-2"
                content={`${primaryMetricLabel}: ${primaryMetric}\nMean: ${stats.mean.toFixed(1)}\nMedian: ${stats.median}\nMin: ${stats.min}\nMax: ${stats.max}`}
                variant="ghost"
              />
              {/* Revamped stats box: large primary metric, then grid of stats with deltas/percents */}
              <div className="flex flex-col items-center mb-4">
                <div
                  className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400 font-medium mb-0.5"
                >
                  {primaryMetricLabel.toUpperCase()}
                </div>
                <NumberText
                  value={primaryMetric}
                  valenceValue={primaryValenceMetric}
                  isHighest={!!isHighestPrimary}
                  isLowest={!!isLowestPrimary}
                  valence={valence}
                  className="text-3xl font-mono font-extrabold"
                />
                {deltas && percents && (
                  <div className="flex items-center gap-1 mt-1">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-xs font-mono font-semibold text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700">
                      <NumberText
                        value={deltas[getPrimaryMetric(tracking)]}
                        valenceValue={deltas[getPrimaryMetric(tracking)]}
                        valence={valence}
                        className="text-xs font-mono font-semibold"
                        formatOptions={{ signDisplay: 'always' }}
                      />
                    </span>
                    {percents[getPrimaryMetric(tracking)] !== undefined && !isNaN(percents[getPrimaryMetric(tracking)] as number) && (
                      <span className="text-xs text-slate-500 dark:text-slate-400 font-mono font-medium">
                        {new Intl.NumberFormat(undefined, { signDisplay: 'always', maximumFractionDigits: 1 }).format(percents[getPrimaryMetric(tracking)]!)}%
                      </span>
                    )}
                  </div>
                )}
                {/* If no deltas and trend mode, show stats.change and stats.changePercent -- OBSOLETE now that deltas have built in fallback behavior */}
                {/* {!deltas && tracking === 'trend' && stats && (
                  <div className="flex items-center gap-1 mt-1">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-xs font-mono font-semibold text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700">
                      <NumberText
                        value={stats.change}
                        valenceValue={stats.change}
                        valence={valence}
                        className="text-xs font-mono font-semibold"
                        formatOptions={{ signDisplay: 'always' }}
                      />
                    </span>
                    {typeof stats.changePercent === 'number' && !isNaN(stats.changePercent) && (
                      <span className="text-xs text-slate-500 dark:text-slate-400 font-mono font-medium">
                        {new Intl.NumberFormat(undefined, { signDisplay: 'always', maximumFractionDigits: 1 }).format(stats.changePercent)}%
                      </span>
                    )}
                  </div>
                )} */}
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Mean', value: stats.mean, valenceValue: valenceStats?.mean, isHighest: isHighestMean, isLowest: isLowestMean, delta: deltas?.mean, percent: percents?.mean },
                  { label: 'Median', value: stats.median, valenceValue: valenceStats?.median, isHighest: isHighestMedian, isLowest: isLowestMedian, delta: deltas?.median, percent: percents?.median },
                  { label: 'Min', value: stats.min, valenceValue: valenceStats?.min, isHighest: isHighestMin, isLowest: isLowestMin, delta: deltas?.min, percent: percents?.min },
                  { label: 'Max', value: stats.max, valenceValue: valenceStats?.max, isHighest: isHighestMax, isLowest: isLowestMax, delta: deltas?.max, percent: percents?.max },
                ].map(({ label, value, valenceValue, isHighest, isLowest, delta, percent }) => (
                  <div key={label} className="flex flex-col items-center">
                    <div className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400 font-medium mb-0.5">{label}</div>
                    <NumberText
                      value={value}
                      valenceValue={valenceValue}
                      isHighest={!!isHighest}
                      isLowest={!!isLowest}
                      valence={valence}
                      className="text-base font-mono font-bold"
                    />
                    {deltas && percents && (
                      <div className="flex items-center gap-1 mt-0.5">
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-[11px] font-mono font-semibold text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700">
                          <NumberText
                            value={delta}
                            valenceValue={delta}
                            valence={valence}
                            className="text-xs font-mono font-semibold"
                            formatOptions={{ signDisplay: 'always' }}
                          />
                        </span>
                        {percent !== undefined && !isNaN(percent as number) && (
                          <span className="text-[11px] text-slate-400 font-mono font-medium">
                            {new Intl.NumberFormat(undefined, { signDisplay: 'always', maximumFractionDigits: 1 }).format(percent!)}%
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Micro cumulative line chart below numbers, in its own box */}
          {chartData.length > 1 && (
            <div className="rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-2 mt-2 flex items-center justify-center">
              <ChartContainer config={{ numbers: { color: getValueForValence(primaryMetric, valence, {
                good: '#22c55e',
                bad: '#ef4444',
                neutral: '#3b82f6',
              }) } }} className="w-full h-10">
                <LineChart width={120} height={32} data={chartData} margin={{ top: 8, right: 0, left: 0, bottom: 8 }}>
                  <Line
                    type="monotone"
                    dataKey="y"
                    stroke={getValueForValence(primaryValenceMetric, valence, {
                      good: '#22c55e',
                      bad: '#ef4444',
                      neutral: '#3b82f6',
                    })}
                    strokeWidth={2}
                    dot={{ r: 2, stroke: 'none', fill: getValueForValence(primaryValenceMetric, valence, {
                      good: '#22c55e',
                      bad: '#ef4444',
                      neutral: '#3b82f6',
                    }) }}
                    activeDot={{ r: 3, stroke: 'none', fill: getValueForValence(primaryValenceMetric, valence, {
                      good: '#22c55e',
                      bad: '#ef4444',
                      neutral: '#3b82f6',
                    }) }}
                    isAnimationActive={false}
                  />
                  <Tooltip
                    cursor={{ fill: getValueForValence(primaryValenceMetric, valence, {
                      good: 'rgba(16,185,129,0.08)',
                      bad: 'rgba(239,68,68,0.08)',
                      neutral: 'rgba(59,130,246,0.08)',
                    }) }}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const { value, valenceValue, format, secondaryValue, secondaryFormat, secondaryLabel } = payload[0].payload as NumbersChartDataPoint;
                        return (
                          <div className="rounded-md bg-white dark:bg-slate-900 px-2 py-1 shadow-lg dark:shadow-xl border border-gray-200 dark:border-slate-700">
                            <div style={{ fontWeight: 600, fontSize: 14 }}>
                              <NumberText value={value} valenceValue={valenceValue} valence={valence} formatOptions={format ?? undefined} />
                            </div>
                            {secondaryValue !== undefined && secondaryValue !== null ? (
                              <div style={{ fontSize: 12, opacity: 0.7 }}>
                                {secondaryLabel && <span className="mr-1">{secondaryLabel}</span>}
                                <NumberText value={secondaryValue} valenceValue={secondaryValue} valence={valence} formatOptions={secondaryFormat ?? undefined} />
                              </div>
                            ) : null}
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

          {/* Daily stats if monthData provided */}
          {daysData && (
            <>
              <GroupedStats
                grouping='monthly'
                daysData={daysData}
                valence={valence}
                tracking={tracking}
              />
              <GroupedStats
                grouping='daily'
                daysData={daysData}
                valence={valence}
                tracking={tracking}
              />
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}


interface DailyStatsProps {
  grouping: "daily" | "monthly";
  daysData: Record<DayKey, number[]>;
  valence: Valence;
  tracking: Tracking;
}

const GroupedStats: React.FC<DailyStatsProps> = ({ grouping, daysData, valence, tracking }) => {
  const stats = useMemo(() => {
    return {
      daily: computeDailyStats,
      monthly: computeMonthlyStats
    }[grouping](daysData);
  }, [daysData, grouping]);

  const extremes = useMemo(() => {
    return calculateExtremes(stats);
  }, [stats]);

  const primaryMetric = getPrimaryMetric(tracking);
  const primaryMetricLabel = getPrimaryMetricLabel(tracking);
  const primaryMetricStats = useMemo(() => {
    return computeMetricStats(stats, primaryMetric);
  }, [stats, primaryMetric]);

  if (!primaryMetricStats || stats.length <= 1) {
    return null;
  }

  const displayStats = [
    {
      label: `Mean`,
      value: primaryMetricStats.mean,
      high: extremes?.highestMean,
      low: extremes?.lowestMean,
    },
    {
      label: `Median`,
      value: primaryMetricStats.median,
      high: extremes?.highestMedian,
      low: extremes?.lowestMedian,
    },
    {
      label: `Min`,
      value: primaryMetricStats.min,
      high: extremes?.highestMin,
      low: extremes?.lowestMin,
    },
    {
      label: `Max`,
      value: primaryMetricStats.max,
      high: extremes?.highestMax,
      low: extremes?.lowestMax,
    },
  ];

  return (
    <div className="mt-6">
      <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2 text-center">{capitalize(grouping)} Statistics</h3>
      <div className="grid grid-cols-2 gap-4">
        {displayStats.map(({ label, value, high, low }) => (
          <div key={label} className="flex flex-col items-center">
            <div className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400 font-medium mb-0.5">{label}</div>
            <span title={`${label} ${grouping} ${primaryMetricLabel}`}>
              <NumberText
                value={value}
                valenceValue={getValenceValueForNumber(value, undefined, tracking)}
                valence={valence}
                className="text-base font-mono font-bold"
              />
            </span>
            {(high !== undefined || low !== undefined) && (
              <div className="flex items-center gap-1 mt-0.5 rounded-full grayt-bg-slate-100 dark:bg-slate-800 px-2 py-1">
                {high !== undefined && (
                  <span className="inline-flex items-center px-1.5 py-0.5 text-[11px] font-mono font-semibold" title={`Highest ${grouping} ${label}`}>
                    <ArrowUpToLine className="inline-block w-3 h-3 text-slate-500 dark:text-slate-400" /><NumberText
                      value={high}
                      valenceValue={getValenceValueForNumber(high, undefined, tracking)}
                      valence={valence}
                      className="ml-1 text-xs font-mono font-semibold"
                    />
                  </span>
                )}
                {low !== undefined && (
                  <span className="inline-flex items-center px-1.5 py-0.5 text-[11px] font-mono font-semibold" title={`Lowest ${grouping} ${label}`}>
                    <ArrowDownToLine className="inline-block w-3 h-3 text-slate-500 dark:text-slate-400" /> <NumberText
                      value={low}
                      valenceValue={getValenceValueForNumber(low, undefined, tracking)}
                      valence={valence}
                      className="ml-1 text-xs font-mono font-semibold"
                    />
                  </span>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}