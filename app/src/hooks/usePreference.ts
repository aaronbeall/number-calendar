import { useEffect, useRef, useState } from "react";


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
  const keyRef = useRef(key);
  const [value, setValue] = useState<T>(() => getInitial(key, initialValue));

  // React to key changes by updating ref and re-reading localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;
    keyRef.current = key;
    setValue(getInitial(key, initialValue));
  }, [key]);

  // Update localStorage whenever the value changes (use ref for key to avoid race conditions)
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(keyRef.current, JSON.stringify(value));
    } catch (err) {
      console.error("Failed to save preference to localStorage", err);
    }
  }, [value]);

  // Sync updates from other tabs/windows
  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleStorage = (event: StorageEvent) => {
      if (event.key === keyRef.current) {
        setValue((prev) => parseStoredValue<T>(event.newValue, prev));
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  return [value, setValue] as const;
}
