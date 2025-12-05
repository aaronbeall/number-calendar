import type { Dataset, DayEntry, DayKey, MonthKey, Tracking } from "@/features/db/localdb";
import { getPrimaryMetric, getPrimaryMetricLabel } from "./tracking";
import { computeMonthlyStats, computeNumberStats } from "./stats";
import { convertDateKey, toMonthKey } from "./friendly-date";

export type ExportType = 'daily' | 'monthly' | 'entries';
export type ExportRangeType = 'all' | 'range';
export type ExportFormat = 'csv' | 'tsv' | 'json';

export type JsonExportData = {
  version: string;
  datasetId: string;
  datasetName: string;
  exportType: ExportType;
  exportedAt: string;
  range: {
    type: 'all';
  } | {
    type: 'range';
    start: string | null;
    end: string | null;
  };
} & (
    { exportType: 'daily'; data: Record<DayKey, number[]> }
    | { exportType: 'monthly'; data: Record<MonthKey, number[]> }
    | { exportType: 'entries'; data: [DayKey, number][] }
  );

export type ExportData = (ExportDayData | ExportMonthData | ExportEntryData)[];

export type ExportDayData = {
  Date: DayKey;
  Numbers: number[];
} & {
  [K in ReturnType<typeof getPrimaryMetricLabel>]?: number;
}

export type ExportMonthData = {
  Date: MonthKey;
  Numbers: number[];
} & {
  [K in ReturnType<typeof getPrimaryMetricLabel>]?: number;
}

export type ExportEntryData = {
  Date: DayKey;
  Number: number;
}

export function generateExportData({
  dataset,
  allDays,
  exportType,
  rangeType,
  startDate,
  endDate,
  tracking
}: {
  dataset: Dataset | undefined;
  allDays: DayEntry[];
  exportType: ExportType;
  rangeType: ExportRangeType;
  startDate: string;
  endDate: string;
  tracking: Tracking;
}): ExportData {
  if (!dataset) return [];

  let entries = allDays;

  // Apply date range filter (inclusive)
  if (rangeType === 'range' && startDate && endDate) {
    if (exportType === 'monthly') {
      // For monthly exports, compare against month prefixes (YYYY-MM)
      // Include all days that fall within the month range
      entries = entries.filter(entry => {
        const entryMonth = convertDateKey(entry.date, 'month');
        return entryMonth >= startDate && entryMonth <= endDate;
      });
    } else {
      // For daily/entries exports, direct date comparison (YYYY-MM-DD)
      entries = entries.filter(entry => entry.date >= startDate && entry.date <= endDate);
    }
  }

  const primaryMetricKey = getPrimaryMetric(tracking);
  const primaryMetricLabel = getPrimaryMetricLabel(tracking);

  if (exportType === 'entries') {
    // Flatten to individual entries
    return entries.flatMap(entry =>
      entry.numbers.map(num => ({
        Date: entry.date,
        Number: num
      }))
    );
  }

  if (exportType === 'daily') {
    // Daily aggregation
    return entries.map(entry => {
      const stats = computeNumberStats(entry.numbers);
      return {
        Date: entry.date,
        [primaryMetricLabel]: stats?.[primaryMetricKey] ?? 0,
        Numbers: entry.numbers
      };
    }).sort((a, b) => a.Date.localeCompare(b.Date));
  }

  if (exportType === 'monthly') {
    // Monthly aggregation
    const dataRecord: Record<DayKey, number[]> = {};
    entries.forEach(entry => {
      dataRecord[entry.date] = entry.numbers;
    });

    const monthlyStats = computeMonthlyStats(dataRecord);

    return monthlyStats.map(stats => {
      const monthKey = toMonthKey(stats.year, stats.monthNumber);
      const monthNumbers = entries
        .filter(e => e.date.startsWith(monthKey))
        .flatMap(e => e.numbers);

      return {
        Date: monthKey,
        [primaryMetricLabel]: stats[primaryMetricKey],
        Numbers: monthNumbers
      };
    });
  }

  return [];
}

export const generateFileContent = ({
  exportData,
  format,
  dataset,
  datasetId,
  exportType,
  rangeType,
  startDate,
  endDate
}: {
  exportData: ExportData;
  format: ExportFormat;
  dataset: Dataset | undefined;
  datasetId: string;
  exportType: ExportType;
  rangeType: ExportRangeType;
  startDate: string;
  endDate: string;
}) => {
  if (exportData.length === 0) return '';

  if (format === 'json') {
    const jsonData: Omit<JsonExportData, 'data'> & { data: JsonExportData['data'] } = {
      version: '1.0',
      datasetId,
      datasetName: dataset?.name ?? "",
      exportedAt: new Date().toISOString(),
      exportType,
      range: rangeType === 'all' ? { type: 'all' } : {
        type: 'range',
        start: startDate || null,
        end: endDate || null,
      },
      data: (() => {
        if (exportType === 'daily' || exportType === 'monthly') {
          return (exportData as ExportDayData[] | ExportMonthData[]).reduce<Record<DayKey | MonthKey, number[]>>((acc, curr) => {
            const numbers = acc[curr.Date] ?? (acc[curr.Date] = []);
            numbers.push(...curr.Numbers);
            return acc;
          }, {});
        } else if (exportType === 'entries') {
          return (exportData as ExportEntryData[]).map(item => ([item.Date, item.Number]));
        }
        throw new Error('Invalid export type');
      })()
    };
    return JSON.stringify(jsonData, null, 2);
  }

  const delimiter = format === 'csv' ? ',' : '\t';
  const headers = Object.keys(exportData[0]);
  const csvRows = [
    headers.join(delimiter),
    ...exportData.map(row =>
      headers.map(header => {
        const value = row[header as keyof typeof row];
        const strValue = Array.isArray(value) ? value.join(', ') : String(value ?? '');
        // Quote if contains delimiter or quotes
        return format === 'csv' && (strValue.includes(',') || strValue.includes('"'))
          ? `"${strValue.replace(/"/g, '""')}"`
          : strValue;
      }).join(delimiter)
    )
  ];
  return csvRows.join('\n');
};