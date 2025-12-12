// Valence helpers for stat/number semantics
import type { Valence } from '@/features/db/localdb';

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
export function getValueForValence<T>(value: number | boolean | null | undefined, valence: Valence, { good, bad, neutral }: { good: T; bad: T; neutral: T; positive?: T; negative?: T }): T {
  if (isGood(value ?? 0, valence)) return good;
  if (isBad(value ?? 0, valence)) return bad;
  return neutral;
}