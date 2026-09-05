'use client';

import { useCallback, useEffect, useRef } from 'react';

/** setTimeout that auto-clears on unmount and on reset (rival "thinking" delays, auto-advance). */
export function useTimers() {
  const ids = useRef<Set<number>>(new Set());
  const after = useCallback((ms: number, fn: () => void) => {
    const id = window.setTimeout(() => {
      ids.current.delete(id);
      fn();
    }, ms);
    ids.current.add(id);
    return id;
  }, []);
  const clearAll = useCallback(() => {
    ids.current.forEach((id) => window.clearTimeout(id));
    ids.current.clear();
  }, []);
  useEffect(() => clearAll, [clearAll]);
  return { after, clearAll };
}
