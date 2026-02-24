import { useTheme } from '@/components/ThemeProvider';
import type { DayEntry, Valence } from '@/features/db/localdb';
import { formatFriendlyDate } from '@/lib/friendly-date';
import { formatValue } from '@/lib/friendly-numbers';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

type AggregationType = 'day' | 'week' | 'month' | 'year' | 'none';

interface TrendAnalysisChartProps {
  days: DayEntry[];
  aggregationType: AggregationType;
  valence?: Valence;
}

interface TrendPoint {
  date: string;
  value: number;
  avg?: number;
}

export function TrendAnalysisChart({
  days,
  valence = 'neutral',
}: TrendAnalysisChartProps) {
  const { theme } = useTheme();
  const isDark =
    theme === 'dark' ||
    (theme === 'system' &&
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches);

  const data: TrendPoint[] = days.map((day) => {
    const lastValue = day.numbers[day.numbers.length - 1] ?? 0;
    const avgValue = day.numbers.reduce((a, b) => a + b, 0) / day.numbers.length;
    return {
      date: day.date,
      value: lastValue,
      avg: avgValue,
    };
  });

  if (data.length === 0) {
    return <div>No data available</div>;
  }

  const axisColor = isDark ? '#64748b' : '#334155';
  const gridColor = isDark ? '#334155' : '#e5e7eb';
  
  // Determine line colors based on valence
  const getLineColor = () => {
    if (valence === 'neutral') return isDark ? '#60a5fa' : '#3b82f6';
    if (valence === 'positive') return isDark ? '#4ade80' : '#22c55e';
    return isDark ? '#fca5a5' : '#ef4444';
  };

  const lineColor = getLineColor();
  const avgColor = isDark ? '#a78bfa' : '#8b5cf6';

  return (
    <div className="h-80 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
          <XAxis
            dataKey="date"
            stroke={axisColor}
            style={{ fontSize: '12px' }}
            tick={{ fill: axisColor }}
            interval={Math.floor(data.length / 8) || 0}
          />
          <YAxis stroke={axisColor} style={{ fontSize: '12px' }} tick={{ fill: axisColor }} />
          <Tooltip
            contentStyle={{
              backgroundColor: isDark ? '#1e293b' : '#ffffff',
              border: `1px solid ${isDark ? '#475569' : '#e2e8f0'}`,
              borderRadius: '8px',
            }}
            formatter={(value) => formatValue(value as number)}
            labelFormatter={(label) => formatFriendlyDate(label as any)}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke={lineColor}
            dot={false}
            strokeWidth={2}
            isAnimationActive={true}
            name="Last Value"
          />
          <Line
            type="monotone"
            dataKey="avg"
            stroke={avgColor}
            dot={false}
            strokeWidth={1}
            strokeDasharray="5 5"
            isAnimationActive={true}
            name="Daily Avg"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
