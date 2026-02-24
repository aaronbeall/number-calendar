import { useTheme } from '@/components/ThemeProvider';
import type { Valence } from '@/features/db/localdb';
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

interface DistributionHistogramProps {
  numbers: number[];
  valence?: Valence;
}

interface HistogramBucket {
  range: string;
  count: number;
  midpoint: number;
}

export function DistributionHistogram({ numbers, valence = 'neutral' }: DistributionHistogramProps) {
  const { theme } = useTheme();
  const isDark =
    theme === 'dark' ||
    (theme === 'system' &&
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches);

  if (numbers.length === 0) {
    return <div>No data available</div>;
  }

  // Calculate histogram bins
  const min = Math.min(...numbers);
  const max = Math.max(...numbers);
  const range = max - min || 1;
  const binCount = Math.min(20, Math.ceil(Math.sqrt(numbers.length)));
  const binSize = range / binCount;

  const bins: HistogramBucket[] = [];
  for (let i = 0; i < binCount; i++) {
    const binMin = min + i * binSize;
    const binMax = binMin + binSize;
    const binMid = (binMin + binMax) / 2;
    const count = numbers.filter((n) => n >= binMin && n < binMax).length;

    if (count > 0 || i === 0 || i === binCount - 1) {
      bins.push({
        range: `${formatValue(binMin)} - ${formatValue(binMax)}`,
        count,
        midpoint: binMid,
      });
    }
  }

  const axisColor = isDark ? '#64748b' : '#334155';
  const gridColor = isDark ? '#334155' : '#e5e7eb';

  const getBarColor = (midpoint: number) => {
    const colorName = getValueForValence(midpoint, valence, {
      good: 'good',
      bad: 'bad',
      neutral: 'neutral',
    });
    
    if (colorName === 'good') {
      return isDark ? '#4ade80' : '#22c55e';
    } else if (colorName === 'bad') {
      return isDark ? '#f87171' : '#ef4444';
    }
    return isDark ? '#60a5fa' : '#3b82f6';
  };

  return (
    <div className="h-80 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={bins} margin={{ top: 5, right: 20, bottom: 40, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
          <XAxis
            dataKey="range"
            stroke={axisColor}
            style={{ fontSize: '12px' }}
            tick={{ fill: axisColor }}
            angle={-45}
            textAnchor="end"
            height={80}
          />
          <YAxis
            stroke={axisColor}
            style={{ fontSize: '12px' }}
            tick={{ fill: axisColor }}
            label={{ value: 'Frequency', angle: -90, position: 'insideLeft' }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: isDark ? '#1e293b' : '#ffffff',
              border: `1px solid ${isDark ? '#475569' : '#e2e8f0'}`,
              borderRadius: '8px',
            }}
            labelFormatter={(label) => label as string}
          />
          <Bar
            dataKey="count"
            isAnimationActive={true}
            radius={[8, 8, 0, 0]}
          >
            {bins.map((bin, index) => (
              <Cell key={`bar-${index}`} fill={getBarColor(bin.midpoint)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
