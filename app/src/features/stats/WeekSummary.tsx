import React, { useMemo } from 'react';
import { CheckCircle, XCircle, Minus, Clock, TrendingUp, TrendingDown } from 'lucide-react';
import { ChartContainer } from '@/components/ui/chart';
import { LineChart, Line, Tooltip } from 'recharts';
import { computeNumberStats } from '@/lib/stats';
import { NumberText } from '@/components/ui/number-text';
import type { Valence } from '@/features/db/localdb';
import { getValueForValence } from '@/lib/valence';

export interface WeekSummaryProps {
  numbers: number[];
  weekNumber?: number;
  isCurrentWeek?: boolean;
  valence: Valence;
}

export const WeekSummary: React.FC<WeekSummaryProps> = ({ numbers, weekNumber, isCurrentWeek, valence }) => {
  if (!numbers || numbers.length === 0) return null;

  const stats = useMemo(() => computeNumberStats(numbers), [numbers]);
  if (!stats) return null;
  const { count, total, mean, median, min, max } = stats;

  const bgClasses = getValueForValence(total, valence, {
    good: 'bg-green-50 dark:bg-[#1a3a2a]',
    bad: 'bg-red-50 dark:bg-[#3a1a1a]',
    neutral: 'bg-slate-50 dark:bg-slate-800',
  });

  const borderClasses = getValueForValence(total, valence, {
    good: 'border-r-4 border-green-400 dark:border-green-600',
    bad: 'border-r-4 border-red-400 dark:border-red-600',
    neutral: 'border-r-4 border-slate-400 dark:border-slate-600',
  });

  // Number coloring handled by NumberText component based on sign.


  // Cumulative numbers for micro line chart
  const cumulativeNumbers = React.useMemo(() => {
    let sum = 0;
    return numbers.map(n => (sum += n));
  }, [numbers]);

  const chartBgClasses = getValueForValence(total, valence, {
    good: 'bg-green-100 dark:bg-green-900/40',
    bad: 'bg-red-100 dark:bg-red-900/40',
    neutral: 'bg-slate-100 dark:bg-slate-800/40',
  });

  // Chart line color based on valence
  const chartLineColor = getValueForValence(total, valence, {
    good: '#22c55e', // green
    bad: '#ef4444',  // red
    neutral: '#2563eb', // blue-600
  });

  // Choose icon based on valence and total
  const getStatusIcon = () => {
    if (isCurrentWeek) {
      return <Clock className="w-4 h-4 text-blue-600" />;
    }
    return getValueForValence(total, valence, {
      good: <CheckCircle className="w-4 h-4 text-green-600" />,
      bad: <XCircle className="w-4 h-4 text-red-600" />,
      neutral: total > 0 ? <TrendingUp className="w-4 h-4 text-slate-600" /> : total < 0 ? <TrendingDown className="w-4 h-4 text-slate-600" /> : <Minus className="w-4 h-4 text-slate-600" />,
    });
  };

  return (
  <div className={`rounded-md ${bgClasses} ${borderClasses} shadow-sm dark:shadow-md hover:shadow-md dark:hover:shadow-lg transition-shadow`} aria-label="Weekly summary">
      <div className="w-full flex items-stretch gap-3 sm:gap-5 px-3 py-2">
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
          {count > 1 && (
            <div className={`w-full h-8 rounded-md ${chartBgClasses} flex items-center justify-center px-2`} aria-label="Weekly trend mini chart">
              <ChartContainer config={{ numbers: { color: chartLineColor } }} className="w-full h-6">
                <LineChart width={160} height={24} data={cumulativeNumbers.map((y, i) => ({ x: i, y }))} margin={{ top: 4, right: 0, left: 0, bottom: 4 }}>
                  <Line
                    type="monotone"
                    dataKey="y"
                    stroke={chartLineColor}
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={false}
                  />
                  <Tooltip
                    cursor={{ fill: getValueForValence(total, valence, {
                      good: 'rgba(16,185,129,0.10)',
                      bad: 'rgba(239,68,68,0.10)',
                      neutral: 'rgba(37,99,235,0.10)', // blue-600
                    }) }}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const cumulative = payload[0].value as number;
                        const entryIndex = payload[0].payload.x as number;
                        const entryValue = entryIndex === 0 ? cumulative : cumulative - cumulativeNumbers[entryIndex - 1];
                        const entryColor = getValueForValence(entryValue, valence, {
                          good: '#22c55e',
                          bad: '#ef4444',
                          neutral: '#2563eb',
                        });
                        const totalColor = getValueForValence(cumulative, valence, {
                          good: '#22c55e',
                          bad: '#ef4444',
                          neutral: '#2563eb',
                        });
                        return (
                          <div className="rounded-md bg-white dark:bg-slate-900 px-2 py-1 shadow-lg dark:shadow-xl border border-gray-200 dark:border-slate-700">
                            <div style={{ color: entryColor, fontWeight: 600, fontSize: 12 }}>
                              {entryValue > 0 ? `+${entryValue}` : entryValue < 0 ? `-${Math.abs(entryValue)}` : entryValue}
                            </div>
                            <div className="flex items-center gap-1 text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                              <span>Total</span>
                              <span style={{ color: totalColor, fontWeight: 600, fontSize: 12 }}>
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
        {/* STATS (right) */}
        <div className="flex items-center gap-3 sm:gap-5 justify-end flex-shrink-0">
          {/* spacer removed */}

          {/* Mean / Median (secondary) */}
          <div className="hidden sm:flex items-center gap-3">
            <div className="text-right">
              <div className="text-[10px] uppercase tracking-wide text-slate-500 dark:text-slate-400">Mean</div>
              <NumberText value={Number.isFinite(mean) ? mean : null} valence={valence} className="font-mono text-xs sm:text-sm font-semibold" formatOptions={{ maximumFractionDigits: 1 }} />
            </div>
            <div className="text-right">
              <div className="text-[10px] uppercase tracking-wide text-slate-500 dark:text-slate-400">Median</div>
              <NumberText value={Number.isFinite(median) ? median : null} valence={valence} className="font-mono text-xs sm:text-sm font-semibold" formatOptions={{ maximumFractionDigits: 1 }} />
            </div>
          </div>

          <div className="hidden md:block w-px h-6 bg-slate-300/40 dark:bg-slate-700/40" />

          {/* Min / Max (tertiary) */}
          <div className="hidden md:flex items-center gap-3">
            <div className="text-right">
              <div className="text-[10px] uppercase tracking-wide text-slate-500 dark:text-slate-400">Min</div>
              <NumberText value={min} valence={valence} className="font-mono text-sm font-semibold" />
            </div>
            <div className="text-right">
              <div className="text-[10px] uppercase tracking-wide text-slate-500 dark:text-slate-400">Max</div>
              <NumberText value={max} valence={valence} className="font-mono text-sm font-semibold" />
            </div>
          </div>

          <div className="hidden sm:block w-px h-6 bg-slate-300/40 dark:bg-slate-700/40" />

          {/* Total (most prominent, right-most, own container) */}
          <div className={`flex items-center gap-2 px-3 py-2 rounded font-mono font-bold ${getValueForValence(total, valence, {
            good: 'bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-300',
            bad: 'bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300',
            neutral: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200',
          })}`}>
            <div className="text-[10px] uppercase tracking-wide text-slate-500 dark:text-slate-400">Total</div>
            <NumberText value={total} valence={valence} className="text-lg sm:text-xl font-extrabold" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default WeekSummary;
