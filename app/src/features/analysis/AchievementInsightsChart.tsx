import { AchievementBadgeIcon } from '@/features/achievements/AchievementBadgeIcon';
import { Button } from '@/components/ui/button';
import { useAchievements } from '@/hooks/useAchievements';
import { computeAchievementInsightsData, type AggregationType, type TimeRange } from '@/lib/analysis';
import { adjectivize } from '@/lib/utils';
import { ExternalLink, Flag, Target, Trophy } from 'lucide-react';
import { useMemo } from 'react';
import { Link } from 'react-router-dom';

interface AchievementInsightsChartProps {
  datasetId: string;
  aggregationType: AggregationType;
  timeRange: TimeRange;
}

export function AchievementInsightsChart({
  datasetId,
  aggregationType,
  timeRange,
}: AchievementInsightsChartProps) {
  const achievementResults = useAchievements(datasetId);

  const insights = useMemo(
    () => computeAchievementInsightsData(achievementResults.all, aggregationType, timeRange),
    [achievementResults.all, aggregationType, timeRange],
  );
  const matchingPeriod = aggregationType === 'none' ? 'day' : aggregationType;
  const matchingGoalCount = useMemo(
    () => achievementResults.all.filter((result) => result.goal.timePeriod === matchingPeriod).length,
    [achievementResults.all, matchingPeriod],
  );
  const periodly = aggregationType === 'none' ? 'individual' : adjectivize(aggregationType);

  if (achievementResults.isLoading) {
    return <div className="text-sm text-muted-foreground">Loading achievement insights...</div>;
  }

  if (insights.stacked.length === 0) {
    if (matchingGoalCount === 0) {
      return (
        <div className="rounded-md border border-slate-200 dark:border-slate-800 p-4">
          <p className="text-sm text-slate-700 dark:text-slate-300 mb-3">
            You have no {periodly} achievements configured yet.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <Link to={`/dataset/${datasetId}/achievements?add`}>
              <Button variant="outline" size="sm" className="h-8 text-xs gap-1 w-full">
                <span className="inline-flex items-center gap-1 text-yellow-600 dark:text-yellow-400 font-medium">
                  <Trophy className="h-3 w-3" />
                </span>
                Create Achievement
                <ExternalLink className="h-3 w-3" />
              </Button>
            </Link>
            <Link to={`/dataset/${datasetId}/milestones?add`}>
              <Button variant="outline" size="sm" className="h-8 text-xs gap-1 w-full">
                <span className="inline-flex items-center gap-1 text-purple-600 dark:text-purple-400 font-medium">
                  <Flag className="h-3 w-3" />
                </span>
                Create Milestone
                <ExternalLink className="h-3 w-3" />
              </Button>
            </Link>
            <Link to={`/dataset/${datasetId}/targets?add`}>
              <Button variant="outline" size="sm" className="h-8 text-xs gap-1 w-full">
                <span className="inline-flex items-center gap-1 text-green-600 dark:text-green-400 font-medium">
                  <Target className="h-3 w-3" />
                </span>
                Create Target
                <ExternalLink className="h-3 w-3" />
              </Button>
            </Link>
          </div>
        </div>
      );
    }

    return <div className="text-sm text-muted-foreground">No completed {periodly} achievements in this time frame yet.</div>;
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2.5">
        {insights.stacked.map((item) => (
          <div key={item.id} className="space-y-1">
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="flex items-center gap-2 min-w-0">
                <AchievementBadgeIcon badge={item.badge} size={16} className="shrink-0" />
                <span className="truncate text-slate-700 dark:text-slate-300">{item.title}</span>
              </span>
              <span className="font-semibold text-slate-600 dark:text-slate-400">{item.inRangeCount}</span>
            </div>
            <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
              <div className="h-full rounded-full bg-amber-500/80 dark:bg-amber-400/70" style={{ width: `${item.widthPercent}%` }} />
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="rounded-md border border-slate-200 dark:border-slate-800 p-3">
          <div className="text-[10px] uppercase tracking-wide font-semibold text-slate-500 dark:text-slate-400 mb-2">Top By Count</div>
          <div className="space-y-1.5">
            {insights.topByCount.map((item) => (
              <div key={`top-${item.id}`} className="flex items-center justify-between gap-2 text-xs">
                <span className="flex items-center gap-2 min-w-0">
                  <AchievementBadgeIcon badge={item.badge} size={14} className="shrink-0" />
                  <span className="truncate">{item.title}</span>
                </span>
                <span className="font-semibold">{item.inRangeCount}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-md border border-slate-200 dark:border-slate-800 p-3">
          <div className="text-[10px] uppercase tracking-wide font-semibold text-slate-500 dark:text-slate-400 mb-2">Best Rarity</div>
          <div className="space-y-1.5">
            {insights.rarestByAllTimeCount.map((item) => (
              <div key={`rare-${item.id}`} className="flex items-center justify-between gap-2 text-xs">
                <span className="flex items-center gap-2 min-w-0">
                  <AchievementBadgeIcon badge={item.badge} size={14} className="shrink-0" />
                  <span className="truncate">{item.title}</span>
                </span>
                <span className="font-semibold" title="All-time completion count">{item.allTimeCount}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
