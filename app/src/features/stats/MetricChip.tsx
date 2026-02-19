import { NumberText } from '@/components/ui/number-text';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { Valence } from '@/features/db/localdb';
import { formatValue, type FormatValueOptions } from '@/lib/friendly-numbers';
import { getValueForValence } from '@/lib/valence';
import { cn } from '@/lib/utils';

type MetricChipProps = {
  primaryMetric: number | undefined;
  primaryMetricLabel: string;
  primaryValenceMetric: number | undefined;
  secondaryMetric?: number;
  secondaryMetricLabel: string;
  secondaryMetricFormat?: FormatValueOptions;
  changePercent?: number;
  valence: Valence;
};

export const MetricChip = ({
  primaryMetric,
  primaryMetricLabel,
  primaryValenceMetric,
  secondaryMetric,
  secondaryMetricLabel,
  secondaryMetricFormat,
  changePercent,
  valence,
}: MetricChipProps) => {
  const primaryClasses = getValueForValence(primaryValenceMetric, valence, {
    good: 'bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-300',
    bad: 'bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300',
    neutral: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200',
  });
  const formattedChangePercent = changePercent !== undefined
    ? formatValue(changePercent, { percent: true, delta: true })
    : '';
  const changeClass = getValueForValence(changePercent ?? 0, valence, {
    good: 'text-green-600 dark:text-green-400',
    bad: 'text-red-600 dark:text-red-400',
    neutral: 'text-slate-500 dark:text-slate-400',
  });

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className={cn('flex items-center gap-2 px-3 py-2 rounded font-mono font-bold', primaryClasses)}>
          <div className="flex flex-col items-end">
            <div className="text-[10px] uppercase tracking-wide text-slate-500 dark:text-slate-400">
              {primaryMetricLabel}
            </div>
            <NumberText
              value={primaryMetric ?? null}
              valenceValue={primaryValenceMetric}
              valence={valence}
              className="text-lg sm:text-xl font-extrabold"
            />
            <div className="text-[10px] font-medium text-slate-500 dark:text-slate-400">
              <NumberText
                value={secondaryMetric ?? null}
                valenceValue={secondaryMetric ?? 0}
                valence={valence}
                className="font-semibold"
                short
                {...secondaryMetricFormat}
              />{' '}
              {formattedChangePercent && (
                <span className={changeClass}>({formattedChangePercent})</span>
              )}
            </div>
          </div>
        </div>
      </TooltipTrigger>
      <TooltipContent>
        <div className="space-y-1 text-sm">
          <div>
            <span className="text-slate-400">{primaryMetricLabel}:</span>{' '}
            <span className="font-semibold">
              <NumberText
                value={primaryMetric ?? null}
                valenceValue={primaryValenceMetric}
                valence={valence}
              />
            </span>
          </div>
          <div>
            <span className="text-slate-400">{secondaryMetricLabel}:</span>{' '}
            <span className="font-semibold">
              <NumberText
                value={secondaryMetric ?? null}
                valenceValue={secondaryMetric ?? 0}
                valence={valence}
                {...secondaryMetricFormat}
              />
            </span>
            {formattedChangePercent && (
              <span className={cn('ml-1', changeClass)}>({formattedChangePercent})</span>
            )}
          </div>
        </div>
      </TooltipContent>
    </Tooltip>
  );
};
