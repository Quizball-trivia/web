"use client";

import { useCallback, useRef } from "react";

/**
 * Synchronous re-entry guard for turn handlers. State-based guards (`turn`,
 * `phase`) only update on re-render, so two rapid clicks in the same frame can
 * both pass them — double-consuming opponent scripts or stacking opponent
 * timers. Acquire at the top of a user-action handler; release when control
 * returns to the user (opponent turn done, round over, or reset).
 */
export function useTurnLock() {
  const lockedRef = useRef(false);

  const acquire = useCallback(() => {
    if (lockedRef.current) return false;
    lockedRef.current = true;
    return true;
  }, []);

  const release = useCallback(() => {
    lockedRef.current = false;
  }, []);

  return { acquire, release };
}
