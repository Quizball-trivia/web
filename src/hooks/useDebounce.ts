import { useEffect, useState } from 'react';

/**
 * Hook for debouncing a value with a specified delay.
 * Useful for delaying expensive operations like API searches.
 *
 * @param value The value to debounce
 * @param delay The debounce delay in milliseconds
 * @returns The debounced value
 *
 * @example
 * const debouncedQuery = useDebounce(query, 400);
 * // Use debouncedQuery for API calls
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => window.clearTimeout(timeoutId);
  }, [value, delay]);

  return debouncedValue;
}
