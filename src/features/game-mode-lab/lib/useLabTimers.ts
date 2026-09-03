"use client";

import { useCallback, useEffect, useRef } from "react";

/**
 * setTimeout wrapper that auto-clears on unmount and supports clearing all
 * pending timers on game reset (mock-opponent "thinking" delays).
 */
export function useLabTimers() {
  const timers = useRef<Set<number>>(new Set());

  const schedule = useCallback((fn: () => void, ms: number) => {
    const id = window.setTimeout(() => {
      timers.current.delete(id);
      fn();
    }, ms);
    timers.current.add(id);
    return id;
  }, []);

  const clearAll = useCallback(() => {
    timers.current.forEach((id) => window.clearTimeout(id));
    timers.current.clear();
  }, []);

  useEffect(() => clearAll, [clearAll]);

  return { schedule, clearAll };
}
