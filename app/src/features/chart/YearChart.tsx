import React, { useMemo, useState } from 'react';
import { useTheme } from '@/components/ThemeProvider';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts';
import { getValueForValence } from '@/lib/valence';
import type { DayKey, Valence } from '@/features/db/localdb';
import { parseDayKey, toDayKey } from '@/lib/friendly-date';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { BarChart as BarChartIcon, LineChart as LineChartIcon } from 'lucide-react';
import { entriesOf } from '@/lib/utils';

type YearChartMode = 'serial' | 'cumulative';
type YearChartGroup = 'daily' | 'monthly';

interface YearChartProps {
  year: number;
  yearData: Record<DayKey, number[]>;
  valence: Valence;
}

// Helper to group data by month
function groupByMonth(yearData: Record<DayKey, number[]>): { month: number; numbers: number[] }[] {
  const months: { month: number; numbers: number[] }[] = Array.from({ length: 12 }, (_, i) => ({ month: i + 1, numbers: [] }));
  entriesOf(yearData).forEach(([date, nums]) => {
    const { month } = parseDayKey(date);
    if (month >= 1 && month <= 12) {
      months[month - 1].numbers.push(...nums);
    }
  });
  return months;
}

const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export const YearChart: React.FC<YearChartProps> = ({ year, yearData, valence }) => {
  const [mode, setMode] = useState<YearChartMode>(() => 'serial');
  const [group, setGroup] = useState<YearChartGroup>(() => 'monthly');
  // Prepare chart data
  const chartDataMonthly = useMemo(() => groupByMonth(yearData), [yearData]);

  // For daily mode, generate all days in the year
  const getAllYearDays = (year: number) => {
    const days: DayKey[] = [];
    for (let m = 1; m <= 12; m++) {
      const lastDay = new Date(year, m, 0).getDate();
      for (let d = 1; d <= lastDay; d++) {
        days.push(toDayKey(year, m, d));
      }
    }
    return days;
  };

  let data: { label: string; value: number }[] = [];
  if (group === 'monthly') {
    let cumulative = 0;
    data = chartDataMonthly.map(({ month, numbers }) => {
      const sum = numbers.reduce((a, b) => a + b, 0);
      if (mode === 'cumulative') {
        cumulative += sum;
        return { label: monthNames[month - 1], value: cumulative };
      } else {
        return { label: monthNames[month - 1], value: sum };
      }
    });
  } else {
    // Daily mode: fill all days in year
    const allDays = getAllYearDays(year);
    let cumulative = 0;
    data = allDays.map(date => {
      const numbers = yearData[date] || [];
      const sum = numbers.reduce((a, b) => a + b, 0);
      if (mode === 'cumulative') {
        cumulative += sum;
        return { label: date, value: cumulative };
      } else {
        return { label: date, value: sum };
      }
    });
  }

  const { theme } = useTheme();
  const isDark = theme === 'dark' || (theme === 'system' && typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  const axisColor = isDark ? '#64748b' : '#334155';
  const gridColor = isDark ? '#334155' : '#e5e7eb'; // slate-200 for light mode

  // Valence-aware bar and tooltip colors
  const barColors = {
    good: '#10b981', // green-500
    bad: '#ef4444',  // red-500
    neutral: '#3b82f6', // blue-500
  };

  return (
    <div className="rounded-lg bg-slate-50 dark:bg-slate-900/60 p-6 shadow-lg dark:shadow-xl hover:shadow-xl dark:hover:shadow-2xl transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-2">
          <ToggleGroup
            type="single"
            value={group}
            onValueChange={(v: YearChartGroup) => setGroup(v)}
            size="sm"
            variant="outline"
            aria-label="Chart Group"
          >
            <ToggleGroupItem value="daily" aria-label="Daily">
              <span>Daily</span>
            </ToggleGroupItem>
            <ToggleGroupItem value="monthly" aria-label="Monthly">
              <span>Monthly</span>
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
        <ToggleGroup
          type="single"
          value={mode}
          onValueChange={(v: YearChartMode) => setMode(v)}
          size="sm"
          variant="outline"
          aria-label="Chart Mode"
        >
          <ToggleGroupItem value="serial" aria-label="Serial">
            <BarChartIcon className="size-4 mr-1" />
            <span className="hidden sm:inline">Serial</span>
          </ToggleGroupItem>
          <ToggleGroupItem value="cumulative" aria-label="Cumulative">
            <LineChartIcon className="size-4 mr-1" />
            <span className="hidden sm:inline">Cumulative</span>
          </ToggleGroupItem>
        </ToggleGroup>
      </div>
      <div className="w-full h-48 bg-white dark:bg-slate-900 rounded-lg shadow-sm dark:shadow-md">
        {data.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">No data to display</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
              <XAxis
                dataKey="label"
                tickFormatter={d => {
                  if (group === 'monthly') return d;
                  const parts = d.split('-');
                  const month = monthNames[parseInt(parts[1], 10) - 1];
                  const day = parseInt(parts[2], 10);
                  return `${month} ${day}`;
                }}
                fontSize={12}
                minTickGap={20}
                stroke={axisColor}
                tick={{ fill: axisColor }}
              />
              <YAxis fontSize={12} domain={['dataMin', 'dataMax']} stroke={axisColor} tick={{ fill: axisColor }} />
              <Tooltip
                cursor={{ fill: 'rgba(16,185,129,0.08)' }}
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    const value = payload[0].value;
                    if (typeof value !== 'number') return null;
                    const color = getValueForValence(value, valence, barColors);
                    let formattedDate = '';
                    if (group === 'monthly') {
                      formattedDate = label;
                    } else {
                      // label is 'YYYY-MM-DD'
                      const date = new Date(label);
                      formattedDate = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                    }
                    return (
                      <div className="rounded-md bg-white dark:bg-slate-900 px-3 py-2 shadow-lg dark:shadow-xl border border-gray-200 dark:border-slate-700">
                        <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">{formattedDate}</div>
                        <span style={{ color, fontWeight: 600, fontSize: 16 }}>{value}</span>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {data.map((entry, idx) => (
                  <Cell key={`cell-${idx}`} fill={getValueForValence(entry.value, valence, barColors)} />
                ))}
              </Bar>
            </BarChart>
        </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};

export default YearChart;
