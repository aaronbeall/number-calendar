import { AchievementBadgeIcon } from '@/features/achievements/AchievementBadgeIcon';
import { AchievementBadge } from '@/features/achievements/AchievementBadge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useTheme } from '@/components/ThemeProvider';
import { useAchievements } from '@/hooks/useAchievements';
import { computeAchievementInsightsData, computeAchievementInsightsPeriodSeriesData, type AchievementPeriodTooltipItem, type AggregationType, type TimeRange } from '@/lib/analysis';
import { adjectivize } from '@/lib/utils';
import { ChevronDown, ChevronUp, ExternalLink, Filter } from 'lucide-react';
import { memo, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { formatFriendlyDate, type DateKeyType, convertDateKey, parseDateKey } from '@/lib/friendly-date';
import type { PeriodAggregateData } from '@/lib/period-aggregate';
import type { DateKey, GoalBadge, GoalType } from '@/features/db/localdb';
import { formatValue } from '@/lib/friendly-numbers';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from 'recharts';

const GOAL_TYPE_META: Record<GoalType, { label: string; color: string }> = {
  // Matches PageHeader variant icon colors: achievements=yellow, targets=green, milestones=blue
  goal: { label: 'Achievements', color: '#eab308' },
  target: { label: 'Targets', color: '#22c55e' },
  milestone: { label: 'Milestones', color: '#3b82f6' },
};

const EMPTY_STATE_BADGES: Record<GoalType, GoalBadge> = {
  goal: { style: 'medal', icon: 'trophy', color: 'gold', label: '' },
  target: { style: 'bolt_shield', icon: 'target', color: 'emerald', label: '' },
  milestone: { style: 'laurel_trophy', icon: 'flag', color: 'sapphire', label: '' },
};

const TOOLTIP_GOAL_TYPE_ORDER: GoalType[] = ['milestone', 'target', 'goal'];

interface AchievementInsightItem {
  id: string;
  title: string;
  goalType: GoalType;
  badge: GoalBadge;
  description?: string;
  inRangeCount: number;
  allTimeCount: number;
  periodCompletionPercent: number;
  timePeriod: string;
  rarityScore?: number;
}

type InsightListVariant = 'topByCount' | 'bestRarity';

interface AchievementInsightListProps {
  title: string;
  variant: InsightListVariant;
  items: AchievementInsightItem[];
  expanded: boolean;
  onToggleExpanded: () => void;
  periodName: string;
  totalPeriods: number;
  selectedIds: string[];
  onToggleItem: (id: string) => void;
}

const AchievementInsightList = memo(function AchievementInsightList({
  title,
  variant,
  items,
  expanded,
  onToggleExpanded,
  periodName,
  totalPeriods,
  selectedIds,
  onToggleItem,
}: AchievementInsightListProps) {
  const displayItems = expanded ? items : items.slice(0, 5);
  const hasSelection = selectedIds.length > 0;
  
  return (
    <div className="rounded-md border border-slate-200 dark:border-slate-800 p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="text-[10px] uppercase tracking-wide font-semibold text-slate-500 dark:text-slate-400">
          {title}
        </div>
        {items.length > 5 && (
          <button
            onClick={onToggleExpanded}
            className="text-[10px] text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 flex items-center gap-0.5 transition-colors"
          >
            {expanded ? (
              <>
                <ChevronUp className="h-3 w-3" />
                Top 5
              </>
            ) : (
              <>
                <ChevronDown className="h-3 w-3" />
                All ({items.length})
              </>
            )}
          </button>
        )}
      </div>
      <div className="space-y-0.5">
        {displayItems.map((item) => (
          <Tooltip key={`${variant}-${item.id}`}>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={() => onToggleItem(item.id)}
                className={`w-full text-left flex items-center justify-between gap-2 text-xs rounded px-1.5 py-0.5 transition-colors ${hasSelection && !selectedIds.includes(item.id) ? 'opacity-45' : 'opacity-100'} hover:bg-slate-100 dark:hover:bg-slate-800/50`}
              >
                <span className="flex items-center gap-2 min-w-0 flex-1">
                  <AchievementBadgeIcon badge={item.badge} size={14} className="shrink-0" />
                  <span
                    className="inline-flex items-center truncate rounded px-1 py-0.5"
                    style={{
                      color: GOAL_TYPE_META[item.goalType].color,
                      backgroundColor: `${GOAL_TYPE_META[item.goalType].color}1A`,
                    }}
                  >
                    {item.title}
                  </span>
                </span>
                <span className="flex items-center gap-1.5 shrink-0">
                  {variant === 'topByCount' && item.periodCompletionPercent > 0 && (
                    <span
                      className="text-[10px] font-medium px-1.5 py-0.5 rounded"
                      style={{
                        color: item.periodCompletionPercent >= 80 ? '#16a34a' : item.periodCompletionPercent >= 50 ? '#eab308' : '#64748b',
                        backgroundColor: item.periodCompletionPercent >= 80 ? '#16a34a20' : item.periodCompletionPercent >= 50 ? '#eab30820' : '#64748b20',
                      }}
                    >
                      {Math.round(item.periodCompletionPercent)}%
                    </span>
                  )}
                  {variant === 'bestRarity' && item.rarityScore !== undefined && (
                    <span
                      className="text-[10px] font-medium px-1.5 py-0.5 rounded"
                      style={{
                        color: item.rarityScore >= 80 ? '#dc2626' : item.rarityScore >= 50 ? '#f59e0b' : '#64748b',
                        backgroundColor: item.rarityScore >= 80 ? '#dc262620' : item.rarityScore >= 50 ? '#f59e0b20' : '#64748b20',
                      }}
                    >
                      {item.rarityScore}%
                    </span>
                  )}
                  <span className="inline-flex items-center rounded-full border border-slate-300 dark:border-slate-600 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 text-[10px] font-semibold text-slate-700 dark:text-slate-200">
                    {item.inRangeCount}
                  </span>
                </span>
              </button>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <div className="flex items-start gap-3">
                <AchievementBadge badge={item.badge} size="small" />
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-xs mb-1">{item.title}</div>
                  {item.description && (
                    <div className="text-xs text-slate-500 dark:text-slate-500 mb-1 italic">{item.description}</div>
                  )}
                  <div className="text-xs text-slate-600 dark:text-slate-400 space-y-0.5">
                    <div>Completed <strong>{item.inRangeCount}</strong> {item.inRangeCount === 1 ? 'time' : 'times'} in this range</div>
                    {variant === 'topByCount' && (
                      <div>Achieved in <strong>{Math.round(item.periodCompletionPercent)}%</strong> of {periodName} periods ({item.inRangeCount} of {totalPeriods})</div>
                    )}
                    {variant === 'bestRarity' && (
                      <>
                        <div>Rarity score: <strong>{item.rarityScore}%</strong></div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-500">Only completed {item.allTimeCount} {item.allTimeCount === 1 ? 'time' : 'times'} all-time</div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
    </div>
  );
});

interface AchievementInsightsChartProps {
  datasetId: string;
  aggregationType: AggregationType;
  timeRange: TimeRange;
  periods: PeriodAggregateData<DateKeyType>[];
}

export function AchievementInsightsChart({
  datasetId,
  aggregationType,
  timeRange,
  periods,
}: AchievementInsightsChartProps) {
  const { isDark } = useTheme();
  const achievementResults = useAchievements(datasetId);
  const [insightsExpanded, setInsightsExpanded] = useState(false);
  const [selectedAchievementIds, setSelectedAchievementIds] = useState<string[]>([]);

  const insights = useMemo(
    () => computeAchievementInsightsData(achievementResults.all, aggregationType, timeRange),
    [achievementResults.all, aggregationType, timeRange],
  );
  const periodSeries = useMemo(
    () => computeAchievementInsightsPeriodSeriesData(achievementResults.all, periods, aggregationType),
    [achievementResults.all, periods, aggregationType],
  );
  const chartData = useMemo(
    () => periodSeries.points.map((point) => ({
      ...point.seriesByType,
      dateKey: point.dateKey,
      label: point.label,
      total: point.total,
      achievements: point.achievements,
    })),
    [periodSeries.points],
  );

  const filteredChartData = useMemo(() => {
    if (selectedAchievementIds.length === 0) return chartData;

    const selected = new Set(selectedAchievementIds);
    return chartData.map((point) => {
      const filteredAchievements = point.achievements.filter((achievement) => selected.has(achievement.id));
      const typeCounts = filteredAchievements.reduce(
        (acc, item) => {
          acc[item.goalType] += item.count;
          return acc;
        },
        { goal: 0, target: 0, milestone: 0 } as Record<GoalType, number>,
      );

      return {
        ...point,
        goal: typeCounts.goal,
        target: typeCounts.target,
        milestone: typeCounts.milestone,
        total: filteredAchievements.reduce((sum, item) => sum + item.count, 0),
        achievements: filteredAchievements,
      };
    });
  }, [chartData, selectedAchievementIds]);

  const fullDataYAxisMax = useMemo(() => {
    const maxTotal = chartData.reduce((max, point) => Math.max(max, Number(point.total ?? 0)), 0);
    return Math.max(1, maxTotal);
  }, [chartData]);

  const visibleGoalTypes = useMemo(() => {
    const ordered: GoalType[] = ['milestone', 'target', 'goal'];
    return ordered.filter((goalType) => filteredChartData.some((point) => Number(point[goalType] ?? 0) > 0));
  }, [filteredChartData]);

  const toggleSelectedAchievement = (id: string) => {
    setSelectedAchievementIds((prev) => (prev.includes(id) ? prev.filter((itemId) => itemId !== id) : [...prev, id]));
  };

  // Compute full lists with period completion percentages
  const fullInsightLists = useMemo(() => {
    const selectedPeriod = aggregationType === 'none' ? 'day' : aggregationType;
    const totalPeriods = periods.length;

    const buckets = achievementResults.all
      .filter((result) =>
        result.goal.timePeriod === selectedPeriod
        || result.goal.timePeriod === 'anytime'
      )
      .map((result) => {
        const completed = result.achievements.filter((ach) => !!ach.completedAt);
        const inRange = completed.filter((ach) => {
          if (!ach.completedAt) return false;
          try {
            const comparable = convertDateKey(ach.completedAt, 'day');
            const date = parseDateKey(comparable);
            return date >= timeRange.startDate && date <= timeRange.endDate;
          } catch {
            return false;
          }
        });

        return {
          id: result.goal.id,
          title: result.goal.title,
          goalType: result.goal.type,
          badge: result.goal.badge,
          description: result.goal.description,
          inRangeCount: inRange.length,
          allTimeCount: completed.length,
          periodCompletionPercent: totalPeriods > 0 ? (inRange.length / totalPeriods) * 100 : 0,
          timePeriod: result.goal.timePeriod,
        };
      })
      .filter((item) => item.inRangeCount > 0);

    const topByCount = [...buckets].sort((a, b) => b.inRangeCount - a.inRangeCount);
    const rarestByAllTimeCount = [...buckets]
      .sort((a, b) => a.allTimeCount - b.allTimeCount || b.inRangeCount - a.inRangeCount);

    // Calculate rarity scores for the rarest achievements
    const maxAllTimeInRarest = Math.max(...rarestByAllTimeCount.map(item => item.allTimeCount), 1);
    const rarestWithScore = rarestByAllTimeCount.map(item => ({
      ...item,
      rarityScore: Math.max(0, Math.round((1 - (item.allTimeCount - 1) / maxAllTimeInRarest) * 100)),
    }));

    return { topByCount, rarestByAllTimeCount: rarestWithScore };
  }, [achievementResults.all, aggregationType, timeRange, periods]);

  const matchingPeriod = aggregationType === 'none' ? 'day' : aggregationType;
  const matchingGoalCount = useMemo(
    () => achievementResults.all.filter((result) => 
      result.goal.timePeriod === matchingPeriod || result.goal.timePeriod === 'anytime'
    ).length,
    [achievementResults.all, matchingPeriod],
  );
  const periodly = aggregationType === 'none' ? 'individual' : adjectivize(aggregationType);
  const axisColor = isDark ? '#64748b' : '#334155';
  const gridColor = isDark ? '#334155' : '#e5e7eb';

  if (achievementResults.isLoading) {
    return <div className="text-sm text-muted-foreground">Loading achievement insights...</div>;
  }

  if (insights.stacked.length === 0) {
    if (matchingGoalCount === 0) {
      return (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-gradient-to-br from-slate-50 to-white dark:from-slate-900/70 dark:to-slate-900 p-4 sm:p-5">
          <div className="flex flex-col gap-4">
            <div className="flex items-start gap-3">
              <div className="hidden sm:flex items-center -space-x-2 pt-0.5">
                <AchievementBadge badge={EMPTY_STATE_BADGES.goal} size="small" />
                <AchievementBadge badge={EMPTY_STATE_BADGES.target} size="small" />
                <AchievementBadge badge={EMPTY_STATE_BADGES.milestone} size="small" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Start your first {periodly} achievement goals
                </p>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                  Add one now to unlock this chart and see completion patterns over time.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <Link to={`/dataset/${datasetId}/achievements?add`}>
              <Button variant="outline" className="h-auto min-h-16 w-full px-3 py-2.5 justify-start gap-2.5 border-yellow-200/80 dark:border-yellow-900/60 bg-yellow-50/70 dark:bg-yellow-950/20 hover:bg-yellow-100 dark:hover:bg-yellow-900/30">
                <AchievementBadge badge={EMPTY_STATE_BADGES.goal} size="small" />
                <span className="flex-1 min-w-0 text-left">
                  <span className="block text-xs font-semibold text-yellow-800 dark:text-yellow-200">Create Achievement</span>
                  <span className="block text-[11px] text-yellow-700/85 dark:text-yellow-300/85">Track everyday wins</span>
                </span>
                <ExternalLink className="h-3.5 w-3.5 text-yellow-700 dark:text-yellow-300" />
              </Button>
            </Link>
            <Link to={`/dataset/${datasetId}/milestones?add`}>
              <Button variant="outline" className="h-auto min-h-16 w-full px-3 py-2.5 justify-start gap-2.5 border-blue-200/80 dark:border-blue-900/60 bg-blue-50/70 dark:bg-blue-950/20 hover:bg-blue-100 dark:hover:bg-blue-900/30">
                <AchievementBadge badge={EMPTY_STATE_BADGES.milestone} size="small" />
                <span className="flex-1 min-w-0 text-left">
                  <span className="block text-xs font-semibold text-blue-800 dark:text-blue-200">Create Milestone</span>
                  <span className="block text-[11px] text-blue-700/85 dark:text-blue-300/85">Mark major moments</span>
                </span>
                <ExternalLink className="h-3.5 w-3.5 text-blue-700 dark:text-blue-300" />
              </Button>
            </Link>
            <Link to={`/dataset/${datasetId}/targets?add`}>
              <Button variant="outline" className="h-auto min-h-16 w-full px-3 py-2.5 justify-start gap-2.5 border-green-200/80 dark:border-green-900/60 bg-green-50/70 dark:bg-green-950/20 hover:bg-green-100 dark:hover:bg-green-900/30">
                <AchievementBadge badge={EMPTY_STATE_BADGES.target} size="small" />
                <span className="flex-1 min-w-0 text-left">
                  <span className="block text-xs font-semibold text-green-800 dark:text-green-200">Create Target</span>
                  <span className="block text-[11px] text-green-700/85 dark:text-green-300/85">Stay focused by period</span>
                </span>
                <ExternalLink className="h-3.5 w-3.5 text-green-700 dark:text-green-300" />
              </Button>
            </Link>
          </div>
          </div>
        </div>
      );
    }

    return <div className="text-sm text-muted-foreground">No completed {periodly} achievements in this time frame yet.</div>;
  }

  const renderTooltip = ({
    active,
    payload,
  }: {
    active?: boolean;
    payload?: Array<{ payload?: { dateKey: DateKey; label: string; total: number; achievements: AchievementPeriodTooltipItem[] } }>;
  }) => {
    if (!active || !payload?.length || !payload[0].payload) return null;
    const point = payload[0].payload;
    const typeBreakdown = point.achievements.reduce(
      (acc, item) => {
        acc[item.goalType] += item.count;
        return acc;
      },
      { goal: 0, target: 0, milestone: 0 } as Record<GoalType, number>,
    );
    const groupedAchievements = TOOLTIP_GOAL_TYPE_ORDER
      .map((goalType) => ({
        goalType,
        items: point.achievements.filter((item) => item.goalType === goalType && item.count > 0),
      }))
      .filter((group) => typeBreakdown[group.goalType] > 0);

    return (
      <div className="rounded-md bg-white dark:bg-slate-900 px-2.5 py-2 shadow-lg dark:shadow-xl border border-gray-200 dark:border-slate-700 max-w-sm">
        <div className="text-xs text-slate-500 dark:text-slate-400 mb-2">{formatFriendlyDate(point.dateKey)}</div>
        <div className="space-y-1.5">
          {groupedAchievements.map((group) => (
            <div key={`tooltip-group-${group.goalType}`} className="space-y-0.5">
              <div className="inline-flex items-center gap-1.5">
                <div
                  className="text-[10px] font-semibold uppercase tracking-wide"
                  style={{ color: GOAL_TYPE_META[group.goalType].color }}
                >
                  {GOAL_TYPE_META[group.goalType].label}
                </div>
                <span
                  className="inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold"
                  style={{
                    color: GOAL_TYPE_META[group.goalType].color,
                    backgroundColor: `${GOAL_TYPE_META[group.goalType].color}1A`,
                  }}
                >
                  {formatValue(typeBreakdown[group.goalType])}
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {group.items.map((item) => (
                  <span
                    key={`${item.id}-${item.title}`}
                    className="inline-flex items-center gap-1 rounded-full border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-700 dark:text-slate-300"
                  >
                    <AchievementBadgeIcon badge={item.badge} size={12} className="shrink-0" />
                    <span>{item.title}</span>
                    {item.count > 1 && <span className="font-semibold">×{item.count}</span>}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const totalAchievementCount = fullInsightLists.topByCount.length;

  const achievementBreakdown = useMemo(() => {
    const breakdown = { goal: 0, target: 0, milestone: 0 } as Record<GoalType, number>;
    fullInsightLists.topByCount.forEach((item) => {
      breakdown[item.goalType]++;
    });
    return breakdown;
  }, [fullInsightLists]);

  const selectedBreakdown = useMemo(() => {
    if (selectedAchievementIds.length === 0) return achievementBreakdown;
    const breakdown = { goal: 0, target: 0, milestone: 0 } as Record<GoalType, number>;
    const selected = new Set(selectedAchievementIds);
    fullInsightLists.topByCount.forEach((item) => {
      if (selected.has(item.id)) {
        breakdown[item.goalType]++;
      }
    });
    return breakdown;
  }, [selectedAchievementIds, fullInsightLists]);

  return (
    <div className="space-y-4">
      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={filteredChartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
            <XAxis
              dataKey="label"
              stroke={axisColor}
              style={{ fontSize: '12px' }}
              tick={{ fill: axisColor }}
              interval={Math.floor(filteredChartData.length / 8) || 0}
            />
            <YAxis
              stroke={axisColor}
              style={{ fontSize: '12px' }}
              tick={{ fill: axisColor }}
              domain={[0, fullDataYAxisMax]}
              tickFormatter={(value) => formatValue(Number(value), { short: true })}
            />
            <RechartsTooltip content={renderTooltip} />
            {visibleGoalTypes.map((goalType) => (
              <Bar
                key={goalType}
                dataKey={goalType}
                stackId="achievements"
                fill={GOAL_TYPE_META[goalType].color}
                radius={[4, 4, 4, 4]}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="flex justify-center">
        <div className={`inline-flex items-center gap-2.5 rounded-md border px-3 py-1.5 text-xs shadow-sm transition-colors ${
          selectedAchievementIds.length === 0
            ? 'border-slate-200/90 bg-slate-50/80 dark:border-slate-700/80 dark:bg-slate-800/60'
            : 'border-indigo-200/80 bg-indigo-50/80 dark:border-indigo-900/60 dark:bg-indigo-950/40'
        }`}>
          {selectedAchievementIds.length === 0 ? (
            <>
              <span className="font-semibold text-slate-700 dark:text-slate-200">
                {totalAchievementCount} total
              </span>
              {(['milestone', 'target', 'goal'] as const).map((goalType) =>
                achievementBreakdown[goalType] > 0 ? (
                  <div
                    key={goalType}
                    className="flex items-center gap-1 rounded px-1.5 py-0.5"
                    style={{
                      color: GOAL_TYPE_META[goalType].color,
                      backgroundColor: `${GOAL_TYPE_META[goalType].color}1A`,
                    }}
                  >
                    <span className="font-semibold">{achievementBreakdown[goalType]}</span>
                    <span className="text-[10px]">{GOAL_TYPE_META[goalType].label}</span>
                  </div>
                ) : null
              )}
            </>
          ) : (
            <>
              <Filter className="h-4 w-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
              <span className="font-semibold text-indigo-700 dark:text-indigo-200">
                {selectedAchievementIds.length} of {totalAchievementCount} selected
              </span>
              {(['milestone', 'target', 'goal'] as const).map((goalType) =>
                selectedBreakdown[goalType] > 0 ? (
                  <div
                    key={goalType}
                    className="flex items-center gap-1 rounded px-1.5 py-0.5 font-semibold"
                    style={{
                      color: GOAL_TYPE_META[goalType].color,
                      backgroundColor: `${GOAL_TYPE_META[goalType].color}20`,
                      borderWidth: '1px',
                      borderColor: GOAL_TYPE_META[goalType].color,
                    }}
                  >
                    <span>{selectedBreakdown[goalType]}</span>
                    <span className="text-[10px] font-normal">{GOAL_TYPE_META[goalType].label}</span>
                  </div>
                ) : null
              )}
              <button
                onClick={() => setSelectedAchievementIds([])}
                className="ml-1 font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-300 dark:hover:text-indigo-200 transition-colors"
              >
                Clear
              </button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <AchievementInsightList
          title="Top By Count"
          variant="topByCount"
          items={fullInsightLists.topByCount}
          expanded={insightsExpanded}
          onToggleExpanded={() => setInsightsExpanded(!insightsExpanded)}
          periodName={periodly}
          totalPeriods={periods.length}
          selectedIds={selectedAchievementIds}
          onToggleItem={toggleSelectedAchievement}
        />
        <AchievementInsightList
          title="Best Rarity"
          variant="bestRarity"
          items={fullInsightLists.rarestByAllTimeCount}
          expanded={insightsExpanded}
          onToggleExpanded={() => setInsightsExpanded(!insightsExpanded)}
          periodName={periodly}
          totalPeriods={periods.length}
          selectedIds={selectedAchievementIds}
          onToggleItem={toggleSelectedAchievement}
        />
      </div>
    </div>
  );
}
