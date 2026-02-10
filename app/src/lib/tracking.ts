import type { Tracking } from "@/features/db/localdb";
import type { NumberSource, NumberStats, StatsExtremes } from "./stats";
import { capitalize } from "./utils";

/**
 * Returns the primary metric key based on tracking type.
 */
export function getPrimaryMetric(tracking: Tracking) {
  return ({
    series: 'total' as const,
    trend: 'last' as const,
  })[tracking] satisfies keyof NumberStats;
}

/**
 * Returns the primary metric label based on tracking type.
 */
export function getPrimaryMetricLabel(tracking: Tracking) {
  return {
    series: 'Total' as const,
    trend: 'Close' as const,
  }[tracking];
}

/**
 * Returns the primary metric value from the given stats based on tracking type.
 */
export function getPrimaryMetricFromStats(stats: NumberStats, tracking: Tracking): number {
  return stats[getPrimaryMetric(tracking)];
}

/**
 * Returns the highest primary metric value from the given extremes based on tracking type.
 */
export function getPrimaryMetricHighFromExtremes(extremes: StatsExtremes, tracking: Tracking): number | undefined {
  const key = getPrimaryMetric(tracking);
  const extremeKey = `highest${capitalize(key)}` as const;
  return extremes[extremeKey];
}

/**
 * Returns the lowest primary metric value from the given extremes based on tracking type.
 */
export function getPrimaryMetricLowFromExtremes(extremes: StatsExtremes, tracking: Tracking): number | undefined {
  const key = getPrimaryMetric(tracking);
  const extremeKey = `lowest${capitalize(key)}` as const;
  return extremes[extremeKey];
}

/**
 * Returns the source of valence (good or bad) based on tracking type.
 */
export function getValenceSource(tracking: Tracking): Exclude<NumberSource, 'percents'> {
  return {
    series: 'stats' as const,
    trend: 'deltas' as const,
  }[tracking];
}

/**
 * Returns the valence-adjusted value for a number based on tracking type, ie like getValenceMetricFromData() but with just the raw numbers
 */
export function getValenceValueForNumber(primaryMetric: number, priorPrimaryMetric: number | undefined, tracking: Tracking): number {
  if (getValenceSource(tracking) === 'deltas') {
    if (priorPrimaryMetric === undefined) {
      return 0;
    }
    return primaryMetric - priorPrimaryMetric;
  }
  return primaryMetric;
}

/**
 * Returns the metric to use for valence from the given data based on tracking type.
 */
export function getValenceValueFromData(data: { stats: NumberStats; deltas?: NumberStats; }, tracking: Tracking): number | undefined {
  const metric = getPrimaryMetric(tracking);
  const source = getValenceSource(tracking);
  const sourceData = data[source];
  return sourceData?.[metric];
}