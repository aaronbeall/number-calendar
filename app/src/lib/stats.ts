export interface NumberStats {
  count: number;
  total: number;
  mean: number; // average
  median: number;
  min: number;
  max: number;
}

export function computeNumberStats(numbers: number[]): NumberStats | null {
  if (!numbers || numbers.length === 0) return null;
  const count = numbers.length;
  const total = numbers.reduce((a, b) => a + b, 0);
  const mean = total / count;
  const sorted = [...numbers].sort((a, b) => a - b);
  const median = count % 2 === 0
    ? (sorted[count / 2 - 1] + sorted[count / 2]) / 2
    : sorted[Math.floor(count / 2)];
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  return { count, total, mean, median, min, max };
}

export interface DayStatsData extends NumberStats {
  dateStr: string;
}

export interface MonthStatsData extends NumberStats {
  monthNumber: number;
}

export interface StatsExtremes {
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
      const stats = computeNumberStats(nums);
      if (!stats) return null;
      const { total, count, mean, median, min, max } = stats;
      return { dateStr, total, count, mean, median, min, max };
    })
    .filter((d): d is DayStatsData => !!d);
}

/**
 * Calculate extreme values across all days in the month
 */
export function calculateMonthExtremes(dayStats: DayStatsData[]): StatsExtremes {
  if (dayStats.length <= 1) return {};

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

/**
 * Calculate statistics for each month in the year
 */
export function calculateMonthStats(yearData: Record<string, number[]>, year: number): MonthStatsData[] {
  const monthStats: MonthStatsData[] = [];
  
  for (let monthNumber = 1; monthNumber <= 12; monthNumber++) {
    const monthNumbers: number[] = [];
    const lastDay = new Date(year, monthNumber, 0).getDate();
    
    for (let day = 1; day <= lastDay; day++) {
      const dateStr = `${year}-${String(monthNumber).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayNumbers = yearData[dateStr] || [];
      monthNumbers.push(...dayNumbers);
    }
    
    if (monthNumbers.length === 0) continue;
    
    const stats = computeNumberStats(monthNumbers);
    if (stats) {
      const { total, count, mean, median, min, max } = stats;
      monthStats.push({ monthNumber, total, count, mean, median, min, max });
    }
  }
  
  return monthStats;
}

/**
 * Calculate extreme values across all months in the year
 */
export function calculateYearExtremes(monthStats: MonthStatsData[]): StatsExtremes {
  if (monthStats.length <= 1) return {};

  return {
    highestTotal: Math.max(...monthStats.map(m => m.total)),
    lowestTotal: Math.min(...monthStats.map(m => m.total)),
    highestCount: Math.max(...monthStats.map(m => m.count)),
    highestMean: Math.max(...monthStats.map(m => m.mean)),
    lowestMean: Math.min(...monthStats.map(m => m.mean)),
    highestMedian: Math.max(...monthStats.map(m => m.median)),
    lowestMedian: Math.min(...monthStats.map(m => m.median)),
    highestMax: Math.max(...monthStats.map(m => m.max)),
    lowestMax: Math.min(...monthStats.map(m => m.max)),
    highestMin: Math.max(...monthStats.map(m => m.min)),
    lowestMin: Math.min(...monthStats.map(m => m.min)),
  };
}
