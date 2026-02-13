// Valence helpers for stat/number semantics
import type { GoalCondition, Valence } from '@/features/db/localdb';
import { evalCondition } from './goals';

/**
 * Determines if a value (boolean or number) is considered "good" for the given valence.
 * For booleans: true = highest, false = lowest.
 * For numbers: positive = highest, negative = lowest, 0 = neutral.
 */
export function isGood(value: boolean | number, valence: Valence): boolean {
  if (valence === 'neutral') return false;
  if (typeof value === 'boolean') {
    // true = highest, false = lowest
    return valence === 'positive' ? value : !value;
  }
  // number: positive = highest, negative = lowest
  return valence === 'positive' ? value > 0 : value < 0;
}

/**
 * Determines if a value (boolean or number) is considered "bad" for the given valence.
 * For booleans: true = highest, false = lowest.
 * For numbers: positive = highest, negative = lowest, 0 = neutral.
 */
export function isBad(value: boolean | number, valence: Valence): boolean {
  if (valence === 'neutral') return false;
  if (typeof value === 'boolean') {
    // true = highest, false = lowest
    return valence === 'positive' ? !value : value;
  }
  // number: positive = highest, negative = lowest
  return valence === 'positive' ? value < 0 : value > 0;
}

/**
 * Determines if a value (boolean or number) is considered neutral for the given valence.
 * For booleans: never neutral (always highest/lowest).
 * For numbers: 0 is neutral.
 */
export function isNeutral(value: boolean | number, valence: Valence): boolean {
  if (valence === 'neutral') return true;
  if (typeof value === 'boolean') return false;
  return value === 0;
}

export type ValueForNumber<T> = {
  positive: T;
  negative: T;
  zero: T;
}

/**
 * Returns one of the provided positive/negative/zero values based on the sign of the input number.)
 */
export function getValueForSign<T>(value: number, values: ValueForNumber<T>): T {
  if (value > 0) return values.positive;
  if (value < 0) return values.negative;
  return values.zero;
}

/**
 * Returns one of the provided good/bad/neutral values based on the evaluation of the input value and valence.
 * 
 * Example:
 * ```
 * const direction = getValueForValence(10, 'positive', { good: 'up', bad: 'down', neutral: 'flat' }) // returns 'up'
 * const { text, background } = getValueForValence(-5, 'negative', { 
 *  good: { text: 'green', background: 'lightgreen' }, 
 *  bad: { text: 'red', background: 'lightred' }, 
 *  neutral: { text: 'gray', background: 'lightgray' } }
 * ) // returns { text: 'green', background: 'lightgreen' }
 * ```
 */
export function getValueForValence<T>(value: number | boolean | null | undefined, valence: Valence, { good, bad, neutral }: { good: T; bad: T; neutral: T; }): T {
  if (isGood(value ?? 0, valence)) return good;
  if (isBad(value ?? 0, valence)) return bad;
  return neutral;
}

/**
 * Returns one of the provided good/bad/neutral values based on the evaluation of the input value, valence, and an optional condition.
 * If the condition is provided, it overrides the valence evaluation.
 */
export function getValueForValenceWithCondition<T>(
  value: number | null | undefined,
  valenceValue: number | null | undefined,
  valence: Valence,
  condition: GoalCondition | undefined, 
  { good, bad, neutral }: { good: T; bad: T; neutral: T; }
): T {
  // If condition is provided, override valence evaluation with condition evaluation
  if (condition) {
    if (value == null) return neutral; // If no value to evaluate condition against, return neutral
    const conditionMet = evalCondition(condition, value);
    return conditionMet ? good : bad;
  }
  // Otherwise, evaluate based on valence as usual
  return getValueForValence(valenceValue, valence, { good, bad, neutral });
}

/**
 * Returns a value for whatever is a "good" outcome based on the valence.
 * 
 * Example:
 * ```
 * const goodDirection = getValueForGood('positive', { positive: 'up', negative: 'down', neutral: 'flat' }) // returns 'up'
 * const goodColor = getValueForGood('negative', { positive: 'green', negative: 'red', neutral: 'gray' }) // returns 'red'
 * ```
 */
export function getValueForGood<T>(valence: Valence, { positive, negative, neutral }: { positive: T; negative: T; neutral: T }): T {
  if (isGood(1, valence)) return positive;
  if (isGood(-1, valence)) return negative;
  return neutral;
}

/**
 * Returns a value for whatever is a "bad" outcome based on the valence.
 * 
 * Example:
 * ```
 * const badDirection = getValueForBad('positive', { positive: 'gain', negative: 'loss', neutral: 'flat' }) // returns 'gain'
 * const badColor = getValueForBad('negative', { positive: 'red', negative: 'green', neutral: 'gray' }) // returns 'green'
 * ```
 */
export function getValueForBad<T>(valence: Valence, { positive, negative, neutral }: { positive: T; negative: T; neutral: T }): T {
  if (isBad(1, valence)) return positive;
  if (isBad(-1, valence)) return negative;
  return neutral;
}

/**
 * Returns a value for whatever is a "neutral" outcome based on the valence.
 * 
 * Example:
 * ```
 * const neutralDirection = getValueForNeutral('positive', { positive: 'flat', negative: 'breakeven', neutral: 'steady' }) // returns 'flat'
 * const neutralColor = getValueForNeutral('negative', { positive: 'gray', negative: 'white', neutral: 'blue' }) // returns 'gray'
 * ```
 */
export function getValueForNeutral<T>(valence: Valence, { positive, negative, neutral }: { positive: T; negative: T; neutral: T }): T {
  if (isNeutral(1, valence)) return positive;
  if (isNeutral(-1, valence)) return negative;
  return neutral;
}