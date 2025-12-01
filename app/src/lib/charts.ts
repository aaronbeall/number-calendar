import type { Tracking } from "@/features/db/localdb";

interface ChartDataPoint {
  x: number;
  y: number;
  raw: number;
  primaryValue: number;
  primaryValenceValue: number;
  delta?: number;
}

export function getChartNumbers(numbers: number[], priorNumbers: number[] | undefined, tracking: Tracking): number[] {
  if (tracking === 'trend') {
    const lastPrior = priorNumbers && priorNumbers.length > 0 ? priorNumbers[priorNumbers.length - 1] : null;
    if (lastPrior !== null) {
      return [lastPrior, ...numbers];
    }
  }
  return numbers;
}

export function getChartData(numbers: number[], tracking: Tracking): ChartDataPoint[] {
  if (!Array.isArray(numbers) || numbers.length === 0) return [];

  if (tracking === 'series') {
    let sum = 0;
    return numbers.map((n, i) => {
      sum += n;
      // For series, y, primaryValue, and primaryValenceValue are all the cumulative total
      // delta is the change from previous cumulative value
      const prevSum = i === 0 ? 0 : sum - n;
      return {
        x: i,
        y: sum,
        raw: n,
        primaryValue: sum,
        primaryValenceValue: sum, // can be customized if needed
        delta: i === 0 ? n : sum - prevSum,
      };
    });
  } else if (tracking === 'trend') {
    return numbers.map((n, i) => {
      // For trend, y and primaryValue are the raw number, primaryValenceValue is the delta from previous
      const prev = i === 0 ? null : numbers[i - 1];
      const delta = prev === null ? null : n - prev;
      return {
        x: i,
        y: n,
        raw: n,
        primaryValue: n,
        primaryValenceValue: delta ?? 0,
        delta: delta ?? 0,
      };
    });
  }
  // Default fallback
  return numbers.map((n, i) => ({
    x: i,
    y: n,
    raw: n,
    primaryValue: n,
    primaryValenceValue: n,
    delta: 0,
  }));
}