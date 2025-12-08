import type { DayEntry, DayKey } from "@/features/db/localdb";
import { detectExpressionTrackingFormat, parseExpression } from "./expression";
import { dateToDayKey } from "./friendly-date";



export type ColumnType = 'date' | 'numeric' | 'unknown';

export type MergeStrategy = 'combine' | 'replace';

export interface ParsedColumn {
  index: number;
  type: ColumnType;
  selected: boolean;
  data: string[];
  name: string;
}

export interface ParsedData {
  columns: ParsedColumn[];
  rows: boolean[]; // selection state for each row
}


// Helper to parse date strings
export const parseDateString = (rawValue: string) => {
  const trimmed = rawValue.trim();
  // Use Date.parse() to parse various date formats,
  // but don't parse any purely numeric strings (including decimals) which gives valid but unlikely dates
  if (/^[+-]?(?:\d+\.\d+|\d+|\.\d+)$/.test(trimmed)) {
    return null;
  }
  const timestamp = Date.parse(trimmed);
  if (isNaN(timestamp)) {
    return null;
  }
  // Avoid timezone issues by adjusting to local timezone
  return new Date(timestamp + new Date(timestamp).getTimezoneOffset() * 60000);
 
}

// Helper to parse numeric strings or expressions
export const parseNumericString = (expr: string): number | number[] | null => {
  const format = detectExpressionTrackingFormat(expr);
  if (format == null) {
    const float = parseFloat(expr);
    if (!isNaN(float)) {
      return float;
    }
    return null;
  }
  return parseExpression(expr, format);
}

// Helper functions for cell parsing and validation
export const parseCellValue = (rawValue: string, type: ColumnType): { parsed: Date | number | number[] | null; valid: boolean } => {
  const trimmed = rawValue.trim();

  if (type === 'date') {
    // Empty dates are invalid
    if (!trimmed) return { parsed: null, valid: false };
    // Check if it's a valid date format
    const parsed = parseDateString(trimmed);
    const valid = parsed !== null && !isNaN(parsed.getTime());
    return { parsed, valid };
  }

  if (type === 'numeric') {
    // Empty numeric values are valid (optional)
    if (!trimmed) return { parsed: null, valid: true };
    // Try to parse as expression
    const parsed = parseNumericString(trimmed);
    const valid = parsed !== null;
    return { parsed, valid };
  }

  // Unknown type - show as-is
  return { parsed: null, valid: true };
};

// Parser functions
export const detectDelimiter = (text: string): string => {
  const lines = text.split('\n').filter(l => l.trim());
  if (lines.length === 0) return ',';

  const delimiters = [',', '\t', ';', '|'];
  const delimiterStats: Record<string, { counts: number[], present: boolean }> = {};

  // Initialize stats for each delimiter
  for (const delim of delimiters) {
    delimiterStats[delim] = { counts: [], present: false };
  }

  // Count occurrences of each delimiter per line
  for (const line of lines) {
    for (const delim of delimiters) {
      const count = line.split(delim).length - 1; // number of delimiters = splits - 1
      delimiterStats[delim].counts.push(count);
      if (count > 0) {
        delimiterStats[delim].present = true;
      }
    }
  }

  // Find the best delimiter
  let bestDelimiter = ',';
  let bestScore = -Infinity;

  for (const delim of delimiters) {
    const stats = delimiterStats[delim];

    // Skip if delimiter doesn't appear in any line
    if (!stats.present || stats.counts.length === 0) continue;

    // Calculate consistency score
    const avgCount = stats.counts.reduce((a, b) => a + b, 0) / stats.counts.length;
    const variance = stats.counts.reduce((sum, count) => sum + Math.pow(count - avgCount, 2), 0) / stats.counts.length;
    const stdDev = Math.sqrt(variance);

    // Score: higher average count is good, lower variance is better
    // We prefer delimiters that appear in more columns with consistent counts
    const score = avgCount - (stdDev * 0.5);

    if (score > bestScore && avgCount > 0) {
      bestScore = score;
      bestDelimiter = delim;
    }
  }

  return bestDelimiter;
};

export const parseCSV = (text: string, delimiter: string): string[][] => {
  const lines = text.split('\n').filter(l => l.trim());
  return lines.map(line => {
    const cells: string[] = [];
    let currentCell = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          currentCell += '"';
          i++; // skip next quote
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === delimiter && !inQuotes) {
        cells.push(currentCell.trim());
        currentCell = '';
      } else {
        currentCell += char;
      }
    }
    cells.push(currentCell.trim());
    return cells;
  });
};

export const parseJSON = (text: string): string[][] => {
  const data = JSON.parse(text);

  // Handle structured export format (version 1.0+)
  if (data.version && data.data && data.exportType) {
    if (data.exportType === 'entries' && Array.isArray(data.data)) {
      // Entries format: [DayKey, number][]
      const rows = [['Date', 'Number']];
      for (const [date, number] of data.data) {
        rows.push([date, String(number)]);
      }
      return rows;
    } else if ((data.exportType === 'daily' || data.exportType === 'monthly') && typeof data.data === 'object') {
      // Daily/Monthly format: Record<DateKey, number[]>
      const headers = ['Date', 'Numbers'];
      const rows = [headers];

      for (const [date, numbers] of Object.entries(data.data)) {
        rows.push([date, (numbers as number[]).join(', ')]);
      }

      return rows;
    }
  }

  throw new Error('Unsupported JSON format');
};

const detectColumnType = (values: string[]): ColumnType => {
  const nonEmpty = values.filter(v => v.trim() !== '');
  if (nonEmpty.length === 0) return 'unknown';

  let dateCount = 0;
  let numericCount = 0;

  for (const val of nonEmpty) {
    // Check if it's a date (YYYY-MM-DD or YYYY-MM format)
    if (parseDateString(val.trim())) {
      dateCount++;
    }
    // Check if it's numeric (number, list of numbers, or expression)
    else if (parseNumericString(val.trim()) !== null) {
      numericCount++;
    }
  }

  const total = nonEmpty.length;
  if (dateCount / total > 0.5) return 'date';
  if (numericCount / total > 0.5) return 'numeric';
  return 'unknown';
};

const isHeaderRow = (row: string[]): boolean => {
  // If all cells are non-date and non-numeric, likely a header
  return row.every(cell => {
    return !parseDateString(cell.trim()) && parseNumericString(cell.trim()) === null;
  });
};

// Function to separate headers and data rows
export const getHeadersAndRows = (rows: string[][]) => {
  let headerNames: string[] = [];
  let dataRows: string[][] = rows;
  if (rows.length > 1 && isHeaderRow(rows[0])) {
    headerNames = rows[0].map((name, idx) => name || `Col ${idx + 1}`);
    dataRows = rows.slice(1);
  } else {
    headerNames = rows[0].map((_, idx) => `Col ${idx + 1}`);
  }
  return { headerNames, dataRows };
};

// Function to get parsed columns with types and selection state
export const getParsedColumns = (dataRows: string[][], headerNames: string[]) => {

  // Build columns, detecting types
  const numCols = Math.max(...dataRows.map(r => r.length));
  const columns: ParsedColumn[] = [];
  for (let colIdx = 0; colIdx < numCols; colIdx++) {
    const colData = dataRows.map(row => row[colIdx] || '');
    const type = detectColumnType(colData);
    columns.push({
      index: colIdx,
      type,
      selected: type !== 'unknown',
      data: colData,
      name: headerNames[colIdx] || `Col ${colIdx + 1}`
    });
  }

  return columns;
};

// Function to get row selection based on selected date column
export const getRowSelection = (dataRows: string[][], columns: ParsedColumn[]): boolean[] => {
  // Apply selection rules
  const dateColumns = columns.filter(c => c.type === 'date' && c.selected);
  if (dateColumns.length > 1) {
    // Only select first date column
    dateColumns.forEach((col, idx) => {
      if (idx > 0) col.selected = false;
    });
  }

  // Initially select rows that have a date value in selected date column
  const dateColIdx = columns.findIndex(c => c.type === 'date' && c.selected);
  const rowSelection = dataRows.map((_, rowIdx) => {
    if (dateColIdx === -1) return false;
    const dateValue = columns[dateColIdx].data[rowIdx];
    return dateValue.trim() !== '';
  });

  return rowSelection;
}

export const validateImport = (parsedData: ParsedData | null): string | null => {
  if (!parsedData) return 'No data to import';

  const dateColumns = parsedData.columns.filter(c => c.type === 'date' && c.selected);
  if (dateColumns.length !== 1) return 'Exactly one date column must be selected';

  const dateColIdx = parsedData.columns.findIndex(c => c.type === 'date' && c.selected);
  const numericCols = parsedData.columns.filter(c => c.type === 'numeric' && c.selected);
  if (numericCols.length === 0) return 'At least one numeric column must be selected';

  const selectedRows = parsedData.rows.map((selected, idx) => ({ selected, idx })).filter(r => r.selected);
  if (selectedRows.length === 0) return 'At least one row must be selected';

  // Check that all selected rows have dates
  for (const { idx } of selectedRows) {
    const dateValue = parsedData.columns[dateColIdx].data[idx];
    if (!dateValue.trim()) {
      return `Row ${idx + 1} is selected but has no date`;
    }
  }

  return null;
};

export function generateDayEntries({
  parsedData,
  existingDays,
  mergeStrategy,
  datasetId
}: {
  parsedData: ParsedData;
  existingDays: DayEntry[];
  mergeStrategy: MergeStrategy;
  datasetId: string;
}) {
  const dateColIdx = parsedData.columns.findIndex(c => c.type === 'date' && c.selected);
  const numericCols = parsedData.columns.filter(c => c.type === 'numeric' && c.selected);
  
  // Group data by date
  const dayMap = new Map<DayKey, number[]>();
  
  for (let rowIdx = 0; rowIdx < parsedData.rows.length; rowIdx++) {
    if (!parsedData.rows[rowIdx]) continue;
    
    const dateStr = parsedData.columns[dateColIdx].data[rowIdx].trim();
    if (!dateStr) continue;
    
    // Normalize date to YYYY-MM-DD
    let dayKey: DayKey;
    const date = parseDateString(dateStr);
    if (date) {
      dayKey = dateToDayKey(date);
    } else {
      continue;
    }
    
    // Collect all numbers from numeric columns
    const numbers: number[] = [];
    for (const col of numericCols) {
      const value = col.data[rowIdx].trim();
      if (!value) continue;
      
      // Parse as expression (handles single numbers, lists, expressions)
      const parsed = parseNumericString(value);
      if (parsed !== null) {
        numbers.push(...[parsed].flat());
      }
    }
    
    if (numbers.length > 0) {
      if (!dayMap.has(dayKey)) {
        dayMap.set(dayKey, []);
      }
      dayMap.get(dayKey)!.push(...numbers);
    }
  }
  
  // Convert to DayEntry array and apply merge strategy
  const existingDataMap = new Map(existingDays.map(entry => [entry.date, entry.numbers]));
  const dayEntries: DayEntry[] = Array.from(dayMap.entries()).map(([date, numbers]) => {
    const existingNumbers = existingDataMap.get(date);
    let finalNumbers = numbers;
    
    if (existingNumbers && existingNumbers.length > 0) {
      if (mergeStrategy === 'combine') {
        // Combine: add new numbers to existing
        finalNumbers = [...existingNumbers, ...numbers];
      }
      // For 'replace' strategy, just use the new numbers (default)
    }
    
    return {
      datasetId,
      date,
      numbers: finalNumbers
    };
  });

  return dayEntries;
}