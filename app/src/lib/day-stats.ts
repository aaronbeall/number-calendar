export interface DayStatsData {
  dateStr: string;
  total: number;
  count: number;
  mean: number;
  median: number;
  min: number;
  max: number;
}

export interface MonthExtremes {
  highestTotal?: number;
  lowestTotal?: number;
  highestCount?: number;
  highestMean?: number;
  lowestMean?: number;
  highestMedian?: number;
  lowestMedian?: number;
  highestMax?: number;
  lowestMax?: number;
  highestMin?: number;
  lowestMin?: number;
}

/**
 * Calculate statistics for each day in the month
 */
export function calculateDayStats(monthData: Record<string, number[]>): DayStatsData[] {
  return Object.entries(monthData)
    .map(([dateStr, nums]) => {
      if (nums.length === 0) return null;
      const total = nums.reduce((a, b) => a + b, 0);
      const count = nums.length;
      const mean = total / count;
      const sorted = [...nums].sort((a, b) => a - b);
      const median = count % 2 === 0
        ? (sorted[count / 2 - 1] + sorted[count / 2]) / 2
        : sorted[Math.floor(count / 2)];
      const min = sorted[0];
      const max = sorted[sorted.length - 1];
      return { dateStr, total, count, mean, median, min, max };
    })
    .filter(Boolean) as DayStatsData[];
}

/**
 * Calculate extreme values across all days in the month
 */
export function calculateMonthExtremes(dayStats: DayStatsData[]): MonthExtremes {
  if (dayStats.length === 0) return {};

  return {
    highestTotal: Math.max(...dayStats.map(d => d.total)),
    lowestTotal: Math.min(...dayStats.map(d => d.total)),
    highestCount: Math.max(...dayStats.map(d => d.count)),
    highestMean: Math.max(...dayStats.map(d => d.mean)),
    lowestMean: Math.min(...dayStats.map(d => d.mean)),
    highestMedian: Math.max(...dayStats.map(d => d.median)),
    lowestMedian: Math.min(...dayStats.map(d => d.median)),
    highestMax: Math.max(...dayStats.map(d => d.max)),
    lowestMax: Math.min(...dayStats.map(d => d.max)),
    highestMin: Math.max(...dayStats.map(d => d.min)),
    lowestMin: Math.min(...dayStats.map(d => d.min)),
  };
}
