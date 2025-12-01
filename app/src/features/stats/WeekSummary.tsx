import { ChartContainer } from '@/components/ui/chart';
import { NumberText } from '@/components/ui/number-text';
import type { Tracking, Valence } from '@/features/db/localdb';
import { getCalendarData } from '@/lib/calendar';
import { getChartData, getChartNumbers, type NumbersChartDataPoint } from '@/lib/charts';
import { getValueForValence } from '@/lib/valence';
import { CheckCircle, Clock, Minus, TrendingDown, TrendingUp, XCircle } from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { NumbersPanel } from '../panel/NumbersPanel';
import { Line, LineChart, Tooltip } from 'recharts';

export interface WeekSummaryProps {
  numbers: number[];
  weekNumber: number;
  isCurrentWeek?: boolean;
  valence: Valence;
  tracking: Tracking;
  priorNumbers?: number[];
}

export const WeekSummary: React.FC<WeekSummaryProps> = ({ numbers, weekNumber, isCurrentWeek, valence, tracking, priorNumbers }) => {
  if (!numbers || numbers.length === 0) return null;

  const [panelOpen, setPanelOpen] = useState(false);

  // Use getCalendarData for all stats, deltas, valence, etc. (no extremes for week)
  const {
    stats,
    valenceStats,
    primaryMetric,
    primaryMetricLabel,
    primaryValenceMetric,
    isHighestPrimary,
    isLowestPrimary,
  } = useMemo(() => getCalendarData(numbers, priorNumbers, undefined, tracking), [numbers, priorNumbers, tracking]);

  if (!stats) return null;
  const { mean, median, min, max, count } = stats;
  
  // Use valence metric for coloring, as in DayCell
  const bgClasses = getValueForValence(primaryValenceMetric, valence, {
    good: 'bg-green-50 dark:bg-[#1a3a2a]',
    bad: 'bg-red-50 dark:bg-[#3a1a1a]',
    neutral: 'bg-slate-50 dark:bg-slate-800',
  });

  const borderClasses = getValueForValence(primaryValenceMetric, valence, {
    good: 'border-r-4 border-green-400 dark:border-green-600',
    bad: 'border-r-4 border-red-400 dark:border-red-600',
    neutral: 'border-r-4 border-slate-400 dark:border-slate-600',
  });


  // Chart data and config based on tracking mode
  const chartBgClasses = getValueForValence(primaryValenceMetric, valence, {
    good: 'bg-green-100 dark:bg-green-900/40',
    bad: 'bg-red-100 dark:bg-red-900/40',
    neutral: 'bg-slate-100 dark:bg-slate-800/40',
  });

  const chartLineColor = getValueForValence(primaryValenceMetric, valence, {
    good: '#22c55e', // green
    bad: '#ef4444',  // red
    neutral: '#2563eb', // blue-600
  });

  // Chart data using getChartData utility
  const chartData = useMemo(() => getChartData(getChartNumbers(numbers, priorNumbers, tracking), tracking), [numbers, priorNumbers, tracking]);

  // Choose icon based on valence and valence metric
  const getStatusIcon = () => {
    if (isCurrentWeek) {
      return <Clock className="w-4 h-4 text-blue-600" />;
    }
    return getValueForValence(primaryValenceMetric, valence, {
      good: <CheckCircle className="w-4 h-4 text-green-600" />, 
      bad: <XCircle className="w-4 h-4 text-red-600" />, 
      neutral: (primaryValenceMetric ?? 0) > 0 
        ? <TrendingUp className="w-4 h-4 text-slate-600" /> 
        : (primaryValenceMetric ?? 0) < 0 
          ? <TrendingDown className="w-4 h-4 text-slate-600" /> 
          : <Minus className="w-4 h-4 text-slate-600" />, 
    });
  };

  // Selected highlight (blue ring) when panel is open
  const selectedRing = panelOpen ? 'ring-2 ring-blue-400/80 ring-offset-2 ring-offset-white dark:ring-blue-300/70 dark:ring-offset-slate-900' : '';

  return (
    <div className={`relative rounded-md ${bgClasses} ${borderClasses} shadow-sm dark:shadow-md hover:shadow-md dark:hover:shadow-lg transition-shadow ${selectedRing}`} aria-label="Weekly summary">
      <div
        className="w-full flex items-stretch gap-3 sm:gap-5 px-3 py-2 cursor-pointer"
        onClick={() => setPanelOpen(true)}
        tabIndex={0}
        role="button"
        aria-label={`Show week ${weekNumber} details`}
      >
        {/* TITLE (left) */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {getStatusIcon()}
          <div className="leading-tight">
            <div className="text-xs font-medium text-slate-600 dark:text-slate-300">Week {weekNumber || '?'}</div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400">{count} entries</div>
          </div>
        </div>
        {/* CHART (middle, flex-grow) */}
        <div className="hidden sm:flex items-center flex-1">
          {chartData.length > 1 && (
            <div className={`w-full h-8 rounded-md ${chartBgClasses} flex items-center justify-center px-2`} aria-label="Weekly trend mini chart">
              <ChartContainer config={{ numbers: { color: chartLineColor } }} className="w-full h-6">
                <LineChart width={160} height={24} data={chartData} margin={{ top: 4, right: 0, left: 0, bottom: 4 }}>
                  <Line
                    type="monotone"
                    dataKey="y"
                    stroke={chartLineColor}
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={false}
                  />
                  <Tooltip
                    cursor={{ fill: getValueForValence(primaryValenceMetric, valence, {
                      good: 'rgba(16,185,129,0.10)',
                      bad: 'rgba(239,68,68,0.10)',
                      neutral: 'rgba(37,99,235,0.10)', // blue-600
                    }) }}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const { value, valenceValue, format, secondaryValue, secondaryFormat, secondaryLabel } = payload[0].payload as NumbersChartDataPoint;
                        return (
                          <div className="rounded-md bg-white dark:bg-slate-900 px-2 py-1 shadow-lg dark:shadow-xl border border-gray-200 dark:border-slate-700">
                            <div style={{ fontWeight: 600, fontSize: 14 }}>
                              <NumberText value={value} valenceValue={valenceValue} valence={valence} formatOptions={format} />
                            </div>
                            {secondaryValue !== undefined && secondaryValue !== null ? (
                              <div style={{ fontSize: 12, opacity: 0.7 }}>
                                {secondaryLabel && <span className=" text-slate-500 dark:text-slate-400 mr-1">{secondaryLabel}</span>}
                                <NumberText value={secondaryValue} valenceValue={secondaryValue} valence={valence} formatOptions={secondaryFormat} />
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
        </div>
        {/* STATS (right) */}
        <div className="flex items-center gap-3 sm:gap-5 justify-end flex-shrink-0">
          {/* Mean / Median (secondary) */}
          <div className="hidden sm:flex items-center gap-3">
            <div className="text-right">
              <div className="text-[10px] uppercase tracking-wide text-slate-500 dark:text-slate-400">Mean</div>
              <NumberText value={mean} valenceValue={valenceStats?.mean ?? primaryValenceMetric} valence={valence} className="font-mono text-xs sm:text-sm font-semibold" formatOptions={{ maximumFractionDigits: 1 }} />
            </div>
            <div className="text-right">
              <div className="text-[10px] uppercase tracking-wide text-slate-500 dark:text-slate-400">Median</div>
              <NumberText value={median} valenceValue={valenceStats?.median ?? primaryValenceMetric} valence={valence} className="font-mono text-xs sm:text-sm font-semibold" formatOptions={{ maximumFractionDigits: 1 }} />
            </div>
          </div>

          <div className="hidden md:block w-px h-6 bg-slate-300/40 dark:bg-slate-700/40" />

          {/* Min / Max (tertiary) */}
          <div className="hidden md:flex items-center gap-3">
            <div className="text-right">
              <div className="text-[10px] uppercase tracking-wide text-slate-500 dark:text-slate-400">Min</div>
              <NumberText value={min} valenceValue={valenceStats?.min ?? primaryValenceMetric} valence={valence} className="font-mono text-sm font-semibold" />
            </div>
            <div className="text-right">
              <div className="text-[10px] uppercase tracking-wide text-slate-500 dark:text-slate-400">Max</div>
              <NumberText value={max} valenceValue={valenceStats?.max ?? primaryValenceMetric} valence={valence} className="font-mono text-sm font-semibold" />
            </div>
          </div>

          <div className="hidden md:block w-px h-6 bg-slate-300/40 dark:bg-slate-700/40" />

          {/* Primary metric (most prominent, right-most, own container) */}
          <div className={`flex items-center gap-2 px-3 py-2 rounded font-mono font-bold ${getValueForValence(primaryValenceMetric, valence, {
            good: 'bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-300',
            bad: 'bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300',
            neutral: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200',
          })}`}>
            <div className="text-[10px] uppercase tracking-wide text-slate-500 dark:text-slate-400">{primaryMetricLabel}</div>
            <NumberText value={primaryMetric} valenceValue={primaryValenceMetric} isHighest={!!isHighestPrimary} isLowest={!!isLowestPrimary} valence={valence} className="text-lg sm:text-xl font-extrabold" />
          </div>
        </div>
      </div>
      <NumbersPanel
        isOpen={panelOpen}
        onClose={() => setPanelOpen(false)}
        title={`Week ${weekNumber}`}
        numbers={numbers}
        priorNumbers={priorNumbers}
        editableNumbers={false}
        showExpressionInput={false}
        valence={valence}
        tracking={tracking}
      />
    </div>
  );
};
export default WeekSummary;
