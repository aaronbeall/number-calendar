import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";

/**
 * State can be the deserialized value from the URL search params, or null if not present, or true if present but no value.
 * Set to null or false to remove the param from the URL.
 */
type SearchParamState<T> = readonly [T | null | boolean, (next: T | null | boolean) => void];

/**
 * A hook to manage a single URL search param as state. It handles deserialization of common types (boolean, number, JSON) and updates the URL accordingly.
 * The value can be of type T (deserialized from the URL), null (if the param is not present), or true (if the param is present but has no value).
 * Setting the value to null or false will remove the param from the URL.
 */
export function useSearchParamState<T>(key: string, defaultValue: T | null | boolean): SearchParamState<T> {
  const [searchParams, setSearchParams] = useSearchParams();

  const value = useMemo(() => {
    if (!searchParams.has(key)) {
      return defaultValue;
    }

    const raw = searchParams.get(key);
    if (raw == null) {
      return defaultValue;
    }

    if (raw === "") {
      return true as T;
    }

    const normalized = raw.trim().toLowerCase();
    if (normalized === "true" || normalized === "false") {
      return normalized === "true" as T;
    }

    if (/^-?\d+(\.\d+)?$/.test(raw.trim())) {
      const parsed = Number.parseFloat(raw);
      if (!Number.isNaN(parsed)) {
        return parsed as T;
      }
    }

    const trimmed = raw.trim();
    if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
      try {
        return JSON.parse(raw) as T;
      } catch {
        return defaultValue;
      }
    }

    return raw as T;
  }, [defaultValue, key, searchParams]);

  const setValue = useCallback(
    (next: T | null | boolean) => {
      const nextParams = new URLSearchParams(searchParams);

      if (next == null) {
        nextParams.delete(key);
        setSearchParams(nextParams);
        return;
      }

      if (typeof next === "boolean") {
        if (next) {
          nextParams.set(key, "");
        } else {
          nextParams.delete(key);
        }
        setSearchParams(nextParams);
        return;
      }

      if (typeof next === "number") {
        if (Number.isFinite(next)) {
          nextParams.set(key, String(next));
        } else {
          nextParams.delete(key);
        }
        setSearchParams(nextParams);
        return;
      }

      if (typeof next === "string") {
        nextParams.set(key, next);
        setSearchParams(nextParams);
        return;
      }

      try {
        const serialized = JSON.stringify(next);
        if (serialized == null) {
          nextParams.delete(key);
        } else {
          nextParams.set(key, serialized);
        }
      } catch {
        nextParams.delete(key);
      }

      setSearchParams(nextParams);
    },
    [defaultValue, key, searchParams, setSearchParams]
  );

  return [value, setValue] as const;
}
