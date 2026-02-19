
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

/**
 * Convert a per-period value between different period units (day, week, month),
 * adjusting decimal places based on whether converting to a larger or smaller period.
 * - When converting to a smaller period (e.g., week → day), increase decimal places by 1
 * - When converting to a larger period (e.g., day → week), reduce decimal places by 1
 * - When converting between same-sized periods, keep the same number of decimal places
 *
 * E.g.,
 *   convertPeriodUnitWithRounding("0.5", "week", "day") -> "0.07" (0.5 per week = 0.0714 per day, rounded to 2 decimals)
 *   convertPeriodUnitWithRounding("10", "day", "week") -> "70" (10 per day = 70 per week)
 *
 * Returns null for invalid input.
 */
export function convertPeriodUnitWithRounding(value: string, from: PeriodUnit, to: PeriodUnit): string | null {
  const parsed = parseFloat(value);
  if (!Number.isFinite(parsed)) return null;

  const decimalMatch = value.match(/\.(\d+)/);
  const currentDecimals = decimalMatch ? decimalMatch[1].length : 0;
  const periodDays: Record<PeriodUnit, number> = { day: 1, week: 7, month: 30 };
  const convertedValue = parsed * (periodDays[to] / periodDays[from]);
  const goingToSmallerPeriod = periodDays[from] > periodDays[to];
  const goingToLargerPeriod = periodDays[from] < periodDays[to];
  const targetDecimals = goingToSmallerPeriod
    ? currentDecimals + 1
    : goingToLargerPeriod
      ? Math.max(0, currentDecimals - 1)
      : currentDecimals;

  return String(Number(convertedValue.toFixed(targetDecimals)));
}

/**
 * Converts a value from a period + length (ex "500" in "3 weeks") to a per-period value in a different 
 * period unit, applying the same rounding rules as convertPeriodUnitWithRounding.
 * E.g. 
 * ```
 * convertPeriodLengthWithRounding("500", "week", 3, "day") 
 * // -> "24" (500 over 3 weeks = ~71.43 per week = ~23.81 per day, rounded to 2 significant digits)
 * ```
 * Returns null for invalid input.
 */
export function convertPeriodLengthWithRounding(value: string, from: PeriodUnit, fromLength: number, to: PeriodUnit): string | null {
  const parsed = parseFloat(value);
  if (!Number.isFinite(parsed) || fromLength <= 0) return null;

  // Determine significant digits to use based on conversion direction
  const toSignificantDigits = countSignificantDigits(value) + 
    (['day', 'week', 'month'].indexOf(from) < ['day', 'week', 'month'].indexOf(to) ? -1 : 1);
  const perPeriodValue = parsed / fromLength;
  const converted = convertPeriodUnitWithRounding(String(perPeriodValue), from, to);
  return converted ? String(roundToClean(parseFloat(converted), toSignificantDigits)) : null;
}

// WIP
export type NumberDisplayOptions = {
  /** e.g. "USD" for formatting as currency */
  currency?: string;
  /** e.g. "kg" for formatting with a unit suffix */
  unit?: string;
  /** if true, format negative numbers in accounting style (e.g. ($1,234.56) instead of -$1,234.56) */
  accounting?: boolean;
}

export type FormatValueOptions = { 
  /** If true, use compact notation (e.g. 1.2K instead of 1200) */
  short?: boolean;
  /** If true, format as percentage (e.g. 12.3 -> "12.3%") */
  percent?: boolean;
  /** If true, format as a delta with sign (e.g. +5, -3) */
  delta?: boolean;
  /** 
   * Control decimal places:
   * - "auto": Round to 3 significant figures (e.g., 0.1234 -> 0.123, 123.456 -> 123)
   * - number: Maximum fractional digits (e.g., 2 -> 12.34)
   * - Default is 2, or "auto" if short is true
   */
  decimals?: 'auto' | number;
};

/**
 * Helper to format numbers for display in the UI, with options for shortening, percent formatting, and delta formatting (with signs).
 * Can also handle formatting ranges when given a tuple of [min, max], applying the same formatting to both numbers and using an appropriate separator (en dash for regular ranges, arrow for deltas or ranges with negatives).
 * E.g.
 *   formatFriendlyNumber(1234, { short: true }) -> "1.2K"
 *   formatFriendlyNumber(0.05678, { percent: true, short: true }) -> "5.7%"
 *   formatFriendlyNumber(-0.0345, { percent: true, delta: true }) -> "-3.45%"
 *   formatFriendlyNumber([1000, 5000], { short: true }) -> "1K–5K"
 *   formatFriendlyNumber([-500, 200], { delta: true }) -> "-500 → 200"
 *   formatFriendlyNumber([0.01, 0.05], { percent: true }) -> "1%–5%"
 *   formatFriendlyNumber([0.01, 0.05], { percent: true, delta: true }) -> "1% → 5%"
 *   formatFriendlyNumber([0.01, 0.05], { percent: true, delta: true, short: true }) -> "1% → 5%"
 */
export function formatFriendlyNumber(value: number | [number, number], options: FormatValueOptions = {}): string {
  if (Array.isArray(value)) {
    return formatRange(value, options);
  }
  return formatValue(value, options);
}

/**
 * Helper to format values for display in goal titles and descriptions,
 * with options for shortening, percent formatting, and delta formatting (with signs)
 */
export function formatValue(num: number | undefined, { short = false, percent = false, delta = false, decimals }: FormatValueOptions = {}): string {
  if (num === undefined || isNaN(num)) return '';
  let options: Intl.NumberFormatOptions = {};
  let value = num;
  if (short) {
    options = { ...options, notation: 'compact', compactDisplay: 'short', maximumFractionDigits: 1 };
  }
  if (percent) {
    options = { ...options, style: 'percent', maximumFractionDigits: 1 };
    value = num / 100;
  }
  if (delta) {
    options = { ...options, signDisplay: 'exceptZero' };
  }
  
  // Handle decimal places
  const decimalOption = decimals ?? options.maximumFractionDigits ?? 2;
  if (decimalOption === 'auto') {
    // Don't apply `auto` to short because it will round off decimals based on pre-shortened value (e.g. 1234 -> 1.2K with 1 decimal place, but with `auto` it sees no decimals in the original number and we'd get "1K")
    if (!short) {
      // Round to 3 significant figures and extract decimal places
      const rounded = roundToClean(value, 3);
      const roundedStr = rounded.toString();
      const decimalMatch = roundedStr.match(/\.(\d+)/);
      const maxFractionDigits = decimalMatch ? decimalMatch[1].length : 0;
      options = { ...options, maximumFractionDigits: maxFractionDigits };
    }
  } else {
    options = { ...options, maximumFractionDigits: decimalOption };
  }
  
  return new Intl.NumberFormat('en-US', options).format(value);
}

/**
 * Helper to format ranges for display, using formatValue for each number and handling percent/delta formatting
 */
export function formatRange(range: [number, number] | undefined, { short, percent, delta }: FormatValueOptions = {}): string {
  if (!range) return '';
  const [min, max] = range;
  // For deltas or ranges with negatives use `→` to avoid confusion with minus sign, 
  // otherwise en dash (e.g. `5–10`)
  const separator = delta || (min < 0 || max < 0) ? '→' : '–';
  // For percents, omit the leading % symbol if using en dash, for brevity (e.g. `5–10%` instead of `5%–10%`))
  const options = { short, percent, delta };
  const minOptions = percent && separator === '–' ? { short, delta } : options;
  const minStr = formatValue(min, minOptions);
  const maxStr = formatValue(max, options);
  return `${minStr}${separator}${maxStr}`;
}

