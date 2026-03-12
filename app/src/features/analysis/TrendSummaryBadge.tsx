import { NumberText } from '@/components/ui/number-text';
import { getValueForValence } from '@/lib/valence';
import type { Valence } from '@/features/db/localdb';
import { cn } from '@/lib/utils';

interface TrendSummaryBadgeProps {
  primaryMetricLabel: string;
  valence: Valence;
  primaryValue?: number;
  primaryValenceValue?: number;
  primaryDelta?: boolean;
  changePercent?: number;
  changePercentValenceValue?: number;
}

export function TrendSummaryBadge({
  primaryMetricLabel,
  valence,
  primaryValue,
  primaryValenceValue,
  primaryDelta,
  changePercent,
  changePercentValenceValue,
}: TrendSummaryBadgeProps) {
  const percentClasses = {
    good: 'text-green-500 dark:text-green-400',
    bad: 'text-red-500 dark:text-red-400',
    neutral: 'text-blue-500 dark:text-blue-400',
  }
  const changePercentColor = getValueForValence(changePercentValenceValue ?? 0, valence, percentClasses);

  return (
    <div className="mt-1 mb-2 flex justify-center">
      <div className="inline-flex items-center gap-2 rounded-md border border-slate-200/90 bg-slate-50/80 px-3 py-1.5 text-xs shadow-sm dark:border-slate-700/80 dark:bg-slate-800/60">
        <span className="font-semibold text-slate-700 dark:text-slate-200">{primaryMetricLabel}</span>
        <span className="font-semibold">
          <NumberText
            value={primaryValue}
            valenceValue={primaryValenceValue}
            valence={valence}
            delta={primaryDelta}
            animated
            className="inline"
          />
        </span>
        {typeof changePercent === 'number' && (
          <span className={cn('font-medium', changePercentColor)}>
            (
            <NumberText
              value={changePercent}
              valenceValue={changePercentValenceValue}
              valence={valence}
              percent
              delta
              animated
              className="inline"
              goodClassName={percentClasses.good}
              badClassName={percentClasses.bad}
              neutralClassName={percentClasses.neutral}
            />
            )
          </span>
        )}
      </div>
    </div>
  );
}
