import type { Tracking, Valence } from '@/features/db/localdb';
import { Badge } from '@/components/ui/badge';
import type { AggregationType } from '@/lib/analysis';
import type { PeriodAggregateData } from '@/lib/period-aggregate';
import { getValenceValueFromData } from '@/lib/tracking';
import { getValueForValence } from '@/lib/valence';
import { formatValue } from '@/lib/friendly-numbers';
import { pluralize } from '@/lib/utils';
import {
  Cell,
  Legend,
  PieChart,
  Pie,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';

interface ValenceDistributionChartProps {
  periods: PeriodAggregateData<any>[];
  aggregationType: AggregationType;
  tracking: Tracking;
  valence: Valence;
}

interface PieDataPoint {
  name: string;
  value: number;
  percentage: number;
  direction: 1 | -1;
}

export function ValenceDistributionChart({
  periods,
  aggregationType,
  tracking,
  valence,
}: ValenceDistributionChartProps) {
  let positiveCount = 0;
  let negativeCount = 0;

  // Count positive/negative based on valence source
  periods.forEach((period) => {
    if (period.stats.count === 0) return;
    const value = getValenceValueFromData(period, tracking) ?? 0;
    
    const valenceValue = getValueForValence(value, valence, { good: 1, bad: -1, neutral: 0 });
    
    if (valenceValue > 0) {
      positiveCount++;
    } else if (valenceValue < 0) {
      negativeCount++;
    }
  });

  const total = positiveCount + negativeCount;

  if (total === 0) {
    return <div>No data available</div>;
  }

  // Labels based on tracking type
  const positiveLabel = tracking === 'trend' ? 'Uptrend' : 'Positive';
  const negativeLabel = tracking === 'trend' ? 'Downtrend' : 'Negative';

  const data: PieDataPoint[] = [
    {
      name: positiveLabel,
      value: positiveCount,
      percentage: (positiveCount / total) * 100,
      direction: 1 as const,
    },
    {
      name: negativeLabel,
      value: negativeCount,
      percentage: (negativeCount / total) * 100,
      direction: -1 as const,
    },
  ].filter((item) => item.value > 0);

  const positiveColor = getValueForValence(1, valence, {
    good: '#22c55e',
    bad: '#ef4444',
    neutral: '#3b82f6',
  });
  const negativeColor = getValueForValence(-1, valence, {
    good: '#22c55e',
    bad: '#ef4444',
    neutral: '#3b82f6',
  });

  const colors = [positiveColor, negativeColor];
  const aggregationUnit = aggregationType === 'none' ? 'entry' : aggregationType;

  const renderTooltip = ({
    active,
    payload,
  }: {
    active?: boolean;
    payload?: Array<{ payload?: PieDataPoint }>;
  }) => {
    if (!active || !payload?.length || !payload[0].payload) return null;
    const entry = payload[0].payload;
    const valueColor = getValueForValence(entry.direction, valence, {
      good: '#22c55e',
      bad: '#ef4444',
      neutral: '#3b82f6',
    });

    return (
      <div className="rounded-md bg-white dark:bg-slate-900 px-2 py-1 shadow-lg dark:shadow-xl border border-gray-200 dark:border-slate-700">
        <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-0.5">
          {entry.name}
        </div>
        <div className="text-xs text-slate-600 dark:text-slate-400">
          <span style={{ color: valueColor }} className="font-semibold">{entry.value}</span> {pluralize(aggregationUnit, entry.value)} ({formatValue(entry.percentage, { percent: true })})
        </div>
      </div>
    );
  };

  const renderLegend = (props: any) => {
    const { payload } = props;
    return (
      <div className="flex justify-center gap-4 mt-2">
        {payload.map((entry: any, index: number) => {
          const dataPoint = data[index];
          return (
            <div key={`legend-${index}`} className="flex items-center gap-2 rounded-md border border-slate-200 bg-white/70 px-2 py-1 dark:border-slate-800 dark:bg-slate-900/60">
              <span
                className="inline-block h-3 w-3 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-sm text-slate-700 dark:text-slate-300">
                {entry.value}
              </span>
              <Badge variant="secondary" className="px-1.5 py-0 text-[11px] leading-4">{dataPoint?.value}</Badge>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="h-80 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={100}
            paddingAngle={3}
            dataKey="value"
            stroke="none"
            cornerRadius={6}
            labelLine={false}
            label={({ percentage }) => formatValue(percentage ?? 0, { percent: true })}
          >
            {data.map((_, index) => (
              <Cell key={`cell-${index}`} fill={colors[index]} stroke="none" />
            ))}
          </Pie>
          <Tooltip content={renderTooltip} />
          <Legend content={renderLegend} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
