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



/**
 * Normalize absolute values to a range (default 0.1-0.9 for opacity).
 * Takes absolute value of input, finds max magnitude across min/max, then interpolates.
 * Useful for opacity-based emphasis where higher magnitude = more opaque.
 */
export const getNormalizedMagnitude = (value: number, range?: { min?: number; max?: number }, minOutput: number = 0, maxOutput: number = 1): number => {
  if (!range) return (minOutput + maxOutput) / 2;
  const { min, max } = range;
  if (min === undefined || max === undefined) return (minOutput + maxOutput) / 2;
  
  const absValue = Math.abs(value);
  const absMin = Math.abs(min);
  const absMax = Math.abs(max);
  const maxMagnitude = Math.max(absMin, absMax);
  if (maxMagnitude === 0) return (minOutput + maxOutput) / 2;
  
  return minOutput + (absValue / maxMagnitude) * (maxOutput - minOutput);
};