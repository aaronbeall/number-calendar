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
