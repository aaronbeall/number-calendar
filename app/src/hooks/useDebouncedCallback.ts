import { useRef, useCallback, useEffect } from 'react';

/**
 * Hook to debounce a callback function
 * @param callback - The function to debounce
 * @param delay - Delay in milliseconds
 * @returns A tuple of [debouncedFunction, cancelFunction]
 */
export function useDebouncedCallback<TArgs extends unknown[]>(
  callback: (...args: TArgs) => void,
  delay: number
): [(...args: TArgs) => void, () => void] {
  const timerRef = useRef<number | null>(null);

  const debouncedCallback = useCallback(
    ((...args: TArgs) => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      timerRef.current = window.setTimeout(() => {
        callback(...args);
      }, delay);
    }) as (...args: TArgs) => void,
    [callback, delay]
  );

  const cancel = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  return [debouncedCallback, cancel];
}
