import type { DateKey, DayKey, Tracking } from "@/features/db/localdb";
import { toDayKey } from "./friendly-date";
import { computeNumberStats, getStatsDelta, getStatsPercentChange, type StatsExtremes } from "./stats";
import { getPrimaryMetric, getPrimaryMetricFromStats, getPrimaryMetricHighFromExtremes, getPrimaryMetricLabel, getPrimaryMetricLowFromExtremes, getValenceMetricFromData, getValenceSource } from "./tracking";


export function getMonthDays(year: number, month: number) {
  const days: DayKey[] = [];
  const lastDay = new Date(year, month, 0).getDate();
  for (let d = 1; d <= lastDay; d++) {
    days.push(toDayKey(year, month, d));
  }
  return days;
}

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
// Given an ordered array of date keys and a data map, returns a map of dateKey -> prior populated numbers (previous non-empty entry)

export function getPriorNumbersMap<T extends DateKey>(orderedKeys: T[], data: Record<T, number[]>, initialLastPopulated: number[] = []): Record<T, number[]> {
  const result = {} as Record<T, number[]>;
  let lastPopulated: number[] = initialLastPopulated;
  for (let i = 0; i < orderedKeys.length; i++) {
    const key = orderedKeys[i];
    result[key] = lastPopulated;
    if (data[key] && data[key].length > 0) {
      lastPopulated = data[key];
    }
  }
  return result;
}
