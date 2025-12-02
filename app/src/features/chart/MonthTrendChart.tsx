import React, { useMemo, useState } from 'react';
import { useTheme } from '@/components/ThemeProvider';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, BarChart, Bar, Cell } from 'recharts';
import type { DayKey, Valence } from '@/features/db/localdb';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { LineChart as LineChartIcon, BarChart as BarChartIcon } from 'lucide-react';
import { getValueForValence } from '@/lib/valence';
import { getMonthDays } from '@/lib/calendar';
import { parseISO } from 'date-fns';
import { dateToDayKey } from '@/lib/friendly-date';

type MonthTrendChartMode = 'trend' | 'change';

interface MonthTrendChartProps {
  year: number;
  month: number; // 1-based
  data: Record<DayKey, number[]>;
  valence: Valence;
  priorDay?: number[] | undefined;
}

interface TrendPoint {
  x: string;
  day: number;
  value: number;
  delta: number;
  idx?: number;
}

export const MonthTrendChart: React.FC<MonthTrendChartProps> = ({ year, month, data, valence, priorDay }) => {
  const [mode, setMode] = useState<MonthTrendChartMode>('trend');

  const { theme } = useTheme();
  const isDark =
    theme === 'dark' ||
    (theme === 'system' && typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  const axisColor = isDark ? '#64748b' : '#334155';
  const gridColor = isDark ? '#334155' : '#e5e7eb';

  // All day keys for the month (ticks)
  const dayKeys = useMemo(() => getMonthDays(year, month), [year, month]);

  // Points only for populated days
  const points: TrendPoint[] = useMemo(() => {
    let prior = priorDay?.[priorDay.length - 1];
    const pts: TrendPoint[] = [];
    // If we have a prior value, prepend a synthetic point at last day before this month
    if (prior !== undefined && mode === 'trend') {
      const prevKey = dateToDayKey(new Date(year, month - 1, 0));
      pts.push({ x: prevKey, day: 0, value: prior, delta: 0, idx: 0 });
    }
    for (let i = 0; i < dayKeys.length; i++) {
        const date = dayKeys[i];
        let numbers = data[date];
        if (!numbers || numbers.length === 0) continue
        const value = numbers[numbers.length - 1];
        const delta = prior !== undefined ? value - prior : 0;
        prior = value;
        const day = parseISO(date).getDate();
        pts.push({ x: date, day, value, delta, idx: pts.length });
    }
    return pts;
  }, [dayKeys, data, priorDay, mode]);

  const firstDay = 1;
  const lastDay = new Date(year, month, 0).getDate();

  const overallChange = useMemo(() => {
    if (points.length === 0) return 0;
    const firstValid = points[0];
    const lastValid = points[points.length - 1];
    if (!firstValid || !lastValid) return 0;
    return lastValid.value - firstValid.value;
  }, [points]);

  const lineColor = getValueForValence(overallChange, valence, {
    good: '#22c55e',
    bad: '#ef4444',
    neutral: '#2563eb'
  });

  const barColors = {
    good: '#10b981',
    bad: '#ef4444',
    neutral: '#3b82f6'
  };

  return (
    <div className="rounded-lg bg-slate-50 dark:bg-slate-900/60 p-6 shadow-lg dark:shadow-xl hover:shadow-xl dark:hover:shadow-2xl transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <div />
        <ToggleGroup
          type="single"
          value={mode}
          onValueChange={(v: string | null) => {
            if (!v) return; // prevent unselecting; keep previous selection
            setMode(v as MonthTrendChartMode);
          }}
          size="sm"
          variant="outline"
          aria-label="Trend Mode"
        >
          <ToggleGroupItem value="change" aria-label="Change">
            <BarChartIcon className="size-4 mr-1" />
            <span className="hidden sm:inline">Change</span>
          </ToggleGroupItem>
          <ToggleGroupItem value="trend" aria-label="Trend">
            <LineChartIcon className="size-4 mr-1" />
            <span className="hidden sm:inline">Trend</span>
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      {mode === 'trend' ? (
        <div className="w-full h-48 bg-white dark:bg-slate-900 rounded-lg shadow-sm dark:shadow-md">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={points} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
              <XAxis
                dataKey="day"
                type="number"
                domain={[firstDay, lastDay]}
                allowDecimals={false}
                allowDataOverflow={true}
                // keep ticks to real days only (1..last), synthetic prior point sits at 0
                ticks={Array.from({ length: lastDay }, (_, i) => i + 1)}
                tickFormatter={d => String(d)}
                fontSize={12}
                stroke={axisColor}
                tick={{ fill: axisColor }}
              />
              <YAxis fontSize={12} domain={['dataMin', 'dataMax']} stroke={axisColor} tick={{ fill: axisColor }} />
              <Tooltip
                cursor={{
                  fill: getValueForValence(overallChange, valence, {
                    good: 'rgba(16,185,129,0.10)',
                    bad: 'rgba(239,68,68,0.10)',
                    neutral: 'rgba(37,99,235,0.10)'
                  })
                }}
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const p = payload[0].payload as TrendPoint;
                    if (p.day === 0) return null; // suppress priorDay synthetic point tooltip
                    const deltaColor = getValueForValence(p.delta, valence, barColors);
                    return (
                      <div className="rounded-md bg-white dark:bg-slate-900 px-3 py-2 shadow-lg dark:shadow-xl border border-gray-200 dark:border-slate-700">
                        <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                          {parseISO(p.x).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </div>
                        <div className="font-semibold" style={{ color: deltaColor }}>
                          {p.value}
                        </div>
                        <div className="font-mono text-sm">
                          <span style={{ color: deltaColor }}>
                            {new Intl.NumberFormat(undefined, { signDisplay: 'always' }).format(p.delta)}
                          </span>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke={lineColor}
                strokeWidth={2}
                dot={({ cx, cy, payload }) => {
                  const color = getValueForValence((payload as TrendPoint).delta, valence, barColors);
                  return <circle cx={cx} cy={cy} r={4} fill={color} />;
                }}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="w-full h-48 bg-white dark:bg-slate-900 rounded-lg shadow-sm dark:shadow-md">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={points}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
              <XAxis
                dataKey="idx"
                type="number"
                scale="linear"
                domain={[Math.min(-0.5, 0), Math.max((points.length - 1) + 0.5, 0.5)]}
                allowDecimals={false}
                ticks={points.map(p => p.idx ?? 0)}
                tickFormatter={(i: number) => {
                  const p = points[i];
                  if (!p) return '';
                  return String(parseISO(p.x).getDate());
                }}
                fontSize={12}
                stroke={axisColor}
                tick={{ fill: axisColor }}
              />
              <YAxis
                fontSize={12}
                domain={[
                  (dataMin: number) => Math.min(dataMin, 0),
                  (dataMax: number) => Math.max(dataMax, 0)
                ]}
                stroke={axisColor}
                tick={{ fill: axisColor }}
              />
              <Tooltip
                cursor={{ fill: 'rgba(16,185,129,0.08)' }}
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const p = payload[0].payload as TrendPoint;
                    if (p.day === 0) return null; // suppress priorDay synthetic point tooltip
                    const deltaColor = getValueForValence(p.delta, valence, barColors);
                    return (
                      <div className="rounded-md bg-white dark:bg-slate-900 px-3 py-2 shadow-lg dark:shadow-xl border border-gray-200 dark:border-slate-700">
                        <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                          {parseISO(p.x).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </div>
                        <span style={{ color: deltaColor, fontWeight: 600, fontSize: 16 }}>
                          {new Intl.NumberFormat(undefined, { signDisplay: 'always' }).format(p.delta)}
                        </span>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar dataKey="delta" radius={[4, 4, 0, 0]}>
                {points.map((entry, idx) => (
                  <Cell key={`cell-${idx}`} fill={getValueForValence(entry.delta, valence, barColors)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};