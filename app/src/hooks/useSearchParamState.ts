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
 * 
 * Example:
 * 
 * ```
 * // Boolean flag state
 * const [showDetails, setShowDetails] = useSearchParamState("details", false);
 * setShowDetails(true); // URL will have ?details
 * setShowDetails(false); // URL will remove details param
 * 
 * // String state
 * const [filter, setFilter] = useSearchParamState<string>("filter", "all");
 * setFilter("active"); // URL will have ?filter=active
 * setFilter(null); // URL will remove filter param
 * 
 * // Object lookup state
 * const [datasetId, setDatasetId] = useSearchParamState("dataset", "");
 * const dataset = datasets.find(d => d.id === datasetId);
 * setDatasetId("123"); // URL will have ?dataset=123, dataset will be the one with id "123"
 * setDatasetId(null); // URL will remove dataset param, dataset will be null
 * ```
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
      setSearchParams((prev) => {
        if (next == null) {
          prev.delete(key);
          return prev;
        }

        if (typeof next === "boolean") {
          if (next) {
            prev.set(key, "");
          } else {
            prev.delete(key);
          }
          return prev;
        }

        if (typeof next === "number") {
          if (Number.isFinite(next)) {
            prev.set(key, String(next));
          } else {
            prev.delete(key);
          }
          return prev;
        }

        if (typeof next === "string") {
          prev.set(key, next);
          return prev;
        }

        try {
          const serialized = JSON.stringify(next);
          if (serialized == null) {
            prev.delete(key);
          } else {
            prev.set(key, serialized);
          }
        } catch {
          prev.delete(key);
        }
        return prev;
      });
    },
    [key, setSearchParams]
  );

  return [value, setValue] as const;
}
