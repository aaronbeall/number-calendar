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
      return result;
    }
    return null;
  } catch {
    return null;
  }
}
// Expression utilities for number parsing/building
export function parseNumbers(input: string): number[] {
  if (!input.trim()) return [];
  return input
    .replace(/\s+/g, '')
    .split(/(?=[+-])/) // split at + or -
    .map(Number)
    .filter(n => !isNaN(n));
}

export function buildExpressionFromNumbers(nums: number[]): string {
  if (!nums.length) return '';
  return nums.reduce((acc, n, i) => (i === 0 ? `${n}` : `${acc}${n >= 0 ? '+' : ''}${n}`), '');
}

// Parses a math expression or comma/space separated numbers into an array of numbers
export function parseExpression(expr: string): number[] | null {
  if (!expr.trim()) return [];
  try {
    // Normalize input (remove currency symbols, thousands separators, whitespace)
    const normalize = (s: string) => s
      .replace(/[$€£¥₹]/g, '')
      .replace(/(?<=\d)[,\s](?=\d{3}\b)/g, '')
      .replace(/,/g, '')
      .replace(/\s+/g, '');

    // Split on '=' to support delta targets. The first segment provides base numbers.
    const segments = expr.split('=');
    if (segments.length === 0) return [];

    // Parse first segment into signed numbers by splitting at + or - boundaries.
    const firstCleaned = normalize(segments[0]);
    if (!firstCleaned) return [];

    const baseParts = firstCleaned.split(/(?=[+-])/);
    const numbers: number[] = baseParts.map(Number).filter(n => !isNaN(n));
    if (numbers.length === 0) return null; // nothing valid before '='

    // Running sum after initial numbers
    let runningSum = numbers.reduce((a, b) => a + b, 0);

    // For each subsequent '=' segment, treat segment as a target total and append the delta (target - current runningSum)
    for (let i = 1; i < segments.length; i++) {
      const segRaw = segments[i];
      if (!segRaw.trim()) continue; // skip empty (e.g., trailing '=')
      const segClean = normalize(segRaw);
      if (!segClean) continue;

      // Allow arithmetic expressions in target segments using parseSingleNumberExpression for flexibility
      const target = parseSingleNumberExpression(segClean);
      if (target === null) return null; // invalid target expression

      const delta = target - runningSum;
      numbers.push(delta);
      runningSum = runningSum + delta; // should equal target
    }

    return numbers;
  } catch {
    return null;
  }
}
