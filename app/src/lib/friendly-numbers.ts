
/**
 * Round a number to a "clean" value based on significant leading digits.
 * E.g., 1234 with 2 significant digits -> 1200
 *       5.6789 with 2 significant digits -> 5.7
 *       0.056789 with 2 significant digits -> 0.057
 */
export function roundToClean(num: number, significantLeadingDigits: number = 2): number {
  if (num === 0) return 0;
  const sign = num < 0 ? -1 : 1;
  const abs = Math.abs(num);
  
  // Find the magnitude (position of the first digit relative to decimal point)
  // e.g., 120.123 -> magnitude=2, 5.6789 -> magnitude=0, 0.056789 -> magnitude=-2
  const magnitude = Math.floor(Math.log10(abs));
  
  // Calculate the decimal place to round to based on significant figures
  // decimalPlace = magnitude - (significant digits - 1)
  // For 120.123 with 2 sig figs: 2 - 1 = 1, so round to 10s place (result: 120)
  // For 5.6789 with 2 sig figs: 0 - 1 = -1, so round to 0.1s place (result: 5.7)
  // For 0.056789 with 2 sig figs: -2 - 1 = -3, so round to 0.001s place (result: 0.057)
  const decimalPlace = magnitude - (significantLeadingDigits - 1);
  
  const multiplier = Math.pow(10, -decimalPlace);
  return sign * (Math.round(abs * multiplier) / multiplier);
}

/**
 * Count the number of significant digits in a number or numeric string.
 * Trailing zeros after a decimal point in string input are considered significant.
 * E.g., 0.0012300 has 3 significant digits (1, 2, 3)
 *       120.5 has 4 significant digits (1, 2, 0, 5)
 *       10000 has 1 significant digit (1)
 *       12300 has 3 significant digits (1, 2, 3) 
 *       "50" has 1 significant digit (5) 
 *       "50.0" has 3 significant digits (5, 0, 0)
 */
export function countSignificantDigits(num: number | string): number {
  const str = typeof num === 'string' ? num : Math.abs(num).toString();
  const abs = typeof num === 'number' ? Math.abs(num) : Math.abs(parseFloat(str));
  
  if (abs === 0) return 0;
  
  const hasDecimal = str.includes('.');
  let workStr = str.replace('.', '').replace(/^0+/, '');
  
  // Remove trailing zeros only for inputs without a decimal point
  // Numbers with decimals keep trailing zeros as they're considered significant
  if (!hasDecimal) {
    workStr = workStr.replace(/0+$/, '');
    // If everything was removed (e.g., "10", "100"), return 1 for the leading digit
    if (workStr.length === 0) return 1;
  }
  
  return workStr.length;
}

export type PeriodUnit = 'day' | 'week' | 'month';

export function convertPeriodUnitWithRounding(value: string, from: PeriodUnit, to: PeriodUnit): string | null {
  const parsed = parseFloat(value);
  if (!Number.isFinite(parsed)) return null;

  const decimalMatch = value.match(/\.(\d+)/);
  const currentDecimals = decimalMatch ? decimalMatch[1].length : 0;
  const periodDays: Record<PeriodUnit, number> = { day: 1, week: 7, month: 30 };
  const convertedValue = parsed * (periodDays[from] / periodDays[to]);
  const goingToSmallerPeriod = periodDays[from] > periodDays[to];
  const goingToLargerPeriod = periodDays[from] < periodDays[to];
  const targetDecimals = goingToSmallerPeriod
    ? Math.max(0, currentDecimals - 1)
    : goingToLargerPeriod
      ? currentDecimals + 1
      : currentDecimals;

  return String(Number(convertedValue.toFixed(targetDecimals)));
}