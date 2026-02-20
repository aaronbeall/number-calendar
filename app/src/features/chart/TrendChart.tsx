import { useTheme } from '@/components/ThemeProvider';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import type { DayKey, Valence } from '@/features/db/localdb';
import { getMonthDays, getYearDays } from '@/lib/calendar';
import { dateToDayKey, formatFriendlyDate } from '@/lib/friendly-date';
import { formatValue } from '@/lib/friendly-numbers';
import { getValueForValence } from '@/lib/valence';
import { parseISO } from 'date-fns';
import { BarChart as BarChartIcon, LineChart as LineChartIcon } from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

type TrendChartMode = 'trend' | 'change';
type TrendGroup = 'daily' | 'monthly';

interface TrendChartProps {
  year: number;
  month?: number; // 1-based, optional for full-year mode
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
  doy?: number; // day-of-year index for full-year daily mode
  mon?: number; // 1-12 month index for full-year monthly mode
}

export const TrendChart: React.FC<TrendChartProps> = ({ year, month, data, valence, priorDay }) => {
  const [mode, setMode] = useState<TrendChartMode>('trend');
  const [group, setGroup] = useState<TrendGroup>('daily');

  const isFullYear = !month;

  const { theme } = useTheme();
  const isDark =
    theme === 'dark' ||
    (theme === 'system' && typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  const axisColor = isDark ? '#64748b' : '#334155';
  const gridColor = isDark ? '#334155' : '#e5e7eb';

  // All day keys for the month (ticks)
  // Build day keys: either full month or full year
  const dayKeys = useMemo(() => {
    if (month) return getMonthDays(year, month);
    return getYearDays(year);
  }, [year, month]);

  // Points only for populated days
  const points: TrendPoint[] = useMemo(() => {
    let prior = priorDay?.[priorDay.length - 1];
    const pts: TrendPoint[] = [];
    const getDayOfYear = (d: Date) => {
      const start = new Date(d.getFullYear(), 0, 1);
      const diff = d.getTime() - start.getTime();
      return Math.floor(diff / 86400000) + 1;
    };
    // Synthetic prior point only when focusing a single month
    if (prior !== undefined && mode === 'trend' && month) {
      const prevKey = dateToDayKey(new Date(year, (month) - 1, 0));
      pts.push({ x: prevKey, day: 0, value: prior, delta: 0, idx: 0 });
    }
    if (!isFullYear || group === 'daily') {
      // Daily over month or daily over full year: use last value for each populated day
      for (let i = 0; i < dayKeys.length; i++) {
        const date = dayKeys[i];
        const numbers = data[date];
        if (!numbers || numbers.length === 0) continue;
        const value = numbers[numbers.length - 1];
        const delta = prior !== undefined ? value - prior : 0;
        prior = value;
        const d = parseISO(date);
        const day = d.getDate();
        const doy = isFullYear ? getDayOfYear(d) : undefined;
        pts.push({ x: date, day, doy, value, delta, idx: pts.length });
      }
    } else {
      // Monthly over full year: take last populated day of each month
      const monthMap = new Map<string, DayKey>();
      for (const date of dayKeys) {
        const numbers = data[date];
        if (!numbers || numbers.length === 0) continue;
        const key = date.slice(0, 7); // YYYY-MM
        const existing = monthMap.get(key);
        if (!existing || date > existing) {
          monthMap.set(key, date);
        }
      }
      const lastDays = Array.from(monthMap.values()).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
      for (const date of lastDays) {
        const numbers = data[date]!;
        const value = numbers[numbers.length - 1];
        const delta = prior !== undefined ? value - prior : 0;
        prior = value;
        const d = parseISO(date);
        const day = d.getDate();
        const doy = getDayOfYear(d);
        const mon = d.getMonth() + 1;
        pts.push({ x: date, day, doy, mon, value, delta, idx: pts.length });
      }
    }
    return pts;
  }, [dayKeys, data, priorDay, mode, month, isFullYear, group]);

  const firstDay = 1;
  const lastDay = month ? new Date(year, month, 0).getDate() : 31;

  // Month tick positions for full-year views (day-of-year for first day of each month)
  const monthTicksNum: number[] = useMemo(() => {
    if (!isFullYear) return [];
    const ticks: number[] = [];
    for (let m = 1; m <= 12; m++) {
      const d = new Date(year, m - 1, 1);
      const start = new Date(year, 0, 1);
      const diff = d.getTime() - start.getTime();
      const doy = Math.floor(diff / 86400000) + 1;
      ticks.push(doy);
    }
    return ticks;
  }, [isFullYear, year]);

  // Use actual data points for monthly tick anchors when in full-year daily mode
  const yearLastDayIndex: number = useMemo(() => {
    if (!isFullYear) return lastDay; // month mode uses lastDay
    const dec31 = new Date(year, 11, 31);
    const start = new Date(year, 0, 1);
    const diff = dec31.getTime() - start.getTime();
    return Math.floor(diff / 86400000) + 1;
  }, [isFullYear, year, lastDay]);

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
        <div className="flex gap-2">
          {isFullYear && (
            <ToggleGroup
              type="single"
              value={group}
              onValueChange={(v: string | null) => {
                if (!v) return;
                setGroup(v as TrendGroup);
              }}
              size="sm"
              variant="outline"
              aria-label="Group Mode"
            >
              <ToggleGroupItem value="daily" aria-label="Daily"><span>Daily</span></ToggleGroupItem>
              <ToggleGroupItem value="monthly" aria-label="Monthly"><span>Monthly</span></ToggleGroupItem>
            </ToggleGroup>
          )}
        </div>
        <ToggleGroup
          type="single"
          value={mode}
          onValueChange={(v: string | null) => {
            if (!v) return; // prevent unselecting; keep previous selection
            setMode(v as TrendChartMode);
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
              {isFullYear && group === 'monthly' ? (
                <XAxis
                  dataKey="mon"
                  type="number"
                  domain={[1, 12]}
                  ticks={[1,2,3,4,5,6,7,8,9,10,11,12]}
                  tickFormatter={(m: number) => {
                    const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
                    return monthNames[m - 1];
                  }}
                  fontSize={12}
                  minTickGap={20}
                  stroke={axisColor}
                  tick={{ fill: axisColor }}
                />
              ) : isFullYear && group === 'daily' ? (
                <XAxis
                  dataKey="doy"
                  type="number"
                  domain={[1, yearLastDayIndex]}
                  ticks={monthTicksNum}
                  tickFormatter={(d: number) => {
                    // d is day-of-year index for the first of each month; map to month abbreviation
                    const date = new Date(year, 0, d);
                    const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
                    return monthNames[date.getMonth()];
                  }}
                  fontSize={12}
                  minTickGap={20}
                  stroke={axisColor}
                  tick={{ fill: axisColor }}
                />
              ) : (
                <XAxis
                  dataKey="day"
                  type="number"
                  domain={[firstDay, lastDay]}
                  allowDecimals={false}
                  allowDataOverflow={true}
                  ticks={Array.from({ length: lastDay }, (_, i) => i + 1)}
                  tickFormatter={d => String(d)}
                  fontSize={12}
                  stroke={axisColor}
                  tick={{ fill: axisColor }}
                />
              )}
              <YAxis fontSize={12} domain={['dataMin', 'dataMax']} stroke={axisColor} tick={{ fill: axisColor }} tickFormatter={(value) => formatValue(value, { short: true })} />
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
                          {formatFriendlyDate(p.x as any)}
                        </div>
                        <div className="font-semibold" style={{ color: deltaColor }}>
                          {formatValue(p.value)}
                        </div>
                        <div className="font-mono text-sm">
                          <span style={{ color: deltaColor }}>
                            {formatValue(p.delta, { delta: true })}
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
              {isFullYear && group === 'monthly' ? (
                <XAxis
                  dataKey="mon"
                  type="number"
                  domain={[1, 12]}
                  ticks={[1,2,3,4,5,6,7,8,9,10,11,12]}
                  tickFormatter={(m: number) => {
                    const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
                    return monthNames[m - 1];
                  }}
                  fontSize={12}
                  minTickGap={20}
                  stroke={axisColor}
                  tick={{ fill: axisColor }}
                />
              ) : isFullYear && group === 'daily' ? (
                <XAxis
                  dataKey="doy"
                  type="number"
                  domain={[1, yearLastDayIndex]}
                  ticks={monthTicksNum}
                  tickFormatter={(d: number) => {
                    const date = new Date(year, 0, d);
                    const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
                    return monthNames[date.getMonth()];
                  }}
                  fontSize={12}
                  minTickGap={20}
                  stroke={axisColor}
                  tick={{ fill: axisColor }}
                />
              ) : (
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
              )}
              <YAxis
                fontSize={12}
                domain={[
                  (dataMin: number) => Math.min(dataMin, 0),
                  (dataMax: number) => Math.max(dataMax, 0)
                ]}
                stroke={axisColor}
                tick={{ fill: axisColor }}
                tickFormatter={(value) => formatValue(value, { short: true })}
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
                          {formatFriendlyDate(p.x as any)}
                        </div>
                        <span style={{ color: deltaColor, fontWeight: 600, fontSize: 16 }}>
                          {formatValue(p.delta, { delta: true })}
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