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
    // Remove currency symbols and locale-specific thousands separators (commas, spaces, etc.)
    let cleaned = expr.replace(/[$€£¥₹]/g, '') // Remove common currency symbols
      .replace(/(?<=\d)[,\s](?=\d{3}\b)/g, '') // Remove thousands separators between digits
      .replace(/,/g, '') // Remove any remaining commas
      .replace(/\s+/g, ''); // Remove all whitespace

    // Split on + or - (keep sign with number)
    const parts = cleaned.split(/(?=[+-])/);
    const numbers = parts.map(Number).filter(n => !isNaN(n));
    if (numbers.length === 0) return null;
    return numbers;
  } catch {
    return null;
  }
}
