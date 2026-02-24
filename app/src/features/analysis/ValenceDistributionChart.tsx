import type { Valence } from '@/features/db/localdb';
import { getValueForValence } from '@/lib/valence';
import { formatValue } from '@/lib/friendly-numbers';
import {
  Cell,
  Legend,
  PieChart,
  Pie,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';

interface ValenceDistributionChartProps {
  numbers: number[];
  valence: Valence;
}

interface PieDataPoint {
  name: string;
  value: number;
  percentage: number;
}

export function ValenceDistributionChart({
  numbers,
  valence,
}: ValenceDistributionChartProps) {

  const count = numbers.length;
  let positiveCount = 0;
  let negativeCount = 0;
  let zeroCount = 0;

  numbers.forEach((num) => {
    const val = getValueForValence(num, valence, { good: 1, bad: -1, neutral: 0 });
    if (val > 0) positiveCount++;
    else if (val < 0) negativeCount++;
    else zeroCount++;
  });

  const data: PieDataPoint[] = [];

  if (valence === 'positive') {
    data.push({
      name: 'Positive',
      value: positiveCount,
      percentage: (positiveCount / count) * 100,
    });
    data.push({
      name: 'Negative',
      value: negativeCount,
      percentage: (negativeCount / count) * 100,
    });
  } else if (valence === 'negative') {
    data.push({
      name: 'Beneficial',
      value: negativeCount,
      percentage: (negativeCount / count) * 100,
    });
    data.push({
      name: 'Harmful',
      value: positiveCount,
      percentage: (positiveCount / count) * 100,
    });
  }

  if (zeroCount > 0) {
    data.push({
      name: 'Neutral',
      value: zeroCount,
      percentage: (zeroCount / count) * 100,
    });
  }

  if (data.length === 0) {
    return <div>No data available</div>;
  }

  const colors =
    valence === 'positive'
      ? ['#22c55e', '#ef4444', '#94a3b8']
      : ['#22c55e', '#ef4444', '#94a3b8'];

  return (
    <div className="h-80 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={120}
            paddingAngle={2}
            dataKey="value"
            label={(entry) => `${entry.name}: ${formatValue(entry.percentage, { percent: true })}`}
            labelLine={true}
          >
            {data.map((_, index) => (
              <Cell key={`cell-${index}`} fill={colors[index]} />
            ))}
          </Pie>
          <Tooltip
            formatter={(_value, _name, props) => {
              const entry = props.payload as PieDataPoint;
              return [`${entry.value} (${formatValue(entry.percentage, { percent: true })})`, 'Count'];
            }}
          />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
