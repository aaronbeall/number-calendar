import type { Tracking } from "@/features/db/localdb";
import { type NumberMetric, type NumberSource, type NumberStats, type StatsExtremes } from "./stats";
import { capitalize } from "./utils";
import type { FormatValueOptions } from "./friendly-numbers";

/**
 * Returns the primary metric key based on tracking type.
 */
export function getPrimaryMetric(tracking: Tracking) {
  return ({
    series: 'total' as const,
    trend: 'last' as const,
  })[tracking] satisfies NumberMetric;
}

/**
 * Returns the primary metric label based on tracking type.
 */
export function getPrimaryMetricLabel(tracking: Tracking) {
  return {
    series: 'Total' as const,
    trend: 'Close' as const,
  }[tracking]
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
export function getValenceSource(tracking: Tracking) {
  return {
    series: 'stats' as const,
    trend: 'deltas' as const,
  }[tracking] satisfies NumberSource;
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

/**
 * Returns the secondary metric source based on tracking type.
 */
export function getSecondaryMetricSource(tracking: Tracking) {
  return {
    series: 'cumulatives' as const,
    trend: 'deltas' as const,
  }[tracking] satisfies NumberSource;
}

/**
 * Returns the secondary metric value from the given data based on tracking type.
 */
export function getSecondaryMetricValueFromData(data: { stats: NumberStats; deltas?: NumberStats; cumulatives?: NumberStats }, tracking: Tracking): number | undefined {
  const metric = getPrimaryMetric(tracking);
  const source = getSecondaryMetricSource(tracking);
  const sourceData = data[source];
  return sourceData?.[metric];
}

/**
 * Returns the secondary metric label based on tracking type.
 */
export function getSecondaryMetricLabel(tracking: Tracking) {
  const source = getSecondaryMetricSource(tracking);
  return {
    cumulatives: 'All-time',
    deltas: 'Change',
  }[source]
}

export function getSecondaryMetricFormat(tracking: Tracking) {
  const source = getSecondaryMetricSource(tracking);
  return {
    cumulatives: { },
    deltas: { delta: true },
  }[source] satisfies FormatValueOptions;
}

/**
 * Returns the change metric source based on tracking type.
 */
export function getChangeMetricSource(tracking: Tracking) {
  return {
    series: 'cumulativePercents' as const,
    trend: 'percents' as const,
  }[tracking] satisfies NumberSource;
}

/**
 * Returns the change metric label based on tracking type.
 */
export function getChangeMetricLabel(tracking: Tracking) {
  const source = getChangeMetricSource(tracking);
  return {
    cumulativePercents: 'Change (%)',
    percents: 'Change (%)',
  }[source]
}

/**
 * Returns the change metric value from the given data based on tracking type.
 */
export function getChangeMetricValueFromData(data: { stats: NumberStats; deltas?: NumberStats; percents?: Partial<NumberStats>; cumulatives?: NumberStats; cumulativePercents?: Partial<NumberStats> }, tracking: Tracking): number | undefined {
  const metric = getPrimaryMetric(tracking);
  const source = getChangeMetricSource(tracking);
  const sourceData = data[source];
  return sourceData?.[metric];
}