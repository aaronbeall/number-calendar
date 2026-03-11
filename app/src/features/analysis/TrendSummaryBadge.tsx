import { useTheme } from '@/components/ThemeProvider';
import { NumberText } from '@/components/ui/number-text';
import type { Valence } from '@/features/db/localdb';

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
  const { isDark } = useTheme();
  const percentAccentColor = isDark ? '#22d3ee' : '#0e7490';

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
            short
            animated
            className="inline"
          />
        </span>
        {typeof changePercent === 'number' && (
          <span className="font-medium" style={{ color: percentAccentColor }}>
            (
            <NumberText
              value={changePercent}
              valenceValue={changePercentValenceValue}
              valence={valence}
              percent
              delta
              animated
              className="inline"
            />
            )
          </span>
        )}
      </div>
    </div>
  );
}
