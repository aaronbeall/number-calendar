import { useTheme } from '@/components/ThemeProvider';
import type { DayEntry, DateKey } from '@/features/db/localdb';
import { formatFriendlyDate } from '@/lib/friendly-date';
import { formatValue } from '@/lib/friendly-numbers';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

type AggregationType = 'day' | 'week' | 'month' | 'year' | 'none';

interface PeriodComparisonChartProps {
  groupedData: Record<string, DayEntry[]>;
  aggregationType: AggregationType;
}

interface ComparisonDataPoint {
  label: string;
  count: number;
  min: number;
  max: number;
  avg: number;
}

export function PeriodComparisonChart({
  groupedData,
  aggregationType,
}: PeriodComparisonChartProps) {
  const { theme } = useTheme();
  const isDark =
    theme === 'dark' ||
    (theme === 'system' &&
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches);

  const data: ComparisonDataPoint[] = Object.entries(groupedData)
    .map(([groupKey, days]) => {
      const allNumbers = days.flatMap((day) => day.numbers);

      let label = groupKey;
      if (aggregationType === 'month') {
        label = formatFriendlyDate(groupKey as DateKey);
      } else if (aggregationType === 'week') {
        label = formatFriendlyDate(groupKey as DateKey);
      } else if (aggregationType === 'year') {
        label = formatFriendlyDate(groupKey as DateKey);
      }

      return {
        label,
        count: allNumbers.length,
        min: allNumbers.length > 0 ? Math.min(...allNumbers) : 0,
        max: allNumbers.length > 0 ? Math.max(...allNumbers) : 0,
        avg: allNumbers.length > 0 ? allNumbers.reduce((a, b) => a + b, 0) / allNumbers.length : 0,
      };
    })
    .sort((a, b) => a.label.localeCompare(b.label));

  if (data.length === 0) {
    return <div>No data available</div>;
  }

  const axisColor = isDark ? '#64748b' : '#334155';
  const gridColor = isDark ? '#334155' : '#e5e7eb';

  return (
    <div className="h-80 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 5, right: 20, bottom: 40, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
          <XAxis
            dataKey="label"
            stroke={axisColor}
            style={{ fontSize: '12px' }}
            tick={{ fill: axisColor }}
            angle={-45}
            textAnchor="end"
            height={80}
          />
          <YAxis stroke={axisColor} style={{ fontSize: '12px' }} tick={{ fill: axisColor }} />
          <Tooltip
            contentStyle={{
              backgroundColor: isDark ? '#1e293b' : '#ffffff',
              border: `1px solid ${isDark ? '#475569' : '#e2e8f0'}`,
              borderRadius: '8px',
            }}
            formatter={(value) => formatValue(value as number)}
            labelFormatter={(label) => label as string}
          />
          <Legend />
          <Bar dataKey="min" fill="#ef4444" name="Min" isAnimationActive={true} />
          <Bar dataKey="avg" fill="#3b82f6" name="Avg" isAnimationActive={true} />
          <Bar dataKey="max" fill="#22c55e" name="Max" isAnimationActive={true} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
