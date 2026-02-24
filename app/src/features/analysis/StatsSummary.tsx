import { Card } from '@/components/ui/card';
import type { Valence } from '@/features/db/localdb';
import { formatValue } from '@/lib/friendly-numbers';
import { getValueForValence } from '@/lib/valence';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  BarChart3,
  Target,
  ArrowUpToLine,
  ArrowDownToLine,
  FoldVertical,
} from 'lucide-react';

interface StatsSummaryProps {
  stats: {
    dataPoints: number[];
    min: number | null;
    max: number | null;
    avg: number | null;
    median: number | null;
    count: number;
  };
  valence: Valence;
}

export function StatsSummary({ stats, valence }: StatsSummaryProps) {
  const neutralColors = {
    bg: 'bg-slate-50 dark:bg-slate-800/50',
    icon: 'text-slate-500 dark:text-slate-400',
    text: 'text-slate-700 dark:text-slate-300',
  };

  const getValueColors = (value: number | null) => {
    if (value === null) return { bg: 'bg-slate-50 dark:bg-slate-800/50', icon: 'text-slate-500 dark:text-slate-400', text: 'text-slate-500 dark:text-slate-400' };
    
    const colorResult = getValueForValence(value, valence, {
      good: { bg: 'bg-green-50 dark:bg-green-900/20', icon: 'text-green-600 dark:text-green-400', text: 'text-green-700 dark:text-green-400' },
      bad: { bg: 'bg-red-50 dark:bg-red-900/20', icon: 'text-red-600 dark:text-red-400', text: 'text-red-700 dark:text-red-400' },
      neutral: { bg: 'bg-slate-50 dark:bg-slate-800/50', icon: 'text-slate-500 dark:text-slate-400', text: 'text-slate-700 dark:text-slate-300' },
    });
    return colorResult;
  };

  const maxColors = getValueColors(stats.max);
  const minColors = getValueColors(stats.min);
  const avgColors = getValueColors(stats.avg);
  const medianColors = getValueColors(stats.median);
  const countColors = neutralColors;

  const summaryItems = [
    {
      icon: <BarChart3 className="w-4 h-4" />,
      label: 'Count',
      value: formatValue(stats.count),
      colors: countColors,
    },
    {
      icon: <ArrowUpToLine className="w-4 h-4" />,
      label: 'Max',
      value: stats.max !== null ? formatValue(stats.max) : '—',
      colors: maxColors,
    },
    {
      icon: <ArrowDownToLine className="w-4 h-4" />,
      label: 'Min',
      value: stats.min !== null ? formatValue(stats.min) : '—',
      colors: minColors,
    },
    {
      icon: <Target className="w-4 h-4" />,
      label: 'Average',
      value: stats.avg !== null ? formatValue(stats.avg) : '—',
      colors: avgColors,
    },
    {
      icon: <FoldVertical className="w-4 h-4" />,
      label: 'Median',
      value: stats.median !== null ? formatValue(stats.median) : '—',
      colors: medianColors,
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
      {summaryItems.map((item, idx) => (
        <Card key={idx} className={`p-3 ${item.colors.bg}`}>
          <div className="flex items-start gap-2">
            <div className={`${item.colors.icon} mt-0.5`}>{item.icon}</div>
            <div className="flex-1 min-w-0">
              <div className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                {item.label}
              </div>
              <div className={`text-lg font-bold ${item.colors.text} truncate`}>
                {item.value}
              </div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
