"use client";

import { useEffect, useState } from "react";

/** Eased count from 0 to `target`. `instant` (reduced motion) shows the target at once. */
export function useCountUp(target: number, { durationMs = 1400, instant = false } = {}): number {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (instant) return;
    let frame = 0;
    const began = performance.now();
    const tick = (now: number) => {
      const progress = Math.min(1, (now - began) / durationMs);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(target * eased));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, durationMs, instant]);

  return instant ? target : value;
}
