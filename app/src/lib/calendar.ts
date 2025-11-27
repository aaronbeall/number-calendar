import type { Tracking, Valence } from "@/features/db/localdb";
import { computeNumberStats, getPrimaryMetric, getPrimaryMetricFromStats, getPrimaryMetricHighFromExtremes, getPrimaryMetricLabel, getPrimaryMetricLowFromExtremes, getStatsDelta, getStatsPercentChange, getValenceMetricFromData, getValenceSource, type StatsExtremes } from "./stats";


/**
 * Aggregates calendar data for a given set of numbers, prior numbers, extremes, and tracking type.
 */
export function getCalendarData(numbers: number[], priorNumbers: number[] | undefined, extremes: StatsExtremes | undefined, tracking: Tracking) {
  const stats = computeNumberStats(numbers);
  const priorStats = computeNumberStats(priorNumbers ?? []);
  const deltas = (stats && priorStats) ? getStatsDelta(stats, priorStats) : undefined;
  const percents = (stats && priorStats) ? getStatsPercentChange(stats, priorStats) : undefined;
  const valenceStats = { stats, deltas }[getValenceSource(tracking)];
  const primaryMetric = stats ? getPrimaryMetricFromStats(stats, tracking) : 0;
  const primaryMetricLabel = getPrimaryMetricLabel(tracking);
  const primaryMetricDelta = deltas && deltas[getPrimaryMetric(tracking)];
  const primaryMetricPercent = percents && percents[getPrimaryMetric(tracking)];
  const primaryValenceMetric = stats ? getValenceMetricFromData({ stats, deltas }, tracking) : 0;
  const hasData = numbers.length > 0;
  return {
    stats,
    valenceStats,
    deltas,
    percents,
    primaryMetric,
    primaryMetricLabel,
    primaryMetricDelta,
    primaryMetricPercent,
    primaryValenceMetric,
    isHighestPrimary: hasData && extremes && primaryMetric === getPrimaryMetricHighFromExtremes(extremes, tracking),
    isLowestPrimary: hasData && extremes && primaryMetric === getPrimaryMetricLowFromExtremes(extremes, tracking),
    isHighestCount: hasData && extremes && stats?.count === extremes.highestCount,
    isHighestMean: hasData && extremes && stats?.mean === extremes.highestMean,
    isLowestMean: hasData && extremes && stats?.mean === extremes.lowestMean,
    isHighestMedian: hasData && extremes && stats?.median === extremes.highestMedian,
    isLowestMedian: hasData && extremes && stats?.median === extremes.lowestMedian,
    isHighestMin: hasData && extremes && stats?.min === extremes.highestMin,
    isLowestMin: hasData && extremes && stats?.min === extremes.lowestMin,
    isHighestMax: hasData && extremes && stats?.max === extremes.highestMax,
    isLowestMax: hasData && extremes && stats?.max === extremes.lowestMax,
  }
}