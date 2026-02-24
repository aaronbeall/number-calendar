import { useTheme } from '@/components/ThemeProvider';
import type { DayEntry, Valence, DateKey, MonthKey } from '@/features/db/localdb';
import { formatFriendlyDate } from '@/lib/friendly-date';
import { formatValue } from '@/lib/friendly-numbers';
import { getValueForValence } from '@/lib/valence';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

type AggregationType = 'day' | 'week' | 'month' | 'year' | 'none';

interface AggregationBarChartProps {
  groupedData: Record<string, DayEntry[]>;
  aggregationType: AggregationType;
  valence: Valence;
}

interface BarDataPoint {
  label: string;
  total: number;
  count: number;
  avg: number;
}

export function AggregationBarChart({
  groupedData,
  aggregationType,
  valence,
}: AggregationBarChartProps) {
  const { theme } = useTheme();
  const isDark =
    theme === 'dark' ||
    (theme === 'system' &&
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches);

  const data: BarDataPoint[] = Object.entries(groupedData)
    .map(([groupKey, days]) => {
      const allNumbers = days.flatMap((day) => day.numbers);
      const total = allNumbers.reduce((a, b) => a + b, 0);
      const avg = allNumbers.length > 0 ? total / allNumbers.length : 0;

      let label = groupKey;
      if (aggregationType === 'day') {
        label = formatFriendlyDate(groupKey as DateKey);
      } else if (aggregationType === 'month') {
        label = formatFriendlyDate(groupKey as MonthKey);
      } else if (aggregationType === 'week') {
        label = formatFriendlyDate(groupKey as DateKey);
      } else if (aggregationType === 'year') {
        label = formatFriendlyDate(groupKey as DateKey);
      }

      return {
        label,
        total,
        count: allNumbers.length,
        avg,
      };
    })
    .sort((a, b) => a.label.localeCompare(b.label));

  if (data.length === 0) {
    return <div>No data available</div>;
  }

  const axisColor = isDark ? '#64748b' : '#334155';
  const gridColor = isDark ? '#334155' : '#e5e7eb';
  
  // Get colors based on valence
  const getBarColor = (value: number) => {
    if (valence === 'neutral') return isDark ? '#60a5fa' : '#3b82f6';
    const isPositive = getValueForValence(value, valence, { good: true, bad: false, neutral: false });
    if (isPositive) {
      return isDark ? '#4ade80' : '#22c55e';
    } else {
      return isDark ? '#f87171' : '#ef4444';
    }
  };

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
          <Bar dataKey="total" fill="#8884d8" isAnimationActive={true} radius={[8, 8, 0, 0]}>
            {data.map((entry, index) => (
              <Cell key={`bar-${index}`} fill={getBarColor(entry.total)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
