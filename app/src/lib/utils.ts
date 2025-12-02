import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
 
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getRelativeTime(timestamp: number): string {
  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto', style: 'short' });
  const diff = timestamp - Date.now();
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
 * Object.entries with key typing
 */
export const entriesOf = <T extends object>(obj: T) =>
  Object.entries(obj) as [keyof T, NonNullable<T[keyof T]>][];

/**
 * Object.keys with key typing
 */
export const keysOf = <T extends object>(obj: T) =>
  Object.keys(obj) as (keyof T)[];