import { useCallback, useEffect, useState, type Dispatch, type SetStateAction } from "react";


// Safe JSON parse for localStorage values
function parseStoredValue<T>(stored: string | null, fallback: T): T {
  if (stored == null) return fallback;
  try {
    return JSON.parse(stored) as T;
  } catch (err) {
    console.error("Failed to parse preference from localStorage", err);
    return fallback;
  }
}

function getInitial<T>(key: string, initialValue: T | (() => T)): T {
  const resolveInitial = () => (typeof initialValue === "function" ? (initialValue as () => T)() : initialValue);
  if (typeof window === "undefined") {
    return resolveInitial();
  }

  const stored = window.localStorage.getItem(key);
  return parseStoredValue<T>(stored, resolveInitial());
}

/**
 * Persisted state hook keyed in localStorage.
 * Works like useState but requires a key and syncs across tabs.
 */
export function usePreference<T>(key: string, initialValue: T | (() => T)) {
  const [value, setValue] = useState<T>(() => getInitial(key, initialValue));

  // Update localStorage whenever the value changes
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch (err) {
      console.error("Failed to save preference to localStorage", err);
    }
  }, [key, value]);

  // React to key changes by re-reading localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;
    setValue(getInitial(key, initialValue));
  }, [key, initialValue]);

  // Sync updates from other tabs/windows
  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleStorage = (event: StorageEvent) => {
      if (event.key === key) {
        setValue((prev) => parseStoredValue<T>(event.newValue, prev));
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [key]);

  return [value, setValue] as const;
}
