// --- TREND MODE EXPRESSION HELPERS ---

import type { Tracking } from "@/features/db/localdb";

/**
 * Rounds a number to 10 decimal places to avoid floating point precision errors.
 * Example: 0.1 + 0.2 = 0.30000000000004 => 0.3
 */
function round(num: number): number {
  return Math.round(num * 1e10) / 1e10;
}

/**
 * Formats an array of numbers for trend mode: space-delimited, e.g. "35 21 -76 2000"
 */
export function buildTrendExpressionFromNumbers(nums: number[]): string {
  if (!nums.length) return '';
  return nums.map(n => n.toString()).join(' ');
}

/**
 * Parses a trend-mode expression into an array of numbers.
 * - Accepts space, semicolon, or pipe as delimiters (not comma)
 * - Each number can be positive or negative
 * - Supports "+=" or "-=" at the end to specify a delta to apply to the last number
 *   e.g. "35 21 -76 +=10" becomes [35, 21, -76, -66]
 * - Normalizes away currency, commas, and whitespace
 */
export function parseTrendExpression(expr: string): number[] | null {
  if (!expr.trim()) return [];
  try {
    // Normalize input (remove currency symbols, thousands separators, whitespace)
    // Only remove currency and thousands separators, but DO NOT collapse spaces
    const normalize = (s: string) => s
      .replace(/[$€£¥₹]/g, '')
      .replace(/,/g, '')
      .trim();

    let cleaned = normalize(expr);

    // Split on space, semicolon, or pipe (but not comma),
    // and also split out any += or -= delta syntax attached to a number
    let rawParts = cleaned.split(/\s+|;|\|/).filter(Boolean);
    if (!rawParts.length) return [];

    // Further split any part that contains a delta (e.g. 240+=2 => [240, "+=2"])
    let parts: string[] = [];
    for (const part of rawParts) {
      // Match e.g. 240+=2 or 240-=2
      const match = part.match(/^(-?\d+(?:\.\d+)?)([+-]=.+)$/);
      if (match) {
        parts.push(match[1]);
        parts.push(match[2]);
      } else {
        parts.push(part);
      }
    }
    if (!parts.length) return [];

    let numbers: number[] = [];

    for (const part of parts) {
      // Check for += or -=
      const deltaMatch = part.match(/^([+-])=(.+)$/);
      if (deltaMatch) {
        if (!numbers.length) return null;
        const sign = deltaMatch[1];
        const deltaVal = parseSingleNumberExpression(deltaMatch[2]);
        if (deltaVal === null) return null;
        const lastNum = numbers[numbers.length - 1];
        const newNum = round(sign === '+' ? lastNum + deltaVal : lastNum - deltaVal);
        numbers.push(newNum);
        continue;
      }
      const n = parseSingleNumberExpression(part);
      if (n === null) return null;
      numbers.push(n);
    }

    return numbers;
  } catch {
    return null;
  }
}
// Parses a single number or arithmetic expression (e.g. '10+8-2') and returns the result, or null if invalid
export function parseSingleNumberExpression(expr: string): number | null {
  if (!expr.trim()) return null;
  try {
    // Remove currency symbols and locale-specific thousands separators
    let cleaned = expr.replace(/[$€£¥₹]/g, '')
      .replace(/(?<=\d)[,\s](?=\d{3}\b)/g, '')
      .replace(/,/g, '')
      .replace(/\s+/g, '');

    // Only allow numbers, parentheses, and basic arithmetic operators
    // Accepts: + - * / ( ) .
    if (!/^[\d+\-*/().]+$/.test(cleaned)) return null;

    // Evaluate the arithmetic expression safely
    // Example: '10+8-2*3/2' => 13
    // Use Function constructor for simple arithmetic
    // (no variables, no function calls)
    // eslint-disable-next-line no-new-func
    const result = Function(`"use strict";return (${cleaned})`)();
    if (typeof result === 'number' && !isNaN(result)) {
      return round(result);
    }
    return null;
  } catch {
    return null;
  }
}

export function buildExpressionFromNumbers(nums: number[], tracking: Tracking): string {
  return {
    series: buildSeriesExpressionFromNumbers,
    trend: buildTrendExpressionFromNumbers,
  }[tracking](nums);
}

export function parseExpression(expr: string, tracking: Tracking): number[] | null {
  return {
    series: parseSeriesExpression,
    trend: parseTrendExpression,
  }[tracking](expr);
}

export function detectExpressionTrackingFormat(expr: string): Tracking | null {
  // Check the format for expresion format for matches of what parseSeriesExpression and parseTrendExpression expect
  // Normalize: remove currency and all non-numeric relevant symbols and commas (thousands separators)
  const normalized = expr
    .replace(/[$€£¥₹]/g, '')
    .replace(/,/g, '')
    .trim();

  // Check trend pattern first (requires spaces as delimiters)
  const trendPattern = /^-?\d+(\s+-?\d+|\s+[+-]=-?\d+)+$/;
  if (trendPattern.test(normalized)) {
    return 'trend';
  }

  // Check series pattern (remove spaces since series format has no spaces)
  const noSpaces = normalized.replace(/\s+/g, '');
  // Require at least one operator to distinguish from plain numbers
  const seriesPattern = /^-?\d+([+-]\d+|=-?\d+)+$/;
  if (seriesPattern.test(noSpaces)) {
    return 'series';
  }

  return null;
}

/**
 * Formats an array of numbers for series mode: e.g. "35 +21 -76 +2000"
 */
export function buildSeriesExpressionFromNumbers(nums: number[]): string {
  if (!nums.length) return '';
  return nums.reduce((acc, n, i) => (i === 0 ? `${n}` : `${acc} ${n >= 0 ? '+' : ''}${n}`), '');
}

/**
 * Parses a series-mode expression into an array of numbers.
 * - Accepts numbers separated by '+' or '-' signs (no spaces)
 * - Each number can be positive or negative
 * - Supports '=' to specify target totals, calculating deltas accordingly
 *   e.g. "35+21-76=50" becomes [35, 21, -76, 70] because 35+21-76+70=50
 * - Normalizes away currency, commas, and whitespace
 */
export function parseSeriesExpression(expr: string): number[] | null {
  if (!expr.trim()) return [];
  try {
    // Normalize input (remove currency symbols, thousands separators, whitespace)
    const normalize = (s: string) => s
      .replace(/[$€£¥₹]/g, '')
      .replace(/,/g, '')
      .replace(/\s+/g, '');

    // Split on '=' to support delta targets. The first segment provides base numbers.
    const segments = expr.split('=');
    if (segments.length === 0) return null;

    // Parse first segment into signed numbers by splitting at + or - boundaries.
    const firstCleaned = normalize(segments[0]);
    if (!firstCleaned) return null;
    const baseParts = firstCleaned.split(/(?=[+-])/);
    const numbers: number[] = baseParts.map(Number).filter(n => !isNaN(n));
    if (numbers.length === 0) return null; // nothing valid before '='

    // Running sum after initial numbers
    let runningSum = round(numbers.reduce((a, b) => a + b, 0));

    // For each subsequent '=' segment, treat segment as a target total and append the delta (target - current runningSum)
    for (let i = 1; i < segments.length; i++) {
      const segRaw = segments[i];
      if (!segRaw.trim()) continue; // skip empty (e.g., trailing '=')
      const segClean = normalize(segRaw);
      if (!segClean) continue;

      // Allow arithmetic expressions in target segments using parseSingleNumberExpression for flexibility
      const target = parseSingleNumberExpression(segClean);
      if (target === null) return null; // invalid target expression

      const delta = round(target - runningSum);
      numbers.push(delta);
      runningSum = round(runningSum + delta); // should equal target
    }

    return numbers.length > 0 ? numbers : null;
  } catch {
    return null;
  }
}
