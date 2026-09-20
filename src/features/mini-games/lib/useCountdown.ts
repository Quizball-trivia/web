'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * A self-correcting countdown timer. Returns the ms/seconds left, a 0→1 progress
 * value, and start/reset/stop controls. Ticks ~10×/s so a progress bar animates
 * smoothly; fires `onExpire` once when it reaches zero.
 */
export function useCountdown(durationMs: number, opts?: { autoStart?: boolean; onExpire?: () => void }) {
  const { autoStart = false, onExpire } = opts ?? {};
  const [endsAt, setEndsAt] = useState<number | null>(() => (autoStart ? Date.now() + durationMs : null));
  const [msLeft, setMsLeft] = useState(autoStart ? durationMs : durationMs);
  const firedRef = useRef(false);
  const onExpireRef = useRef(onExpire);
  useEffect(() => {
    onExpireRef.current = onExpire;
  });

  const start = useCallback(
    (overrideMs?: number) => {
      firedRef.current = false;
      const d = overrideMs ?? durationMs;
      setMsLeft(d);
      setEndsAt(Date.now() + d);
    },
    [durationMs],
  );

  const stop = useCallback(() => setEndsAt(null), []);
  const reset = useCallback(() => {
    firedRef.current = false;
    setEndsAt(null);
    setMsLeft(durationMs);
  }, [durationMs]);

  useEffect(() => {
    if (endsAt === null) return;
    let raf = 0;
    const tick = () => {
      const left = Math.max(0, endsAt - Date.now());
      setMsLeft(left);
      if (left <= 0) {
        if (!firedRef.current) {
          firedRef.current = true;
          onExpireRef.current?.();
        }
        return;
      }
      raf = window.setTimeout(tick, 80) as unknown as number;
    };
    tick();
    return () => window.clearTimeout(raf);
  }, [endsAt]);

  const running = endsAt !== null && msLeft > 0;
  return {
    msLeft,
    secondsLeft: Math.ceil(msLeft / 1000),
    progress: durationMs > 0 ? 1 - msLeft / durationMs : 1,
    running,
    start,
    stop,
    reset,
  };
}
