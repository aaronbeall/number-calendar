import type { Tracking, Valence } from '@/features/db/localdb';
import { Badge } from '@/components/ui/badge';
import { PopoverTip, PopoverTipTrigger, PopoverTipContent } from '@/components/ui/popover-tip';
import { getAggregationPeriodLabel, type AggregationType } from '@/lib/analysis';
import type { PeriodAggregateData } from '@/lib/period-aggregate';
import { getValenceValueFromData } from '@/lib/tracking';
import { getValueForValence } from '@/lib/valence';
import { formatValue } from '@/lib/friendly-numbers';
import { pluralize } from '@/lib/utils';
import { useMemo } from 'react';
import { HelpCircle } from 'lucide-react';
import {
  Cell,
  Legend,
  PieChart,
  Pie,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import type { DateKeyType } from '@/lib/friendly-date';

interface ValenceDistributionChartProps {
  periods: PeriodAggregateData<DateKeyType>[];
  aggregationType: AggregationType;
  tracking: Tracking;
  valence: Valence;
  mode?: 'count' | 'total';
}

interface PieDataPoint {
  name: string;
  value: number;
  percentage: number;
  direction: 1 | -1;
  mode: 'count' | 'total';
}

interface MetricsData {
  impactRatio: number | null;
  intensitySkew: number;
}

export function ValenceDistributionChart({
  periods,
  aggregationType,
  tracking,
  valence,
  mode = 'count',
}: ValenceDistributionChartProps) {
  const effectiveMode = tracking === 'series' ? mode : 'count';

  const { positiveCount, negativeCount, positiveTotal, negativeTotal, metrics } = useMemo(() => {
    let posCount = 0;
    let negCount = 0;
    let posTotal = 0;
    let negTotal = 0;

    periods.forEach((period) => {
      if (period.stats.count === 0) return;
      const value = getValenceValueFromData(period, tracking) ?? 0;

      // Count based on actual value sign, not semantic valence
      if (value > 0) {
        posCount += 1;
        posTotal += Math.abs(value);
      } else if (value < 0) {
        negCount += 1;
        negTotal += Math.abs(value);
      }
    });

    // Calculate metrics for series tracking
    const metrics: MetricsData = {
      impactRatio: null,
      intensitySkew: 0,
    };

    if (tracking === 'series' && posCount > 0 && negCount > 0) {
      // Impact ratio: average magnitude per occurrence for each direction
      const posAvg = posTotal / posCount;
      const negAvg = negTotal / negCount;
      metrics.impactRatio = posAvg / negAvg;

      // Intensity skew: difference in share between magnitude and count
      const total = posCount + negCount;
      const totalMagnitude = posTotal + negTotal;
      const countShare = posCount / total;
      const magnitudeShare = posTotal / totalMagnitude;
      metrics.intensitySkew = magnitudeShare - countShare;
    }

    return {
      positiveCount: posCount,
      negativeCount: negCount,
      positiveTotal: posTotal,
      negativeTotal: negTotal,
      metrics,
    };
  }, [periods, tracking, valence]);

  const positiveValue = effectiveMode === 'count' ? positiveCount : positiveTotal;
  const negativeValue = effectiveMode === 'count' ? negativeCount : negativeTotal;
  const total = positiveValue + negativeValue;

  if (total === 0) {
    return <div>No data available</div>;
  }

  // Labels based on tracking type
  const positiveLabel = tracking === 'trend' ? 'Uptrend' : 'Positive';
  const negativeLabel = tracking === 'trend' ? 'Downtrend' : 'Negative';

  const data: PieDataPoint[] = [
    {
      name: positiveLabel,
      value: positiveValue,
      percentage: (positiveValue / total) * 100,
      direction: 1 as const,
      mode: effectiveMode,
    },
    {
      name: negativeLabel,
      value: negativeValue,
      percentage: (negativeValue / total) * 100,
      direction: -1 as const,
      mode: effectiveMode,
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
  const aggregationUnit = getAggregationPeriodLabel(aggregationType).toLowerCase();

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
          {entry.mode === 'count' ? (
            <>
              <span style={{ color: valueColor }} className="font-semibold">{formatValue(entry.value)}</span> {pluralize(aggregationUnit, entry.value)} (
              <span style={{ color: valueColor }}>{formatValue(entry.percentage, { percent: true })}</span>)
            </>
          ) : (
            <>
              <span style={{ color: valueColor }} className="font-semibold">{formatValue(entry.value)}</span> total {entry.name.toLowerCase()} (
              <span style={{ color: valueColor }}>{formatValue(entry.percentage, { percent: true })}</span>)
            </>
          )}
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
            <div key={`legend-${dataPoint?.name || index}`} className="flex items-center gap-2 rounded-md border border-slate-200 bg-white/70 px-2 py-1 dark:border-slate-800 dark:bg-slate-900/60">
              <span
                className="inline-block h-3 w-3 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-sm text-slate-700 dark:text-slate-300">
                {entry.value}
              </span>
              <Badge variant="secondary" className="px-1.5 py-0 text-[11px] leading-4">{formatValue(dataPoint?.value ?? 0)}</Badge>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-3">
      {tracking === 'series' && metrics.impactRatio !== null && (
        <div className="flex flex-wrap gap-2">
          {(() => {
            const ratioDirection = metrics.impactRatio > 1 ? 1 : -1;
            const ratioColor = getValueForValence(ratioDirection, valence, {
              good: '#22c55e',
              bad: '#ef4444',
              neutral: '#3b82f6',
            });
            return (
              <PopoverTip>
                <PopoverTipTrigger asChild>
                  <Badge
                    variant="outline"
                    className="cursor-help"
                    style={{
                      backgroundColor: ratioColor + '15',
                      borderColor: ratioColor + '40',
                    }}
                  >
                    <span className="text-xs" style={{ color: ratioColor }}>
                      {metrics.impactRatio > 1
                        ? `${formatValue(metrics.impactRatio)}x stronger positive impact`
                        : `${formatValue(1 / metrics.impactRatio)}x stronger negative impact`}
                    </span>
                    <HelpCircle className="ml-1 h-4 w-4 text-slate-400" />
                  </Badge>
                </PopoverTipTrigger>
                <PopoverTipContent side="top">
                  <div className="space-y-1">
                    <p className="font-semibold text-sm">Impact Ratio</p>
                    <p className="text-xs text-slate-600 dark:text-slate-300">
                      Compares the average strength of positive vs negative entries. For example, a 2x ratio means positive entries are roughly twice as strong as negative ones.
                    </p>
                  </div>
                </PopoverTipContent>
              </PopoverTip>
            );
          })()}
          {Math.abs(metrics.intensitySkew) > 0.01 && (() => {
            const skewDirection = metrics.intensitySkew > 0 ? 1 : -1;
            const skewColor = getValueForValence(skewDirection, valence, {
              good: '#22c55e',
              bad: '#ef4444',
              neutral: '#3b82f6',
            });
            return (
              <PopoverTip>
                <PopoverTipTrigger asChild>
                  <Badge
                    variant="outline"
                    className="cursor-help"
                    style={{
                      backgroundColor: skewColor + '15',
                      borderColor: skewColor + '40',
                    }}
                  >
                    <span className="text-xs" style={{ color: skewColor }}>
                      {metrics.intensitySkew > 0
                        ? `Positive is ${formatValue(metrics.intensitySkew, { percent: true })} more impactful`
                        : `Negative is ${formatValue(Math.abs(metrics.intensitySkew), { percent: true })} more impactful`}
                    </span>
                    <HelpCircle className="ml-1 h-4 w-4 text-slate-400" />
                  </Badge>
                </PopoverTipTrigger>
                <PopoverTipContent side="top">
                  <div className="space-y-1">
                    <p className="font-semibold text-sm">Intensity Skew</p>
                    <p className="text-xs text-slate-600 dark:text-slate-300">
                      Shows if positive and negative entries have uneven impact. A 10% skew means one direction produces 10% more total impact than its number of entries would suggest.
                    </p>
                  </div>
                </PopoverTipContent>
              </PopoverTip>
            );
          })()}
        </div>
      )}
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
            {data.map((entry) => (
              <Cell key={`cell-${entry.name}`} fill={colors[data.indexOf(entry)]} stroke="none" />
            ))}
          </Pie>
          <Tooltip content={renderTooltip} />
          <Legend content={renderLegend} />
        </PieChart>
      </ResponsiveContainer>
      </div>
    </div>
  );
}
