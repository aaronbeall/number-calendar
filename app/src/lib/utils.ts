import type { ISODateString } from "@/features/db/localdb";
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
 
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getRelativeTime(timestamp: number | ISODateString): string {
  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto', style: 'short' });
  const time = typeof timestamp === 'string' ? new Date(timestamp).getTime() : timestamp;
  const diff = time - Date.now();
  const absDiff = Math.abs(diff);
  
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  const week = 7 * day;
  const month = 30 * day;
  const year = 365 * day;
  
  if (absDiff >= year) return rtf.format(Math.round(diff / year), 'year');
  if (absDiff >= month) return rtf.format(Math.round(diff / month), 'month');
  if (absDiff >= week) return rtf.format(Math.round(diff / week), 'week');
  if (absDiff >= day) return rtf.format(Math.round(diff / day), 'day');
  if (absDiff >= hour) return rtf.format(Math.round(diff / hour), 'hour');
  if (absDiff >= minute) return rtf.format(Math.round(diff / minute), 'minute');
  return rtf.format(Math.round(diff / 1000), 'second');
}

export const capitalize = <S extends string>(str: S): Capitalize<S> => {
  return (str.charAt(0).toUpperCase() + str.slice(1)) as Capitalize<S>;
}

/**
 * Convert a word to plural form (e.g., 'day' -> 'days', 'week' -> 'weeks')
 * Works for most regular nouns; special cases can be handled manually
 */
export const pluralize = (str: string, count: number = 2): string => {
  if (count === 1) return str; // No change for singular
  if (str.endsWith('y') && str.length > 1) {
    const beforeY = str.charAt(str.length - 2).toLowerCase();
    const isVowel = /[aeiou]/.test(beforeY);
    // Only change y to ies if preceded by consonant (e.g., "city" -> "cities")
    // But keep y+s if preceded by vowel (e.g., "day" -> "days")
    if (!isVowel) return `${str.slice(0, -1)}ies`;
  }
  if (str.endsWith('s') || str.endsWith('x') || str.endsWith('z')) return `${str}es`;
  return `${str}s`;
}

/**
 * Convert a word to its adjective/adverbial form using English rules
 * (e.g., 'happy' -> 'happily', 'simple' -> 'simply', 'quick' -> 'quickly')
 * Returns lowercase; caller can capitalize if needed
 */
export const adjectivize = (str: string): string => {
  const lower = str.toLowerCase();

  // Irregular: day -> daily (preserve original case prefix)
  if (lower === 'day') {
    return `${str.slice(0, -1)}ily`;
  }

  // Default: add ly
  return `${str}ly`;
}

/**
 * Object.entries with key typing
 */
export const entriesOf = <T extends object>(obj: T) =>
  Object.entries(obj) as [keyof T, NonNullable<T[keyof T]>][];

/**
 * Object.keys with key typing
 */
export const keysOf = <T extends object>(obj: T) =>
  Object.keys(obj) as (keyof T)[];

/**
 * Check if a name is already taken in a collection of items
 */
export function isNameTaken<T>(
  current: Partial<T> | null | undefined,
  existing: T[],
  nameKey: keyof T,
  idKey: keyof T
): boolean {
  return existing.some(item =>
    String(item[nameKey]).toLowerCase() === String(current?.[nameKey]).toLowerCase() &&
    (!current || item[idKey] !== current[idKey]) // Allow current name in edit mode
  );
}

/**
 * Get a random key from an object
 */
export function randomKeyOf<T extends object>(obj: T): keyof T {
  const keys = keysOf(obj);
  if (keys.length === 0) throw new Error("Object has no keys");
  const randomIndex = Math.floor(Math.random() * keys.length);
  return keys[randomIndex];
}

/**
 * Get a random value from an object
 */
export function randomValueOf<T extends object>(obj: T): T[keyof T] {
  const key = randomKeyOf(obj);
  return obj[key];
}

/**
 * Convert a string to Title Case (e.g., "hello world" -> "Hello World", "my-name_is here" -> "My Name Is Here")
 */
export function titleCase(str: string): string {
  // Split on delims like space, hyphen, underscore
  return str.split(/[\s-_]+/).map(capitalize).join(' ');
}