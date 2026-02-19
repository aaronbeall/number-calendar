import type { Tracking } from "@/features/db/localdb";
import type { FormatValueOptions } from "./friendly-numbers";

export interface NumbersChartDataPoint {
  x: number;
  y: number;
  value: number;
  valenceValue: number;
  format?: FormatValueOptions;
  secondaryValue?: number;
  secondaryFormat?: FormatValueOptions;
  secondaryLabel: string;
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

export function getChartData(numbers: number[], tracking: Tracking): NumbersChartDataPoint[] {
  if (!Array.isArray(numbers) || numbers.length === 0) return [];

  if (tracking === 'series') {
    let sum = 0;
    return numbers.map((n, i) => {
      sum += n;
      return {
        x: i,
        y: sum, // cumulative
        value: n,
        valenceValue: n,
        format: { delta: true },
        secondaryValue: sum, // cumulative
        secondaryLabel: 'Total',
      };
    });
  } else if (tracking === 'trend') {
    return numbers.map((n, i) => {
      const prev = i === 0 ? undefined : numbers[i - 1];
      const delta = prev === undefined ? undefined : n - prev;
      return {
        x: i,
        y: n,
        value: n,
        valenceValue: delta ?? 0,
        secondaryValue: delta,
        secondaryFormat: { delta: true },
        secondaryLabel: 'Delta',
      };
    });
  }
  // Default fallback
  return numbers.map((n, i) => ({
    x: i,
    y: n,
    value: n,
    valenceValue: n,
    secondaryLabel: '',
  }));
}

export const getRelativeSize = (value: number, range?: { min?: number; max?: number }, minScale: number = 0.4, maxScale: number = 1): number => {
  if (!range) return 1;
  const { min, max } = range;
  if (min === undefined || max === undefined) return 1;
  const absValue = Math.abs(value);
  const absMin = Math.abs(min);
  const absMax = Math.abs(max);
  const maxMagnitude = Math.max(absMin, absMax);
  if (maxMagnitude === 0) return 1;
  return minScale + (absValue / maxMagnitude) * (maxScale - minScale);
};